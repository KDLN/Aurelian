import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkServerMissions() {
  try {
    // Check all server missions
    const missions = await prisma.serverMission.findMany({
      include: {
        participants: {
          include: {
            user: {
              include: { profile: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${missions.length} server missions:`);
    
    for (const mission of missions) {
      console.log(`\n📋 Mission: ${mission.name}`);
      console.log(`   Status: ${mission.status}`);
      console.log(`   Type: ${mission.type}`);
      console.log(`   Created: ${mission.createdAt.toISOString()}`);
      console.log(`   Ends: ${mission.endsAt.toISOString()}`);
      console.log(`   Started: ${mission.startedAt?.toISOString() || 'Not started'}`);
      console.log(`   Completed: ${mission.completedAt?.toISOString() || 'Not completed'}`);
      
      // Show requirements vs progress
      const requirements = mission.globalRequirements as any;
      const progress = mission.globalProgress as any;
      
      console.log(`   📊 Progress:`);
      if (requirements && typeof requirements === 'object') {
        Object.entries(requirements).forEach(([key, required]: [string, any]) => {
          const current = progress?.[key] || 0;
          const percent = Math.round((current / required) * 100);
          console.log(`     ${key}: ${current.toLocaleString()} / ${required.toLocaleString()} (${percent}%)`);
        });
      }
      
      console.log(`   👥 Participants (${mission.participants.length}):`);
      mission.participants.forEach(p => {
        const displayName = p.user.profile?.display || p.user.email;
        console.log(`     - ${displayName} (${p.tier || 'no tier'}) - Joined: ${p.joinedAt.toISOString()}`);
        
        const contribution = p.contribution as any;
        if (contribution?.items) {
          Object.entries(contribution.items).forEach(([key, qty]: [string, any]) => {
            console.log(`       ${key}: ${qty.toLocaleString()}`);
          });
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkServerMissions();