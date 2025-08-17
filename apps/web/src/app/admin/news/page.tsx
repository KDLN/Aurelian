'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import GameLayout from '@/components/GameLayout';

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

  const categories = [
    { value: 'update', label: '🆕 Update', color: 'good' },
    { value: 'event', label: '🎉 Event', color: 'warn' },
    { value: 'maintenance', label: '🚧 Maintenance', color: 'bad' },
    { value: 'market', label: '📈 Market', color: 'warn' },
    { value: 'announcement', label: '📢 Announcement', color: 'muted' }
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

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
      }
    } catch (error) {
      console.error('Error saving news:', error);
    }
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

  if (isLoading) {
    return (
      <GameLayout title="News Management">
        <div className="game-card">
          <p>Loading news management...</p>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="News Management">
      <div className="game-flex-col">
        <div className="game-card">
          <div className="game-space-between">
            <h2>News & Announcements Management</h2>
            <button 
              className="game-btn game-btn-primary"
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setEditingNews(null);
                setFormData({
                  title: '',
                  content: '',
                  category: 'announcement',
                  priority: 'normal',
                  isPinned: false,
                  expiresAt: ''
                });
              }}
            >
              {showCreateForm ? 'Cancel' : '+ Create News'}
            </button>
          </div>

          {showCreateForm && (
            <div className="game-card-nested" style={{ marginTop: '1rem' }}>
              <h3>{editingNews ? 'Edit News Item' : 'Create News Item'}</h3>
              <form onSubmit={handleSubmit} className="game-flex-col">
                <div>
                  <label>Title:</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="game-input"
                    required
                  />
                </div>
                
                <div>
                  <label>Content:</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="game-input"
                    rows={4}
                    required
                  />
                </div>

                <div className="game-grid-2">
                  <div>
                    <label>Category:</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="game-input"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Priority:</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="game-input"
                    >
                      {priorities.map(pri => (
                        <option key={pri.value} value={pri.value}>{pri.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="game-grid-2">
                  <div>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.isPinned}
                        onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                      />
                      Pin to top
                    </label>
                  </div>

                  <div>
                    <label>Expires At (optional):</label>
                    <input
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                      className="game-input"
                    />
                  </div>
                </div>

                <button type="submit" className="game-btn game-btn-primary">
                  {editingNews ? 'Update News' : 'Create News'}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="game-card">
          <h3>Existing News Items ({news.length})</h3>
          {news.length === 0 ? (
            <p className="game-muted">No news items found.</p>
          ) : (
            <div className="game-flex-col">
              {news.map(item => {
                const categoryInfo = getCategoryInfo(item.category);
                return (
                  <div key={item.id} className="game-card-nested">
                    <div className="game-space-between">
                      <div>
                        <div className="game-space-between">
                          <span className={`game-pill game-pill-${categoryInfo.color}`}>
                            {categoryInfo.label}
                          </span>
                          {item.isPinned && <span className="game-pill game-pill-warn">📌 Pinned</span>}
                          {!item.isActive && <span className="game-pill game-pill-bad">❌ Inactive</span>}
                          <span className={`game-pill game-pill-${item.priority === 'urgent' ? 'bad' : item.priority === 'high' ? 'warn' : 'good'}`}>
                            {item.priority.toUpperCase()}
                          </span>
                        </div>
                        <h4 style={{ margin: '0.5rem 0' }}>{item.title}</h4>
                        <p className="game-small game-muted">{item.content.substring(0, 100)}...</p>
                        <div className="game-small game-muted">
                          By {item.author.name} • {new Date(item.publishedAt).toLocaleDateString()}
                          {item.expiresAt && ` • Expires: ${new Date(item.expiresAt).toLocaleDateString()}`}
                        </div>
                      </div>
                      <div className="game-flex-col">
                        <button 
                          className="game-btn game-btn-small"
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </button>
                        <button 
                          className={`game-btn game-btn-small ${item.isActive ? 'game-btn-warn' : 'game-btn-good'}`}
                          onClick={() => handleToggleActive(item)}
                        >
                          {item.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          className="game-btn game-btn-small game-btn-bad"
                          onClick={() => handleDelete(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </GameLayout>
  );
}