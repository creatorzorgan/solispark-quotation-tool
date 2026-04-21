// PropertyMap — interactive satellite map with address search and a one-click
// "Capture Roof" button that snaps the framed view to a base64 JPEG, which is
// then persisted on the quotation draft and later embedded in the PDF cover
// letter.
//
// Key engineering notes:
//
// • We force `tilt: 0` so the satellite imagery renders flat (no 45° oblique
//   mode) — oblique view uses a different renderer that html2canvas can't see.
//
// • We listen for the map's `idle` event before capture so every tile has
//   finished streaming. Capturing too early produces a grey checkerboard.
//
// • html2canvas needs `useCORS: true` so Google's tile CDN responses (which
//   include `Access-Control-Allow-Origin: *`) are treated as same-origin for
//   canvas read-back. Without it the canvas is tainted and `toDataURL` throws.
//
// • Place autocomplete: Google deprecated the classic `places.Autocomplete`
//   class for Cloud projects created after March 2025, so a fresh API key
//   crashes with "undefined is not a constructor" the moment we try to
//   instantiate it. We feature-detect and fall back to plain Geocoder on
//   Enter, which always works regardless of project age.
//
// • We downscale captures above ~1600px wide before returning the data URL.
//   Google Maps containers at 2× DPR can easily produce 3000px images; those
//   bloat the quotation JSON blob and slow down Supabase upserts.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { Camera, MapPin, RotateCcw, Search, AlertTriangle, Loader2 } from 'lucide-react';
import { useGoogleMaps, isGoogleMapsKeyConfigured } from '../hooks/useGoogleMaps.js';

// Bengaluru default — matches Solispark's HQ. Overridden the moment the user
// searches an address or the component receives a non-empty `initialAddress`.
const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };
const DEFAULT_ZOOM = 19;

const MAX_CAPTURE_WIDTH = 1600;

// Downscale a canvas to at most MAX_CAPTURE_WIDTH while preserving aspect.
const downscaleCanvas = (sourceCanvas) => {
  if (sourceCanvas.width <= MAX_CAPTURE_WIDTH) return sourceCanvas;
  const ratio = MAX_CAPTURE_WIDTH / sourceCanvas.width;
  const target = document.createElement('canvas');
  target.width = MAX_CAPTURE_WIDTH;
  target.height = Math.round(sourceCanvas.height * ratio);
  const ctx = target.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, target.width, target.height);
  return target;
};

// Wait for the next `idle` event on a map (fires after all tiles have loaded
// following a pan/zoom/type change). Tops out at 4 s so we don't hang forever
// if the user goes offline mid-capture.
const waitForIdle = (map) =>
  new Promise((resolve) => {
    const timeout = setTimeout(resolve, 4000);
    try {
      window.google.maps.event.addListenerOnce(map, 'idle', () => {
        clearTimeout(timeout);
        resolve();
      });
    } catch {
      clearTimeout(timeout);
      resolve();
    }
  });

const PropertyMap = ({ initialAddress, roofSnapshot, roofLocation, onCapture, onClear }) => {
  const { ready, error: loadError } = useGoogleMaps();
  const mapContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const geocoderRef = useRef(null);

  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState(null);
  const [searchText, setSearchText] = useState(roofLocation?.formattedAddress || initialAddress || '');
  const [autocompleteAvailable, setAutocompleteAvailable] = useState(false);

  // ── Geocode-on-Enter fallback (used when classic Autocomplete isn't
  // available on the API key). Also called programmatically for the initial
  // address lookup.
  const geocodeAndFly = useCallback((address) => {
    if (!address || !mapRef.current || !geocoderRef.current) return;
    geocoderRef.current.geocode({ address, region: 'in' }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const loc = results[0].geometry.location;
        const viewport = results[0].geometry.viewport;
        if (viewport) mapRef.current.fitBounds(viewport);
        else {
          mapRef.current.setCenter(loc);
          mapRef.current.setZoom(DEFAULT_ZOOM);
        }
        if (markerRef.current) markerRef.current.setPosition(loc);
        setSearchText(results[0].formatted_address || address);
      }
    });
  }, []);

  // ── Initialise the map once the API is ready. Guarded against re-entry
  // (React StrictMode double-invokes effects in dev) and wrapped in a try so
  // any Google Maps runtime error surfaces to the error boundary instead of
  // crashing mid-mount.
  useEffect(() => {
    if (!ready || !mapContainerRef.current || mapRef.current) return;

    const google = window.google;
    if (!google?.maps?.Map) return;

    try {
      const initialCenter =
        roofLocation?.lat && roofLocation?.lng
          ? { lat: roofLocation.lat, lng: roofLocation.lng }
          : DEFAULT_CENTER;
      const initialZoom = roofLocation?.zoom || DEFAULT_ZOOM;

      const map = new google.maps.Map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        mapTypeId: 'satellite',
        tilt: 0,
        disableDefaultUI: false,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'greedy',
        rotateControl: false,
      });
      mapRef.current = map;

      // Persistent centre marker. Marker may be deprecated on very new API
      // versions in favour of AdvancedMarkerElement — if Marker is gone,
      // silently skip it; the fixed crosshair overlay still guides framing.
      if (google.maps.Marker) {
        const marker = new google.maps.Marker({
          position: initialCenter,
          map,
          draggable: false,
        });
        markerRef.current = marker;
        map.addListener('center_changed', () => {
          try {
            marker.setPosition(map.getCenter());
          } catch {
            /* ignore */
          }
        });
      }

      // Geocoder — always available regardless of API key vintage. Used for
      // both the initial address lookup and the Enter-key search fallback.
      if (google.maps.Geocoder) {
        geocoderRef.current = new google.maps.Geocoder();
      }

      // Try to wire up classic Places Autocomplete. This class was deprecated
      // in March 2025 for new Cloud projects, so feature-detect before
      // constructing. If unavailable, the Enter-key geocode flow kicks in.
      if (
        searchInputRef.current &&
        google.maps.places &&
        typeof google.maps.places.Autocomplete === 'function'
      ) {
        try {
          const ac = new google.maps.places.Autocomplete(searchInputRef.current, {
            fields: ['geometry', 'formatted_address', 'name'],
            componentRestrictions: { country: 'in' },
          });
          ac.bindTo('bounds', map);
          ac.addListener('place_changed', () => {
            const place = ac.getPlace();
            if (!place?.geometry) return;
            if (place.geometry.viewport) map.fitBounds(place.geometry.viewport);
            else {
              map.setCenter(place.geometry.location);
              map.setZoom(DEFAULT_ZOOM);
            }
            if (markerRef.current) markerRef.current.setPosition(place.geometry.location);
            setSearchText(place.formatted_address || place.name || '');
          });
          autocompleteRef.current = ac;
          setAutocompleteAvailable(true);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[PropertyMap] Places Autocomplete unavailable, falling back to geocode:', err);
          setAutocompleteAvailable(false);
        }
      }

      // If we arrived with an initialAddress but no saved location, geocode
      // it so the map lands on the client's roof without the user typing.
      if (!roofLocation?.lat && initialAddress && geocoderRef.current) {
        geocodeAndFly(initialAddress);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[PropertyMap] map init failed:', err);
      // Rethrow so the ErrorBoundary parent shows its fallback.
      throw err;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ── Capture handler ──────────────────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    if (!mapRef.current || !mapContainerRef.current) return;
    setCapturing(true);
    setCaptureError(null);

    try {
      const map = mapRef.current;
      await waitForIdle(map);
      await new Promise((r) => setTimeout(r, 250));

      const rawCanvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: null,
        scale: window.devicePixelRatio || 1,
        ignoreElements: (el) =>
          el.classList?.contains('gm-style-cc') ||
          el.classList?.contains('gmnoprint') ||
          el.classList?.contains('gm-fullscreen-control') ||
          el.classList?.contains('gm-svpc'),
      });

      const sized = downscaleCanvas(rawCanvas);
      const dataUrl = sized.toDataURL('image/jpeg', 0.85);

      const center = map.getCenter();
      onCapture({
        snapshot: dataUrl,
        location: {
          lat: center?.lat?.() ?? null,
          lng: center?.lng?.() ?? null,
          zoom: map.getZoom(),
          formattedAddress: searchText || null,
          capturedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[PropertyMap] capture failed:', err);
      setCaptureError(
        err?.message?.includes('tainted')
          ? 'Capture blocked by browser CORS. Try a hard refresh and capture again.'
          : 'Capture failed. Please try again.'
      );
    } finally {
      setCapturing(false);
    }
  }, [onCapture, searchText]);

  // Enter-key handler for the search box — only used when Autocomplete isn't
  // available. Also harmless to have when Autocomplete IS active, since
  // pressing Enter on a suggestion is consumed by Autocomplete first.
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && !autocompleteAvailable) {
      e.preventDefault();
      geocodeAndFly(searchText);
    }
  };

  // ── Render paths ─────────────────────────────────────────────────────────

  if (!isGoogleMapsKeyConfigured) {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <strong>Google Maps API key not configured.</strong>{' '}
          Add <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> to{' '}
          <code className="font-mono">.env.local</code> and restart the dev server to enable the
          property satellite view.
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-sm">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <strong>Couldn't load Google Maps.</strong> {loadError.message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-500 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={
            ready
              ? autocompleteAvailable
                ? 'Search for the property address…'
                : 'Type address and press Enter to search…'
              : 'Loading map…'
          }
          disabled={!ready}
          className="input pl-9"
          autoComplete="off"
        />
      </div>

      {/* Map + crosshair overlay */}
      <div className="relative">
        <div
          ref={mapContainerRef}
          className="w-full h-[420px] rounded-md overflow-hidden bg-cream-100 border border-cream-200"
          style={{ backgroundImage: 'linear-gradient(45deg, #f3eee4 25%, transparent 25%)' }}
        >
          {!ready && (
            <div className="w-full h-full flex items-center justify-center text-cream-600 text-sm">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading satellite imagery…
            </div>
          )}
        </div>

        {/* Fixed crosshair — helps the user line up the exact roof */}
        {ready && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-gold-primary shadow-lg ring-2 ring-white/60" />
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCapture}
          disabled={!ready || capturing}
          className="btn-primary text-sm"
        >
          {capturing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Capturing…
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" /> {roofSnapshot ? 'Retake' : 'Capture Roof'}
            </>
          )}
        </button>

        {roofSnapshot && (
          <button type="button" onClick={onClear} className="btn-ghost text-sm text-rose-500 hover:bg-rose-50">
            <RotateCcw className="w-4 h-4" /> Clear snapshot
          </button>
        )}

        {roofLocation?.capturedAt && (
          <span className="text-xs text-cream-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Last captured {new Date(roofLocation.capturedAt).toLocaleString()}
          </span>
        )}
      </div>

      {captureError && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {captureError}
        </div>
      )}

      {/* Captured preview */}
      {roofSnapshot && (
        <div>
          <div className="text-xs uppercase tracking-wider text-cream-600 mb-2">
            Captured Snapshot (embedded in PDF)
          </div>
          <div className="rounded-xl overflow-hidden shadow-cardHover ring-1 ring-navy-dark/10">
            <img src={roofSnapshot} alt="Roof satellite view" className="w-full block" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyMap;
