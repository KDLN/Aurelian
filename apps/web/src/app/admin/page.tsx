'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Plus, Settings, TrendingUp, Users, Package, Sword, ScrollText, Truck, Castle } from 'lucide-react';

const adminSections = [
  {
    id: 'news',
    title: 'News & Announcements',
    description: 'Manage game updates, events, and announcements',
    href: '/admin/news',
    icon: '📢',
    iconComponent: ScrollText,
    color: 'bg-blue-500',
  },
  {
    id: 'items',
    title: 'Items',
    description: 'Manage game items, materials, and crafted goods',
    href: '/admin/items',
    icon: '📦',
    iconComponent: Package,
    color: 'bg-green-500',
  },
  {
    id: 'equipment',
    title: 'Equipment',
    description: 'Manage weapons, armor, tools, and accessories',
    href: '/admin/equipment',
    icon: '⚔️',
    iconComponent: Sword,
    color: 'bg-red-500',
  },
  {
    id: 'blueprints',
    title: 'Blueprints',
    description: 'Manage crafting recipes and requirements',
    href: '/admin/blueprints',
    icon: '📜',
    iconComponent: ScrollText,
    color: 'bg-purple-500',
  },
  {
    id: 'missions',
    title: 'Missions',
    description: 'Manage mission definitions and rewards',
    href: '/admin/missions',
    icon: '🚛',
    iconComponent: Truck,
    color: 'bg-orange-500',
  },
  {
    id: 'hubs',
    title: 'Hubs & Routes',
    description: 'Manage trading hubs and route connections',
    href: '/admin/hubs',
    icon: '🏛️',
    iconComponent: Castle,
    color: 'bg-indigo-500',
  },
];

const systemStatus = [
  { name: 'Database Connection', status: 'online', color: 'bg-green-500' },
  { name: 'Admin Panel', status: 'active', color: 'bg-green-500' },
  { name: 'Game Services', status: 'running', color: 'bg-green-500' },
];

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

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

  const formatStatValue = (value: unknown) => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value || 0);
  };

  const formatStatKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <CardTitle className="text-3xl font-bold flex items-center gap-3">
                  <div className="bg-gradient-to-br from-orange-400 to-orange-600 w-12 h-12 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
                    ⚡
                  </div>
                  Admin Panel
                </CardTitle>
                <CardDescription className="text-lg">
                  Manage all aspects of your game content from one central location
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={loadStats}
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Stats
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-muted animate-pulse rounded-lg p-6">
                    <div className="h-8 bg-muted-foreground/20 rounded mb-2"></div>
                    <div className="h-4 bg-muted-foreground/20 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {stats && Object.entries(stats).map(([key, value]) => (
                  <Card key={key} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold mb-1">
                        {formatStatValue(value)}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium">
                        {formatStatKey(key)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Management Sections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Content Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminSections.map((section) => (
                <Link
                  key={section.id}
                  href={section.href}
                  className="group block"
                >
                  <Card className="hover:shadow-md transition-all h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`${section.color} w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl group-hover:scale-110 transition-transform shadow-lg`}>
                          <section.iconComponent className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                            {section.title}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            {section.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemStatus.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                    <span className="text-muted-foreground font-medium">{item.name}</span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 ${item.color} rounded-full`}></div>
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  onClick={loadStats}
                  variant="default"
                  className="w-full justify-between"
                  disabled={loading}
                >
                  <span>Refresh Statistics</span>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-between"
                >
                  <Link href="/admin/items">
                    <span>Add New Item</span>
                    <Package className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-between"
                >
                  <Link href="/admin/missions">
                    <span>Create Mission</span>
                    <Truck className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-between"
                >
                  <Link href="/admin/news">
                    <span>Add News Item</span>
                    <ScrollText className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}