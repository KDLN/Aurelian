// Enhanced Dynamic Rewards System
console.log('🚀 Enhanced Rewards System Loaded');

// Enhanced reward calculation with more dynamic factors
window.enhancedRewardsSystem = {
  
  // Context-aware bonus items based on mission type and location
  getBonusItemsForMission: (missionDef) => {
    const bonusMap = {
      'Mining Camp': ['iron_ore', 'iron_ingot'],
      'Forest Outpost': ['herb', 'healing_tonic'],
      'Tribal Grounds': ['hide', 'leather_roll'],
      'Harbor Town': ['pearl', 'hide'],
      'Ancient Ruins': ['relic_fragment', 'pearl'],
      'Treasure Island': ['pearl', 'relic_fragment', 'iron_ore'],
      'Capital City': ['iron_ore', 'herb', 'hide'] // Trading hub
    };
    
    return bonusMap[missionDef.fromHub] || bonusMap[missionDef.toHub] || ['iron_ore', 'herb', 'hide'];
  },
  
  // Progressive difficulty based on player stats (mock for now)
  getProgressiveMultiplier: (userLevel = 1, missionCount = 0) => {
    // Early missions are easier, veterans get better rewards
    const experienceBonus = Math.min(0.5, missionCount * 0.01); // Up to 50% bonus after 50 missions
    const levelBonus = (userLevel - 1) * 0.05; // 5% per level
    
    return {
      successBonus: experienceBonus,
      rewardBonus: levelBonus,
      unlockTier: Math.floor(userLevel / 5) // Unlock new missions every 5 levels
    };
  },
  
  // Enhanced risk calculation with more factors
  calculateEnhancedRisk: (missionDef, playerStats = {}) => {
    let baseRoll = Math.floor(Math.random() * 101);
    let modifiers = 0;
    
    // Existing risk modifiers
    switch (missionDef.riskLevel) {
      case 'LOW':
        modifiers += 20;
        break;
      case 'MEDIUM':
        modifiers += 0;
        break;
      case 'HIGH':
        modifiers -= 15;
        break;
    }
    
    // NEW: Distance difficulty
    if (missionDef.distance > 200) modifiers -= 5;
    if (missionDef.distance < 100) modifiers += 5;
    
    // NEW: Duration fatigue
    if (missionDef.baseDuration > 300) modifiers -= 3; // Long missions are harder
    
    // NEW: Player experience bonus
    const progressive = this.getProgressiveMultiplier(playerStats.level, playerStats.missionCount);
    modifiers += Math.floor(progressive.successBonus * 20); // Convert to roll modifier
    
    return Math.max(0, Math.min(100, baseRoll + modifiers));
  },
  
  // Enhanced outcome system with more granular results
  getEnhancedOutcome: (roll) => {
    if (roll >= 95) {
      return {
        type: 'LEGENDARY_SUCCESS',
        description: 'Legendary success! Your caravan discovered a secret route and ancient cache. Word of this achievement will spread throughout the realm.',
        goldMultiplier: 2.0,
        itemMultiplier: 1.2,
        bonusChance: 0.9,
        discoveryChance: 0.5,
        reputationGain: 15
      };
    } else if (roll >= 85) {
      return {
        type: 'CRITICAL_SUCCESS', 
        description: 'Exceptional success! Your caravan traveled swiftly and safely, with expert navigation avoiding all hazards. The crew discovered additional opportunities along the route.',
        goldMultiplier: 1.5,
        itemMultiplier: 1.0,
        bonusChance: 0.8,
        discoveryChance: 0.3,
        reputationGain: 10
      };
    } else if (roll >= 70) {
      return {
        type: 'GOOD_SUCCESS',
        description: 'Great success! The journey proceeded smoothly with only minor delays. Your caravan arrived safely with full cargo and some extra goods picked up en route.',
        goldMultiplier: 1.2,
        itemMultiplier: 1.0,
        bonusChance: 0.4,
        discoveryChance: 0.1,
        reputationGain: 5
      };
    } else if (roll >= 40) {
      return {
        type: 'NORMAL_SUCCESS',
        description: 'Mission completed successfully. The caravan reached its destination as planned with all expected cargo intact. A routine but profitable journey.',
        goldMultiplier: 1.0,
        itemMultiplier: 1.0,
        bonusChance: 0.1,
        discoveryChance: 0.05,
        reputationGain: 2
      };
    } else if (roll >= 20) {
      return {
        type: 'POOR_SUCCESS',
        description: 'Difficult journey with complications. Your caravan faced delays, harsh weather, or equipment problems but managed to deliver most of the cargo. Some goods were damaged or lost.',
        goldMultiplier: 0.7,
        itemMultiplier: 0.75,
        bonusChance: 0.0,
        discoveryChance: 0.0,
        reputationGain: 0
      };
    } else if (roll >= 5) {
      return {
        type: 'FAILURE',
        description: 'Mission largely failed due to bandits, severe weather, or major equipment failure. Only salvaged a small portion of the cargo and minimal payment for the attempt.',
        goldMultiplier: 0.3,
        itemMultiplier: 0.25,
        bonusChance: 0.0,
        discoveryChance: 0.0,
        reputationGain: -2
      };
    } else {
      return {
        type: 'CATASTROPHIC_FAILURE',
        description: 'Catastrophic failure! The caravan was completely lost to bandits, disasters, or other calamity. Nothing was recovered and the caravan requires major repairs. Your reputation suffers.',
        goldMultiplier: 0.0,
        itemMultiplier: 0.0,
        bonusChance: 0.0,
        discoveryChance: 0.0,
        reputationGain: -5
      };
    }
  },
  
  // Seasonal/time-based modifiers
  getSeasonalModifier: () => {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    let modifier = 1.0;
    
    // Weekend bonus
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      modifier += 0.1; // 10% weekend bonus
    }
    
    // Peak hours bonus (evening gaming time)
    if (hour >= 18 && hour <= 22) {
      modifier += 0.05; // 5% evening bonus
    }
    
    return modifier;
  },
  
  // Simulate enhanced rewards
  simulateEnhanced: (missionDef, playerStats = {}, trials = 100) => {
    console.log(`\n🔮 Enhanced Simulation: ${missionDef.name} (${trials} trials)`);
    
    const results = [];
    let totalReputation = 0;
    
    for (let i = 0; i < trials; i++) {
      const roll = this.calculateEnhancedRisk(missionDef, playerStats);
      const outcome = this.getEnhancedOutcome(roll);
      const seasonal = this.getSeasonalModifier();
      const progressive = this.getProgressiveMultiplier(playerStats.level, playerStats.missionCount);
      
      // Calculate enhanced rewards
      let baseGold = missionDef.baseReward;
      
      // Risk bonus
      if (missionDef.riskLevel === 'HIGH') {
        baseGold = Math.floor(baseGold * 1.25);
      }
      
      // Progressive bonus
      baseGold = Math.floor(baseGold * (1 + progressive.rewardBonus));
      
      // Outcome multiplier
      let finalGold = Math.floor(baseGold * outcome.goldMultiplier);
      
      // Seasonal modifier
      finalGold = Math.floor(finalGold * seasonal);
      
      // Variation
      const variation = Math.floor(finalGold * 0.1 * (Math.random() * 2 - 1));
      finalGold = Math.max(0, finalGold + variation);
      
      totalReputation += outcome.reputationGain || 0;
      
      results.push({
        roll,
        outcome: outcome.type,
        gold: finalGold,
        reputation: outcome.reputationGain || 0,
        hasBonus: Math.random() < outcome.bonusChance,
        hasDiscovery: Math.random() < outcome.discoveryChance
      });
    }
    
    // Calculate stats
    const avgGold = results.reduce((sum, r) => sum + r.gold, 0) / trials;
    const avgReputation = totalReputation / trials;
    const bonusRate = results.filter(r => r.hasBonus).length / trials * 100;
    const discoveryRate = results.filter(r => r.hasDiscovery).length / trials * 100;
    
    console.log('📈 Enhanced Results:');
    console.log(`Average Gold: ${avgGold.toFixed(1)}g (vs ${missionDef.baseReward}g base)`);
    console.log(`Average Reputation: ${avgReputation.toFixed(1)}`);
    console.log(`Bonus Rate: ${bonusRate.toFixed(1)}%`);
    console.log(`Discovery Rate: ${discoveryRate.toFixed(1)}%`);
    console.log(`Enhanced ROI: ${((avgGold / missionDef.baseReward - 1) * 100).toFixed(1)}%`);
    
    return {
      avgGold,
      avgReputation,
      bonusRate,
      discoveryRate,
      results
    };
  }
};

// Quick test function
window.testEnhancedRewards = () => {
  console.log('🧪 Testing Enhanced Rewards System...');
  
  // Mock mission definitions from seed data
  const testMissions = [
    {
      name: 'Iron Ore Delivery',
      fromHub: 'Mining Camp',
      toHub: 'Capital City',
      distance: 120,
      baseDuration: 240,
      baseReward: 60,
      riskLevel: 'LOW'
    },
    {
      name: 'Pearl Diving Expedition',
      fromHub: 'Harbor Town', 
      toHub: 'Coastal Ruins',
      distance: 250,
      baseDuration: 480,
      baseReward: 150,
      riskLevel: 'HIGH'
    }
  ];
  
  const playerStats = {
    level: 5,
    missionCount: 25
  };
  
  testMissions.forEach(mission => {
    window.enhancedRewardsSystem.simulateEnhanced(mission, playerStats, 50);
  });
};

console.log('🛠️ Enhanced Rewards System Functions:');
console.log('• window.enhancedRewardsSystem.simulateEnhanced(mission, playerStats, trials)');
console.log('• window.testEnhancedRewards() - Quick test with sample missions');
console.log('');
console.log('🆕 New Features:');
console.log('• Context-aware bonus items based on mission location');
console.log('• Player progression bonuses (level + mission count)'); 
console.log('• Enhanced risk calculation with distance/duration factors');
console.log('• Reputation system with social progression');
console.log('• Seasonal/time-based bonus multipliers');
console.log('• Legendary success tier (2x gold multiplier)');