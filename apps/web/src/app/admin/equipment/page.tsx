'use client';

import { useState, useEffect } from 'react';

interface EquipmentDef {
  id: string;
  itemKey: string;
  name: string;
  description: string;
  slot: string;
  rarity: string;
  successBonus: number;
  speedBonus: number;
  rewardBonus: number;
  minLevel: number;
  agentType: string | null;
}

export default function AdminEquipmentPage() {
  const [equipment, setEquipment] = useState<EquipmentDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentDef | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    try {
      const response = await fetch('/api/admin/equipment');
      const data = await response.json();
      setEquipment(data);
    } catch (error) {
      console.error('Failed to load equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteEquipment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return;

    try {
      const response = await fetch(`/api/admin/equipment/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setEquipment(equipment.filter(eq => eq.id !== id));
      } else {
        alert('Failed to delete equipment');
      }
    } catch (error) {
      console.error('Failed to delete equipment:', error);
      alert('Failed to delete equipment');
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600 dark:text-slate-400">Loading equipment...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Equipment Management</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage agent equipment and their stat bonuses</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-slate-600 dark:text-slate-400 text-sm">Total Equipment: </span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">{equipment.length}</span>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 shadow-sm"
          >
            <span>➕</span>
            <span>Create New Equipment</span>
          </button>
        </div>
      </div>

      {(showCreateForm || editingEquipment) && (
        <EquipmentForm
          equipment={editingEquipment}
          onSave={(eq) => {
            if (editingEquipment) {
              setEquipment(equipment.map(e => e.id === eq.id ? eq : e));
            } else {
              setEquipment([...equipment, eq]);
            }
            setEditingEquipment(null);
            setShowCreateForm(false);
          }}
          onCancel={() => {
            setEditingEquipment(null);
            setShowCreateForm(false);
          }}
        />
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-slate-50 dark:bg-slate-700 px-6 py-4 border-b border-slate-200 dark:border-slate-600">
          <div className="grid grid-cols-9 gap-4 font-semibold text-slate-900 dark:text-slate-100 text-sm">
            <div>Item Key</div>
            <div>Name</div>
            <div>Slot</div>
            <div>Rarity</div>
            <div>Success</div>
            <div>Speed</div>
            <div>Reward</div>
            <div>Min Level</div>
            <div>Actions</div>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {equipment.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-slate-400 dark:text-slate-500 text-lg mb-2">⚔️</div>
              <div className="text-slate-600 dark:text-slate-400 font-medium mb-1">No equipment found</div>
              <div className="text-slate-500 dark:text-slate-500 text-sm">Create your first equipment to get started</div>
            </div>
          ) : (
            equipment.map((eq, index) => (
              <div
                key={eq.id}
                className={`grid grid-cols-9 gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm ${
                  index !== equipment.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''
                }`}
              >
                <div className="font-mono text-slate-600 dark:text-slate-400">{eq.itemKey}</div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{eq.name}</div>
                <div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSlotColor(eq.slot)}`}>
                    {eq.slot}
                  </span>
                </div>
                <div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRarityColor(eq.rarity)}`}>
                    {eq.rarity}
                  </span>
                </div>
                <div className={eq.successBonus > 0 ? 'text-green-600 dark:text-green-400 font-medium' : eq.successBonus < 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400'}>
                  {eq.successBonus > 0 ? '+' : ''}{eq.successBonus}
                </div>
                <div className={eq.speedBonus > 0 ? 'text-green-600 dark:text-green-400 font-medium' : eq.speedBonus < 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400'}>
                  {eq.speedBonus > 0 ? '+' : ''}{eq.speedBonus}
                </div>
                <div className={eq.rewardBonus > 0 ? 'text-green-600 dark:text-green-400 font-medium' : eq.rewardBonus < 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400'}>
                  {eq.rewardBonus > 0 ? '+' : ''}{eq.rewardBonus}
                </div>
                <div className="text-slate-600 dark:text-slate-400">Lv{eq.minLevel}</div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setEditingEquipment(eq)}
                    className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteEquipment(eq.id)}
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

function EquipmentForm({
  equipment,
  onSave,
  onCancel,
}: {
  equipment: EquipmentDef | null;
  onSave: (equipment: EquipmentDef) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    itemKey: equipment?.itemKey || '',
    name: equipment?.name || '',
    description: equipment?.description || '',
    slot: equipment?.slot || 'WEAPON',
    rarity: equipment?.rarity || 'COMMON',
    successBonus: equipment?.successBonus || 0,
    speedBonus: equipment?.speedBonus || 0,
    rewardBonus: equipment?.rewardBonus || 0,
    minLevel: equipment?.minLevel || 1,
    agentType: equipment?.agentType || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      agentType: formData.agentType || null,
    };

    try {
      const url = equipment ? `/api/admin/equipment/${equipment.id}` : '/api/admin/equipment';
      const method = equipment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const savedEquipment = await response.json();
        onSave(savedEquipment);
      } else {
        alert('Failed to save equipment');
      }
    } catch (error) {
      console.error('Failed to save equipment:', error);
      alert('Failed to save equipment');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 lg:p-8 mb-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {equipment ? 'Edit Equipment' : 'Create New Equipment'}
        </h2>
        <button
          onClick={onCancel}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl transition-colors rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Item Key</label>
            <input
              type="text"
              value={formData.itemKey}
              onChange={(e) => setFormData({ ...formData, itemKey: e.target.value })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              placeholder="equipment_key"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              placeholder="Equipment Name"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              rows={3}
              placeholder="Equipment description..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Slot</label>
            <select
              value={formData.slot}
              onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            >
              <option value="WEAPON">Weapon</option>
              <option value="ARMOR">Armor</option>
              <option value="TOOL">Tool</option>
              <option value="ACCESSORY">Accessory</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Rarity</label>
            <select
              value={formData.rarity}
              onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            >
              <option value="COMMON">Common</option>
              <option value="UNCOMMON">Uncommon</option>
              <option value="RARE">Rare</option>
              <option value="EPIC">Epic</option>
              <option value="LEGENDARY">Legendary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Success Bonus</label>
            <input
              type="number"
              value={formData.successBonus}
              onChange={(e) => setFormData({ ...formData, successBonus: parseInt(e.target.value) || 0 })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Speed Bonus</label>
            <input
              type="number"
              value={formData.speedBonus}
              onChange={(e) => setFormData({ ...formData, speedBonus: parseInt(e.target.value) || 0 })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Reward Bonus</label>
            <input
              type="number"
              value={formData.rewardBonus}
              onChange={(e) => setFormData({ ...formData, rewardBonus: parseInt(e.target.value) || 0 })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Min Level</label>
            <input
              type="number"
              value={formData.minLevel}
              onChange={(e) => setFormData({ ...formData, minLevel: parseInt(e.target.value) || 1 })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              min="1"
              placeholder="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Agent Type (Optional)</label>
            <select
              value={formData.agentType}
              onChange={(e) => setFormData({ ...formData, agentType: e.target.value })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            >
              <option value="">Any Agent</option>
              <option value="GUARD">Guard</option>
              <option value="SCOUT">Scout</option>
              <option value="TRADER">Trader</option>
              <option value="SPECIALIST">Specialist</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onCancel}
            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-md font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors flex items-center justify-center space-x-2 shadow-sm"
          >
            <span>{equipment ? '💾' : '➕'}</span>
            <span>{equipment ? 'Update' : 'Create'} Equipment</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function getSlotColor(slot: string): string {
  switch (slot) {
    case 'WEAPON':
      return 'bg-red-500 dark:bg-red-600 text-red-100';
    case 'ARMOR':
      return 'bg-blue-500 dark:bg-blue-600 text-blue-100';
    case 'TOOL':
      return 'bg-yellow-500 dark:bg-yellow-600 text-yellow-100';
    case 'ACCESSORY':
      return 'bg-purple-500 dark:bg-purple-600 text-purple-100';
    default:
      return 'bg-slate-500 dark:bg-slate-600 text-slate-100';
  }
}

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'COMMON':
      return 'bg-slate-500 dark:bg-slate-600 text-slate-100';
    case 'UNCOMMON':
      return 'bg-green-500 dark:bg-green-600 text-green-100';
    case 'RARE':
      return 'bg-blue-500 dark:bg-blue-600 text-blue-100';
    case 'EPIC':
      return 'bg-purple-500 dark:bg-purple-600 text-purple-100';
    case 'LEGENDARY':
      return 'bg-orange-500 dark:bg-orange-600 text-orange-100';
    default:
      return 'bg-slate-500 dark:bg-slate-600 text-slate-100';
  }
}