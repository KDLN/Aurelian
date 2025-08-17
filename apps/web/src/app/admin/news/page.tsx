'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Edit, Eye, EyeOff, Plus, X } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  isActive: boolean;
  isPinned: boolean;
  publishedAt: string;
  expiresAt?: string | null;
  author: {
    name: string;
    id: string;
  };
}

const categories = [
  { value: 'update', label: '🆕 Update', variant: 'default' as const },
  { value: 'event', label: '🎉 Event', variant: 'secondary' as const },
  { value: 'maintenance', label: '🚧 Maintenance', variant: 'destructive' as const },
  { value: 'market', label: '📈 Market', variant: 'outline' as const },
  { value: 'announcement', label: '📢 Announcement', variant: 'secondary' as const }
];

const priorities = [
  { value: 'low', label: 'Low', variant: 'outline' as const },
  { value: 'normal', label: 'Normal', variant: 'secondary' as const },
  { value: 'high', label: 'High', variant: 'default' as const },
  { value: 'urgent', label: 'Urgent', variant: 'destructive' as const }
];

export default function NewsManagement() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'announcement',
    priority: 'normal',
    isPinned: false,
    expiresAt: ''
  });

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/admin/news?includeInactive=true', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setNews(result.news || []);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const url = '/api/admin/news';
      const method = editingNews ? 'PUT' : 'POST';
      const body = editingNews 
        ? { id: editingNews.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchNews();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving news:', error);
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingNews(null);
    setFormData({
      title: '',
      content: '',
      category: 'announcement',
      priority: 'normal',
      isPinned: false,
      expiresAt: ''
    });
  };

  const handleEdit = (newsItem: NewsItem) => {
    setEditingNews(newsItem);
    setFormData({
      title: newsItem.title,
      content: newsItem.content,
      category: newsItem.category,
      priority: newsItem.priority,
      isPinned: newsItem.isPinned,
      expiresAt: newsItem.expiresAt ? newsItem.expiresAt.split('T')[0] : ''
    });
    setShowCreateForm(true);
  };

  const handleToggleActive = async (newsItem: NewsItem) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/admin/news', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: newsItem.id,
          isActive: !newsItem.isActive
        }),
      });

      if (response.ok) {
        await fetchNews();
      }
    } catch (error) {
      console.error('Error toggling news status:', error);
    }
  };

  const handleDelete = async (newsId: string) => {
    if (!confirm('Are you sure you want to delete this news item?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/admin/news?id=${newsId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        await fetchNews();
      }
    } catch (error) {
      console.error('Error deleting news:', error);
    }
  };

  const getCategoryInfo = (category: string) => {
    return categories.find(c => c.value === category) || categories[4];
  };

  const getPriorityInfo = (priority: string) => {
    return priorities.find(p => p.value === priority) || priorities[1];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <p>Loading news management...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">News & Announcements</CardTitle>
                <CardDescription>
                  Manage game updates, events, and announcements
                </CardDescription>
              </div>
              <Button 
                onClick={() => {
                  if (showCreateForm) {
                    resetForm();
                  } else {
                    setShowCreateForm(true);
                  }
                }}
                className="w-full sm:w-auto"
              >
                {showCreateForm ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create News
                  </>
                )}
              </Button>
            </div>
          </CardHeader>

          {/* Create/Edit Form */}
          {showCreateForm && (
            <CardContent className="border-t">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="Enter news title..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      required
                      rows={4}
                      placeholder="Enter news content..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Priority</Label>
                      <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorities.map(pri => (
                            <SelectItem key={pri.value} value={pri.value}>
                              {pri.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pinned"
                        checked={formData.isPinned}
                        onCheckedChange={(checked) => setFormData({ ...formData, isPinned: !!checked })}
                      />
                      <Label htmlFor="pinned">Pin to top</Label>
                    </div>

                    <div>
                      <Label htmlFor="expiresAt">Expires At (optional)</Label>
                      <Input
                        id="expiresAt"
                        type="date"
                        value={formData.expiresAt}
                        onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full sm:w-auto">
                  {editingNews ? 'Update News' : 'Create News'}
                </Button>
              </form>
            </CardContent>
          )}
        </Card>

        {/* News List */}
        <Card>
          <CardHeader>
            <CardTitle>Existing News Items ({news.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {news.length === 0 ? (
              <p className="text-muted-foreground">No news items found.</p>
            ) : (
              <div className="space-y-4">
                {news.map(item => {
                  const categoryInfo = getCategoryInfo(item.category);
                  const priorityInfo = getPriorityInfo(item.priority);
                  
                  return (
                    <Card key={item.id} className="relative">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge variant={categoryInfo.variant}>
                                {categoryInfo.label}
                              </Badge>
                              <Badge variant={priorityInfo.variant}>
                                {priorityInfo.label.toUpperCase()}
                              </Badge>
                              {item.isPinned && (
                                <Badge variant="outline">📌 Pinned</Badge>
                              )}
                              {!item.isActive && (
                                <Badge variant="destructive">❌ Inactive</Badge>
                              )}
                            </div>
                            
                            {/* Content */}
                            <h3 className="font-semibold text-lg mb-2 break-words">{item.title}</h3>
                            <p className="text-muted-foreground text-sm mb-3 break-words">
                              {item.content.length > 150 
                                ? `${item.content.substring(0, 150)}...` 
                                : item.content
                              }
                            </p>
                            
                            {/* Meta */}
                            <div className="text-xs text-muted-foreground">
                              By {item.author.name} • {new Date(item.publishedAt).toLocaleDateString()}
                              {item.expiresAt && ` • Expires: ${new Date(item.expiresAt).toLocaleDateString()}`}
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:ml-4 w-full sm:w-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              className="w-full sm:flex-1 lg:w-auto"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant={item.isActive ? "outline" : "default"}
                              size="sm"
                              onClick={() => handleToggleActive(item)}
                              className="w-full sm:flex-1 lg:w-auto"
                            >
                              {item.isActive ? (
                                <>
                                  <EyeOff className="w-4 h-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="w-full sm:flex-1 lg:w-auto"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}