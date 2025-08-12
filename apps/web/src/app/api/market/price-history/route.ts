import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PriceHistoryQuery {
  itemId?: string;
  itemKey?: string;
  hubId?: string;
  period?: '1h' | '6h' | '24h' | '7d' | '30d';
  limit?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const itemId = searchParams.get('itemId');
    const itemKey = searchParams.get('itemKey');
    const hubIdParam = searchParams.get('hubId');
    const hubId = hubIdParam || undefined;
    const period = searchParams.get('period') as '1h' | '6h' | '24h' | '7d' | '30d' || '24h';
    const limit = parseInt(searchParams.get('limit') || '100');

    // Validate that we have either itemId or itemKey
    if (!itemId && !itemKey) {
      return NextResponse.json({
        error: 'Either itemId or itemKey must be provided'
      }, { status: 400 });
    }

    // If itemKey is provided, get the itemId
    let resolvedItemId = itemId;
    if (!resolvedItemId && itemKey) {
      const item = await prisma.itemDef.findUnique({
        where: { key: itemKey },
        select: { id: true }
      });
      
      if (!item) {
        return NextResponse.json({
          error: 'Item not found'
        }, { status: 404 });
      }
      
      resolvedItemId = item.id;
    }

    // Ensure we have a valid itemId
    if (!resolvedItemId) {
      return NextResponse.json({
        error: 'Unable to resolve item ID'
      }, { status: 400 });
    }

    // Calculate time range based on period
    const now = new Date();
    const timeRanges = {
      '1h': new Date(now.getTime() - 1 * 60 * 60 * 1000),
      '6h': new Date(now.getTime() - 6 * 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    };

    const startTime = timeRanges[period];

    // Fetch price history
    const priceHistory = await prisma.priceTick.findMany({
      where: {
        itemId: resolvedItemId,
        hubId: hubId,
        at: { gte: startTime }
      },
      select: {
        price: true,
        volume: true,
        high: true,
        low: true,
        trend: true,
        volatility: true,
        supplyDemandRatio: true,
        priceMultiplier: true,
        at: true
      },
      orderBy: { at: 'asc' },
      take: limit
    });

    // Calculate analytics
    if (priceHistory.length === 0) {
      return NextResponse.json({
        itemId: resolvedItemId,
        hubId,
        period,
        data: [],
        analytics: {
          currentPrice: 0,
          priceChange: 0,
          priceChangePercent: 0,
          totalVolume: 0,
          avgVolume: 0,
          highPrice: 0,
          lowPrice: 0,
          avgVolatility: 0,
          dataPoints: 0
        }
      });
    }

    const prices = priceHistory.map(tick => tick.price);
    const volumes = priceHistory.map(tick => tick.volume || 0);
    const volatilities = priceHistory.map(tick => tick.volatility || 0).filter(v => v > 0);

    const currentPrice = prices[prices.length - 1];
    const firstPrice = prices[0];
    const priceChange = currentPrice - firstPrice;
    const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

    const analytics = {
      currentPrice,
      priceChange,
      priceChangePercent: parseFloat(priceChangePercent.toFixed(2)),
      totalVolume: volumes.reduce((sum, vol) => sum + vol, 0),
      avgVolume: parseFloat((volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length).toFixed(0)),
      highPrice: Math.max(...prices),
      lowPrice: Math.min(...prices),
      avgVolatility: volatilities.length > 0 ? 
        parseFloat((volatilities.reduce((sum, vol) => sum + vol, 0) / volatilities.length).toFixed(4)) : 0,
      dataPoints: priceHistory.length
    };

    // Format data for charts
    const chartData = priceHistory.map(tick => ({
      timestamp: tick.at.toISOString(),
      price: tick.price,
      volume: tick.volume || 0,
      high: tick.high,
      low: tick.low,
      trend: tick.trend,
      volatility: tick.volatility,
      supplyDemandRatio: tick.supplyDemandRatio,
      priceMultiplier: tick.priceMultiplier
    }));

    return NextResponse.json({
      itemId: resolvedItemId,
      hubId,
      period,
      data: chartData,
      analytics
    });

  } catch (error) {
    console.error('Price history API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch price history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}