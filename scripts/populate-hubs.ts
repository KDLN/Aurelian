import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateHubs() {
  console.log('🏛️ Populating hubs and trade routes...');

  try {
    // Hub definitions with their trade connections
    const hubsData = [
      // Major Trading Centers
      { key: 'capital_city', name: 'Capital City', x: 500, y: 500, safe: true },
      { key: 'trading_post', name: 'Trading Post', x: 450, y: 480, safe: true },
      { key: 'industrial_district', name: 'Industrial District', x: 520, y: 520, safe: true },
      { key: 'harbor_town', name: 'Harbor Town', x: 600, y: 400, safe: true },

      // Regional Hubs
      { key: 'frontier_town', name: 'Frontier Town', x: 300, y: 600, safe: true },
      { key: 'market_square', name: 'Market Square', x: 400, y: 450, safe: true },
      { key: 'fortress_gate', name: 'Fortress Gate', x: 200, y: 700, safe: true },
      { key: 'scholars_tower', name: 'Scholar\'s Tower', x: 350, y: 300, safe: true },

      // Minor Settlements
      { key: 'village_clinic', name: 'Village Clinic', x: 480, y: 420, safe: true },
      { key: 'farming_hamlet', name: 'Farming Hamlet', x: 550, y: 450, safe: true },
      { key: 'forest_outpost', name: 'Forest Outpost', x: 300, y: 350, safe: false },
      { key: 'mining_camp', name: 'Mining Camp', x: 250, y: 650, safe: false },
      { key: 'tribal_grounds', name: 'Tribal Grounds', x: 400, y: 300, safe: false },
      { key: 'remote_settlement', name: 'Remote Settlement', x: 150, y: 750, safe: false },

      // Special Locations
      { key: 'ancient_ruins', name: 'Ancient Ruins', x: 200, y: 200, safe: false },
      { key: 'treasure_island', name: 'Treasure Island', x: 800, y: 300, safe: false },
      { key: 'mystic_portal', name: 'Mystic Portal', x: 100, y: 400, safe: false },
      { key: 'hidden_cove', name: 'Hidden Cove', x: 50, y: 100, safe: false },
    ];

    // Clear existing hubs and insert fresh ones
    await prisma.hub.deleteMany({});
    console.log('🗑️ Cleared existing hubs');

    // Insert hubs
    const createdHubs: { [key: string]: string } = {};
    for (const hub of hubsData) {
      const created = await prisma.hub.create({
        data: hub
      });
      createdHubs[hub.key] = created.id;
      console.log(`✅ Added hub: ${hub.name}`);
    }

    // Trade route definitions
    const tradeRoutes = [
      // Capital City connections (major hub)
      { from: 'capital_city', to: 'trading_post', baseDist: 25, baseRisk: 0.1 },
      { from: 'capital_city', to: 'industrial_district', baseDist: 15, baseRisk: 0.05 },
      { from: 'capital_city', to: 'harbor_town', baseDist: 60, baseRisk: 0.2 },
      { from: 'capital_city', to: 'village_clinic', baseDist: 45, baseRisk: 0.1 },
      { from: 'capital_city', to: 'forest_outpost', baseDist: 120, baseRisk: 0.4 },
      { from: 'capital_city', to: 'tribal_grounds', baseDist: 140, baseRisk: 0.5 },

      // Trading Post connections
      { from: 'trading_post', to: 'market_square', baseDist: 35, baseRisk: 0.1 },
      { from: 'trading_post', to: 'frontier_town', baseDist: 80, baseRisk: 0.25 },
      { from: 'trading_post', to: 'farming_hamlet', baseDist: 40, baseRisk: 0.1 },

      // Industrial District connections
      { from: 'industrial_district', to: 'mining_camp', baseDist: 110, baseRisk: 0.4 },
      { from: 'industrial_district', to: 'farming_hamlet', baseDist: 55, baseRisk: 0.1 },

      // Harbor Town connections
      { from: 'harbor_town', to: 'treasure_island', baseDist: 250, baseRisk: 0.8 },
      { from: 'harbor_town', to: 'tribal_grounds', baseDist: 95, baseRisk: 0.3 },

      // Frontier Town connections
      { from: 'frontier_town', to: 'mining_camp', baseDist: 95, baseRisk: 0.35 },
      { from: 'frontier_town', to: 'remote_settlement', baseDist: 150, baseRisk: 0.6 },
      { from: 'frontier_town', to: 'fortress_gate', baseDist: 70, baseRisk: 0.2 },

      // Fortress Gate connections (dangerous area access)
      { from: 'fortress_gate', to: 'remote_settlement', baseDist: 200, baseRisk: 0.7 },
      { from: 'fortress_gate', to: 'ancient_ruins', baseDist: 180, baseRisk: 0.75 },

      // Scholar's Tower connections
      { from: 'scholars_tower', to: 'ancient_ruins', baseDist: 180, baseRisk: 0.6 },
      { from: 'scholars_tower', to: 'mystic_portal', baseDist: 120, baseRisk: 0.5 },

      // Mystic Portal connections (special routes)
      { from: 'mystic_portal', to: 'hidden_cove', baseDist: 300, baseRisk: 0.9 },

      // Regional connections
      { from: 'market_square', to: 'village_clinic', baseDist: 30, baseRisk: 0.05 },
      { from: 'forest_outpost', to: 'tribal_grounds', baseDist: 85, baseRisk: 0.35 },
      { from: 'mining_camp', to: 'remote_settlement', baseDist: 120, baseRisk: 0.45 },
    ];

    // Clear existing links and insert fresh ones
    await prisma.link.deleteMany({});
    console.log('🗑️ Cleared existing trade routes');

    // Insert bidirectional trade routes
    for (const route of tradeRoutes) {
      const fromHubId = createdHubs[route.from];
      const toHubId = createdHubs[route.to];

      if (!fromHubId || !toHubId) {
        console.log(`⚠️ Skipping route ${route.from} -> ${route.to}: Hub not found`);
        continue;
      }

      // Create route from A to B
      await prisma.link.create({
        data: {
          aId: fromHubId,
          bId: toHubId,
          baseDist: route.baseDist,
          baseRisk: route.baseRisk,
        }
      });

      // Create reverse route from B to A  
      await prisma.link.create({
        data: {
          aId: toHubId,
          bId: fromHubId,
          baseDist: route.baseDist,
          baseRisk: route.baseRisk,
        }
      });

      console.log(`✅ Added bidirectional route: ${route.from} ↔ ${route.to} (${route.baseDist}km, risk: ${route.baseRisk})`);
    }

    const totalHubs = await prisma.hub.count();
    const totalLinks = await prisma.link.count();
    
    console.log(`✨ Successfully populated ${totalHubs} hubs and ${totalLinks} trade route links!`);
    
  } catch (error) {
    console.error('❌ Error populating hubs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateHubs();