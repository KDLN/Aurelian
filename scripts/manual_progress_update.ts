import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function manualProgressUpdate() {
  try {
    // Get the current mission and participants
    const mission = await prisma.serverMission.findFirst({
      where: { name: "Fixed Test Mission - Small Requirements" },
      include: { participants: true }
    });
    
    if (!mission) {
      console.log('❌ Mission not found');
      return;
    }
    
    console.log(`🎯 Found mission: "${mission.name}"`);
    console.log(`📊 Current global progress:`, JSON.stringify(mission.globalProgress, null, 2));
    console.log(`📋 Requirements:`, JSON.stringify(mission.globalRequirements, null, 2));
    
    // Calculate new progress by summing all participant contributions
    const newProgress: Record<string, number> = {};
    
    console.log(`\n👥 Processing ${mission.participants.length} participants:`);
    
    for (const participant of mission.participants) {
      const contribution = participant.contribution as any;
      console.log(`  - User ${participant.userId}: ${JSON.stringify(contribution)}`);
      
      // Handle both flat and nested structures
      if (contribution.items) {
        // Nested structure: { items: { iron_ore: 50 } }
        for (const [key, value] of Object.entries(contribution.items)) {
          if (typeof value === 'number') {
            newProgress[key] = (newProgress[key] || 0) + value;
          }
        }
      }
      
      // Also check for direct numeric properties (flat structure)
      for (const [key, value] of Object.entries(contribution)) {
        if (typeof value === 'number' && key !== 'gold' && key !== 'trades') {
          newProgress[key] = (newProgress[key] || 0) + value;
        }
      }
    }
    
    console.log(`\n📊 Calculated progress from participants:`, JSON.stringify(newProgress, null, 2));
    
    // Update the mission progress
    await prisma.serverMission.update({
      where: { id: mission.id },
      data: { globalProgress: newProgress }
    });
    
    console.log('✅ Mission progress updated successfully!');
    
    // Calculate percentages
    const requirements = mission.globalRequirements as any;
    console.log('\n📈 Progress percentages:');
    for (const [key, required] of Object.entries(requirements)) {
      if (typeof required === 'number') {
        const current = newProgress[key] || 0;
        const percentage = Math.round((current / required) * 100);
        console.log(`  - ${key}: ${current} / ${required} (${percentage}%)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

manualProgressUpdate();