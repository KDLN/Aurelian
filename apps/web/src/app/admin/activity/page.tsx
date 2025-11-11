'use client'

import { useState, useEffect } from 'react'

interface ActivityLog {
  id: string
  adminUser: string
  action: string
  resourceType: string
  resourceId?: string
  timestamp: string
  ipAddress?: string
}

interface ActivityStats {
  totalActions: number
  uniqueAdmins: number
  timeframe: string
  byAdmin: Record<string, number>
  byAction: Record<string, number>
  byResource: Record<string, number>
  recentActivity: {
    admin: string
    action: string
    resourceType: string
    timestamp: string
  }[]
}

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('24h')
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    adminUserId: ''
  })

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: '0',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      })

      const response = await fetch(`/api/admin/activity-logs?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setLogs(result.data)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe })
      })
      const result = await response.json()
      
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchLogs(), fetchStats()])
      setLoading(false)
    }
    
    loadData()
  }, [timeframe, filters])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg text-gray-600">Loading activity logs...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Activity Logs</h1>
        <p className="mt-2 text-sm text-gray-600">
          Monitor and track admin actions across the system
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="text-sm font-medium text-gray-500">Total Actions</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalActions}</div>
            <div className="text-sm text-gray-500">in last {stats.timeframe}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="text-sm font-medium text-gray-500">Active Admins</div>
            <div className="text-2xl font-bold text-gray-900">{stats.uniqueAdmins}</div>
            <div className="text-sm text-gray-500">unique administrators</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="text-sm font-medium text-gray-500">Top Action</div>
            <div className="text-lg font-bold text-gray-900">
              {Object.keys(stats.byAction)[0] || 'None'}
            </div>
            <div className="text-sm text-gray-500">
              {Object.values(stats.byAction)[0] || 0} times
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="text-sm font-medium text-gray-500">Top Resource</div>
            <div className="text-lg font-bold text-gray-900">
              {Object.keys(stats.byResource)[0] || 'None'}
            </div>
            <div className="text-sm text-gray-500">
              {Object.values(stats.byResource)[0] || 0} actions
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <input
              type="text"
              value={filters.action}
              onChange={(e) => setFilters({...filters, action: e.target.value})}
              placeholder="Filter by action..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resource Type
            </label>
            <input
              type="text"
              value={filters.resourceType}
              onChange={(e) => setFilters({...filters, resourceType: e.target.value})}
              placeholder="Filter by resource..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin User
            </label>
            <input
              type="text"
              value={filters.adminUserId}
              onChange={(e) => setFilters({...filters, adminUserId: e.target.value})}
              placeholder="Filter by admin..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Activity Logs Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No activity logs found for the current filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.adminUser}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.action.includes('DELETE') ? 'bg-red-100 text-red-800' :
                          log.action.includes('CREATE') ? 'bg-green-100 text-green-800' :
                          log.action.includes('UPDATE') ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.resourceType}
                        {log.resourceId && (
                          <span className="text-gray-500 ml-1">#{log.resourceId}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ipAddress || 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}