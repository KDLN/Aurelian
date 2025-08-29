import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError, withErrorHandler, validateRequestBody } from '@/lib/api/server-utils';
import { CreateItemSchema } from '@/lib/api/schemas';
import type { ItemsResponse, ItemResponse, CreateItemRequest } from '@/types/api';

export const GET = withErrorHandler(async (): Promise<NextResponse<ItemsResponse>> => {
  const items = await prisma.itemDef.findMany({
    orderBy: { name: 'asc' },
  });

  return apiSuccess(items);
});

export const POST = withErrorHandler(async (request: NextRequest): Promise<NextResponse<ItemResponse>> => {
  const validation = await validateRequestBody(request, CreateItemSchema);
  
  if ('error' in validation) {
    return validation.error;
  }

  const { key, name, rarity, stack, meta } = validation.data;

  // Check if item key already exists
  const existingItem = await prisma.itemDef.findFirst({
    where: { key }
  });

  if (existingItem) {
    return apiError('Item with this key already exists', 400);
  }

  const item = await prisma.itemDef.create({
    data: {
      key,
      name,
      rarity,
      stack,
      meta,
    },
  });

  return apiSuccess(item, 'Item created successfully');
});