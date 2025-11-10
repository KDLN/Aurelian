# Implementation Roadmap - Aurelian MVP

This document provides a structured approach to implementing all user stories for MVP launch.

## Overview

**Total Stories**: 19
**Estimated Total Time**: 2-3 weeks
**Branch**: `claude/audit-game-systems-011CUyRw4rtZMss7DFBY5Tqo`

## Week 1: Fix Critical Blockers

### Day 1: Security & Broken Features (6 hours)
**Morning**:
- [ ] **US-001**: Remove debug buttons (1h)
  - missions/page.tsx: Remove handleDebugSpeedUp
  - crafting/page.tsx: Remove handleDebugCraft, handlePopulateBlueprints
  - Test: Verify buttons gone, normal functions work

**Afternoon**:
- [ ] **US-002**: Hide hub travel (2h)
  - Remove from GameLayout navigation
  - Replace /hub-travel page with "Coming Soon"
  - Update landing page timeline
  - Test: No broken links, redirect works

**Evening**:
- [ ] **US-005**: Fix market events (1h)
  - Remove MarketEvents component
  - Replace with "Coming Soon" message
  - Test: Market page loads correctly

### Day 2-3: Economic Education (16 hours)
**Day 2 Morning**:
- [ ] **US-003**: Economic loop tutorial - Component (4h)
  - Create EconomyTutorial.tsx
  - Implement 5-step tutorial with examples
  - Add to hub dashboard
  - Test: Tutorial is clear and interactive

**Day 2 Afternoon**:
- [ ] **US-003**: Economic loop tutorial - Integration (4h)
  - Add economy section to help page
  - Add material source tooltips to crafting
  - Add economy guide link to GameLayout
  - Test: All links work, content is accurate

**Day 3 Full Day**:
- [ ] **US-004**: Progression system (8h)
  - Create database migration for UserProgress
  - Implement progressionService.ts
  - Update mission completion to award XP
  - Update GameLayout to show real progress
  - Create GoalsDashboard component
  - Test: XP awards correctly, level-ups work, UI updates

### Day 4: Server Missions Clarity (3 hours)
**Morning**:
- [ ] **US-006**: Clarify server missions (3h)
  - Add help modal to missions page
  - Add contribution button with instructions
  - Add modal styles
  - Test: Modal opens, instructions clear, contributions work

### Day 5: Testing & Bug Fixes (8 hours)
- [ ] Test all P0 stories end-to-end
- [ ] Fix any bugs discovered
- [ ] Verify on mobile devices
- [ ] Performance testing
- [ ] Create git commit: "fix: P0 blockers - remove debug, fix tutorials, add progression"

## Week 2: Critical User Experience

### Day 1: Enhanced Onboarding (8 hours)
**Full Day**:
- [ ] **US-101**: Enhanced onboarding (8h)
  - Add completion validation to OnboardingTips
  - Install and configure react-joyride
  - Add visual highlights for key UI elements
  - Add reward for completing onboarding (50 XP)
  - Test: Cannot skip steps, validation works, highlights appear

### Day 2: Equipment & Resource Clarity (6 hours)
**Morning**:
- [ ] **US-102**: Equipment tooltips (2h)
  - Update agents/page.tsx with numerical tooltips
  - Show absolute vs relative values
  - Add example calculations
  - Test: Tooltips show correct math, mobile-friendly

**Afternoon**:
- [ ] **US-103**: Resource flow explanation (3h)
  - Add tooltips to missions page showing item rewards
  - Add "Where to get" tooltips to crafting page
  - Add "What can I use this for" tooltips to warehouse
  - Test: All tooltips display correct information

**Evening**:
- [ ] **US-201**: Mission rewards clarity (1h)
  - Add full reward display to missions
  - Add expected value calculator
  - Test: Calculations accurate, bonuses shown

### Day 3-4: Victory Conditions (16 hours)
**Day 3 Morning**:
- [ ] **US-104**: Achievement system - Database (4h)
  - Create Achievement and UserAchievement models
  - Create database migration
  - Define 15-20 achievements
  - Test: Migration runs successfully

**Day 3 Afternoon**:
- [ ] **US-104**: Achievement system - Backend (4h)
  - Create achievement checking service
  - Hook into mission completion
  - Hook into crafting completion
  - Hook into trading
  - Test: Achievements unlock correctly

**Day 4 Full Day**:
- [ ] **US-104**: Achievement system - Frontend (8h)
  - Create achievements page
  - Add achievements widget to hub
  - Add level-up notifications
  - Add achievement unlock animations
  - Test: UI displays correctly, notifications work

### Day 5: Testing & Polish (8 hours)
- [ ] Test all P1 stories end-to-end
- [ ] Fix any bugs discovered
- [ ] Verify on mobile devices
- [ ] Performance testing
- [ ] Create git commit: "feat: enhanced UX - onboarding, tooltips, achievements"

## Week 3: High Priority Features & Polish

### Day 1: Crafting & Guild Improvements (8 hours)
**Morning**:
- [ ] **US-202**: Crafting material sources (2h)
  - Add "Get Materials" helper to crafting page
  - Show which missions drop materials
  - Add market price comparisons
  - Test: Information is accurate and helpful

**Afternoon**:
- [ ] **US-203**: Guild benefits explanation (3h)
  - Create guild benefits panel
  - Add solo vs guild comparison table
  - Add to guild browse page
  - Test: Information is compelling and clear

**Evening**:
- [ ] **US-205**: Starter package automation (3h)
  - Update ensureUserExistsOptimized to grant starter package
  - Remove manual populate button
  - Add welcome message for new users
  - Test: New accounts get items automatically

### Day 2: Landing & Hub Improvements (8 hours)
**Morning**:
- [ ] **US-301**: Landing page improvements (4h)
  - Add specific launch timelines
  - Add player count / activity stats
  - Add screenshots or GIFs
  - Test: Stats update, images load, responsive

**Afternoon**:
- [ ] **US-302**: Hub dashboard enhancements (4h)
  - Add quick action buttons
  - Add performance dashboard
  - Add market opportunities calculator
  - Test: Actions work, calculations accurate

### Day 3: Guild & API Verification (8 hours)
**Morning**:
- [ ] **US-303**: Contracts API verification (1h)
  - Test if current API works
  - Document or fix as needed
  - Test: Contracts fully functional

**Afternoon**:
- [ ] **US-304**: Guild features polish (4h)
  - Complete guild wars UI
  - Implement guild achievements
  - Add guild permissions system
  - Test: All guild features work

**Evening**:
- [ ] Integration testing (3h)
  - Test complete user journey: signup → level 10
  - Verify all features work together
  - Check for edge cases

### Day 4: Final Testing & Bug Fixes (8 hours)
- [ ] Full regression testing
- [ ] Mobile device testing (iOS & Android)
- [ ] Performance optimization
- [ ] Fix critical bugs
- [ ] Documentation updates

### Day 5: Launch Preparation (8 hours)
- [ ] Final security audit
- [ ] Database backups configured
- [ ] Monitoring set up
- [ ] Error tracking configured
- [ ] Create release notes
- [ ] Final commit: "chore: MVP ready for launch"
- [ ] Create PR for review
- [ ] Deploy to staging for final QA

## Post-Week 3: Launch Checklist

### Pre-Launch
- [ ] All P0 and P1 stories completed and tested
- [ ] Database migrations run on production
- [ ] Environment variables configured
- [ ] SSL certificates active
- [ ] CDN configured for assets
- [ ] Error monitoring active (Sentry, etc.)
- [ ] Analytics configured (optional)
- [ ] Backup strategy tested
- [ ] Rollback plan documented

### Launch Day
- [ ] Deploy to production
- [ ] Smoke test all critical paths
- [ ] Monitor error rates
- [ ] Monitor performance
- [ ] Be available for hotfixes

### Post-Launch (Week 1)
- [ ] Daily monitoring of:
  - [ ] Error rates
  - [ ] User signup flow completion
  - [ ] Player retention (day 1, day 3, day 7)
  - [ ] Economy balance (gold sources vs sinks)
  - [ ] Performance metrics
- [ ] Gather user feedback
- [ ] Fix critical bugs immediately
- [ ] Plan post-MVP features (US-002 full implementation, etc.)

## Success Metrics

### Onboarding (Week 1)
- **Target**: 80%+ of new players complete first 3 onboarding steps
- **Target**: <5% abandon at signup
- **Target**: Average time to first mission: <5 minutes

### Engagement (Week 2)
- **Target**: 50%+ of players return day 2
- **Target**: 30%+ of players return day 7
- **Target**: Average session length: 15+ minutes

### Economy (Ongoing)
- **Target**: Average player gold: 2000-5000g by level 3
- **Target**: Active auction listings: 100+ items
- **Target**: Mission success rate: 70-80% average

### Technical (Ongoing)
- **Target**: Page load time: <2 seconds
- **Target**: Error rate: <1% of requests
- **Target**: Uptime: 99.5%+

## Risk Mitigation

### High Risk Items
1. **Database migrations** (US-004, US-104)
   - Mitigation: Test on staging first, have rollback SQL ready
   - Estimated: 2 hours if issues occur

2. **XP calculation bugs** (US-004)
   - Mitigation: Add comprehensive tests, monitor XP awards
   - Impact: Could affect progression fairness

3. **Starter package duplication** (US-205)
   - Mitigation: Add idempotency checks, test thoroughly
   - Impact: Could break economy if players get multiple packages

### Medium Risk Items
1. **Achievement system performance** (US-104)
   - Mitigation: Add database indexes, cache achievement status
   - Impact: Could slow down mission completion

2. **Mobile responsiveness** (All stories)
   - Mitigation: Test on real devices throughout development
   - Impact: Poor UX on mobile

## Dependencies

### External Libraries to Add
- `react-joyride` (US-101) - User tours
- No other external dependencies needed

### Database Changes
- US-004: UserProgress table
- US-104: Achievement, UserAchievement tables
- All migrations should be reversible

### API Changes
- US-004: New /api/user/progress endpoint
- US-104: New /api/achievements endpoints
- US-006: Update /api/server/missions to include contribution
- All new endpoints, no breaking changes

## Notes

- All work assumes branch: `claude/audit-game-systems-011CUyRw4rtZMss7DFBY5Tqo`
- Commit frequently (end of each story minimum)
- Push daily for backup
- Create PR when all P0+P1 complete (end of Week 2)
- P2 and P3 can be included in same PR or separate
- No breaking changes to existing data
- All changes are additive or clarifying

## Questions for Product Owner

Before starting implementation:

1. **Timeline**: Is 3-week timeline acceptable, or faster needed?
2. **MVP Scope**: Should we launch with P0+P1 only, or include P2?
3. **Hub Travel**: Confirmed we're hiding for MVP? Or implement fully?
4. **Market Events**: Remove or implement properly?
5. **Guild Wars**: Full implementation or just UI improvements?
6. **Achievement Rewards**: Gold + XP ok, or other rewards needed?
7. **Level Cap**: Keep at 10 for MVP, or higher?
8. **Starter Package**: 2000g + materials ok, or adjust amounts?

## Contact

Questions about implementation details? See individual user story files:
- `USER_STORIES/P0-BLOCKERS/US-XXX-*.md`
- `USER_STORIES/P1-CRITICAL/US-XXX-*.md`
- `USER_STORIES/P2-HIGH/US-XXX-*.md`
- `USER_STORIES/P3-MEDIUM/US-XXX-*.md`

Each story contains:
- Detailed problem statement
- Acceptance criteria
- Code examples
- Files to modify
- Testing checklist

---

**Ready to start? Begin with US-001: Remove Debug Buttons** 🚀
