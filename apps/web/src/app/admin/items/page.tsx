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
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600 dark:text-slate-400">Loading items...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Item Management</h1>
          <p className="text-slate-600 dark:text-slate-400">Create, edit, and manage all game items and materials</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-slate-600 dark:text-slate-400 text-sm">Total Items: </span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">{items.length}</span>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 shadow-sm"
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

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-slate-50 dark:bg-slate-700 px-6 py-4 border-b border-slate-200 dark:border-slate-600">
          <div className="grid grid-cols-7 gap-4 font-semibold text-slate-900 dark:text-slate-100 text-sm">
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
          {items.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-slate-400 dark:text-slate-500 text-lg mb-2">📦</div>
              <div className="text-slate-600 dark:text-slate-400 font-medium mb-1">No items found</div>
              <div className="text-slate-500 dark:text-slate-500 text-sm">Create your first item to get started</div>
            </div>
          ) : (
            items.map((item, index) => (
              <div
                key={item.id}
                className={`grid grid-cols-7 gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                  index !== items.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''
                }`}
              >
                <div className="font-mono text-sm text-slate-600 dark:text-slate-400">{item.key}</div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{item.name}</div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRarityColor(item.rarity)}`}>
                    {item.rarity}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">{item.stack}</div>
                <div className="text-center">
                  {item.meta?.isEquipment ? (
                    <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">—</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {item.meta ? Object.keys(item.meta).join(', ') : 'None'}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
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
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 lg:p-8 mb-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {item ? 'Edit Item' : 'Create New Item'}
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
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Key</label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              placeholder="item_key"
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
              placeholder="Item Name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Rarity</label>
            <select
              value={formData.rarity}
              onChange={(e) => setFormData({ ...formData, rarity: e.target.value as ItemRarity })}
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
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Stack Size</label>
            <input
              type="number"
              value={formData.stack}
              onChange={(e) => setFormData({ ...formData, stack: parseInt(e.target.value) || 1 })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              min="1"
              placeholder="1"
              required
            />
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.isEquipment}
                onChange={(e) => setFormData({ ...formData, isEquipment: e.target.checked })}
                className="rounded border-slate-300 dark:border-slate-600 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Is Equipment</span>
            </label>

            {formData.isEquipment && (
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Equipment Slot</label>
                <select
                  value={formData.equipmentSlot}
                  onChange={(e) => setFormData({ ...formData, equipmentSlot: e.target.value })}
                  className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
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