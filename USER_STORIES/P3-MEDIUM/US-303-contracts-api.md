# US-303: Verify Contracts API

**Priority**: P3 - MEDIUM
**Estimated Effort**: 1 hour

## Problem
Contracts page uses `/api/v2/trading/contracts` which may be deprecated.

## Solution

### Test Current Implementation

```bash
# Test if endpoint exists
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v2/trading/contracts
```

### If Broken: Update to Use Colyseus

**File**: `apps/web/src/app/contracts/page.tsx`

Replace REST API with Colyseus room:

```typescript
import { useColyseusRoom } from '@/hooks/useColyseusRoom';

const ContractsPage = () => {
  const { room, state } = useColyseusRoom('trading');

  const createContract = async (contractData) => {
    await room.send('create_contract', contractData);
  };

  // ... rest of component
};
```

### If Working: Document It

Add to API documentation that contracts use v2 endpoint.

## Testing
- [ ] Can create contracts
- [ ] Can cancel contracts
- [ ] Contracts auto-execute correctly
- [ ] Gold is locked/refunded properly
- [ ] No console errors

## Notes
If API is working, this is just a verification task (30 minutes).
If broken, requires API migration (4-6 hours).
