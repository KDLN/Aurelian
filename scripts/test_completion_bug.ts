import { isMissionCompleted } from '../apps/web/src/lib/serverMissions';

// Test the completion logic
const requirements = {
  items: {
    iron_ore: 1000,
    herb: 500,
    hide: 750,
    pearl: 100
  }
};

// Test case 1: Empty progress
const emptyProgress = {};
console.log('Empty progress should be false:', isMissionCompleted(emptyProgress, requirements));

// Test case 2: Progress with no items
const noItemsProgress = { gold: 100 };
console.log('Progress with no items should be false:', isMissionCompleted(noItemsProgress, requirements));

// Test case 3: Progress with some items but not all
const partialProgress = {
  items: {
    hide: 20
  }
};
console.log('Partial progress (20 hide) should be false:', isMissionCompleted(partialProgress, requirements));

// Test case 4: Progress with all requirements met
const completeProgress = {
  items: {
    iron_ore: 1000,
    herb: 500,
    hide: 750,
    pearl: 100
  }
};
console.log('Complete progress should be true:', isMissionCompleted(completeProgress, requirements));