# Database Migration Guide

This guide helps prevent Prisma schema drift and ensures proper database management.

## What is Schema Drift?

Schema drift occurs when your database schema differs from your Prisma migration history. This typically happens when:

1. Database changes are made directly (via SQL)
2. Migrations are applied manually without updating migration history
3. Development/production environments get out of sync

## Preventing Schema Drift

### 1. Always Use Prisma Migrations

**DO:** Make schema changes in `schema.prisma` and run migrations:
```bash
# Make changes to prisma/schema.prisma
npx prisma migrate dev --name descriptive_migration_name
```

**DON'T:** Modify the database directly with SQL unless absolutely necessary

### 2. Check Status Before Making Changes

Before any schema work, check migration status:
```bash
npx prisma migrate status
```

### 3. Proper Development Workflow

1. **Update schema.prisma** with your changes
2. **Create migration**: `npx prisma migrate dev --name your_change_name`
3. **Test the migration** in development
4. **Commit both** schema.prisma and migration files
5. **Deploy to production**: `npx prisma migrate deploy`

### 4. Resolving Drift (If It Happens)

If you encounter drift:

1. **Check what's different**: `npx prisma migrate status`
2. **If migration files exist but aren't applied**:
   ```bash
   npx prisma migrate resolve --applied migration_name
   ```
3. **If database has changes not in migrations**:
   ```bash
   npx prisma db pull  # Update schema.prisma to match database
   npx prisma migrate dev --name baseline_from_current_state
   ```

## Commands Reference

| Command | Purpose |
|---------|---------|
| `npx prisma migrate status` | Check migration status |
| `npx prisma migrate dev --name NAME` | Create and apply migration |
| `npx prisma migrate deploy` | Apply migrations (production) |
| `npx prisma migrate resolve --applied NAME` | Mark migration as applied |
| `npx prisma db pull` | Update schema from database |
| `npx prisma generate` | Generate Prisma client |

## Best Practices

1. **Always commit migration files** along with schema changes
2. **Test migrations in development** before production deployment
3. **Use descriptive migration names** that explain the change
4. **Backup database** before major migrations
5. **Keep environments in sync** using proper deployment workflows

## Emergency Recovery

If you need to recover from severe drift:

1. **Backup your database** first!
2. **Pull current schema**: `npx prisma db pull`
3. **Create baseline**: `npx prisma migrate dev --name emergency_baseline`
4. **Test thoroughly** before deploying

## Windows-Specific Issues

If you encounter `EPERM` errors with `prisma generate`, try:
1. Close all development servers
2. Run as administrator
3. Clear node_modules and reinstall if necessary

This guide was created to prevent the drift issue that occurred on 2025-01-14.