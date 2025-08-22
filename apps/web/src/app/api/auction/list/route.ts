import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabaseClient';

// Helper function to calculate base auction fee based on duration
function calculateBaseFee(durationHours: number): number {
  if (durationHours <= 6) return 2;
  if (durationHours <= 12) return 3;
  if (durationHours <= 24) return 5;
  if (durationHours <= 36) return 8;
  return 12; // 60+ hours
}

// Helper function to get hub controller guild (mock implementation)
async function getHubControllerGuild(hubId: string): Promise<string | null> {
  // In a real implementation, this would query the database for hub ownership
  // For now, return a mock guild ID to simulate controlled hubs
  const hubControllers = {
    'capital-hub': 'crown-guild-id',
    'trading-post': 'merchant-alliance-id',
    'mining-camp': 'iron-brotherhood-id'
  };
  return hubControllers[hubId as keyof typeof hubControllers] || null;
}

// Helper function to check alliance status for auction benefits
async function checkAuctionAlliance(userGuildId: string, hubControllerGuildId: string) {
  const alliance = await prisma.guildAlliance.findFirst({
    where: {
      OR: [
        { fromGuildId: userGuildId, toGuildId: hubControllerGuildId },
        { fromGuildId: hubControllerGuildId, toGuildId: userGuildId }
      ],
      status: 'ACCEPTED',
      type: 'ALLIANCE'
    },
    select: {
      auctionFeeReduction: true,
      fromGuildId: true,
      toGuildId: true,
      fromGuild: { select: { name: true, tag: true } },
      toGuild: { select: { name: true, tag: true } }
    }
  });

  return {
    isAllied: !!alliance,
    auctionFeeReduction: alliance?.auctionFeeReduction || 0,
    alliedGuild: alliance ? (
      alliance.fromGuildId === hubControllerGuildId ? alliance.fromGuild : alliance.toGuild
    ) : null
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { itemKey, quantity, pricePerUnit, hubId, duration } = body;

    // Validate input
    if (!itemKey || !quantity || !pricePerUnit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (quantity <= 0 || pricePerUnit <= 0) {
      return NextResponse.json({ error: 'Invalid quantity or price' }, { status: 400 });
    }

    // Find the item definition
    const itemDef = await prisma.itemDef.findUnique({
      where: { key: itemKey }
    });

    if (!itemDef) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check user's inventory
    const inventory = await prisma.inventory.findFirst({
      where: {
        userId: user.id,
        itemId: itemDef.id,
        location: 'warehouse'
      }
    });

    if (!inventory || inventory.qty < quantity) {
      return NextResponse.json({ error: 'Insufficient inventory' }, { status: 400 });
    }

    // Calculate auction fees with alliance benefits
    const listingDuration = duration || 24; // Default 24 hours
    const baseFeePercent = calculateBaseFee(listingDuration);
    const baseFee = Math.ceil((quantity * pricePerUnit) * (baseFeePercent / 100));
    
    let finalFee = baseFee;
    let allianceDiscount = 0;
    let allianceBenefits: any = null;

    // Check for alliance benefits
    const userGuild = await prisma.guildMember.findUnique({
      where: { userId: user.id },
      include: {
        guild: { select: { id: true, name: true, tag: true } }
      }
    });

    if (userGuild && hubId) {
      // In a real implementation, you'd get the hub's controlling guild from database
      // For now, we'll simulate alliance checking
      const hubControllerGuildId = await getHubControllerGuild(hubId);
      
      if (hubControllerGuildId && hubControllerGuildId !== userGuild.guildId) {
        const allianceStatus = await checkAuctionAlliance(userGuild.guildId, hubControllerGuildId);
        
        if (allianceStatus.isAllied) {
          allianceDiscount = Math.ceil(baseFee * (allianceStatus.auctionFeeReduction / 100));
          finalFee = baseFee - allianceDiscount;
          
          allianceBenefits = {
            isAllied: true,
            alliedGuild: allianceStatus.alliedGuild,
            discountPercent: allianceStatus.auctionFeeReduction,
            discountAmount: allianceDiscount,
            originalFee: baseFee,
            discountedFee: finalFee
          };
        }
      }
    }

    // Check if user has enough gold for fees
    const userWallet = await prisma.wallet.findUnique({
      where: { userId: user.id }
    });

    if (!userWallet || userWallet.gold < finalFee) {
      return NextResponse.json({
        error: 'Insufficient gold for listing fees',
        required: finalFee,
        available: userWallet?.gold || 0,
        allianceDiscount: allianceDiscount
      }, { status: 400 });
    }

    // Create the listing and update inventory in a transaction
    const listing = await prisma.$transaction(async (tx) => {
      // Reduce inventory
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { qty: inventory.qty - quantity }
      });

      // Deduct auction fees
      await tx.wallet.update({
        where: { userId: user.id },
        data: { gold: userWallet.gold - finalFee }
      });

      // Create listing with fee information
      const newListing = await tx.listing.create({
        data: {
          sellerId: user.id,
          itemId: itemDef.id,
          qty: quantity,
          price: pricePerUnit,
          status: 'active',
          duration: listingDuration,
          closedAt: null
        },
        include: {
          item: true,
          seller: {
            include: {
              profile: true
            }
          }
        }
      });

      // Log alliance benefit usage if applicable
      if (allianceBenefits && userGuild) {
        await tx.guildLog.create({
          data: {
            guildId: userGuild.guildId,
            userId: user.id,
            action: 'alliance_auction_benefit_used',
            details: {
              listingId: newListing.id,
              itemName: itemDef.name,
              quantity,
              pricePerUnit,
              hubId: hubId || null,
              allianceDiscount,
              discountPercent: allianceBenefits.discountPercent,
              alliedGuild: allianceBenefits.alliedGuild,
              totalSaved: allianceDiscount,
              originalFee: baseFee,
              finalFee
            }
          }
        });
      }

      return newListing;
    });

    return NextResponse.json({ 
      success: true, 
      listing: {
        id: listing.id,
        item: listing.item.name,
        itemKey: listing.item.key,
        qty: listing.qty,
        price: listing.price,
        seller: listing.seller.profile?.display || 'Unknown',
        duration: listingDuration,
        createdAt: listing.createdAt
      },
      fees: {
        baseFee,
        finalFee,
        allianceDiscount,
        feePercent: baseFeePercent,
        totalValue: quantity * pricePerUnit
      },
      allianceBenefits,
      wallet: {
        goldBefore: userWallet.gold,
        goldAfter: userWallet.gold - finalFee,
        goldSpent: finalFee
      },
      notifications: [
        `Item listed successfully: ${quantity}x ${itemDef.name}`,
        `Listing fee: ${finalFee} gold`,
        ...(allianceBenefits ? [`Alliance discount saved you ${allianceDiscount} gold!`] : [])
      ]
    });

  } catch (error) {
    console.error('List item error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}