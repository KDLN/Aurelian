import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, withAuth, getQueryParam } from '@/lib/api/server-utils';
import type { InventoryResponse, AuthUser } from '@/types/api';

export const dynamic = 'force-dynamic';

// GET - Get user's inventory by location
export const GET = withAuth(async (request: NextRequest, user: AuthUser): Promise<NextResponse<InventoryResponse>> => {
  const location = getQueryParam(request, 'location', 'warehouse');

  // Validate location parameter
  const validLocations = ['warehouse', 'caravan', 'escrow'];
  if (!validLocations.includes(location)) {
    throw new Error(`Invalid location: ${location}`);
  }

  // Get user's inventory for the specified location
  const inventory = await prisma.inventory.findMany({
    where: {
      userId: user.id,
      location: location
    },
    include: {
      item: {
        select: {
          id: true,
          key: true,
          name: true,
          rarity: true,
          stack: true,
          meta: true
        }
      }
    },
    orderBy: [
      { item: { rarity: 'asc' } },
      { item: { name: 'asc' } }
    ]
  });

  return apiSuccess({
    items: inventory.map(item => ({
      id: item.id,
      itemId: item.itemId,
      qty: item.qty,
      location: item.location,
      item: item.item
    })),
    location
  });
});