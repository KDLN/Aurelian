# US-004: Document Progression Path

**Priority**: P0 - BLOCKER
**Estimated Effort**: 4 hours
**Category**: Game Design & Onboarding

## User Story

As a **new player**, I want to **understand how to progress and what goals to work toward**, so that **I feel motivated to keep playing and know what to do next**.

## Problem Statement

Current state:
- XP bar shows "0 / 100" but never increases
- No levels, unlocks, or progression milestones
- No clear goals or victory conditions
- Players don't know what "success" looks like

**Impact**: Players feel aimless and quit after initial exploration.

## Acceptance Criteria

- [ ] Clear progression path from level 1-10 documented
- [ ] Short-term goals (complete 3 missions, earn 1000g)
- [ ] Medium-term goals (hire 4 agents, join guild)
- [ ] Long-term goals (earn 50,000g, craft legendary items)
- [ ] Visible progress tracking in UI
- [ ] Achievement/milestone system

## Proposed Progression Path

### Level 1-3: Learning the Basics
**Goals**:
- ✅ Complete character creation
- ✅ Run first mission (LOW risk)
- ✅ List item on auction house
- ✅ Craft first item

**Unlocks**: Access to all basic features

### Level 4-6: Building Your Empire
**Goals**:
- Hire 2nd agent (requires 1000g)
- Complete 10 missions
- Earn 5,000g total
- Join or create guild

**Unlocks**: Advanced mission types, guild features

### Level 7-10: Mastering Trade
**Goals**:
- Hire 4 agents (max capacity)
- Craft 50 items
- Earn 20,000g total
- Reach guild rank: Veteran Trader

**Unlocks**: Legendary recipes, territory control (future)

## Implementation

### Step 1: Add Progression Tracking (Database)

**File**: Create new migration

```bash
npx prisma migrate dev --name add_user_progression
```

**Migration**: Add to `prisma/schema.prisma`

```prisma
model UserProgress {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Experience & Levels
  experience     Int      @default(0)
  level          Int      @default(1)

  // Milestone tracking
  missionsCompleted   Int @default(0)
  itemsCrafted        Int @default(0)
  itemsSold           Int @default(0)
  totalGoldEarned     BigInt @default(0)

  // Achievements
  achievementsUnlocked String[] @default([])

  // Timestamps
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([userId])
  @@index([level])
}
```

### Step 2: Create XP Calculation Service

**New File**: `apps/web/src/lib/services/progressionService.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const XP_PER_LEVEL = [
  100,   // Level 1 → 2
  200,   // Level 2 → 3
  400,   // Level 3 → 4
  800,   // Level 4 → 5
  1500,  // Level 5 → 6
  2500,  // Level 6 → 7
  4000,  // Level 7 → 8
  6000,  // Level 8 → 9
  10000, // Level 9 → 10
];

export interface XPReward {
  amount: number;
  reason: string;
}

export const XP_REWARDS = {
  MISSION_COMPLETED: 25,
  ITEM_CRAFTED: 10,
  ITEM_SOLD: 15,
  AGENT_HIRED: 50,
  GUILD_JOINED: 100,
  FIRST_TRADE: 50,
};

export async function addExperience(
  userId: string,
  amount: number,
  reason: string,
  prisma: PrismaClient
): Promise<{ levelUp: boolean; newLevel?: number }> {

  // Get current progress
  let progress = await prisma.userProgress.findUnique({
    where: { userId }
  });

  if (!progress) {
    // Create initial progress record
    progress = await prisma.userProgress.create({
      data: {
        userId,
        experience: 0,
        level: 1
      }
    });
  }

  const newXP = progress.experience + amount;
  let currentLevel = progress.level;
  let levelUp = false;

  // Check if leveled up
  const xpNeeded = XP_PER_LEVEL[currentLevel - 1] || 10000;
  if (newXP >= xpNeeded && currentLevel < 10) {
    currentLevel += 1;
    levelUp = true;
  }

  // Update progress
  await prisma.userProgress.update({
    where: { userId },
    data: {
      experience: newXP,
      level: currentLevel
    }
  });

  return { levelUp, newLevel: levelUp ? currentLevel : undefined };
}

export async function incrementMilestone(
  userId: string,
  milestone: 'missionsCompleted' | 'itemsCrafted' | 'itemsSold',
  prisma: PrismaClient
): Promise<void> {
  await prisma.userProgress.upsert({
    where: { userId },
    update: {
      [milestone]: { increment: 1 }
    },
    create: {
      userId,
      [milestone]: 1
    }
  });
}

export async function getProgress(userId: string, prisma: PrismaClient) {
  const progress = await prisma.userProgress.findUnique({
    where: { userId }
  });

  if (!progress) {
    return {
      level: 1,
      experience: 0,
      xpNeeded: XP_PER_LEVEL[0],
      progress: 0,
      milestones: {
        missionsCompleted: 0,
        itemsCrafted: 0,
        itemsSold: 0
      }
    };
  }

  const xpNeeded = XP_PER_LEVEL[progress.level - 1] || 10000;
  const progressPercent = Math.floor((progress.experience / xpNeeded) * 100);

  return {
    level: progress.level,
    experience: progress.experience,
    xpNeeded,
    progress: progressPercent,
    milestones: {
      missionsCompleted: progress.missionsCompleted,
      itemsCrafted: progress.itemsCrafted,
      itemsSold: progress.itemsSold
    }
  };
}
```

### Step 3: Update Mission Completion to Award XP

**File**: `apps/web/src/app/api/missions/complete/route.ts`

Add after mission completion logic:

```typescript
import { addExperience, incrementMilestone, XP_REWARDS } from '@/lib/services/progressionService';

// After successful mission completion:
await incrementMilestone(userId, 'missionsCompleted', prisma);
const { levelUp, newLevel } = await addExperience(
  userId,
  XP_REWARDS.MISSION_COMPLETED,
  'Mission completed',
  prisma
);

if (levelUp) {
  // Return level up notification
  return NextResponse.json({
    success: true,
    levelUp: true,
    newLevel,
    message: `Mission complete! You reached level ${newLevel}!`
  });
}
```

### Step 4: Update UI to Show Real Progress

**File**: `apps/web/src/components/GameLayout.tsx` (Lines 261-298)

Replace the static progress with real data:

```typescript
import { useEffect, useState } from 'react';

const [userProgress, setUserProgress] = useState({
  level: 1,
  experience: 0,
  xpNeeded: 100,
  progress: 0
});

useEffect(() => {
  const loadProgress = async () => {
    if (!user?.id) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const response = await fetch('/api/user/progress', {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (response.ok) {
      const data = await response.json();
      setUserProgress(data.progress);
    }
  };

  loadProgress();
}, [user]);

// Update the UI:
<div className="game-space-between">
  <span style={{ color: '#9b8c70' }}>Level:</span>
  <span style={{ color: '#f1e5c8' }}>{userProgress.level}</span>
</div>
<div className="game-space-between">
  <span style={{ color: '#9b8c70' }}>EXP:</span>
  <span style={{ color: '#f1e5c8' }}>
    {userProgress.experience} / {userProgress.xpNeeded}
  </span>
</div>

{/* Experience Bar */}
<div style={{ marginTop: '8px' }}>
  <div style={{
    background: '#1a1511',
    border: '1px solid #533b2c',
    borderRadius: '2px',
    height: '8px',
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div style={{
      background: 'linear-gradient(90deg, #6eb5ff, #4a8acc)',
      height: '100%',
      width: `${userProgress.progress}%`,
      transition: 'width 0.3s ease'
    }} />
  </div>
</div>
```

### Step 5: Add Goals Dashboard

**New File**: `apps/web/src/components/GoalsDashboard.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: string;
  completed: boolean;
}

export default function GoalsDashboard() {
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const response = await fetch('/api/user/goals', {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (response.ok) {
      const data = await response.json();
      setGoals(data.goals);
    }
  };

  const getGoalIcon = (progress: number, target: number) => {
    if (progress >= target) return '✅';
    if (progress >= target * 0.75) return '🟨';
    if (progress >= target * 0.25) return '🟦';
    return '⬜';
  };

  return (
    <div className="game-card">
      <h3>🎯 Your Goals</h3>
      <p className="game-small game-muted">Complete goals to earn XP and rewards</p>

      <div className="game-flex-col" style={{ marginTop: '1rem', gap: '0.75rem' }}>
        {goals.map(goal => (
          <div key={goal.id} className="game-card-nested">
            <div className="game-space-between" style={{ marginBottom: '0.5rem' }}>
              <div>
                <h4>{getGoalIcon(goal.progress, goal.target)} {goal.title}</h4>
                <p className="game-small game-muted">{goal.description}</p>
              </div>
              {goal.completed && (
                <span className="game-pill game-pill-good">✓</span>
              )}
            </div>

            <div className="game-space-between game-small" style={{ marginBottom: '0.25rem' }}>
              <span>Progress: {goal.progress} / {goal.target}</span>
              <span className="game-muted">{goal.reward}</span>
            </div>

            <div className="game-progress-bar">
              <div
                className="game-progress-fill"
                style={{ width: `${Math.min(100, (goal.progress / goal.target) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Add to hub page:

```typescript
import GoalsDashboard from '@/components/GoalsDashboard';

// In hub/page.tsx:
<GoalsDashboard />
```

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Completing mission awards XP
- [ ] Level up notification displays
- [ ] XP bar updates in real-time
- [ ] Goals dashboard shows correct progress
- [ ] Level displays correctly in GameLayout
- [ ] XP calculation is accurate

## Related Stories

- US-101: Enhanced onboarding (include progression explanation)
- US-104: Victory conditions (level 10 = mastery)
- US-204: Character progression system (this is it!)

## Notes

- Keep level cap at 10 for MVP
- Can expand to 50+ post-launch
- Consider seasonal resets for endgame content
