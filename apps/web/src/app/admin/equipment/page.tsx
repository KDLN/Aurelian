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
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading equipment...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Equipment Management</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-[#8b6f31] hover:bg-[#c5a572] text-[#231913] px-4 py-2 rounded font-semibold transition-colors"
        >
          Create New Equipment
        </button>
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

      <div className="bg-[#2a1f17] border border-[#8b6f31] rounded-lg">
        <div className="grid grid-cols-9 gap-2 p-4 border-b border-[#8b6f31] font-semibold text-sm">
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

        {equipment.map((eq) => (
          <div
            key={eq.id}
            className="grid grid-cols-9 gap-2 p-4 border-b border-[#3d2f22] hover:bg-[#3d2f22] transition-colors text-sm"
          >
            <div className="font-mono">{eq.itemKey}</div>
            <div>{eq.name}</div>
            <div>
              <span className={`px-2 py-1 rounded text-xs ${getSlotColor(eq.slot)}`}>
                {eq.slot}
              </span>
            </div>
            <div>
              <span className={`px-2 py-1 rounded text-xs ${getRarityColor(eq.rarity)}`}>
                {eq.rarity}
              </span>
            </div>
            <div className={eq.successBonus > 0 ? 'text-green-400' : eq.successBonus < 0 ? 'text-red-400' : ''}>
              {eq.successBonus > 0 ? '+' : ''}{eq.successBonus}
            </div>
            <div className={eq.speedBonus > 0 ? 'text-green-400' : eq.speedBonus < 0 ? 'text-red-400' : ''}>
              {eq.speedBonus > 0 ? '+' : ''}{eq.speedBonus}
            </div>
            <div className={eq.rewardBonus > 0 ? 'text-green-400' : eq.rewardBonus < 0 ? 'text-red-400' : ''}>
              {eq.rewardBonus > 0 ? '+' : ''}{eq.rewardBonus}
            </div>
            <div>Lv{eq.minLevel}</div>
            <div className="flex space-x-2">
              <button
                onClick={() => setEditingEquipment(eq)}
                className="text-[#c5a572] hover:text-[#f1e5c8] text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => deleteEquipment(eq.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-[#9a8464] text-sm">
        Total equipment: {equipment.length}
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
    <div className="bg-[#2a1f17] border border-[#8b6f31] rounded-lg p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">
        {equipment ? 'Edit Equipment' : 'Create New Equipment'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Item Key</label>
            <input
              type="text"
              value={formData.itemKey}
              onChange={(e) => setFormData({ ...formData, itemKey: e.target.value })}
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
            <label className="block text-sm font-medium mb-1">Slot</label>
            <select
              value={formData.slot}
              onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
            >
              <option value="WEAPON">Weapon</option>
              <option value="ARMOR">Armor</option>
              <option value="TOOL">Tool</option>
              <option value="ACCESSORY">Accessory</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Rarity</label>
            <select
              value={formData.rarity}
              onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
            >
              <option value="COMMON">Common</option>
              <option value="UNCOMMON">Uncommon</option>
              <option value="RARE">Rare</option>
              <option value="EPIC">Epic</option>
              <option value="LEGENDARY">Legendary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Success Bonus</label>
            <input
              type="number"
              value={formData.successBonus}
              onChange={(e) => setFormData({ ...formData, successBonus: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Speed Bonus</label>
            <input
              type="number"
              value={formData.speedBonus}
              onChange={(e) => setFormData({ ...formData, speedBonus: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reward Bonus</label>
            <input
              type="number"
              value={formData.rewardBonus}
              onChange={(e) => setFormData({ ...formData, rewardBonus: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Min Level</label>
            <input
              type="number"
              value={formData.minLevel}
              onChange={(e) => setFormData({ ...formData, minLevel: parseInt(e.target.value) || 1 })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Agent Type (Optional)</label>
            <select
              value={formData.agentType}
              onChange={(e) => setFormData({ ...formData, agentType: e.target.value })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
            >
              <option value="">Any Agent</option>
              <option value="GUARD">Guard</option>
              <option value="SCOUT">Scout</option>
              <option value="TRADER">Trader</option>
              <option value="SPECIALIST">Specialist</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            className="bg-[#8b6f31] hover:bg-[#c5a572] text-[#231913] px-4 py-2 rounded font-semibold transition-colors"
          >
            {equipment ? 'Update' : 'Create'} Equipment
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

function getSlotColor(slot: string): string {
  switch (slot) {
    case 'WEAPON':
      return 'bg-red-600 text-red-100';
    case 'ARMOR':
      return 'bg-blue-600 text-blue-100';
    case 'TOOL':
      return 'bg-yellow-600 text-yellow-100';
    case 'ACCESSORY':
      return 'bg-purple-600 text-purple-100';
    default:
      return 'bg-gray-600 text-gray-100';
  }
}

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'COMMON':
      return 'bg-gray-600 text-gray-100';
    case 'UNCOMMON':
      return 'bg-green-600 text-green-100';
    case 'RARE':
      return 'bg-blue-600 text-blue-100';
    case 'EPIC':
      return 'bg-purple-600 text-purple-100';
    case 'LEGENDARY':
      return 'bg-orange-600 text-orange-100';
    default:
      return 'bg-gray-600 text-gray-100';
  }
}