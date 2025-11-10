# US-101: Enhanced Onboarding Flow

**Priority**: P1 - CRITICAL
**Estimated Effort**: 1 day
**Category**: New Player Experience

## User Story

As a **new player**, I want **a clear step-by-step guide for my first 30 minutes**, so that **I understand the game quickly and don't get overwhelmed**.

## Current State

Existing `OnboardingTips.tsx` has 7 steps but:
- No integration with actual completion tracking
- Skips important concepts
- Doesn't enforce order (can skip steps)

## Enhancements Needed

1. **Mandatory First Steps**:
   - Create wallet (can't skip)
   - Get starter items (can't skip)
   - Hire first agent (can't skip)

2. **Interactive Tutorials**:
   - Highlight relevant UI elements
   - Wait for user to complete action
   - Celebrate milestones

3. **Progress Gating**:
   - Must complete step before advancing
   - Track completion in database
   - Reward completion (50 XP bonus)

## Implementation

### Update OnboardingTips Component

**File**: `apps/web/src/components/OnboardingTips.tsx`

Add completion verification:

```typescript
// Add validation before marking step complete
const validateStepCompletion = async (stepId: string): Promise<boolean> => {
  switch (stepId) {
    case 'wallet':
      return wallet !== null;
    case 'inventory':
      return inventory?.totalItems > 0;
    case 'agents':
      // Check if user has at least 1 agent
      const response = await fetch('/api/agents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      return data.agents.length > 0;
    default:
      return true;
  }
};

// Modify nextStep to validate:
const nextStep = async () => {
  const currentStepData = steps[currentStep];
  const isValid = await validateStepCompletion(currentStepData.id);

  if (!isValid) {
    setErrorMsg(`Please complete this step before continuing: ${currentStepData.title}`);
    return;
  }

  await saveProgress(currentStepData.id);
  // ... rest of logic
};
```

### Add Visual Highlights

Use library like `react-joyride` or implement custom:

```typescript
import Joyride from 'react-joyride';

const tourSteps = [
  {
    target: '.warehouse-link',
    content: 'Click here to visit your warehouse and get starter items',
    disableBeacon: true,
  },
  {
    target: '.agents-link',
    content: 'Hire your first agent here to start running missions',
  },
  // ... more steps
];

<Joyride steps={tourSteps} run={showTour} continuous />
```

## Success Metrics

- 90%+ of new players complete first 3 steps
- Average time to complete: < 10 minutes
- Reduced support questions about "how to start"

## Files to Modify

- `apps/web/src/components/OnboardingTips.tsx`
- `apps/web/src/app/api/user/onboarding/route.ts`
- Add `react-joyride` package

## Testing

- [ ] Cannot skip mandatory steps
- [ ] Validation works correctly
- [ ] Visual highlights appear
- [ ] Completion rewards XP
- [ ] Works on mobile devices
