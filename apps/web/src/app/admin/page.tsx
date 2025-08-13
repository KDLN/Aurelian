'use client';

import { useState } from 'react';
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
  return (
    <div className="min-h-screen bg-[#231913] text-[#f1e5c8]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Aurelian Admin Panel</h1>
          <p className="text-[#c5a572]">Manage game content and configuration</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className="bg-[#2a1f17] border border-[#8b6f31] rounded-lg p-6 hover:border-[#c5a572] transition-colors group"
            >
              <div className="flex items-start space-x-4">
                <div className="text-3xl">{section.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-[#c5a572] transition-colors">
                    {section.title}
                  </h3>
                  <p className="text-[#9a8464] text-sm">{section.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 bg-[#2a1f17] border border-[#8b6f31] rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Quick Stats</h2>
          <QuickStats />
        </div>
      </div>
    </div>
  );
}

function QuickStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
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

  if (!stats && !loading) {
    return (
      <button
        onClick={loadStats}
        className="bg-[#8b6f31] hover:bg-[#c5a572] text-[#231913] px-4 py-2 rounded font-semibold transition-colors"
      >
        Load Database Stats
      </button>
    );
  }

  if (loading) {
    return <div className="text-[#9a8464]">Loading stats...</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {stats && Object.entries(stats).map(([key, value]) => (
        <div key={key} className="text-center">
          <div className="text-2xl font-bold text-[#c5a572]">{value as number}</div>
          <div className="text-sm text-[#9a8464] capitalize">{key}</div>
        </div>
      ))}
    </div>
  );
}