// Dynamic Rewards Analysis Script
console.log('🏆 Testing Dynamic Rewards System...');

window.testRewardsSystem = async () => {
  console.log('🎯 Starting rewards system analysis...');
  
  try {
    const supabaseClient = window.supabase || window._supabase;
    const { data: { session } } = await supabaseClient.auth.getSession();
    const token = session.access_token;
    
    // First get available missions
    const missionsResponse = await fetch('/api/missions', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const missionsData = await missionsResponse.json();
    console.log('📊 Available missions:', missionsData.missionDefs?.length);
    
    if (!missionsData.missionDefs?.length) {
      console.error('❌ No mission definitions available for testing');
      return;
    }
    
    // Analyze mission reward structures
    console.log('\n🔍 Mission Reward Analysis:');
    missionsData.missionDefs.forEach(mission => {
      console.log(`\n${mission.name} (${mission.riskLevel}):`);
      console.log(`  Base Reward: ${mission.baseReward}g`);
      console.log(`  Duration: ${Math.floor(mission.baseDuration / 60)}min`);
      console.log(`  Gold/min: ${(mission.baseReward / (mission.baseDuration / 60)).toFixed(1)}g`);
      console.log(`  Item Rewards:`, mission.itemRewards);
    });
    
    return missionsData;
    
  } catch (error) {
    console.error('❌ Rewards analysis failed:', error);
  }
};

// Simulate reward outcomes
window.simulateRewardOutcomes = (riskLevel = 'MEDIUM', baseReward = 100, trials = 100) => {
  console.log(`\n🎲 Simulating ${trials} ${riskLevel} mission outcomes (${baseReward}g base):`);
  
  const outcomes = [];
  
  for (let i = 0; i < trials; i++) {
    // Simulate the outcome roll logic from the server
    let outcomeRoll = Math.floor(Math.random() * 101);
    
    // Apply risk-based modifiers
    switch (riskLevel) {
      case 'LOW':
        outcomeRoll += 20;
        break;
      case 'HIGH':
        outcomeRoll -= 15;
        break;
    }
    
    // Clamp roll
    outcomeRoll = Math.max(0, Math.min(100, outcomeRoll));
    
    // Determine outcome
    let outcomeType, goldMultiplier, bonusChance;
    
    if (outcomeRoll >= 90) {
      outcomeType = 'CRITICAL_SUCCESS';
      goldMultiplier = 1.5;
      bonusChance = 0.8;
    } else if (outcomeRoll >= 70) {
      outcomeType = 'GOOD_SUCCESS';
      goldMultiplier = 1.2;
      bonusChance = 0.4;
    } else if (outcomeRoll >= 40) {
      outcomeType = 'NORMAL_SUCCESS';
      goldMultiplier = 1.0;
      bonusChance = 0.1;
    } else if (outcomeRoll >= 20) {
      outcomeType = 'POOR_SUCCESS';
      goldMultiplier = 0.7;
      bonusChance = 0.0;
    } else if (outcomeRoll >= 5) {
      outcomeType = 'FAILURE';
      goldMultiplier = 0.3;
      bonusChance = 0.0;
    } else {
      outcomeType = 'CRITICAL_FAILURE';
      goldMultiplier = 0.0;
      bonusChance = 0.0;
    }
    
    // Calculate rewards
    let adjustedBase = baseReward;
    if (riskLevel === 'HIGH') {
      adjustedBase = Math.floor(baseReward * 1.25);
    }
    
    let actualReward = Math.floor(adjustedBase * goldMultiplier);
    
    // Add variation
    const variation = Math.floor(actualReward * 0.1 * (Math.random() * 2 - 1));
    actualReward = Math.max(0, actualReward + variation);
    
    const hasBonus = Math.random() < bonusChance;
    
    outcomes.push({
      roll: outcomeRoll,
      type: outcomeType,
      gold: actualReward,
      hasBonus
    });
  }
  
  // Analyze results
  const stats = {
    totalGold: outcomes.reduce((sum, o) => sum + o.gold, 0),
    avgGold: outcomes.reduce((sum, o) => sum + o.gold, 0) / trials,
    minGold: Math.min(...outcomes.map(o => o.gold)),
    maxGold: Math.max(...outcomes.map(o => o.gold)),
    bonusRate: outcomes.filter(o => o.hasBonus).length / trials * 100,
    outcomeDistribution: {}
  };
  
  // Count outcome types
  outcomes.forEach(o => {
    stats.outcomeDistribution[o.type] = (stats.outcomeDistribution[o.type] || 0) + 1;
  });
  
  console.log('\n📈 Simulation Results:');
  console.log(`Average Gold: ${stats.avgGold.toFixed(1)}g`);
  console.log(`Range: ${stats.minGold}g - ${stats.maxGold}g`);
  console.log(`Bonus Item Rate: ${stats.bonusRate.toFixed(1)}%`);
  console.log(`ROI vs Base: ${((stats.avgGold / baseReward - 1) * 100).toFixed(1)}%`);
  
  console.log('\n📊 Outcome Distribution:');
  Object.entries(stats.outcomeDistribution).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} (${(count/trials*100).toFixed(1)}%)`);
  });
  
  return stats;
};

// Compare risk levels
window.compareRiskLevels = () => {
  console.log('\n⚖️ Risk Level Comparison (100 trials each):');
  
  const baseReward = 100;
  const lowRisk = window.simulateRewardOutcomes('LOW', baseReward, 100);
  const mediumRisk = window.simulateRewardOutcomes('MEDIUM', baseReward, 100);
  const highRisk = window.simulateRewardOutcomes('HIGH', baseReward, 100);
  
  console.log('\n📊 Risk Comparison Summary:');
  console.table({
    'LOW Risk': {
      avgGold: lowRisk.avgGold.toFixed(1),
      bonusRate: lowRisk.bonusRate.toFixed(1) + '%',
      roi: ((lowRisk.avgGold / baseReward - 1) * 100).toFixed(1) + '%'
    },
    'MEDIUM Risk': {
      avgGold: mediumRisk.avgGold.toFixed(1),
      bonusRate: mediumRisk.bonusRate.toFixed(1) + '%',
      roi: ((mediumRisk.avgGold / baseReward - 1) * 100).toFixed(1) + '%'
    },
    'HIGH Risk': {
      avgGold: highRisk.avgGold.toFixed(1),
      bonusRate: highRisk.bonusRate.toFixed(1) + '%',
      roi: ((highRisk.avgGold / baseReward - 1) * 100).toFixed(1) + '%'
    }
  });
  
  return { lowRisk, mediumRisk, highRisk };
};

console.log('🛠️ Available functions:');
console.log('• window.testRewardsSystem() - Analyze current mission definitions');
console.log('• window.simulateRewardOutcomes(riskLevel, baseReward, trials) - Simulate outcomes');
console.log('• window.compareRiskLevels() - Compare LOW/MEDIUM/HIGH risk rewards');
console.log('');
console.log('📋 This will help analyze:');
console.log('• Risk vs reward balance');
console.log('• Outcome distribution fairness');
console.log('• Gold per minute efficiency');
console.log('• Bonus item frequencies');