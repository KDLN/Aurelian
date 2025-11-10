# US-104: Add Victory Conditions

**Priority**: P1 - CRITICAL
**Estimated Effort**: 4 hours

## User Story
As a **player**, I want **clear goals and milestones to work toward**, so that **I feel a sense of achievement and progress**.

## Solution

### Add Achievement System

**Database**: Add to schema
```prisma
model Achievement {
  id          String   @id @default(cuid())
  key         String   @unique
  name        String
  description String
  icon        String
  category    String   // WEALTH, TRADING, MISSIONS, CRAFTING, GUILD
  requirement Int
  reward      Int      // XP or gold reward
  unlocks     UserAchievement[]
}

model UserAchievement {
  id            String   @id @default(cuid())
  userId        String
  achievementId String
  unlockedAt    DateTime @default(now())
  user          User     @relation(fields: [userId], references: [id])
  achievement   Achievement @relation(fields: [achievementId], references: [id])
  @@unique([userId, achievementId])
}
```

### Achievements List

**Wealth Milestones**:
- 🥉 First Gold: Earn 1,000g total
- 🥈 Merchant: Earn 10,000g total
- 🥇 Tycoon: Earn 50,000g total
- 💎 Trading Empire: Earn 100,000g total

**Mission Milestones**:
- 🎯 First Steps: Complete 5 missions
- ⚔️ Veteran: Complete 25 missions
- 🏆 Master: Complete 100 missions

**Crafting Milestones**:
- 🔨 Apprentice: Craft 10 items
- ⚒️ Artisan: Craft 50 items
- 👑 Master Crafter: Craft 200 items

**Trading Milestones**:
- 💰 First Sale: Sell 1 item on auction
- 📈 Dealer: Complete 25 trades
- 🌟 Merchant Lord: Complete 100 trades

**Guild Milestones**:
- 🏛️ Guild Member: Join a guild
- 🤝 Team Player: Contribute 1000g to guild
- 👑 Guild Master: Lead a guild with 10+ members

### UI Component

**New File**: `apps/web/src/app/achievements/page.tsx`

```typescript
export default function AchievementsPage() {
  const [achievements, setAchievements] = useState([]);

  return (
    <GameLayout title="Achievements">
      <div className="game-grid-2">
        {ACHIEVEMENT_CATEGORIES.map(category => (
          <div key={category} className="game-card">
            <h3>{getCategoryIcon(category)} {category}</h3>
            <div className="game-flex-col">
              {achievements
                .filter(a => a.category === category)
                .map(achievement => (
                  <div key={achievement.id} className="game-card-nested">
                    <div className="game-space-between">
                      <div>
                        <h4>
                          {achievement.unlocked ? '✅' : '🔒'} {achievement.name}
                        </h4>
                        <p className="game-small">{achievement.description}</p>
                      </div>
                      <span className="game-pill">+{achievement.reward} XP</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </GameLayout>
  );
}
```

## Testing
- [ ] Achievements unlock correctly
- [ ] XP rewards granted
- [ ] UI displays unlocked/locked states
- [ ] Progress tracking works
