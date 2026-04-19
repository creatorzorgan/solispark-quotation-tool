// Default company & pricing config — mirrors solispark_config.json.
// Lives in the repo so the app works offline and can be restored from Settings.

export const DEFAULT_CONFIG = {
  company: {
    name: 'Solispark Energy Pvt. Ltd.',
    tagline: 'We Build Energy Empires.',
    website: 'solisparkenergy.com',
    email: 'solisparkenergy@gmail.com',
    phone_1: '+91 98868 86122',
    phone_2: '+91 77603 75599',
    address: {
      line_1: '#244, F Block, 15th Main Road',
      line_2: 'Sahakarnagar, Bengaluru - 92',
      state: 'Karnataka',
      country: 'India',
    },
    gstin: 'PLACEHOLDER_GSTIN',
    founders: [
      { name: 'Ranveer Dorai', title: 'Director of Engineering' },
      { name: 'Pruthvik Hariprasad', title: 'Director of Strategy' },
    ],
    certifications: [
      'MNRE Approved Vendor',
      'DPIIT Recognized (Startup India)',
      'Official Axitec Distribution Partner',
      '30-Year Panel Replacement Warranty',
    ],
    stats: {
      projects_completed: '25+',
      deployed_capacity_mw: '10+',
      industrial_partners: '50+',
      google_rating: '5.0',
      service_sla_hours: 48,
      axitec_warranty_years: 30,
    },
  },
  pricing_defaults: {
    panels: {
      axitec_545w: {
        key: 'axitec_545w',
        label: 'Axitec 545W',
        brand: 'Axitec',
        model: 'AXIpremium XXL HC',
        wattage: 545,
        price_per_panel: 15500,
        warranty_years: 30,
        country: 'Germany',
      },
      axitec_590w: {
        key: 'axitec_590w',
        label: 'Axitec 590Wp',
        brand: 'Axitec',
        model: 'AXIbiperfect GL',
        wattage: 590,
        price_per_panel: 17000,
        warranty_years: 30,
        country: 'Germany',
      },
      axitec_600w: {
        key: 'axitec_600w',
        label: 'Axitec 600Wp',
        brand: 'Axitec',
        model: 'AXIbiperfect GL 600',
        wattage: 600,
        price_per_panel: 18500,
        warranty_years: 30,
        country: 'Germany',
      },
      adani_545w: {
        key: 'adani_545w',
        label: 'Adani 545W',
        brand: 'Adani Solar',
        model: 'ASP-7-545',
        wattage: 545,
        price_per_panel: 14500,
        warranty_years: 25,
        country: 'India',
      },
      adani_600w: {
        key: 'adani_600w',
        label: 'Adani 600Wp',
        brand: 'Adani Solar',
        model: 'ASP-7-600',
        wattage: 600,
        price_per_panel: 16500,
        warranty_years: 25,
        country: 'India',
      },
      panasonic_540w: {
        key: 'panasonic_540w',
        label: 'Panasonic 540W',
        brand: 'Panasonic',
        model: 'VBHN540 Mono-PERC',
        wattage: 540,
        price_per_panel: 15000,
        warranty_years: 25,
        country: 'Japan',
      },
      waaree_540w: {
        key: 'waaree_540w',
        label: 'Waaree 540W',
        brand: 'Waaree',
        model: 'WS-540',
        wattage: 540,
        price_per_panel: 14000,
        warranty_years: 25,
        country: 'India',
      },
      rayzon_550w: {
        key: 'rayzon_550w',
        label: 'Rayzon 550W',
        brand: 'Rayzon Solar',
        model: 'RZ-550',
        wattage: 550,
        price_per_panel: 13500,
        warranty_years: 25,
        country: 'India',
      },
    },
    inverters: {
      solis_5kw: { key: 'solis_5kw', label: 'Solis 5kW', brand: 'Solis', capacity_kw: 5, price: 45000, warranty_years: 10 },
      solis_10kw: { key: 'solis_10kw', label: 'Solis 10kW', brand: 'Solis', capacity_kw: 10, price: 85000, warranty_years: 10 },
      solis_110kw: { key: 'solis_110kw', label: 'Solis 110kW', brand: 'Solis', capacity_kw: 110, price: 850000, warranty_years: 10 },
      sungrow_5kw: { key: 'sungrow_5kw', label: 'Sungrow 5kW', brand: 'Sungrow', capacity_kw: 5, price: 48000, warranty_years: 10 },
      sungrow_10kw: { key: 'sungrow_10kw', label: 'Sungrow 10kW', brand: 'Sungrow', capacity_kw: 10, price: 90000, warranty_years: 10 },
      sungrow_110kw: { key: 'sungrow_110kw', label: 'Sungrow 110kW', brand: 'Sungrow', capacity_kw: 110, price: 920000, warranty_years: 10 },
      deye_3kw:  { key: 'deye_3kw',  label: 'Deye 3kW',  brand: 'Deye', capacity_kw: 3,  price: 32000,  warranty_years: 10 },
      deye_5kw:  { key: 'deye_5kw',  label: 'Deye 5kW',  brand: 'Deye', capacity_kw: 5,  price: 52000,  warranty_years: 10 },
      deye_8kw:  { key: 'deye_8kw',  label: 'Deye 8kW',  brand: 'Deye', capacity_kw: 8,  price: 75000,  warranty_years: 10 },
      deye_10kw: { key: 'deye_10kw', label: 'Deye 10kW', brand: 'Deye', capacity_kw: 10, price: 92000,  warranty_years: 10 },
      deye_15kw: { key: 'deye_15kw', label: 'Deye 15kW', brand: 'Deye', capacity_kw: 15, price: 135000, warranty_years: 10 },
      deye_20kw: { key: 'deye_20kw', label: 'Deye 20kW', brand: 'Deye', capacity_kw: 20, price: 170000, warranty_years: 10 },
      deye_25kw: { key: 'deye_25kw', label: 'Deye 25kW', brand: 'Deye', capacity_kw: 25, price: 200000, warranty_years: 10 },
      deye_30kw: { key: 'deye_30kw', label: 'Deye 30kW', brand: 'Deye', capacity_kw: 30, price: 240000, warranty_years: 10 },
      deye_50kw: { key: 'deye_50kw', label: 'Deye 50kW', brand: 'Deye', capacity_kw: 50, price: 380000, warranty_years: 10 },
      deye_80kw: { key: 'deye_80kw', label: 'Deye 80kW', brand: 'Deye', capacity_kw: 80, price: 620000, warranty_years: 10 },
    },
    other_costs_per_kw: {
      mounting_structure: 8000,
      electrical_wiring: 5000,
      installation_labor: 4000,
    },
    flat_costs: {
      net_metering_fees: 10000,
      transportation: 5000,
    },
    tax: {
      gst_rate_percent: 8.9,
    },
    government_subsidy: {
      residential_up_to_3kw: 14588,
      residential_3kw_to_10kw_per_kw: 7294,
      max_subsidy_amount: 78000,
      note: 'PM Surya Ghar Muft Bijli Yojana rates',
    },
  },
  payment_terms: {
    advance_percent: 30,
    before_dispatch_percent: 65,
    post_installation_percent: 5,
    proposal_validity_days: 15,
  },
  calculation_constants: {
    peak_sun_hours: 4,
    annual_tariff_escalation_percent: 5,
    system_degradation_per_year_percent: 0.5,
    co2_offset_kg_per_kwh: 0.82,
    sqft_per_kw_rooftop: 100,
    days_per_month: 30,
  },
  electricity_providers: {
    bescom: { key: 'bescom', name: 'BESCOM', rate: 7.5 },
    hescom: { key: 'hescom', name: 'HESCOM', rate: 7.0 },
    gescom: { key: 'gescom', name: 'GESCOM', rate: 6.8 },
    cesc: { key: 'cesc', name: 'CESC', rate: 7.2 },
    mescom: { key: 'mescom', name: 'MESCOM', rate: 7.0 },
    other: { key: 'other', name: 'Other', rate: 7.0 },
  },
  terms_and_conditions: [
    'This proposal is valid for 15 days from the date of issue.',
    'Prices are subject to change based on market conditions after the validity period.',
    '30% advance payment is required to confirm the order.',
    '65% payment is due before material dispatch to site.',
    '5% balance payment is due upon successful commissioning.',
    'Installation timeline: 7-14 days for residential, 30-60 days for commercial/industrial.',
    'Net metering application will be filed by Solispark within 7 days of commissioning.',
    'Annual Maintenance Contract (AMC) available at additional cost after warranty period.',
    '48-hour service response SLA included for the first year.',
    'All panels come with manufacturer warranty as specified in the system specifications.',
    'Structural warranty on mounting: 10 years.',
    'Inverter warranty: As per manufacturer terms (typically 5-10 years).',
    'Any additional civil work required on the roof is not included in this proposal.',
    'Pricing assumes standard installation conditions. Complex roofs may require additional charges.',
  ],
};

export const PROPERTY_TYPES = [
  'Independent House',
  'Villa',
  'Apartment (Own Terrace)',
  'Housing Society',
  'Factory/Manufacturing',
  'Cold Storage',
  'Commercial Building',
  'Banquet Hall',
  'Other',
];

export const CLIENT_CATEGORIES = ['Residential', 'Commercial', 'Industrial'];

export const ROOF_TYPES = [
  'RCC Flat Roof',
  'Metal Sheet',
  'Tiled',
  'Mixed',
  'Ground Mount',
];

export const SHADING_OPTIONS = [
  'No Shading',
  'Partial Shading (Morning)',
  'Partial Shading (Afternoon)',
  'Significant Shading',
];

export const MOUNTING_OPTIONS = [
  'Standard Elevated',
  'Short Rail',
  'Custom Fabricated Structure',
  'Ground Mount',
];

export const BATTERY_OPTIONS = ['None', 'Deye 5.3kWh', 'PowerOne 5.3kWh', 'Custom'];

export const STATUS_OPTIONS = ['Draft', 'Sent', 'Accepted', 'Expired'];
