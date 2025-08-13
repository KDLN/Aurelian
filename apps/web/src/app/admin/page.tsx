'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const adminSections = [
  {
    id: 'items',
    title: 'Items',
    description: 'Manage game items, materials, and crafted goods',
    href: '/admin/items',
    icon: '📦',
    color: 'from-blue-600 to-blue-800',
  },
  {
    id: 'equipment',
    title: 'Equipment',
    description: 'Manage weapons, armor, tools, and accessories',
    href: '/admin/equipment',
    icon: '⚔️',
    color: 'from-red-600 to-red-800',
  },
  {
    id: 'blueprints',
    title: 'Blueprints',
    description: 'Manage crafting recipes and requirements',
    href: '/admin/blueprints',
    icon: '📜',
    color: 'from-purple-600 to-purple-800',
  },
  {
    id: 'missions',
    title: 'Missions',
    description: 'Manage mission definitions and rewards',
    href: '/admin/missions',
    icon: '🚛',
    color: 'from-green-600 to-green-800',
  },
  {
    id: 'hubs',
    title: 'Hubs & Routes',
    description: 'Manage trading hubs and route connections',
    href: '/admin/hubs',
    icon: '🏛️',
    color: 'from-yellow-600 to-yellow-800',
  },
];

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#2a1f17] to-[#3d2f22] rounded-xl p-8 border border-[#8b6f31]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#f1e5c8] mb-2">
              Welcome to the Admin Panel
            </h1>
            <p className="text-[#c5a572] text-lg">
              Manage all aspects of your game content from one central location
            </p>
          </div>
          <div className="bg-gradient-to-br from-[#c5a572] to-[#8b6f31] w-20 h-20 rounded-2xl flex items-center justify-center text-[#231913] text-4xl">
            ⚡
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#2a1f17] rounded-xl p-6 border border-[#8b6f31] animate-pulse">
              <div className="h-8 bg-[#3d2f22] rounded mb-2"></div>
              <div className="h-4 bg-[#3d2f22] rounded w-2/3"></div>
            </div>
          ))
        ) : (
          stats && Object.entries(stats).map(([key, value]) => (
            <div key={key} className="bg-[#2a1f17] rounded-xl p-6 border border-[#8b6f31] hover:border-[#c5a572] transition-colors">
              <div className="text-3xl font-bold text-[#c5a572] mb-1">{value as number}</div>
              <div className="text-[#9a8464] capitalize font-medium">{key}</div>
            </div>
          ))
        )}
      </div>

      {/* Management Sections */}
      <div>
        <h2 className="text-2xl font-bold text-[#f1e5c8] mb-6">Content Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className="group relative bg-[#2a1f17] rounded-xl border border-[#8b6f31] overflow-hidden hover:border-[#c5a572] transition-all duration-300 hover:scale-105"
            >
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`bg-gradient-to-br ${section.color} w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl`}>
                    {section.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-[#f1e5c8] mb-2 group-hover:text-[#c5a572] transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-[#9a8464] text-sm leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#8b6f31]/0 to-[#8b6f31]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity / System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#2a1f17] rounded-xl p-6 border border-[#8b6f31]">
          <h3 className="text-xl font-semibold text-[#f1e5c8] mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#9a8464]">Database Connection</span>
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-400 text-sm">Online</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#9a8464]">Admin Panel</span>
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-400 text-sm">Active</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#9a8464]">Game Services</span>
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-400 text-sm">Running</span>
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#2a1f17] rounded-xl p-6 border border-[#8b6f31]">
          <h3 className="text-xl font-semibold text-[#f1e5c8] mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={loadStats}
              className="w-full flex items-center justify-between px-4 py-2 bg-[#8b6f31] hover:bg-[#c5a572] text-[#231913] rounded-lg transition-colors font-medium"
            >
              <span>Refresh Statistics</span>
              <span>🔄</span>
            </button>
            <Link
              href="/admin/items"
              className="w-full flex items-center justify-between px-4 py-2 bg-[#3d2f22] hover:bg-[#4d3f32] text-[#f1e5c8] rounded-lg transition-colors"
            >
              <span>Add New Item</span>
              <span>➕</span>
            </Link>
            <Link
              href="/admin/missions"
              className="w-full flex items-center justify-between px-4 py-2 bg-[#3d2f22] hover:bg-[#4d3f32] text-[#f1e5c8] rounded-lg transition-colors"
            >
              <span>Create Mission</span>
              <span>🗺️</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}