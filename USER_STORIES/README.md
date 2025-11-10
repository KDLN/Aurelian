# Aurelian MVP User Stories

This directory contains all user stories needed to make Aurelian MVP-ready for launch.

## Priority Levels

- **P0 - BLOCKER**: Must be fixed before any MVP launch
- **P1 - CRITICAL**: Should be fixed for good user experience
- **P2 - HIGH**: Important for clarity and retention
- **P3 - MEDIUM**: Nice to have for better UX

## Story Categories

### 🚨 P0 - Blockers (6 stories)
1. [US-001: Remove Debug Buttons](./P0-BLOCKERS/US-001-remove-debug-buttons.md)
2. [US-002: Fix or Hide Hub Travel](./P0-BLOCKERS/US-002-fix-hub-travel.md)
3. [US-003: Add Economic Loop Tutorial](./P0-BLOCKERS/US-003-economic-loop-tutorial.md)
4. [US-004: Document Progression Path](./P0-BLOCKERS/US-004-progression-path.md)
5. [US-005: Fix Market Events System](./P0-BLOCKERS/US-005-fix-market-events.md)
6. [US-006: Clarify Server Missions](./P0-BLOCKERS/US-006-clarify-server-missions.md)

### 🔥 P1 - Critical (4 stories)
1. [US-101: Enhanced Onboarding Flow](./P1-CRITICAL/US-101-enhanced-onboarding.md)
2. [US-102: Clear Equipment Benefits](./P1-CRITICAL/US-102-equipment-tooltips.md)
3. [US-103: Resource Flow Explanation](./P1-CRITICAL/US-103-resource-flow.md)
4. [US-104: Add Victory Conditions](./P1-CRITICAL/US-104-victory-conditions.md)

### ⚡ P2 - High Priority (5 stories)
1. [US-201: Mission Rewards Clarity](./P2-HIGH/US-201-mission-rewards.md)
2. [US-202: Crafting Material Sources](./P2-HIGH/US-202-crafting-materials.md)
3. [US-203: Guild Benefits Explanation](./P2-HIGH/US-203-guild-benefits.md)
4. [US-204: Character Progression System](./P2-HIGH/US-204-character-progression.md)
5. [US-205: Starter Package Automation](./P2-HIGH/US-205-starter-package.md)

### 📝 P3 - Medium Priority (4 stories)
1. [US-301: Landing Page Improvements](./P3-MEDIUM/US-301-landing-page.md)
2. [US-302: Hub Dashboard Enhancements](./P3-MEDIUM/US-302-hub-dashboard.md)
3. [US-303: Verify Contracts API](./P3-MEDIUM/US-303-contracts-api.md)
4. [US-304: Guild Features Polish](./P3-MEDIUM/US-304-guild-polish.md)

## Quick Reference

### Total Stories: 19
### Estimated Timeline: 2-3 weeks
- P0 Blockers: 1 week
- P1 Critical: 1 week
- P2 High: 3-5 days
- P3 Medium: 2-3 days

## Implementation Order

**Week 1** - Fix Blockers:
1. Day 1: US-001 (Remove debug), US-002 (Hide hub travel)
2. Day 2-3: US-003 (Economic tutorial)
3. Day 4: US-004 (Progression), US-005 (Market events)
4. Day 5: US-006 (Server missions)

**Week 2** - Critical Improvements:
1. Day 1-2: US-101 (Enhanced onboarding)
2. Day 3: US-102 (Equipment tooltips), US-103 (Resource flow)
3. Day 4-5: US-104 (Victory conditions)

**Week 3** - High & Medium Priority:
1. Day 1-2: P2 stories (US-201 through US-205)
2. Day 3-4: P3 stories (US-301 through US-304)
3. Day 5: Testing and polish

## Success Metrics

After completing all P0 and P1 stories:
- ✅ New players can understand the game within 5 minutes
- ✅ No exploitable debug features visible
- ✅ Clear progression path from start to level 10
- ✅ All visible features are functional
- ✅ Economic loop is explained and intuitive

## Getting Started

1. Start with P0-BLOCKERS in order
2. Each story file contains:
   - User story format
   - Acceptance criteria
   - Technical solution
   - Files to modify
   - Code examples
   - Testing checklist

## Notes

- All stories assume working on branch: `claude/audit-game-systems-011CUyRw4rtZMss7DFBY5Tqo`
- Database migrations required: US-204 (progression), US-104 (victory conditions)
- No breaking changes to existing data
- All changes are additive or clarifying existing features
