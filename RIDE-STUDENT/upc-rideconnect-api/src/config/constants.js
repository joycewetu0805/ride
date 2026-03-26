const NEIGHBORHOODS = [
  { name: 'Lingwala',           latitude: -4.3167, longitude: 15.3000, zoneGroup: 'centre' },
  { name: 'Barumbu',            latitude: -4.3200, longitude: 15.3100, zoneGroup: 'centre' },
  { name: 'Kinshasa (commune)', latitude: -4.3250, longitude: 15.3150, zoneGroup: 'centre' },
  { name: 'Gombe',              latitude: -4.3100, longitude: 15.2900, zoneGroup: 'ouest' },
  { name: 'Ngaliema',           latitude: -4.3250, longitude: 15.2500, zoneGroup: 'ouest' },
  { name: 'Kalamu',             latitude: -4.3350, longitude: 15.3150, zoneGroup: 'centre-sud' },
  { name: 'Lemba',              latitude: -4.3500, longitude: 15.3300, zoneGroup: 'sud' },
  { name: 'Limete',             latitude: -4.3400, longitude: 15.3350, zoneGroup: 'est' },
  { name: 'Makala',             latitude: -4.3600, longitude: 15.3000, zoneGroup: 'sud' },
  { name: 'Ndjili',             latitude: -4.3750, longitude: 15.3700, zoneGroup: 'est-lointain' },
  { name: 'Masina',             latitude: -4.3600, longitude: 15.3800, zoneGroup: 'est-lointain' },
  { name: 'Kimbanseke',         latitude: -4.3900, longitude: 15.3500, zoneGroup: 'est-lointain' },
];

// Campus UPC coordinates
const CAMPUS_UPC = { latitude: -4.3222, longitude: 15.3125 };

// Payment split
const DRIVER_SHARE = 0.70;
const PLATFORM_FEE = 0.30;

// Bayesian reputation parameters
const REPUTATION_C = 3;     // minimum ratings threshold
const REPUTATION_M = 3.5;   // global mean rating

module.exports = {
  NEIGHBORHOODS,
  CAMPUS_UPC,
  DRIVER_SHARE,
  PLATFORM_FEE,
  REPUTATION_C,
  REPUTATION_M,
};
