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
  },
  {
    id: 'equipment',
    title: 'Equipment',
    description: 'Manage weapons, armor, tools, and accessories',
    href: '/admin/equipment',
    icon: '⚔️',
  },
  {
    id: 'blueprints',
    title: 'Blueprints',
    description: 'Manage crafting recipes and requirements',
    href: '/admin/blueprints',
    icon: '📜',
  },
  {
    id: 'missions',
    title: 'Missions',
    description: 'Manage mission definitions and rewards',
    href: '/admin/missions',
    icon: '🚛',
  },
  {
    id: 'hubs',
    title: 'Hubs & Routes',
    description: 'Manage trading hubs and route connections',
    href: '/admin/hubs',
    icon: '🏛️',
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
    <div className="p-6 lg:p-8 space-y-8">
      {/* Welcome Section */}
      <div className="card p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">
              Welcome to the Admin Panel
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage all aspects of your game content from one central location
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-400 to-orange-600 w-16 h-16 rounded-xl flex items-center justify-center text-white text-3xl shadow-lg">
            ⚡
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))
          ) : (
            stats && Object.entries(stats).map(([key, value]) => (
              <div key={key} className="card p-6 hover:shadow-md transition-shadow">
                <div className="text-2xl font-bold mb-1">
                  {value as number}
                </div>
                <div className="text-sm text-muted-foreground capitalize font-medium">
                  {key}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Management Sections */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Content Management
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className="group block"
            >
              <div className="card p-6 hover:shadow-md transition-all">
                <div className="flex items-start space-x-4">
                  <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center text-orange-600 text-2xl group-hover:bg-orange-200 transition-colors">
                    {section.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-orange-600 transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {section.description}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* System Status and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">
            System Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Database Connection</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600 text-sm font-medium">Online</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Admin Panel</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600 text-sm font-medium">Active</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Game Services</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600 text-sm font-medium">Running</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button
              onClick={loadStats}
              className="btn btn-primary w-full flex items-center justify-between"
            >
              <span>Refresh Statistics</span>
              <span>🔄</span>
            </button>
            <Link
              href="/admin/items"
              className="btn btn-secondary w-full flex items-center justify-between"
            >
              <span>Add New Item</span>
              <span>➕</span>
            </Link>
            <Link
              href="/admin/missions"
              className="btn btn-secondary w-full flex items-center justify-between"
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