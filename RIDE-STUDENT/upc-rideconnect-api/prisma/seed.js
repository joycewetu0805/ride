require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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

const MEETING_POINTS = [
  { neighborhood: 'Lingwala',  points: [
    { name: 'Rond-point Victoire', type: 'rond-point', lat: -4.3180, lon: 15.3010, description: 'Rond-point principal de Lingwala' },
    { name: 'Arret bus Lingwala', type: 'arret-bus', lat: -4.3175, lon: 15.2990, description: 'Arret de bus Avenue du Commerce' },
  ]},
  { neighborhood: 'Barumbu',  points: [
    { name: 'Avenue Kasa-Vubu', type: 'intersection', lat: -4.3210, lon: 15.3105, description: 'Croisement Avenue Kasa-Vubu' },
    { name: 'Marche de Barumbu', type: 'marche', lat: -4.3195, lon: 15.3115, description: 'Entree du marche' },
  ]},
  { neighborhood: 'Gombe',  points: [
    { name: 'Boulevard du 30 Juin', type: 'intersection', lat: -4.3110, lon: 15.2910, description: 'Boulevard principal' },
    { name: 'Place de la Gare', type: 'rond-point', lat: -4.3095, lon: 15.2895, description: 'Devant la gare centrale' },
  ]},
  { neighborhood: 'Ngaliema',  points: [
    { name: 'Rond-point Ngaba', type: 'rond-point', lat: -4.3260, lon: 15.2510, description: 'Grand rond-point de Ngaliema' },
    { name: 'Arret Kintambo', type: 'arret-bus', lat: -4.3240, lon: 15.2520, description: 'Arret bus Kintambo Magasin' },
    { name: 'Carrefour Ma Campagne', type: 'intersection', lat: -4.3270, lon: 15.2490, description: 'Carrefour populaire' },
  ]},
  { neighborhood: 'Kalamu',  points: [
    { name: 'Rond-point Kalamu', type: 'rond-point', lat: -4.3360, lon: 15.3160, description: 'Centre de Kalamu' },
    { name: 'Avenue Tombalbaye', type: 'intersection', lat: -4.3345, lon: 15.3140, description: 'Croisement Tombalbaye' },
  ]},
  { neighborhood: 'Lemba',  points: [
    { name: 'Croisement Tshopo', type: 'intersection', lat: -4.3510, lon: 15.3310, description: 'Carrefour Tshopo-Lemba' },
    { name: 'Campus UNIKIN', type: 'arret-bus', lat: -4.3520, lon: 15.3290, description: 'Devant UNIKIN' },
  ]},
  { neighborhood: 'Limete',  points: [
    { name: 'Echangeur de Limete', type: 'rond-point', lat: -4.3410, lon: 15.3360, description: 'Echangeur principal' },
  ]},
  { neighborhood: 'Makala',  points: [
    { name: 'Carrefour Makala', type: 'intersection', lat: -4.3610, lon: 15.3010, description: 'Centre de Makala' },
  ]},
  { neighborhood: 'Ndjili',  points: [
    { name: 'Aeroport de Ndjili', type: 'arret-bus', lat: -4.3760, lon: 15.3710, description: 'Entree aeroport' },
  ]},
  { neighborhood: 'Masina',  points: [
    { name: 'Rond-point Masina', type: 'rond-point', lat: -4.3610, lon: 15.3810, description: 'Centre de Masina' },
  ]},
  { neighborhood: 'Kimbanseke',  points: [
    { name: 'Marche Kimbanseke', type: 'marche', lat: -4.3910, lon: 15.3510, description: 'Grand marche' },
  ]},
  { neighborhood: 'Kinshasa (commune)',  points: [
    { name: 'Place Victoire', type: 'rond-point', lat: -4.3255, lon: 15.3155, description: 'Place historique' },
  ]},
];

// Adjacency data (neighborhoods that are close to each other)
const ADJACENCIES = [
  ['Lingwala', 'Barumbu', 1.2],
  ['Lingwala', 'Kinshasa (commune)', 1.5],
  ['Lingwala', 'Gombe', 2.0],
  ['Barumbu', 'Kinshasa (commune)', 0.8],
  ['Barumbu', 'Kalamu', 2.5],
  ['Gombe', 'Ngaliema', 3.5],
  ['Gombe', 'Lingwala', 2.0],
  ['Kalamu', 'Lemba', 2.8],
  ['Kalamu', 'Limete', 3.0],
  ['Kalamu', 'Kinshasa (commune)', 1.8],
  ['Lemba', 'Makala', 2.5],
  ['Lemba', 'Limete', 2.2],
  ['Limete', 'Masina', 4.5],
  ['Ndjili', 'Masina', 3.0],
  ['Ndjili', 'Kimbanseke', 4.0],
  ['Masina', 'Kimbanseke', 3.5],
  ['Makala', 'Kalamu', 3.0],
];

async function main() {
  console.log('Seeding database...');

  // Seed neighborhoods
  for (const hood of NEIGHBORHOODS) {
    await prisma.neighborhood.upsert({
      where: { name: hood.name },
      update: hood,
      create: hood
    });
  }
  console.log('  12 neighborhoods seeded');

  // Seed meeting points
  for (const group of MEETING_POINTS) {
    const hood = await prisma.neighborhood.findUnique({ where: { name: group.neighborhood } });
    if (!hood) continue;
    for (const pt of group.points) {
      const existing = await prisma.meetingPoint.findFirst({
        where: { name: pt.name, neighborhoodId: hood.id }
      });
      if (!existing) {
        await prisma.meetingPoint.create({
          data: {
            neighborhoodId: hood.id,
            name: pt.name,
            type: pt.type,
            latitude: pt.lat,
            longitude: pt.lon,
            description: pt.description
          }
        });
      }
    }
  }
  console.log('  Meeting points seeded');

  // Seed adjacency
  for (const [from, to, dist] of ADJACENCIES) {
    const hoodFrom = await prisma.neighborhood.findUnique({ where: { name: from } });
    const hoodTo = await prisma.neighborhood.findUnique({ where: { name: to } });
    if (!hoodFrom || !hoodTo) continue;

    await prisma.neighborhoodAdjacency.upsert({
      where: { neighborhoodId_adjacentId: { neighborhoodId: hoodFrom.id, adjacentId: hoodTo.id } },
      update: { distanceKm: dist },
      create: { neighborhoodId: hoodFrom.id, adjacentId: hoodTo.id, distanceKm: dist }
    });
    // Reverse direction
    await prisma.neighborhoodAdjacency.upsert({
      where: { neighborhoodId_adjacentId: { neighborhoodId: hoodTo.id, adjacentId: hoodFrom.id } },
      update: { distanceKm: dist },
      create: { neighborhoodId: hoodTo.id, adjacentId: hoodFrom.id, distanceKm: dist }
    });
  }
  console.log('  Adjacency data seeded');

  // Create demo user
  const passwordHash = await bcrypt.hash('demo123', 12);
  await prisma.user.upsert({
    where: { email: 'etudiant@upc.ac.cd' },
    update: {},
    create: {
      firstName: 'Jean-Paul',
      lastName: 'Kabongo',
      email: 'etudiant@upc.ac.cd',
      studentCard: 'UPC-2024-0847',
      phone: '+243 81 111 1111',
      role: 'both',
      passwordHash,
      reputation: 4.8,
      totalTrips: 12,
      isVerified: true
    }
  });
  console.log('  Demo user created (etudiant@upc.ac.cd / demo123)');

  // Create demo trips
  const demoUser = await prisma.user.findUnique({ where: { email: 'etudiant@upc.ac.cd' } });
  const hoods = await prisma.neighborhood.findMany();

  const demoTrips = [
    { from: 'Lingwala', time: '07:30', seats: 3, price: 2500, waypoints: 'Rond-point Victoire' },
    { from: 'Barumbu', time: '08:00', seats: 2, price: 2000, waypoints: 'Avenue Kasa-Vubu' },
    { from: 'Ngaliema', time: '07:00', seats: 4, price: 3000, waypoints: 'Rond-point Ngaba' },
    { from: 'Lemba', time: '08:30', seats: 3, price: 2200, waypoints: 'Croisement Tshopo' },
    { from: 'Kalamu', time: '07:45', seats: 1, price: 1800, waypoints: 'Rond-point Victoire' },
    { from: 'Gombe', time: '09:00', seats: 3, price: 2800, waypoints: 'Place de la Gare' },
  ];

  for (const t of demoTrips) {
    const hood = hoods.find(h => h.name === t.from);
    if (!hood) continue;

    const [h, m] = t.time.split(':');
    const depTime = new Date();
    depTime.setHours(parseInt(h), parseInt(m), 0, 0);
    if (depTime < new Date()) depTime.setDate(depTime.getDate() + 1);

    const existing = await prisma.trip.findFirst({
      where: { driverId: demoUser.id, neighborhoodId: hood.id, priceFc: t.price }
    });
    if (!existing) {
      await prisma.trip.create({
        data: {
          driverId: demoUser.id,
          neighborhoodId: hood.id,
          departureTime: depTime,
          totalSeats: t.seats,
          availableSeats: t.seats,
          priceFc: t.price,
          waypointsText: t.waypoints,
          status: 'active'
        }
      });
    }
  }
  console.log('  6 demo trips created');

  console.log('Seeding complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
