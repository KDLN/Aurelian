// Copy of the completion logic to test
interface ContributionData {
  items?: Record<string, number>;
  gold?: number;
  trades?: number;
  [key: string]: any;
}

interface MissionRequirements {
  items?: Record<string, number>;
  gold?: number;
  trades?: number;
  [key: string]: any;
}

function isMissionCompleted(progress: ContributionData, requirements: MissionRequirements): boolean {
  // Check items
  if (requirements.items) {
    for (const [itemKey, required] of Object.entries(requirements.items)) {
      const current = progress.items?.[itemKey] || 0;
      if (current < required) return false;
    }
  }

  // Check gold
  if (requirements.gold) {
    const current = progress.gold || 0;
    if (current < requirements.gold) return false;
  }

  // Check trades
  if (requirements.trades) {
    const current = progress.trades || 0;
    if (current < requirements.trades) return false;
  }

  return true;
}

// Test the completion logic
const requirements = {
  items: {
    iron_ore: 1000,
    herb: 500,
    hide: 750,
    pearl: 100
  }
};

console.log('🔍 Testing mission completion logic...\n');

// Test case 1: Empty progress
const emptyProgress = {};
const test1 = isMissionCompleted(emptyProgress, requirements);
console.log(`1. Empty progress: ${test1} (should be false)`);

// Test case 2: Progress with no items field
const noItemsProgress = { gold: 100 };
const test2 = isMissionCompleted(noItemsProgress, requirements);
console.log(`2. No items field: ${test2} (should be false)`);

// Test case 3: Progress with empty items object
const emptyItemsProgress = { items: {} };
const test3 = isMissionCompleted(emptyItemsProgress, requirements);
console.log(`3. Empty items object: ${test3} (should be false)`);

// Test case 4: Progress with some items but not enough
const partialProgress = {
  items: {
    hide: 20
  }
};
const test4 = isMissionCompleted(partialProgress, requirements);
console.log(`4. Partial progress (20 hide): ${test4} (should be false)`);

// Test case 5: Progress with all requirements met
const completeProgress = {
  items: {
    iron_ore: 1000,
    herb: 500,
    hide: 750,
    pearl: 100
  }
};
const test5 = isMissionCompleted(completeProgress, requirements);
console.log(`5. Complete progress: ${test5} (should be true)`);

console.log('\n🐛 BUG FOUND:');
if (test1 || test2 || test3) {
  console.log('❌ The function incorrectly returns true for incomplete progress!');
  console.log('🔧 This explains why missions complete with just 20 items.');
} else {
  console.log('✅ Completion logic appears correct. Bug must be elsewhere.');
}