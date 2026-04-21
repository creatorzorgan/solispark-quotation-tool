// Catalog of system-equipment datasheets shipped under /public/SYSTEM EQUIPMENTS.
// Each entry is a relative URL that fetch() can pull at runtime; the PDF is
// then merged into the generated proposal. Grouped so the UI can render
// categorised checkbox lists and auto-suggest attachments based on the
// panel / inverter / battery the user picked.

// Resolve against Vite's base URL so deep-linked routes (e.g. /quotations/abc)
// don't turn these into 404s. BASE_URL has a trailing slash already.
const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
const base = `${BASE}SYSTEM EQUIPMENTS`;
const enc = (s) => encodeURI(`${base}/${s}`);

export const EQUIPMENT_CATALOG = {
  Panels: [
    { label: 'Axitec 570-600 Wp',                    brand: 'Axitec',     path: enc('panels/Axitec - 570 - 600 Wp .pdf') },
    { label: 'Axitec 600 Wp AXIbiperfect',           brand: 'Axitec',     path: enc('panels/600 Wp AXIbiperfect .pdf') },
    { label: 'Axitec TOPCon',                        brand: 'Axitec',     path: enc('panels/axitech-topcon.pdf') },
    { label: 'Axitec (General)',                     brand: 'Axitec',     path: enc('panels/axitech.pdf') },
    { label: 'Adani TOPCon',                         brand: 'Adani Solar',path: enc('panels/adani TOPCon .pdf') },
    { label: 'Adani 550W Bifacial',                  brand: 'Adani Solar',path: enc('panels/adani-550-Bifacial.pdf') },
    { label: 'Adani 600 Wp',                         brand: 'Adani Solar',path: enc('panels/adani_600Wp.pdf') },
    { label: 'Waaree 515-545',                       brand: 'Waaree',     path: enc('panels/waree 515-545.pdf') },
    { label: 'Waaree 560-590',                       brand: 'Waaree',     path: enc('panels/WAAREE-560-590.pdf') },
    { label: 'Waaree 670-700',                       brand: 'Waaree',     path: enc('panels/WAREE-670-700 .pdf') },
    { label: 'Waaree HJT 700-730',                   brand: 'Waaree',     path: enc('panels/WAAREE - HJT 700-730.pdf') },
    { label: 'Waaree TOPCon',                        brand: 'Waaree',     path: enc('panels/waree topcon.pdf') },
    { label: 'Waaree ARKA 520-550 Black',            brand: 'Waaree',     path: enc('panels/ARKA-520-550-Black-module waree.pdf') },
    { label: 'Rayzon 570-590',                       brand: 'Rayzon Solar', path: enc('panels/Rayzon-Topcon-570-590.pdf') },
    { label: 'Rayzon (Details)',                     brand: 'Rayzon Solar', path: enc('panels/rayzon details.pdf') },
    { label: 'Saatvik Bifacial N-TOPCon 570-580',    brand: 'Saatvik',    path: enc('panels/Saatvik NTopcon 570-580.pdf') },
    { label: 'Saatvik Bifacial N-TOPCon 600-625',    brand: 'Saatvik',    path: enc('panels/Saatvik Bifacial NTopcon 600Wp-625Wp.pdf') },
    { label: 'Saatvik Mono-PERC',                    brand: 'Saatvik',    path: enc('panels/Saatvik-Mono-Perc-.pdf') },
    { label: 'Saatvik N-TOPCon Bifacial',            brand: 'Saatvik',    path: enc('panels/BIFACIAL-N-TOPCon saatvik.pdf') },
    { label: 'Goldi 525-560',                        brand: 'Goldi',      path: enc('panels/GOLDI-525-Wp-560-Wp.pdf') },
    { label: 'Goldi 580-600',                        brand: 'Goldi',      path: enc('panels/GOLDI-580-Wp-600-Wp.pdf') },
    { label: 'Goldi 600-625 TOPCon G12R G2G',        brand: 'Goldi',      path: enc('panels/Goldi 600wp-625wp Topcn G12R G2G Datasheet.pdf') },
    { label: 'NovaSys 500W',                         brand: 'NovaSys',    path: enc('panels/NovaSys 500 Watts.pdf') },
    { label: 'NovaSys 550W',                         brand: 'NovaSys',    path: enc('panels/NovaSys 550W.pdf') },
    { label: 'NovaSys Bifacial',                     brand: 'NovaSys',    path: enc('panels/novasys-Bifacial .pdf') },
    { label: 'NovaSys TOPCon',                       brand: 'NovaSys',    path: enc('panels/NOVA_TOPCON .pdf') },
    { label: 'Panasonic (All)',                      brand: 'Panasonic',  path: enc('panels/panasonic all.pdf') },
    { label: 'Panasonic 550 Mono-PERC',              brand: 'Panasonic',  path: enc('panels/panasonic 550 Mono-Prec.pdf') },
    { label: 'Panasonic TOPCon',                     brand: 'Panasonic',  path: enc('panels/panasonic topcon.pdf') },
    { label: 'Panasonic (General)',                  brand: 'Panasonic',  path: enc('panels/panasonic .pdf') },
    { label: 'Panasonic TOPCon (Pana)',              brand: 'Panasonic',  path: enc('panels/pana topcon.pdf') },
    { label: 'RenewSys TOPCon',                      brand: 'RenewSys',   path: enc('panels/TOPCon RenewSys .pdf') },
    { label: 'RenewSys TOPCon 615-650',              brand: 'RenewSys',   path: enc('panels/TOPCon RenewSys 615-650.pdf') },
    { label: 'Havells TOPCon',                       brand: 'Havells',    path: enc('panels/Havells Solar Topcon Panel.pdf') },
    { label: 'Vikram Solar',                         brand: 'Vikram',     path: enc('panels/VIKRAM.pdf') },
    { label: 'Credence 710-730W TOPCon',             brand: 'Credence',   path: enc('panels/710-730W Topcon credence.pdf') },
  ],

  Inverters: [
    // Deye
    { label: 'Deye 1-Phase',                         brand: 'Deye',       path: enc('Inverters/DEYE/deye - 1 phase .pdf') },
    { label: 'Deye 3-12 Hybrid',                     brand: 'Deye',       path: enc('Inverters/DEYE/Deye 3-12 Hybrid Inverter .pdf') },
    { label: 'Deye 3-15 kW',                         brand: 'Deye',       path: enc('Inverters/DEYE/deye 3-15 kW .pdf') },
    { label: 'Deye 18-25 kW',                        brand: 'Deye',       path: enc('Inverters/DEYE/Deye-18-25k .pdf') },
    { label: 'Deye 30-36 kW',                        brand: 'Deye',       path: enc('Inverters/DEYE/deye-30-36.pdf') },
    { label: 'Deye 40-50 kW',                        brand: 'Deye',       path: enc('Inverters/DEYE/deye-40-50k-.pdf') },
    { label: 'Deye 60-75 kW',                        brand: 'Deye',       path: enc('Inverters/DEYE/Deye-sun-60-75k.pdf') },
    { label: 'Deye 60-80 kW',                        brand: 'Deye',       path: enc('Inverters/DEYE/deye_sun-60-80k.pdf') },
    { label: 'Deye 70-110 kW',                       brand: 'Deye',       path: enc('Inverters/DEYE/70-110 .pdf') },
    { label: 'Deye 120-136 kW',                      brand: 'Deye',       path: enc('Inverters/DEYE/daye-120-136.pdf') },
    { label: 'Deye Hybrid',                          brand: 'Deye',       path: enc('Inverters/DEYE/deye-Hybrid.pdf') },
    // Solis
    { label: 'Solis 5-20 kW',                        brand: 'Solis',      path: enc('Inverters/SOLIS/solis 5-20k.pdf') },
    { label: 'Solis 15 kW',                          brand: 'Solis',      path: enc('Inverters/SOLIS/Solis_15kw.pdf') },
    { label: 'Solis 20 kW',                          brand: 'Solis',      path: enc('Inverters/SOLIS/20kw Solis.pdf') },
    { label: 'Solis 25-60 kW',                       brand: 'Solis',      path: enc('Inverters/SOLIS/Solis-25 to 60.pdf') },
    { label: 'Solis 75 kW',                          brand: 'Solis',      path: enc('Inverters/SOLIS/75kw inverter .pdf') },
    { label: 'Solis 225-255 kW',                     brand: 'Solis',      path: enc('Inverters/SOLIS/Solis 225-255 .pdf') },
    { label: 'Solis 250 kW',                         brand: 'Solis',      path: enc('Inverters/SOLIS/250 SOLIS.pdf') },
    { label: 'Solis 350 kW',                         brand: 'Solis',      path: enc('Inverters/SOLIS/350 SOLIS.pdf') },
    // Sungrow
    { label: 'Sungrow SG320HX',                      brand: 'Sungrow',    path: enc('Inverters/SUNGROW/SG320HX.pdf') },
    { label: 'Sungrow 350 kW',                       brand: 'Sungrow',    path: enc('Inverters/SUNGROW/sungrow 350 kw.pdf') },
    // Feston
    { label: 'Feston 5 kW',                          brand: 'Feston',     path: enc('Inverters/FESTON/Feston - 5kw.pdf') },
    { label: 'Feston 4-12 kW',                       brand: 'Feston',     path: enc('Inverters/FESTON/feston 4 to12.pdf') },
    { label: 'Feston 20 kW',                         brand: 'Feston',     path: enc('Inverters/FESTON/20kw feston.pdf') },
    { label: 'Feston On-grid',                       brand: 'Feston',     path: enc('Inverters/FESTON/Datasheet - Ongrid Inverter.pdf') },
    // Others
    { label: 'SolarEdge SE66.6K-SE120K (3-Phase)',   brand: 'SolarEdge',  path: enc('SE66.6K-SE120K Three Phase Inverter .pdf') },
    { label: 'SolarEdge (General)',                  brand: 'SolarEdge',  path: enc('Inverters/solar edge inverter.pdf') },
    { label: 'SolarEdge Power Optimizer',            brand: 'SolarEdge',  path: enc('Inverters/power-optimizer.pdf') },
    { label: 'SolarEdge S1400 Optimizer',            brand: 'SolarEdge',  path: enc('se-s1400-optimizer.pdf') },
    { label: 'Enphase IQ8P Microinverter',           brand: 'Enphase',    path: enc('Inverters/IQ8P Microinverter.pdf') },
    { label: 'Power One',                            brand: 'PowerOne',   path: enc('power one .pdf') },
  ],

  Battery: [
    { label: 'Battery 5.3 kWh',                      brand: 'Generic',    path: enc('Battery/battery 5.3kwh.pdf') },
    { label: 'Battery 10 kWh',                       brand: 'Generic',    path: enc('Battery/10 kwh battery.pdf') },
    { label: 'Battery (General)',                    brand: 'Generic',    path: enc('Battery/battery.pdf') },
    { label: 'Deye Battery 6.1-V',                   brand: 'Deye',       path: enc('Battery/Deye - 6.1-V.pdf') },
    { label: 'Deye Battery 12 kWh',                  brand: 'Deye',       path: enc('Battery/Deye - 12kwh.pdf') },
    { label: 'Exide Battery',                        brand: 'Exide',      path: enc('Battery/excide battery.pdf') },
    { label: 'PowerBuild Battery',                   brand: 'PowerBuild', path: enc('Battery/power build - battery.pdf') },
  ],

  Cable: [
    { label: 'Solar DC / AC Cable',                  brand: 'Generic',    path: enc('CABLE.pdf') },
  ],

  'Solar Pump & Water': [
    { label: 'Solar Pump Panel 335W',                brand: 'Generic',    path: enc('SOLAR PUMP/PANEL -335W.pdf') },
    { label: 'Solar Pump Controller',                brand: 'Generic',    path: enc('SOLAR PUMP/SOLAR PUMP CONTROLLER .pdf') },
    { label: 'Grundfos Pressure Pump',               brand: 'Grundfos',   path: enc('Grundfos - Pressure Pump.pdf') },
    { label: 'V-Guard Heat Pump',                    brand: 'V-Guard',    path: enc('V Guard_Heat_Pump_Leaflet.pdf') },
    { label: 'ZeroB Water Softener AS3 3000LPH',     brand: 'ZeroB',      path: enc('ZeroB Water Softener AS3 3000LPH.pdf') },
  ],

  'BIS & Certificates': [
    { label: 'BIS — Deye 3-12 kW (Hybrid)',          brand: 'Deye',       path: enc('Inverters/BIS-Reg No/Hybrid BIS - 3KW -12KW.pdf') },
    { label: 'BIS — Deye 1.5-15 kW (String)',        brand: 'Deye',       path: enc('Inverters/BIS-Reg No/String Inverter _ BIS _ Deye _ 1.5K to 15K.pdf') },
    { label: 'BIS — Deye 30-60 kW (String)',         brand: 'Deye',       path: enc('Inverters/BIS-Reg No/String Inverter _ BIS _ Deye _ 30K to 60K.pdf') },
    { label: 'BIS — Deye 70-110 kW',                 brand: 'Deye',       path: enc('Inverters/BIS-Reg No/BIS _ Deye _ 70K to 110K.pdf') },
    { label: 'BIS — Deye 120-136 kW',                brand: 'Deye',       path: enc('Inverters/BIS-Reg No/BIS (120Kw - 136Kw).pdf') },
    { label: 'BIS — Deye (General)',                 brand: 'Deye',       path: enc('Inverters/BIS-Reg No/Bureau Of Indian Standards(35) deye(1).PDF') },
    { label: 'BIS — FOX-S',                          brand: 'Fox',        path: enc('Inverters/BIS-Reg No/FOX BIS-S.pdf') },
    { label: 'BIS — String SUN 18-25 kW',            brand: 'Deye',       path: enc('Inverters/BIS-Reg No/String Inverter BIS SUN-18kW-25kW-G05-BIS.pdf') },
    { label: 'Certificates — All (Merged)',          brand: 'Solispark',  path: enc('Certificates/All Certificates_merge.pdf') },
    { label: 'IEC 60068-3',                          brand: 'Solispark',  path: enc('Certificates/certificate_iec60068-3.pdf') },
    { label: 'IEC 61683-4',                          brand: 'Solispark',  path: enc('Certificates/certificate_iec61683-4.pdf') },
    { label: 'IEC 61727-4',                          brand: 'Solispark',  path: enc('Certificates/certificate_iec61727-4.pdf') },
    { label: 'IEC 62116-4',                          brand: 'Solispark',  path: enc('Certificates/certificate_iec62116-4.pdf') },
    { label: 'TUV Mark EN 62109-1',                  brand: 'Solispark',  path: enc('Certificates/certificate_tuvmark+en62109-1.pdf') },
    { label: '29.9-50 kW HV Inverter',               brand: 'Solispark',  path: enc('Certificates/29.9kW-50kW_HV Inverter.pdf') },
    { label: 'EU Declaration SUN 29.9-50 kW',        brand: 'Solispark',  path: enc('Certificates/eudeclaration-sun-29.9-50k-sg01hp3-eu-bm4+231009001.pdf') },
    { label: 'R-41179760',                           brand: 'Solispark',  path: enc('Certificates/R-41179760.pdf') },
  ],

  Warranty: [
    { label: 'Saatvik Module Warranty',              brand: 'Saatvik',    path: enc('Warranty/Saatvik_Solar_Module_Warranty_PV_Products.pdf') },
    { label: 'Deye Warranty Service Policy V4',      brand: 'Deye',       path: enc('Warranty/Warranty Service Policy-DEYE_V4.pdf') },
    { label: 'Adani Panel Warranty Certificate',     brand: 'Adani Solar',path: enc('user manual files/Warranty_Certificate_Adani_Solar_Panels.pdf') },
    { label: 'Deye Warranty Certificate',            brand: 'Deye',       path: enc('user manual files/deye- warranty certificate.pdf') },
  ],
};

// Flatten into a lookup { path -> { label, category, brand } } for the UI.
export const EQUIPMENT_INDEX = Object.entries(EQUIPMENT_CATALOG).reduce(
  (acc, [category, items]) => {
    items.forEach((it) => {
      acc[it.path] = { ...it, category };
    });
    return acc;
  },
  {}
);

// Suggest an initial set of datasheets based on the selected panel/inverter/battery.
// Tries to match on brand and size — imperfect but saves a lot of clicks for the
// common case. Users can toggle anything on/off afterwards.
export const suggestAttachments = ({ panel, inverter, batteryOption, systemSizeKw }) => {
  const picked = new Set();

  // Panel: prefer exact wattage match, fallback to brand
  if (panel?.brand) {
    const brandMatches = EQUIPMENT_CATALOG.Panels.filter((p) => p.brand === panel.brand);
    // Try matching on wattage in the label
    const exact = brandMatches.find((p) => p.label.toLowerCase().includes(String(panel.wattage || '')));
    if (exact) picked.add(exact.path);
    else if (brandMatches[0]) picked.add(brandMatches[0].path);
  }

  // Inverter: prefer a datasheet whose label covers the system size
  if (inverter?.brand) {
    const brandMatches = EQUIPMENT_CATALOG.Inverters.filter((i) => i.brand === inverter.brand);
    const size = systemSizeKw || inverter.capacity_kw || 0;
    // Parse "X-Y kW" ranges from labels
    const covering = brandMatches.find((i) => {
      const m = i.label.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*kW/i);
      if (m) return size >= +m[1] && size <= +m[2];
      const single = i.label.match(/(\d+(?:\.\d+)?)\s*kW/i);
      if (single) return Math.abs(+single[1] - size) < 2;
      return false;
    });
    if (covering) picked.add(covering.path);
    else if (brandMatches[0]) picked.add(brandMatches[0].path);
  }

  // Battery: match on brand prefix of the option label (e.g. "Deye 5.3kWh")
  if (batteryOption && batteryOption !== 'None') {
    const brandFromOption = batteryOption.split(' ')[0]; // "Deye", "PowerOne"
    const match = EQUIPMENT_CATALOG.Battery.find((b) =>
      (b.brand || '').toLowerCase().startsWith(brandFromOption.toLowerCase())
    );
    if (match) picked.add(match.path);
  }

  return Array.from(picked);
};
