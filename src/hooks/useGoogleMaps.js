// useGoogleMaps — lazily injects the Google Maps JS API exactly once and
// reports readiness. Multiple components can call this hook; the <script>
// tag is only added on the first call. Subsequent calls resolve as soon as
// the single shared `window.google.maps` namespace is ready.
//
// We explicitly include the `places` library so autocomplete search works
// out of the box. `loading=async` is the modern recommended attribute per
// Google's 2024 guidance — it silences the "loaded synchronously" warning
// and lets the browser defer execution until idle.

import { useEffect, useState } from 'react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Module-level singleton promise so concurrent hook calls share one load.
let loadPromise = null;

const loadGoogleMaps = () => {
  if (loadPromise) return loadPromise;

  // Already on the page (e.g. hot reload in dev)?
  if (typeof window !== 'undefined' && window.google?.maps) {
    loadPromise = Promise.resolve(window.google);
    return loadPromise;
  }

  if (!API_KEY) {
    loadPromise = Promise.reject(
      new Error(
        'VITE_GOOGLE_MAPS_API_KEY is not set. Add it to .env.local and restart the dev server.'
      )
    );
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const params = new URLSearchParams({
      key: API_KEY,
      libraries: 'places',
      v: 'weekly',
      loading: 'async',
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps) resolve(window.google);
      else reject(new Error('Google Maps script loaded but window.google.maps is missing'));
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });

  return loadPromise;
};

export const useGoogleMaps = () => {
  const [state, setState] = useState(() => ({
    ready: Boolean(typeof window !== 'undefined' && window.google?.maps),
    error: null,
  }));

  useEffect(() => {
    if (state.ready) return;
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) setState({ ready: true, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ ready: false, error: err });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
};

export const isGoogleMapsKeyConfigured = Boolean(API_KEY);
