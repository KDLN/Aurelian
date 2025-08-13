import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('📊 Database population summary:');
  
  const missions = await prisma.missionDef.count();
  const blueprints = await prisma.blueprint.count();
  const items = await prisma.itemDef.count();
  const equipment = await prisma.equipmentDef.count();
  const hubs = await prisma.hub.count();
  const links = await prisma.link.count();
  
  console.log(`  Missions: ${missions}`);
  console.log(`  Blueprints: ${blueprints}`);
  console.log(`  Items: ${items}`);
  console.log(`  Equipment: ${equipment}`);
  console.log(`  Hubs: ${hubs}`);
  console.log(`  Trade Links: ${links}`);
  
  await prisma.$disconnect();
}

checkDatabase();