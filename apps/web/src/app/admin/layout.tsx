'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const adminSections = [
  { id: 'items', title: 'Items', href: '/admin/items', icon: '📦' },
  { id: 'equipment', title: 'Equipment', href: '/admin/equipment', icon: '⚔️' },
  { id: 'blueprints', title: 'Blueprints', href: '/admin/blueprints', icon: '📜' },
  { id: 'missions', title: 'Missions', href: '/admin/missions', icon: '🚛' },
  { id: 'hubs', title: 'Hubs', href: '/admin/hubs', icon: '🏛️' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#1a120e] text-[#f1e5c8] flex">
      {/* Sidebar */}
      <div className={`bg-[#2a1f17] border-r border-[#8b6f31] transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-[#8b6f31]">
            <Link href="/admin" className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-[#c5a572] to-[#8b6f31] w-10 h-10 rounded-lg flex items-center justify-center text-[#231913] font-bold text-lg">
                ⚡
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-xl font-bold text-[#f1e5c8]">Aurelian</h1>
                  <p className="text-sm text-[#9a8464]">Admin Panel</p>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {adminSections.map((section) => {
                const isActive = pathname === section.href;
                return (
                  <Link
                    key={section.id}
                    href={section.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#8b6f31] text-[#231913] font-semibold'
                        : 'text-[#c5a572] hover:bg-[#3d2f22] hover:text-[#f1e5c8]'
                    }`}
                  >
                    <span className="text-xl">{section.icon}</span>
                    {!sidebarCollapsed && <span>{section.title}</span>}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-[#8b6f31]">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center px-4 py-2 text-[#9a8464] hover:text-[#f1e5c8] transition-colors"
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
            <Link
              href="/"
              className="mt-2 w-full flex items-center justify-center px-4 py-2 text-[#9a8464] hover:text-[#f1e5c8] transition-colors text-sm"
            >
              {!sidebarCollapsed && '← Back to Game'}
              {sidebarCollapsed && '🎮'}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-[#2a1f17] border-b border-[#8b6f31] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#f1e5c8]">
                {adminSections.find(s => pathname === s.href)?.title || 'Dashboard'}
              </h2>
              <p className="text-[#9a8464]">
                Manage your game content and configuration
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-[#3d2f22] px-3 py-1 rounded-full text-sm text-[#c5a572]">
                Admin Mode
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}