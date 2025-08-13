import { seedEquipment } from './seeds/equipment';

async function main() {
  try {
    await seedEquipment();
    console.log('Equipment seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding equipment:', error);
    process.exit(1);
  }
}

main();