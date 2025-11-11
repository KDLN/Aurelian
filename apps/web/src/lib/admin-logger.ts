import { prisma } from './prisma'

export interface AdminLogEntry {
  adminUserId: string
  action: string
  resourceType: string
  resourceId?: string
  details?: any
  ipAddress?: string
  userAgent?: string
}

export interface AdminLogFilter {
  adminUserId?: string
  action?: string
  resourceType?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export class AdminLogger {
  /**
   * Log an admin action
   */
  static async log(entry: AdminLogEntry): Promise<void> {
    try {
      await prisma.systemLog.create({
        data: {
          userId: entry.adminUserId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          details: entry.details || {},
          metadata: {
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent,
            timestamp: new Date().toISOString()
          },
          severity: 'INFO',
          category: 'ADMIN_ACTION'
        }
      })
    } catch (error) {
      console.error('Failed to log admin action:', error)
      // Don't throw - admin actions should continue even if logging fails
    }
  }

  /**
   * Get admin activity logs
   */
  static async getLogs(filter: AdminLogFilter = {}) {
    const where: any = {
      category: 'ADMIN_ACTION'
    }

    if (filter.adminUserId) {
      where.userId = filter.adminUserId
    }

    if (filter.action) {
      where.action = { contains: filter.action, mode: 'insensitive' }
    }

    if (filter.resourceType) {
      where.resourceType = filter.resourceType
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {}
      if (filter.startDate) where.createdAt.gte = filter.startDate
      if (filter.endDate) where.createdAt.lte = filter.endDate
    }

    try {
      const logs = await prisma.systemLog.findMany({
        where,
        include: {
          user: {
            include: {
              profile: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: filter.limit || 100,
        skip: filter.offset || 0
      })

      return logs.map(log => ({
        id: log.id,
        adminUser: log.user?.profile?.display || log.userId,
        adminUserId: log.userId,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        details: log.details,
        ipAddress: (log.metadata as any)?.ipAddress,
        userAgent: (log.metadata as any)?.userAgent,
        timestamp: log.createdAt
      }))
    } catch (error) {
      console.error('Failed to fetch admin logs:', error)
      return []
    }
  }

  /**
   * Get admin activity statistics
   */
  static async getStats(timeframe: '24h' | '7d' | '30d' = '24h') {
    const now = new Date()
    const startDate = new Date()
    
    switch (timeframe) {
      case '24h':
        startDate.setHours(now.getHours() - 24)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
    }

    try {
      const logs = await prisma.systemLog.findMany({
        where: {
          category: 'ADMIN_ACTION',
          createdAt: {
            gte: startDate
          }
        },
        include: {
          user: {
            include: {
              profile: true
            }
          }
        }
      })

      // Group by admin user
      const byAdmin = logs.reduce((acc, log) => {
        const adminName = log.user?.profile?.display || log.userId
        acc[adminName] = (acc[adminName] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Group by action type
      const byAction = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Group by resource type
      const byResource = logs.reduce((acc, log) => {
        acc[log.resourceType] = (acc[log.resourceType] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        totalActions: logs.length,
        uniqueAdmins: Object.keys(byAdmin).length,
        timeframe,
        byAdmin,
        byAction,
        byResource,
        recentActivity: logs.slice(0, 10).map(log => ({
          admin: log.user?.profile?.display || log.userId,
          action: log.action,
          resourceType: log.resourceType,
          timestamp: log.createdAt
        }))
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error)
      return {
        totalActions: 0,
        uniqueAdmins: 0,
        timeframe,
        byAdmin: {},
        byAction: {},
        byResource: {},
        recentActivity: []
      }
    }
  }
}

// Convenience functions for common admin actions
export const logAdminAction = {
  create: (adminUserId: string, resourceType: string, resourceId: string, details?: any, metadata?: { ipAddress?: string; userAgent?: string }) =>
    AdminLogger.log({
      adminUserId,
      action: 'CREATE',
      resourceType,
      resourceId,
      details,
      ...metadata
    }),

  update: (adminUserId: string, resourceType: string, resourceId: string, details?: any, metadata?: { ipAddress?: string; userAgent?: string }) =>
    AdminLogger.log({
      adminUserId,
      action: 'UPDATE',
      resourceType,
      resourceId,
      details,
      ...metadata
    }),

  delete: (adminUserId: string, resourceType: string, resourceId: string, details?: any, metadata?: { ipAddress?: string; userAgent?: string }) =>
    AdminLogger.log({
      adminUserId,
      action: 'DELETE',
      resourceType,
      resourceId,
      details,
      ...metadata
    }),

  access: (adminUserId: string, resourceType: string, details?: any, metadata?: { ipAddress?: string; userAgent?: string }) =>
    AdminLogger.log({
      adminUserId,
      action: 'ACCESS',
      resourceType,
      details,
      ...metadata
    }),

  emergency: (adminUserId: string, action: string, details?: any, metadata?: { ipAddress?: string; userAgent?: string }) =>
    AdminLogger.log({
      adminUserId,
      action: `EMERGENCY_${action}`,
      resourceType: 'SYSTEM',
      details,
      ...metadata
    })
}