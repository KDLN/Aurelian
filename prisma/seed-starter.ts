import { PrismaClient } from '@prisma/client';
import { createStarterPackage } from '../apps/web/src/lib/services/userOnboarding';

const prisma = new PrismaClient();

// Legacy export for backward compatibility
export { createStarterPackage };

async function main() {
  console.log('This is a utility function for creating starter packages.');
  console.log('It will be called automatically when new users are created.');
  console.log('To manually create a starter package, call createStarterPackage(userId)');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('Starter seed error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}