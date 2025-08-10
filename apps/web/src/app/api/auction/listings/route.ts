import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get active listings
    const listings = await prisma.listing.findMany({
      where: { status: 'active' },
      include: {
        item: true,
        seller: {
          include: {
            profile: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit to 100 most recent
    });

    // Format the response
    const formattedListings = listings.map(listing => ({
      id: listing.id,
      item: listing.item.name,
      itemKey: listing.item.key,
      qty: listing.qty,
      price: listing.price,
      seller: listing.seller.profile?.display || 'Unknown',
      sellerId: listing.sellerId,
      createdAt: listing.createdAt,
      age: Math.floor((Date.now() - listing.createdAt.getTime()) / 60000) // age in minutes
    }));

    return NextResponse.json({ listings: formattedListings });

  } catch (error) {
    console.error('Get listings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}