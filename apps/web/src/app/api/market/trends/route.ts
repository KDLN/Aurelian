import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TrendAnalysis {
  itemId: string;
  itemName: string;
  shortTermTrend: 'bullish' | 'bearish' | 'neutral';
  longTermTrend: 'bullish' | 'bearish' | 'neutral';
  momentum: 'strong' | 'moderate' | 'weak';
  volatilityRating: 'high' | 'medium' | 'low';
  supportLevel: number;
  resistanceLevel: number;
  priceTarget: number;
  confidence: number; // 0-100%
  signals: string[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const itemKey = searchParams.get('itemKey');

    // Get all items or specific item
    let itemsToAnalyze;
    if (itemId || itemKey) {
      let item;
      if (itemId) {
        item = await prisma.itemDef.findUnique({
          where: { id: itemId },
          select: { id: true, key: true, name: true }
        });
      } else if (itemKey) {
        item = await prisma.itemDef.findUnique({
          where: { key: itemKey },
          select: { id: true, key: true, name: true }
        });
      }
      
      if (!item) {
        return NextResponse.json({
          error: 'Item not found'
        }, { status: 404 });
      }
      
      itemsToAnalyze = [item];
    } else {
      itemsToAnalyze = await prisma.itemDef.findMany({
        where: {
          key: { in: ['iron_ore', 'herb', 'hide', 'pearl', 'relic_fragment'] }
        },
        select: { id: true, key: true, name: true }
      });
    }

    const trends: TrendAnalysis[] = [];
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last1h = new Date(now.getTime() - 1 * 60 * 60 * 1000);

    for (const item of itemsToAnalyze) {
      // Get price history for analysis
      const priceHistory = await prisma.priceTick.findMany({
        where: {
          itemId: item.id,
          hubId: null,
          at: { gte: last7d }
        },
        select: {
          price: true,
          volume: true,
          trend: true,
          volatility: true,
          supplyDemandRatio: true,
          at: true
        },
        orderBy: { at: 'asc' }
      });

      if (priceHistory.length < 10) {
        // Not enough data for analysis
        continue;
      }

      // Calculate trend indicators
      const prices = priceHistory.map(tick => tick.price);
      const volumes = priceHistory.map(tick => tick.volume || 0);
      const volatilities = priceHistory.map(tick => tick.volatility || 0).filter(v => v > 0);
      
      // Short-term trend (last 24h)
      const recent24h = priceHistory.filter(tick => tick.at >= last24h);
      const recent1h = priceHistory.filter(tick => tick.at >= last1h);
      
      const shortTermPrices = recent24h.map(tick => tick.price);
      const longTermPrices = prices;
      
      // Calculate moving averages
      const shortMA = shortTermPrices.length > 0 ? 
        shortTermPrices.reduce((sum, price) => sum + price, 0) / shortTermPrices.length : 0;
      const longMA = longTermPrices.reduce((sum, price) => sum + price, 0) / longTermPrices.length;
      
      // Trend determination
      const currentPrice = prices[prices.length - 1];
      const shortTermTrend = currentPrice > shortMA * 1.02 ? 'bullish' : 
        currentPrice < shortMA * 0.98 ? 'bearish' : 'neutral';
      const longTermTrend = shortMA > longMA * 1.02 ? 'bullish' : 
        shortMA < longMA * 0.98 ? 'bearish' : 'neutral';

      // Momentum calculation
      const priceChange1h = recent1h.length >= 2 ? 
        recent1h[recent1h.length - 1].price - recent1h[0].price : 0;
      const priceChange24h = recent24h.length >= 2 ? 
        recent24h[recent24h.length - 1].price - recent24h[0].price : 0;
      
      const momentum1h = Math.abs(priceChange1h / (recent1h[0]?.price || currentPrice)) * 100;
      const momentum24h = Math.abs(priceChange24h / (recent24h[0]?.price || currentPrice)) * 100;
      
      const momentum = momentum1h > 5 || momentum24h > 10 ? 'strong' :
        momentum1h > 2 || momentum24h > 5 ? 'moderate' : 'weak';

      // Volatility rating
      const avgVolatility = volatilities.reduce((sum, vol) => sum + vol, 0) / volatilities.length;
      const volatilityRating = avgVolatility > 0.15 ? 'high' : 
        avgVolatility > 0.08 ? 'medium' : 'low';

      // Support and resistance levels
      const highPrice = Math.max(...prices);
      const lowPrice = Math.min(...prices);
      const priceRange = highPrice - lowPrice;
      
      const supportLevel = Math.round(lowPrice + priceRange * 0.2);
      const resistanceLevel = Math.round(highPrice - priceRange * 0.2);

      // Simple price target calculation
      const trendMultiplier = shortTermTrend === 'bullish' ? 1.1 : 
        shortTermTrend === 'bearish' ? 0.9 : 1.0;
      const priceTarget = Math.round(currentPrice * trendMultiplier);

      // Generate trading signals
      const signals: string[] = [];
      
      if (shortTermTrend === 'bullish' && longTermTrend === 'bullish') {
        signals.push('Strong buy signal - both short and long term trends positive');
      }
      if (shortTermTrend === 'bearish' && longTermTrend === 'bearish') {
        signals.push('Strong sell signal - both trends negative');
      }
      if (currentPrice <= supportLevel) {
        signals.push('Price near support level - potential buying opportunity');
      }
      if (currentPrice >= resistanceLevel) {
        signals.push('Price near resistance - consider taking profits');
      }
      if (momentum === 'strong' && shortTermTrend === 'bullish') {
        signals.push('Strong bullish momentum detected');
      }
      if (volatilityRating === 'high') {
        signals.push('High volatility - exercise caution');
      }
      
      // Get recent market events affecting this item
      const activeEvents = await prisma.marketEvent.findMany({
        where: {
          itemId: item.id,
          isActive: true,
          OR: [
            { endsAt: null },
            { endsAt: { gte: now } }
          ]
        },
        select: {
          type: true,
          severity: true,
          description: true
        }
      });

      activeEvents.forEach(event => {
        signals.push(`Market event: ${event.description || event.type}`);
      });

      // Calculate confidence based on data quality and consistency
      let confidence = 50; // Base confidence
      if (priceHistory.length > 50) confidence += 20;
      if (volatilities.length > 10) confidence += 10;
      if (shortTermTrend === longTermTrend) confidence += 15;
      if (signals.length > 2) confidence += 5;
      confidence = Math.min(100, confidence);

      trends.push({
        itemId: item.id,
        itemName: item.name,
        shortTermTrend,
        longTermTrend,
        momentum,
        volatilityRating,
        supportLevel,
        resistanceLevel,
        priceTarget,
        confidence,
        signals
      });
    }

    // Market-wide trend analysis
    const bullishItems = trends.filter(t => t.shortTermTrend === 'bullish').length;
    const bearishItems = trends.filter(t => t.shortTermTrend === 'bearish').length;
    const neutralItems = trends.filter(t => t.shortTermTrend === 'neutral').length;
    
    const marketSentiment = bullishItems > bearishItems ? 'bullish' : 
      bearishItems > bullishItems ? 'bearish' : 'neutral';

    const marketOverview = {
      overallSentiment: marketSentiment,
      bullishItems,
      bearishItems,
      neutralItems,
      averageConfidence: trends.reduce((sum, t) => sum + t.confidence, 0) / trends.length,
      highVolatilityItems: trends.filter(t => t.volatilityRating === 'high').length,
      strongMomentumItems: trends.filter(t => t.momentum === 'strong').length
    };

    return NextResponse.json({
      trends,
      marketOverview,
      analysisTime: new Date().toISOString(),
      disclaimer: 'This analysis is for informational purposes only and should not be considered financial advice.'
    });

  } catch (error) {
    console.error('Market trends API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch market trends',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}