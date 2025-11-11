'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { AdminErrorBoundary } from '@/components/ui/error-boundary';

const adminSections = [
  { id: 'dashboard', title: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
  { id: 'activity', title: 'Activity Logs', href: '/admin/activity', icon: '📋' },
  { id: 'onboarding', title: 'Onboarding', href: '/admin/onboarding', icon: '🎓' },
  { id: 'items', title: 'Items', href: '/admin/items', icon: '📦' },
  { id: 'equipment', title: 'Equipment', href: '/admin/equipment', icon: '⚔️' },
  { id: 'blueprints', title: 'Blueprints', href: '/admin/blueprints', icon: '📜' },
  { id: 'missions', title: 'Missions', href: '/admin/missions', icon: '🚛' },
  { id: 'server-missions', title: 'Server Missions', href: '/admin/server-missions', icon: '🌍' },
  { id: 'hubs', title: 'Hubs', href: '/admin/hubs', icon: '🏛️' },
  { id: 'debug', title: 'Debug Tools', href: '/admin/debug', icon: '🔧' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <div className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <Link href="/admin" className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">
                ⚡
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Aurelian</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Admin Panel</p>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {adminSections.map((section) => {
              const isActive = pathname === section.href;
              return (
                <Link
                  key={section.id}
                  href={section.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <span className="text-lg">{section.icon}</span>
                  {!sidebarCollapsed && <span>{section.title}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
            <Link
              href="/"
              className="w-full flex items-center justify-center px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-sm rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {!sidebarCollapsed && '← Back to Game'}
              {sidebarCollapsed && '🎮'}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-content">
        {/* Top Bar */}
        <header className="admin-header">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {adminSections.find(s => pathname === s.href)?.title || 'Dashboard'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Manage your game content and configuration
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full text-sm font-medium">
                Admin Mode
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-main">
          <AdminErrorBoundary>
            {children}
          </AdminErrorBoundary>
        </main>
      </div>
    </div>
  );
}