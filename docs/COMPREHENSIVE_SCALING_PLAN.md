# Comprehensive Scaling Plan: The Exchange (Aurelian)

## Executive Summary
This plan addresses scaling the entire Aurelian multiplayer trading game from its current single-user capacity to support 30-100 concurrent users, with a roadmap to 1000+ users. The system consists of three main services: web (Next.js), realtime (Colyseus WebSocket), and worker (background tasks).

## Current Architecture Analysis

### System Components
1. **Web App (Next.js 15.5.0)**: Main game UI, API endpoints, server-side rendering
2. **Realtime Server (Colyseus)**: WebSocket for multiplayer movement, chat, auction tickers
3. **Worker Service**: Background tasks, guild cleanup, world simulation
4. **Database**: PostgreSQL via Supabase with Prisma ORM
5. **Authentication**: Supabase Auth with JWT tokens
6. **Deployment**: Google Cloud Run via GitHub Actions

### Identified Bottlenecks

#### Critical Issues (Blocking)
1. **Database Connection Pool**: `connection_limit=1` causing immediate failures
2. **Nested Transactions**: Server missions causing transaction deadlocks
3. **No Caching Layer**: Every request hits database directly
4. **Synchronous Processing**: All operations block until complete

#### Performance Issues (Degrading)
1. **Heavy API Routes**: Multiple database queries per endpoint
2. **No Query Optimization**: Missing indexes, N+1 queries
3. **React Query Polling**: Excessive refetch intervals
4. **WebSocket Broadcast**: 1-second interval for all state updates
5. **Large State Transfers**: Entire player state sent every second

#### Scalability Limitations
1. **Single Database**: No read replicas or sharding
2. **In-Memory State**: WebSocket rooms store state in memory
3. **No Rate Limiting**: APIs vulnerable to abuse
4. **No Load Balancing**: Single instance of each service
5. **Missing Monitoring**: No performance metrics or alerting

## Scaling Strategy

### Phase 1: Immediate Fixes (Day 1-2)
**Goal: Support 30 concurrent users**

#### 1.1 Database Connection Pool Fix
```env
# Change DATABASE_URL from:
connection_limit=1
# To:
connection_limit=20&pool_timeout=30&statement_timeout=10000
```

#### 1.2 Add Critical Indexes
```sql
-- High-priority indexes for immediate performance
CREATE INDEX CONCURRENTLY "idx_inventory_user_location" ON "Inventory"("userId", "location");
CREATE INDEX CONCURRENTLY "idx_mission_status_ends" ON "ServerMission"("status", "endsAt");
CREATE INDEX CONCURRENTLY "idx_participant_mission_user" ON "ServerMissionParticipant"("missionId", "userId");
CREATE INDEX CONCURRENTLY "idx_listing_status_hub" ON "Listing"("status", "hubId");
CREATE INDEX CONCURRENTLY "idx_contract_status_owner" ON "Contract"("status", "ownerId");
CREATE INDEX CONCURRENTLY "idx_craft_status_user" ON "CraftJob"("status", "userId");
CREATE INDEX CONCURRENTLY "idx_wallet_user" ON "Wallet"("userId");
```

#### 1.3 Implement Redis Caching
**New Files:**
- `apps/web/src/lib/redis.ts`
- `apps/web/src/lib/cache.ts`

**Cache Strategy:**
```typescript
// Cache keys and TTLs
const CACHE_CONFIG = {
  // User data
  userProfile: { ttl: 300, pattern: 'user:{userId}:profile' },
  userWallet: { ttl: 30, pattern: 'user:{userId}:wallet' },
  userInventory: { ttl: 60, pattern: 'user:{userId}:inventory:{location}' },
  
  // Mission data
  serverMission: { ttl: 300, pattern: 'mission:{missionId}' },
  missionProgress: { ttl: 5, pattern: 'mission:{missionId}:progress' },
  missionLeaderboard: { ttl: 10, pattern: 'mission:{missionId}:leaderboard' },
  
  // Market data
  hubListings: { ttl: 30, pattern: 'hub:{hubId}:listings' },
  priceTicks: { ttl: 5, pattern: 'prices:latest' },
  
  // Static data
  itemDefinitions: { ttl: 3600, pattern: 'items:all' },
  blueprints: { ttl: 3600, pattern: 'blueprints:all' }
};
```

#### 1.4 Optimize Critical API Routes
**Priority Endpoints:**
- `/api/server/missions/[missionId]/participate` - Add caching, remove nested transactions
- `/api/user/wallet` - Cache wallet data
- `/api/user/inventory` - Cache inventory queries
- `/api/crafting/start` - Optimize blueprint validation
- `/api/missions` - Paginate results, cache active missions

### Phase 2: Infrastructure Upgrades (Week 1)
**Goal: Support 50-100 concurrent users**

#### 2.1 Connection Pooling
**Option A: Supabase Pooler (Recommended)**
```env
# Use pooled connection for API routes
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=100"
# Direct connection for migrations only
DIRECT_URL="postgresql://...?pgbouncer=false"
```

**Option B: PgBouncer Self-Hosted**
```yaml
# pgbouncer.ini
[databases]
aurelian = host=db.supabase.co port=5432 dbname=postgres
[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

#### 2.2 Queue System Implementation
**New Components:**
- BullMQ for job processing
- Redis as queue backend
- Worker processes for async tasks

```typescript
// Queue definitions
const QUEUES = {
  contributions: {
    name: 'mission-contributions',
    concurrency: 10,
    batch: { size: 20, timeout: 2000 }
  },
  crafting: {
    name: 'crafting-jobs',
    concurrency: 5,
    scheduled: true
  },
  trades: {
    name: 'trade-execution',
    concurrency: 15,
    priority: true
  },
  notifications: {
    name: 'notifications',
    concurrency: 20,
    retry: { attempts: 3 }
  }
};
```

#### 2.3 WebSocket Optimization
**Colyseus Room Improvements:**
```typescript
// Optimized MovementRoom
class MovementRoom extends Room {
  // Reduce broadcast frequency
  broadcastInterval = 100; // 10Hz instead of 1Hz
  
  // Delta compression
  sendOnlyChanges = true;
  
  // Spatial partitioning
  gridSize = 100;
  spatialGrid = new Map();
  
  // Only send updates to nearby players
  broadcastNearby(player, message, range = 200) {
    const nearby = this.getPlayersInRange(player, range);
    nearby.forEach(client => client.send(message));
  }
}
```

#### 2.4 API Response Optimization
```typescript
// Implement response caching middleware
const cacheMiddleware = {
  // Cache GET requests
  read: (ttl: number) => async (req, res, next) => {
    const cached = await redis.get(req.path);
    if (cached) return res.json(JSON.parse(cached));
    
    const json = res.json;
    res.json = (data) => {
      redis.setex(req.path, ttl, JSON.stringify(data));
      return json.call(res, data);
    };
    next();
  },
  
  // Invalidate on mutations
  invalidate: (patterns: string[]) => async (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 300) {
        patterns.forEach(pattern => redis.del(pattern));
      }
    });
    next();
  }
};
```

### Phase 3: Horizontal Scaling (Week 2)
**Goal: Support 100+ concurrent users**

#### 3.1 Service Architecture
```yaml
# Multi-instance deployment
services:
  web:
    instances: 3
    memory: 1Gi
    cpu: 1
    autoscaling:
      min: 2
      max: 10
      target_cpu: 70
  
  realtime:
    instances: 2
    memory: 2Gi
    cpu: 2
    sticky_sessions: true
    
  worker:
    instances: 2
    memory: 512Mi
    cpu: 0.5
```

#### 3.2 Database Scaling
**Read Replicas Configuration:**
```typescript
// Prisma client with read replicas
const prismaWrite = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

const prismaRead = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_READ_URL } }
});

// Query router
const db = {
  read: prismaRead,
  write: prismaWrite,
  transaction: prismaWrite.$transaction
};
```

#### 3.3 CDN and Static Assets
```nginx
# CloudFlare configuration
cache_control: public, max-age=31536000, immutable
vary: Accept-Encoding
x-content-type-options: nosniff

# Static paths to cache
/images/*
/sprites/*
/_next/static/*
/api/items (with 1hr TTL)
/api/blueprints (with 1hr TTL)
```

#### 3.4 Load Balancing
```yaml
# Google Cloud Load Balancer
backend_services:
  - name: web-backend
    protocol: HTTP2
    session_affinity: NONE
    health_check: /api/health
    
  - name: realtime-backend
    protocol: WebSocket
    session_affinity: CLIENT_IP
    health_check: /health
```

### Phase 4: Advanced Optimization (Week 3)
**Goal: Support 1000+ concurrent users**

#### 4.1 Microservices Split
```
Current Monolith → Microservices:
- Auth Service (Supabase)
- Game API (Next.js)
- Trading Service (dedicated)
- Mission Service (dedicated)
- Chat Service (dedicated)
- Analytics Service (separate)
```

#### 4.2 Event-Driven Architecture
```typescript
// Event bus implementation
const EventBus = {
  // Publishers
  mission: new EventEmitter(),
  trade: new EventEmitter(),
  craft: new EventEmitter(),
  
  // Subscribers
  subscribers: new Map(),
  
  // Event types
  events: {
    MISSION_CONTRIBUTION: 'mission.contribution',
    TRADE_EXECUTED: 'trade.executed',
    CRAFT_COMPLETED: 'craft.completed',
    PRICE_UPDATE: 'price.update'
  }
};
```

#### 4.3 GraphQL Federation
```graphql
# Federated schema
type User @key(fields: "id") {
  id: ID!
  profile: Profile
  wallet: Wallet
  inventory: [InventoryItem]
}

type Mission @key(fields: "id") {
  id: ID!
  participants: [Participant]
  progress: Progress
  leaderboard: [LeaderboardEntry]
}
```

## Implementation Timeline

### Week 1: Foundation (Days 1-7)
- [ ] Day 1: Fix connection pool, add indexes
- [ ] Day 2: Setup Redis, implement basic caching
- [ ] Day 3: Optimize critical API routes
- [ ] Day 4: Implement queue system
- [ ] Day 5: Deploy connection pooler
- [ ] Day 6: WebSocket optimizations
- [ ] Day 7: Load testing & monitoring setup

### Week 2: Scaling (Days 8-14)
- [ ] Day 8-9: Deploy read replicas
- [ ] Day 10: Implement CDN
- [ ] Day 11: Setup load balancer
- [ ] Day 12: Deploy multi-instance services
- [ ] Day 13: Implement rate limiting
- [ ] Day 14: Performance testing

### Week 3: Polish (Days 15-21)
- [ ] Day 15-16: Event-driven refactor
- [ ] Day 17: GraphQL implementation
- [ ] Day 18: Advanced caching strategies
- [ ] Day 19: Security hardening
- [ ] Day 20: Documentation
- [ ] Day 21: Final testing & launch

## Performance Targets

### Current Baseline
- Concurrent users: 1-2
- API response time: 2-5 seconds
- WebSocket latency: 100-200ms
- Database connections: 1
- Error rate: >50% at 5+ users

### Phase 1 Target (30 users)
- API response p50: <500ms
- API response p95: <1s
- WebSocket latency: <100ms
- Database connections: 20
- Error rate: <1%

### Phase 2 Target (100 users)
- API response p50: <200ms
- API response p95: <500ms
- WebSocket latency: <50ms
- Database connections: 100 (pooled)
- Error rate: <0.5%

### Phase 3 Target (1000+ users)
- API response p50: <100ms
- API response p95: <300ms
- WebSocket latency: <30ms
- Database connections: Unlimited (pooled)
- Error rate: <0.1%

## Cost Analysis

### Current Monthly Cost
- Supabase Free: $0
- Cloud Run: $0 (free tier)
- Total: $0/month

### 100 Users Monthly Cost
- Supabase Pro: $149
- Redis Cloud: $29
- Cloud Run: ~$100
- CloudFlare: $20
- Monitoring: $50
- Total: ~$348/month ($3.48/user)

### 1000 Users Monthly Cost
- Supabase Team: $599
- Redis Cluster: $199
- Cloud Run: ~$500
- CloudFlare Pro: $200
- Monitoring: $299
- Total: ~$1,797/month ($1.80/user)

## Monitoring & Observability

### Key Metrics
```typescript
const METRICS = {
  // Application metrics
  api_response_time: { unit: 'ms', alert: '>1000' },
  websocket_connections: { unit: 'count', alert: '>500' },
  queue_depth: { unit: 'count', alert: '>1000' },
  cache_hit_rate: { unit: '%', alert: '<80' },
  
  // Infrastructure metrics
  cpu_usage: { unit: '%', alert: '>80' },
  memory_usage: { unit: '%', alert: '>90' },
  database_connections: { unit: 'count', alert: '>80' },
  error_rate: { unit: '%', alert: '>1' }
};
```

### Monitoring Stack
1. **Metrics**: Prometheus + Grafana
2. **Logging**: Winston + Logtail
3. **Tracing**: OpenTelemetry + Jaeger
4. **Errors**: Sentry
5. **Uptime**: Pingdom

## Security Considerations

### Rate Limiting
```typescript
const RATE_LIMITS = {
  // Per user per minute
  api_global: 100,
  contributions: 6,
  trades: 20,
  crafting: 10,
  chat: 30,
  
  // Per IP per minute
  auth: 5,
  registration: 2
};
```

### DDoS Protection
- CloudFlare DDoS protection
- Rate limiting at application level
- Circuit breakers for cascading failures
- Request validation and sanitization

## Rollback Strategy

### Phase Rollback
Each phase can be rolled back independently:
1. **Database**: Restore connection string
2. **Redis**: Disable caching layer
3. **Queue**: Revert to synchronous processing
4. **Load Balancer**: Route to single instance
5. **CDN**: Bypass CDN, serve direct

### Emergency Procedures
```bash
# Quick rollback commands
./scripts/rollback-database.sh
./scripts/disable-redis.sh
./scripts/restore-single-instance.sh
```

## Success Metrics

### Phase 1 Success Criteria
✅ 30 concurrent users without errors
✅ Sub-1 second API responses
✅ Zero connection pool timeouts
✅ 90% cache hit rate

### Phase 2 Success Criteria
✅ 100 concurrent users stable
✅ Sub-500ms API responses
✅ Queue processing < 3 seconds
✅ 95% uptime

### Phase 3 Success Criteria
✅ 1000+ concurrent users supported
✅ Sub-300ms API responses globally
✅ Horizontal scaling proven
✅ 99.9% uptime

## Next Steps

1. **Immediate Action**: Update DATABASE_URL connection limit
2. **Today**: Implement Redis caching for missions
3. **Tomorrow**: Add database indexes
4. **This Week**: Deploy connection pooler
5. **Next Week**: Implement queue system
6. **Ongoing**: Monitor, optimize, iterate

---

*Document Version: 1.0*
*Last Updated: [Current Date]*
*Status: Ready for Implementation*
*Owner: Engineering Team*