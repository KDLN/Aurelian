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
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#f1e5c8] mb-2">Item Management</h1>
          <p className="text-[#9a8464]">Create, edit, and manage all game items and materials</p>
        </div>
        <div className="flex space-x-4">
          <div className="bg-[#2a1f17] px-4 py-2 rounded-lg border border-[#8b6f31]">
            <span className="text-[#9a8464] text-sm">Total Items: </span>
            <span className="text-[#c5a572] font-semibold">{items.length}</span>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-[#8b6f31] hover:bg-[#c5a572] text-[#231913] px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Create New Item</span>
          </button>
        </div>
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

      <div className="bg-[#2a1f17] border border-[#8b6f31] rounded-xl overflow-hidden">
        <div className="bg-[#3d2f22] px-6 py-4 border-b border-[#8b6f31]">
          <div className="grid grid-cols-7 gap-4 font-semibold text-[#f1e5c8]">
            <div>Key</div>
            <div>Name</div>
            <div>Rarity</div>
            <div>Stack Size</div>
            <div>Equipment</div>
            <div>Meta</div>
            <div>Actions</div>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`grid grid-cols-7 gap-4 p-4 hover:bg-[#3d2f22] transition-colors ${
                index !== items.length - 1 ? 'border-b border-[#3d2f22]' : ''
              }`}
            >
              <div className="font-mono text-sm text-[#c5a572]">{item.key}</div>
              <div className="font-medium text-[#f1e5c8]">{item.name}</div>
              <div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRarityColor(item.rarity)}`}>
                  {item.rarity}
                </span>
              </div>
              <div className="text-[#9a8464]">{item.stack}</div>
              <div className="text-center">
                {item.meta?.isEquipment ? (
                  <span className="text-green-400 text-lg">✓</span>
                ) : (
                  <span className="text-[#9a8464]">—</span>
                )}
              </div>
              <div className="text-xs text-[#9a8464]">
                {item.meta ? Object.keys(item.meta).join(', ') : 'None'}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setEditingItem(item)}
                  className="text-[#c5a572] hover:text-[#f1e5c8] text-sm font-medium transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
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
    <div className="bg-[#2a1f17] border border-[#8b6f31] rounded-xl p-8 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#f1e5c8]">
          {item ? 'Edit Item' : 'Create New Item'}
        </h2>
        <button
          onClick={onCancel}
          className="text-[#9a8464] hover:text-[#f1e5c8] text-xl transition-colors"
        >
          ✕
        </button>
      </div>

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

        <div className="flex justify-end space-x-4 pt-6 border-t border-[#8b6f31]">
          <button
            type="button"
            onClick={onCancel}
            className="bg-[#5a4a3a] hover:bg-[#6b5a4a] text-[#f1e5c8] px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-[#8b6f31] hover:bg-[#c5a572] text-[#231913] px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2"
          >
            <span>{item ? '💾' : '➕'}</span>
            <span>{item ? 'Update' : 'Create'} Item</span>
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