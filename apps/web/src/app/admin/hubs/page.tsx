'use client';

import { useState, useEffect } from 'react';

interface Hub {
  id: string;
  key: string;
  name: string;
  x: number;
  y: number;
  safe: boolean;
  _count?: {
    linksA: number;
    linksB: number;
  };
}

interface Link {
  id: string;
  aId: string;
  bId: string;
  baseDist: number;
  baseRisk: number;
  toll: number;
  capacity: number;
  a: { name: string };
  b: { name: string };
}

export default function AdminHubsPage() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingHub, setEditingHub] = useState<Hub | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'hubs' | 'links'>('hubs');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [hubsRes, linksRes] = await Promise.all([
        fetch('/api/admin/hubs'),
        fetch('/api/admin/links'),
      ]);

      const [hubsData, linksData] = await Promise.all([
        hubsRes.json(),
        linksRes.json(),
      ]);

      setHubs(hubsData);
      setLinks(linksData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteHub = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hub? This will also delete all connected routes.')) return;

    try {
      const response = await fetch(`/api/admin/hubs/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setHubs(hubs.filter(h => h.id !== id));
        setLinks(links.filter(l => l.aId !== id && l.bId !== id));
      } else {
        alert('Failed to delete hub');
      }
    } catch (error) {
      console.error('Failed to delete hub:', error);
      alert('Failed to delete hub');
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;

    try {
      const response = await fetch(`/api/admin/links/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setLinks(links.filter(l => l.id !== id));
      } else {
        alert('Failed to delete route');
      }
    } catch (error) {
      console.error('Failed to delete route:', error);
      alert('Failed to delete route');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading hubs...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Hub & Route Management</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-[#8b6f31] hover:bg-[#c5a572] text-[#231913] px-4 py-2 rounded font-semibold transition-colors"
          >
            Create New Hub
          </button>
          <button
            onClick={() => setShowLinkForm(true)}
            className="bg-[#5a4a3a] hover:bg-[#6b5a4a] text-[#f1e5c8] px-4 py-2 rounded font-semibold transition-colors"
          >
            Create New Route
          </button>
        </div>
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('hubs')}
          className={`px-4 py-2 rounded transition-colors ${
            activeTab === 'hubs'
              ? 'bg-[#8b6f31] text-[#231913]'
              : 'bg-[#5a4a3a] text-[#f1e5c8] hover:bg-[#6b5a4a]'
          }`}
        >
          Hubs ({hubs.length})
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`px-4 py-2 rounded transition-colors ${
            activeTab === 'links'
              ? 'bg-[#8b6f31] text-[#231913]'
              : 'bg-[#5a4a3a] text-[#f1e5c8] hover:bg-[#6b5a4a]'
          }`}
        >
          Routes ({links.length})
        </button>
      </div>

      {(showCreateForm || editingHub) && (
        <HubForm
          hub={editingHub}
          onSave={(hub) => {
            if (editingHub) {
              setHubs(hubs.map(h => h.id === hub.id ? hub : h));
            } else {
              setHubs([...hubs, hub]);
            }
            setEditingHub(null);
            setShowCreateForm(false);
          }}
          onCancel={() => {
            setEditingHub(null);
            setShowCreateForm(false);
          }}
        />
      )}

      {showLinkForm && (
        <LinkForm
          hubs={hubs}
          onSave={(link) => {
            setLinks([...links, link]);
            setShowLinkForm(false);
          }}
          onCancel={() => setShowLinkForm(false)}
        />
      )}

      {activeTab === 'hubs' && (
        <div className="bg-[#2a1f17] border border-[#8b6f31] rounded-lg">
          <div className="grid grid-cols-7 gap-4 p-4 border-b border-[#8b6f31] font-semibold">
            <div>Key</div>
            <div>Name</div>
            <div>Coordinates</div>
            <div>Safe</div>
            <div>Connections</div>
            <div>Created</div>
            <div>Actions</div>
          </div>

          {hubs.map((hub) => {
            const totalConnections = (hub._count?.linksA || 0) + (hub._count?.linksB || 0);
            return (
              <div
                key={hub.id}
                className="grid grid-cols-7 gap-4 p-4 border-b border-[#3d2f22] hover:bg-[#3d2f22] transition-colors"
              >
                <div className="font-mono text-sm">{hub.key}</div>
                <div>{hub.name}</div>
                <div className="text-sm text-[#9a8464]">({hub.x}, {hub.y})</div>
                <div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    hub.safe ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
                  }`}>
                    {hub.safe ? 'Safe' : 'Dangerous'}
                  </span>
                </div>
                <div>{totalConnections} routes</div>
                <div className="text-sm text-[#9a8464]">Recently</div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingHub(hub)}
                    className="text-[#c5a572] hover:text-[#f1e5c8] text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteHub(hub.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'links' && (
        <div className="bg-[#2a1f17] border border-[#8b6f31] rounded-lg">
          <div className="grid grid-cols-6 gap-4 p-4 border-b border-[#8b6f31] font-semibold">
            <div>Route</div>
            <div>Distance</div>
            <div>Risk</div>
            <div>Toll</div>
            <div>Capacity</div>
            <div>Actions</div>
          </div>

          {links.map((link) => (
            <div
              key={link.id}
              className="grid grid-cols-6 gap-4 p-4 border-b border-[#3d2f22] hover:bg-[#3d2f22] transition-colors"
            >
              <div className="text-sm">
                {link.a.name} ↔ {link.b.name}
              </div>
              <div>{link.baseDist}km</div>
              <div>
                <span className={`px-2 py-1 rounded text-xs ${getRiskColor(link.baseRisk)}`}>
                  {Math.round(link.baseRisk * 100)}%
                </span>
              </div>
              <div>{link.toll}g</div>
              <div>{link.capacity}</div>
              <div className="flex space-x-2">
                <button
                  onClick={() => deleteLink(link.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HubForm({
  hub,
  onSave,
  onCancel,
}: {
  hub: Hub | null;
  onSave: (hub: Hub) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    key: hub?.key || '',
    name: hub?.name || '',
    x: hub?.x || 500,
    y: hub?.y || 500,
    safe: hub?.safe !== undefined ? hub.safe : true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = hub ? `/api/admin/hubs/${hub.id}` : '/api/admin/hubs';
      const method = hub ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const savedHub = await response.json();
        onSave(savedHub);
      } else {
        alert('Failed to save hub');
      }
    } catch (error) {
      console.error('Failed to save hub:', error);
      alert('Failed to save hub');
    }
  };

  return (
    <div className="bg-[#2a1f17] border border-[#8b6f31] rounded-lg p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">
        {hub ? 'Edit Hub' : 'Create New Hub'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Key</label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">X Coordinate</label>
            <input
              type="number"
              value={formData.x}
              onChange={(e) => setFormData({ ...formData, x: parseInt(e.target.value) || 500 })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Y Coordinate</label>
            <input
              type="number"
              value={formData.y}
              onChange={(e) => setFormData({ ...formData, y: parseInt(e.target.value) || 500 })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              required
            />
          </div>
        </div>

        <div className="flex items-center">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.safe}
              onChange={(e) => setFormData({ ...formData, safe: e.target.checked })}
              className="rounded"
            />
            <span>Safe Area</span>
          </label>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            className="bg-[#8b6f31] hover:bg-[#c5a572] text-[#231913] px-4 py-2 rounded font-semibold transition-colors"
          >
            {hub ? 'Update' : 'Create'} Hub
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-[#5a4a3a] hover:bg-[#6b5a4a] text-[#f1e5c8] px-4 py-2 rounded font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function LinkForm({
  hubs,
  onSave,
  onCancel,
}: {
  hubs: Hub[];
  onSave: (link: Link) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    aId: '',
    bId: '',
    baseDist: 50,
    baseRisk: 0.1,
    toll: 0,
    capacity: 5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.aId === formData.bId) {
      alert('Start and end hubs must be different');
      return;
    }

    try {
      const response = await fetch('/api/admin/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const savedLink = await response.json();
        onSave(savedLink);
      } else {
        alert('Failed to save route');
      }
    } catch (error) {
      console.error('Failed to save route:', error);
      alert('Failed to save route');
    }
  };

  return (
    <div className="bg-[#2a1f17] border border-[#8b6f31] rounded-lg p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">Create New Route</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">From Hub</label>
            <select
              value={formData.aId}
              onChange={(e) => setFormData({ ...formData, aId: e.target.value })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              required
            >
              <option value="">Select Start Hub</option>
              {hubs.map(hub => (
                <option key={hub.id} value={hub.id}>{hub.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">To Hub</label>
            <select
              value={formData.bId}
              onChange={(e) => setFormData({ ...formData, bId: e.target.value })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              required
            >
              <option value="">Select End Hub</option>
              {hubs.map(hub => (
                <option key={hub.id} value={hub.id}>{hub.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Distance (km)</label>
            <input
              type="number"
              value={formData.baseDist}
              onChange={(e) => setFormData({ ...formData, baseDist: parseInt(e.target.value) || 50 })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Risk (0-1)</label>
            <input
              type="number"
              step="0.01"
              value={formData.baseRisk}
              onChange={(e) => setFormData({ ...formData, baseRisk: parseFloat(e.target.value) || 0.1 })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              min="0"
              max="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Toll (gold)</label>
            <input
              type="number"
              value={formData.toll}
              onChange={(e) => setFormData({ ...formData, toll: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Capacity</label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 5 })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              min="1"
            />
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            className="bg-[#8b6f31] hover:bg-[#c5a572] text-[#231913] px-4 py-2 rounded font-semibold transition-colors"
          >
            Create Route
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-[#5a4a3a] hover:bg-[#6b5a4a] text-[#f1e5c8] px-4 py-2 rounded font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function getRiskColor(risk: number): string {
  if (risk < 0.3) return 'bg-green-600 text-green-100';
  if (risk < 0.6) return 'bg-yellow-600 text-yellow-100';
  return 'bg-red-600 text-red-100';
}