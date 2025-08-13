'use client';

import { useState, useEffect } from 'react';
import { ItemRarity } from '@prisma/client';

interface ItemDef {
  id: string;
  key: string;
  name: string;
  rarity: ItemRarity;
  stack: number;
  meta?: any;
}

export default function AdminItemsPage() {
  const [items, setItems] = useState<ItemDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<ItemDef | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const response = await fetch('/api/admin/items');
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(`/api/admin/items/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setItems(items.filter(item => item.id !== id));
      } else {
        alert('Failed to delete item');
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading items...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Item Management</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-[#8b6f31] hover:bg-[#c5a572] text-[#231913] px-4 py-2 rounded font-semibold transition-colors"
        >
          Create New Item
        </button>
      </div>

      {(showCreateForm || editingItem) && (
        <ItemForm
          item={editingItem}
          onSave={(item) => {
            if (editingItem) {
              setItems(items.map(i => i.id === item.id ? item : i));
            } else {
              setItems([...items, item]);
            }
            setEditingItem(null);
            setShowCreateForm(false);
          }}
          onCancel={() => {
            setEditingItem(null);
            setShowCreateForm(false);
          }}
        />
      )}

      <div className="bg-[#2a1f17] border border-[#8b6f31] rounded-lg">
        <div className="grid grid-cols-7 gap-4 p-4 border-b border-[#8b6f31] font-semibold">
          <div>Key</div>
          <div>Name</div>
          <div>Rarity</div>
          <div>Stack Size</div>
          <div>Equipment</div>
          <div>Meta</div>
          <div>Actions</div>
        </div>

        {items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-7 gap-4 p-4 border-b border-[#3d2f22] hover:bg-[#3d2f22] transition-colors"
          >
            <div className="font-mono text-sm">{item.key}</div>
            <div>{item.name}</div>
            <div>
              <span className={`px-2 py-1 rounded text-xs ${getRarityColor(item.rarity)}`}>
                {item.rarity}
              </span>
            </div>
            <div>{item.stack}</div>
            <div>{item.meta?.isEquipment ? '✓' : ''}</div>
            <div className="text-xs text-[#9a8464]">
              {item.meta ? Object.keys(item.meta).join(', ') : 'None'}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setEditingItem(item)}
                className="text-[#c5a572] hover:text-[#f1e5c8] text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => deleteItem(item.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-[#9a8464] text-sm">
        Total items: {items.length}
      </div>
    </div>
  );
}

function ItemForm({
  item,
  onSave,
  onCancel,
}: {
  item: ItemDef | null;
  onSave: (item: ItemDef) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    key: item?.key || '',
    name: item?.name || '',
    rarity: item?.rarity || 'COMMON' as ItemRarity,
    stack: item?.stack || 1,
    isEquipment: item?.meta?.isEquipment || false,
    equipmentSlot: item?.meta?.equipmentSlot || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      key: formData.key,
      name: formData.name,
      rarity: formData.rarity,
      stack: formData.stack,
      meta: formData.isEquipment ? {
        isEquipment: true,
        equipmentSlot: formData.equipmentSlot,
      } : null,
    };

    try {
      const url = item ? `/api/admin/items/${item.id}` : '/api/admin/items';
      const method = item ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const savedItem = await response.json();
        onSave(savedItem);
      } else {
        alert('Failed to save item');
      }
    } catch (error) {
      console.error('Failed to save item:', error);
      alert('Failed to save item');
    }
  };

  return (
    <div className="bg-[#2a1f17] border border-[#8b6f31] rounded-lg p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">
        {item ? 'Edit Item' : 'Create New Item'}
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
            <label className="block text-sm font-medium mb-1">Rarity</label>
            <select
              value={formData.rarity}
              onChange={(e) => setFormData({ ...formData, rarity: e.target.value as ItemRarity })}
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
            <label className="block text-sm font-medium mb-1">Stack Size</label>
            <input
              type="number"
              value={formData.stack}
              onChange={(e) => setFormData({ ...formData, stack: parseInt(e.target.value) || 1 })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              min="1"
              required
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isEquipment}
              onChange={(e) => setFormData({ ...formData, isEquipment: e.target.checked })}
              className="rounded"
            />
            <span>Is Equipment</span>
          </label>

          {formData.isEquipment && (
            <div>
              <label className="block text-sm font-medium mb-1">Equipment Slot</label>
              <select
                value={formData.equipmentSlot}
                onChange={(e) => setFormData({ ...formData, equipmentSlot: e.target.value })}
                className="bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              >
                <option value="">Select Slot</option>
                <option value="WEAPON">Weapon</option>
                <option value="ARMOR">Armor</option>
                <option value="TOOL">Tool</option>
                <option value="ACCESSORY">Accessory</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            className="bg-[#8b6f31] hover:bg-[#c5a572] text-[#231913] px-4 py-2 rounded font-semibold transition-colors"
          >
            {item ? 'Update' : 'Create'} Item
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

function getRarityColor(rarity: ItemRarity): string {
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