'use client';

import { useState, useEffect } from 'react';
import { MissionRisk } from '@prisma/client';

interface MissionDef {
  id: string;
  name: string;
  description: string;
  fromHub: string;
  toHub: string;
  distance: number;
  baseDuration: number;
  baseReward: number;
  riskLevel: MissionRisk;
  itemRewards?: { itemKey: string; qty: number }[];
  isActive: boolean;
}

export default function AdminMissionsPage() {
  const [missions, setMissions] = useState<MissionDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMission, setEditingMission] = useState<MissionDef | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    try {
      const response = await fetch('/api/admin/missions');
      const data = await response.json();
      setMissions(data);
    } catch (error) {
      console.error('Failed to load missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMission = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mission?')) return;

    try {
      const response = await fetch(`/api/admin/missions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMissions(missions.filter(m => m.id !== id));
      } else {
        alert('Failed to delete mission');
      }
    } catch (error) {
      console.error('Failed to delete mission:', error);
      alert('Failed to delete mission');
    }
  };

  const toggleActive = async (mission: MissionDef) => {
    try {
      const response = await fetch(`/api/admin/missions/${mission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...mission, isActive: !mission.isActive }),
      });

      if (response.ok) {
        const updatedMission = await response.json();
        setMissions(missions.map(m => m.id === mission.id ? updatedMission : m));
      } else {
        alert('Failed to update mission');
      }
    } catch (error) {
      console.error('Failed to update mission:', error);
      alert('Failed to update mission');
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600 dark:text-slate-400">Loading missions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Mission Management</h1>
          <p className="text-slate-600 dark:text-slate-400">Configure missions, routes, and rewards</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-slate-600 dark:text-slate-400 text-sm">Total Missions: </span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">{missions.length}</span>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 shadow-sm"
          >
            <span>➕</span>
            <span>Create New Mission</span>
          </button>
        </div>
      </div>

      {(showCreateForm || editingMission) && (
        <MissionForm
          mission={editingMission}
          onSave={(mission) => {
            if (editingMission) {
              setMissions(missions.map(m => m.id === mission.id ? mission : m));
            } else {
              setMissions([...missions, mission]);
            }
            setEditingMission(null);
            setShowCreateForm(false);
          }}
          onCancel={() => {
            setEditingMission(null);
            setShowCreateForm(false);
          }}
        />
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-slate-50 dark:bg-slate-700 px-6 py-4 border-b border-slate-200 dark:border-slate-600">
          <div className="grid grid-cols-9 gap-4 font-semibold text-slate-900 dark:text-slate-100 text-sm">
            <div>Name</div>
            <div>Route</div>
            <div>Distance</div>
            <div>Duration</div>
            <div>Reward</div>
            <div>Risk</div>
            <div>Item Rewards</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {missions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-slate-400 dark:text-slate-500 text-lg mb-2">🗺️</div>
              <div className="text-slate-600 dark:text-slate-400 font-medium mb-1">No missions found</div>
              <div className="text-slate-500 dark:text-slate-500 text-sm">Create your first mission to get started</div>
            </div>
          ) : (
            missions.map((mission, index) => (
              <div
                key={mission.id}
                className={`grid grid-cols-9 gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm ${
                  index !== missions.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''
                }`}
              >
                <div className="font-medium text-slate-900 dark:text-slate-100">{mission.name}</div>
                <div className="text-slate-600 dark:text-slate-400">
                  {mission.fromHub} → {mission.toHub}
                </div>
                <div className="text-slate-600 dark:text-slate-400">{mission.distance}km</div>
                <div className="text-slate-600 dark:text-slate-400">{Math.floor(mission.baseDuration / 60)}h {mission.baseDuration % 60}m</div>
                <div className="text-green-600 dark:text-green-400 font-medium">{mission.baseReward}g</div>
                <div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(mission.riskLevel)}`}>
                    {mission.riskLevel}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  {mission.itemRewards?.map((reward, i) => (
                    <div key={i} className="text-slate-500 dark:text-slate-400">
                      {reward.itemKey} x{reward.qty}
                    </div>
                  )) || <span className="text-slate-400 dark:text-slate-500">None</span>}
                </div>
                <div>
                  <button
                    onClick={() => toggleActive(mission)}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                      mission.isActive
                        ? 'bg-green-500 dark:bg-green-600 text-green-100 hover:bg-green-600 dark:hover:bg-green-700'
                        : 'bg-red-500 dark:bg-red-600 text-red-100 hover:bg-red-600 dark:hover:bg-red-700'
                    }`}
                  >
                    {mission.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setEditingMission(mission)}
                    className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMission(mission.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MissionForm({
  mission,
  onSave,
  onCancel,
}: {
  mission: MissionDef | null;
  onSave: (mission: MissionDef) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: mission?.name || '',
    description: mission?.description || '',
    fromHub: mission?.fromHub || '',
    toHub: mission?.toHub || '',
    distance: mission?.distance || 50,
    baseDuration: mission?.baseDuration || 300,
    baseReward: mission?.baseReward || 50,
    riskLevel: mission?.riskLevel || 'LOW' as MissionRisk,
    itemRewards: mission?.itemRewards || [{ itemKey: '', qty: 1 }],
    isActive: mission?.isActive !== undefined ? mission.isActive : true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      itemRewards: formData.itemRewards.filter(reward => reward.itemKey && reward.qty > 0),
    };

    try {
      const url = mission ? `/api/admin/missions/${mission.id}` : '/api/admin/missions';
      const method = mission ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const savedMission = await response.json();
        onSave(savedMission);
      } else {
        alert('Failed to save mission');
      }
    } catch (error) {
      console.error('Failed to save mission:', error);
      alert('Failed to save mission');
    }
  };

  const addItemReward = () => {
    setFormData({
      ...formData,
      itemRewards: [...formData.itemRewards, { itemKey: '', qty: 1 }],
    });
  };

  const updateItemReward = (index: number, field: 'itemKey' | 'qty', value: string | number) => {
    const newRewards = [...formData.itemRewards];
    newRewards[index] = { ...newRewards[index], [field]: value };
    setFormData({ ...formData, itemRewards: newRewards });
  };

  const removeItemReward = (index: number) => {
    setFormData({
      ...formData,
      itemRewards: formData.itemRewards.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="bg-[#2a1f17] border border-[#8b6f31] rounded-lg p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">
        {mission ? 'Edit Mission' : 'Create New Mission'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium mb-1">Risk Level</label>
            <select
              value={formData.riskLevel}
              onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value as MissionRisk })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
            >
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              rows={2}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">From Hub</label>
            <input
              type="text"
              value={formData.fromHub}
              onChange={(e) => setFormData({ ...formData, fromHub: e.target.value })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">To Hub</label>
            <input
              type="text"
              value={formData.toHub}
              onChange={(e) => setFormData({ ...formData, toHub: e.target.value })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Distance (km)</label>
            <input
              type="number"
              value={formData.distance}
              onChange={(e) => setFormData({ ...formData, distance: parseInt(e.target.value) || 50 })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Duration (seconds)</label>
            <input
              type="number"
              value={formData.baseDuration}
              onChange={(e) => setFormData({ ...formData, baseDuration: parseInt(e.target.value) || 300 })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              min="60"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Base Reward (gold)</label>
            <input
              type="number"
              value={formData.baseReward}
              onChange={(e) => setFormData({ ...formData, baseReward: parseInt(e.target.value) || 50 })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              min="1"
              required
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <span>Active</span>
            </label>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Item Rewards</h3>
            <button
              type="button"
              onClick={addItemReward}
              className="bg-[#5a4a3a] hover:bg-[#6b5a4a] text-[#f1e5c8] px-3 py-1 rounded text-sm transition-colors"
            >
              Add Reward
            </button>
          </div>

          {formData.itemRewards.map((reward, index) => (
            <div key={index} className="grid grid-cols-3 gap-2 mb-2">
              <input
                type="text"
                value={reward.itemKey}
                onChange={(e) => updateItemReward(index, 'itemKey', e.target.value)}
                placeholder="Item Key"
                className="bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              />
              <input
                type="number"
                value={reward.qty}
                onChange={(e) => updateItemReward(index, 'qty', parseInt(e.target.value) || 1)}
                placeholder="Quantity"
                className="bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
                min="1"
              />
              <button
                type="button"
                onClick={() => removeItemReward(index)}
                className="text-red-400 hover:text-red-300 px-3 py-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            className="bg-[#8b6f31] hover:bg-[#c5a572] text-[#231913] px-4 py-2 rounded font-semibold transition-colors"
          >
            {mission ? 'Update' : 'Create'} Mission
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

function getRiskColor(risk: MissionRisk): string {
  switch (risk) {
    case 'LOW':
      return 'bg-green-500 dark:bg-green-600 text-green-100';
    case 'MEDIUM':
      return 'bg-yellow-500 dark:bg-yellow-600 text-yellow-100';
    case 'HIGH':
      return 'bg-red-500 dark:bg-red-600 text-red-100';
    default:
      return 'bg-slate-500 dark:bg-slate-600 text-slate-100';
  }
}