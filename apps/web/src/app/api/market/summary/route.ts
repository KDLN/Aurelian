import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get all tradeable items
    const items = await prisma.itemDef.findMany({
      where: {
        key: { in: ['iron_ore', 'herb', 'hide', 'pearl', 'relic_fragment'] }
      },
      select: {
        id: true,
        key: true,
        name: true,
        rarity: true
      }
    });

    const summary: any[] = [];
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last1h = new Date(now.getTime() - 1 * 60 * 60 * 1000);

    for (const item of items) {
      // Get latest price tick
      const latestTick = await prisma.priceTick.findFirst({
        where: {
          itemId: item.id,
          hubId: null // Global prices for now
        },
        orderBy: { at: 'desc' },
        select: {
          price: true,
          volume: true,
          trend: true,
          volatility: true,
          at: true
        }
      });

      // Get price 24h ago for comparison
      const price24hAgo = await prisma.priceTick.findFirst({
        where: {
          itemId: item.id,
          hubId: null,
          at: { lte: last24h }
        },
        orderBy: { at: 'desc' },
        select: { price: true }
      });

      // Get recent trading activity
      const activeListings = await prisma.listing.count({
        where: {
          itemId: item.id,
          status: 'active',
          createdAt: { gte: last24h }
        }
      });

      const totalListingQuantity = await prisma.listing.aggregate({
        where: {
          itemId: item.id,
          status: 'active',
          createdAt: { gte: last24h }
        },
        _sum: { qty: true }
      });

      // Get recent sales
      const recentSales = await prisma.ledgerTx.count({
        where: {
          reason: 'auction_purchase',
          createdAt: { gte: last24h },
          meta: {
            path: ['itemName'],
            equals: item.name
          }
        }
      });

      // Get volume in last 24h from price ticks
      const volume24h = await prisma.priceTick.aggregate({
        where: {
          itemId: item.id,
          hubId: null,
          at: { gte: last24h }
        },
        _sum: { volume: true }
      });

      // Get volume in last 1h for recent activity
      const volume1h = await prisma.priceTick.aggregate({
        where: {
          itemId: item.id,
          hubId: null,
          at: { gte: last1h }
        },
        _sum: { volume: true }
      });

      // Calculate price change
      const currentPrice = latestTick?.price || 0;
      const oldPrice = price24hAgo?.price || currentPrice;
      const priceChange = currentPrice - oldPrice;
      const priceChangePercent = oldPrice > 0 ? (priceChange / oldPrice) * 100 : 0;

      // Market activity level
      let activityLevel: 'low' | 'medium' | 'high';
      const totalActivity = activeListings + recentSales;
      if (totalActivity > 20) activityLevel = 'high';
      else if (totalActivity > 5) activityLevel = 'medium';
      else activityLevel = 'low';

      summary.push({
        itemId: item.id,
        itemKey: item.key,
        itemName: item.name,
        rarity: item.rarity,
        currentPrice,
        priceChange,
        priceChangePercent: parseFloat(priceChangePercent.toFixed(2)),
        trend: latestTick?.trend || 'stable',
        volatility: latestTick?.volatility || 0,
        volume24h: volume24h._sum.volume || 0,
        volume1h: volume1h._sum.volume || 0,
        activeListings,
        totalSupply: totalListingQuantity._sum.qty || 0,
        recentSales,
        activityLevel,
        lastUpdated: latestTick?.at?.toISOString() || null
      });
    }

    // Sort by activity level and price change
    summary.sort((a, b) => {
      const activityOrder = { high: 3, medium: 2, low: 1 };
      const activityDiff = activityOrder[b.activityLevel] - activityOrder[a.activityLevel];
      if (activityDiff !== 0) return activityDiff;
      return Math.abs(b.priceChangePercent) - Math.abs(a.priceChangePercent);
    });

    // Market overview statistics
    const marketStats = {
      totalItems: summary.length,
      totalActiveListings: summary.reduce((sum, item) => sum + item.activeListings, 0),
      totalSupply: summary.reduce((sum, item) => sum + item.totalSupply, 0),
      totalVolume24h: summary.reduce((sum, item) => sum + item.volume24h, 0),
      averageVolatility: summary.reduce((sum, item) => sum + (item.volatility || 0), 0) / summary.length,
      itemsRising: summary.filter(item => item.priceChangePercent > 2).length,
      itemsFalling: summary.filter(item => item.priceChangePercent < -2).length,
      itemsStable: summary.filter(item => Math.abs(item.priceChangePercent) <= 2).length
    };

    return NextResponse.json({
      summary,
      marketStats,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Market summary API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch market summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}