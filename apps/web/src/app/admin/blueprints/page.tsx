'use client';

import { useState, useEffect } from 'react';

interface Blueprint {
  id: string;
  key: string;
  outputId: string;
  outputQty: number;
  inputs: { itemId: string; qty: number }[];
  timeMin: number;
  category: string;
  requiredLevel: number;
  xpReward: number;
  starterRecipe: boolean;
  discoverable: boolean;
  description?: string;
  output?: { name: string; key: string };
}

interface ItemDef {
  id: string;
  key: string;
  name: string;
}

export default function AdminBlueprintsPage() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [items, setItems] = useState<ItemDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBlueprint, setEditingBlueprint] = useState<Blueprint | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [blueprintsRes, itemsRes] = await Promise.all([
        fetch('/api/admin/blueprints'),
        fetch('/api/admin/items'),
      ]);

      const [blueprintsData, itemsData] = await Promise.all([
        blueprintsRes.json(),
        itemsRes.json(),
      ]);

      setBlueprints(blueprintsData);
      setItems(itemsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteBlueprint = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blueprint?')) return;

    try {
      const response = await fetch(`/api/admin/blueprints/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBlueprints(blueprints.filter(bp => bp.id !== id));
      } else {
        alert('Failed to delete blueprint');
      }
    } catch (error) {
      console.error('Failed to delete blueprint:', error);
      alert('Failed to delete blueprint');
    }
  };

  const getItemName = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    return item?.name || 'Unknown Item';
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600 dark:text-slate-400">Loading blueprints...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Blueprint Management</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage crafting recipes and their requirements</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-slate-600 dark:text-slate-400 text-sm">Total Blueprints: </span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">{blueprints.length}</span>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 shadow-sm"
          >
            <span>➕</span>
            <span>Create New Blueprint</span>
          </button>
        </div>
      </div>

      {(showCreateForm || editingBlueprint) && (
        <BlueprintForm
          blueprint={editingBlueprint}
          items={items}
          onSave={(bp) => {
            if (editingBlueprint) {
              setBlueprints(blueprints.map(b => b.id === bp.id ? bp : b));
            } else {
              setBlueprints([...blueprints, bp]);
            }
            setEditingBlueprint(null);
            setShowCreateForm(false);
          }}
          onCancel={() => {
            setEditingBlueprint(null);
            setShowCreateForm(false);
          }}
        />
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-slate-50 dark:bg-slate-700 px-6 py-4 border-b border-slate-200 dark:border-slate-600">
          <div className="grid grid-cols-8 gap-4 font-semibold text-slate-900 dark:text-slate-100 text-sm">
            <div>Key</div>
            <div>Output</div>
            <div>Inputs</div>
            <div>Time</div>
            <div>Category</div>
            <div>Level</div>
            <div>XP</div>
            <div>Actions</div>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {blueprints.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-slate-400 dark:text-slate-500 text-lg mb-2">📜</div>
              <div className="text-slate-600 dark:text-slate-400 font-medium mb-1">No blueprints found</div>
              <div className="text-slate-500 dark:text-slate-500 text-sm">Create your first blueprint to get started</div>
            </div>
          ) : (
            blueprints.map((bp, index) => (
              <div
                key={bp.id}
                className={`grid grid-cols-8 gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm ${
                  index !== blueprints.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''
                }`}
              >
                <div className="font-mono text-slate-600 dark:text-slate-400">{bp.key}</div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {getItemName(bp.outputId)} x{bp.outputQty}
                </div>
                <div className="text-xs space-y-1">
                  {bp.inputs.map((input, i) => (
                    <div key={i} className="text-slate-500 dark:text-slate-400">
                      {getItemName(input.itemId)} x{input.qty}
                    </div>
                  ))}
                </div>
                <div className="text-slate-600 dark:text-slate-400">{bp.timeMin}m</div>
                <div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(bp.category)}`}>
                    {bp.category}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">Lv{bp.requiredLevel}</div>
                <div className="text-slate-600 dark:text-slate-400">{bp.xpReward} XP</div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setEditingBlueprint(bp)}
                    className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteBlueprint(bp.id)}
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

function BlueprintForm({
  blueprint,
  items,
  onSave,
  onCancel,
}: {
  blueprint: Blueprint | null;
  items: ItemDef[];
  onSave: (blueprint: Blueprint) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    key: blueprint?.key || '',
    outputId: blueprint?.outputId || '',
    outputQty: blueprint?.outputQty || 1,
    inputs: blueprint?.inputs || [{ itemId: '', qty: 1 }],
    timeMin: blueprint?.timeMin || 10,
    category: blueprint?.category || 'general',
    requiredLevel: blueprint?.requiredLevel || 1,
    xpReward: blueprint?.xpReward || 10,
    starterRecipe: blueprint?.starterRecipe || false,
    discoverable: blueprint?.discoverable || true,
    description: blueprint?.description || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      inputs: formData.inputs.filter(input => input.itemId && input.qty > 0),
    };

    try {
      const url = blueprint ? `/api/admin/blueprints/${blueprint.id}` : '/api/admin/blueprints';
      const method = blueprint ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const savedBlueprint = await response.json();
        onSave(savedBlueprint);
      } else {
        alert('Failed to save blueprint');
      }
    } catch (error) {
      console.error('Failed to save blueprint:', error);
      alert('Failed to save blueprint');
    }
  };

  const addInput = () => {
    setFormData({
      ...formData,
      inputs: [...formData.inputs, { itemId: '', qty: 1 }],
    });
  };

  const updateInput = (index: number, field: 'itemId' | 'qty', value: string | number) => {
    const newInputs = [...formData.inputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    setFormData({ ...formData, inputs: newInputs });
  };

  const removeInput = (index: number) => {
    setFormData({
      ...formData,
      inputs: formData.inputs.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 lg:p-8 mb-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {blueprint ? 'Edit Blueprint' : 'Create New Blueprint'}
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
              placeholder="blueprint_key"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            >
              <option value="general">General</option>
              <option value="materials">Materials</option>
              <option value="weapons">Weapons</option>
              <option value="armor">Armor</option>
              <option value="tools">Tools</option>
              <option value="consumables">Consumables</option>
              <option value="mystical">Mystical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Output Item</label>
            <select
              value={formData.outputId}
              onChange={(e) => setFormData({ ...formData, outputId: e.target.value })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              required
            >
              <option value="">Select Output Item</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Output Quantity</label>
            <input
              type="number"
              value={formData.outputQty}
              onChange={(e) => setFormData({ ...formData, outputQty: parseInt(e.target.value) || 1 })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Time (minutes)</label>
            <input
              type="number"
              value={formData.timeMin}
              onChange={(e) => setFormData({ ...formData, timeMin: parseInt(e.target.value) || 10 })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Required Level</label>
            <input
              type="number"
              value={formData.requiredLevel}
              onChange={(e) => setFormData({ ...formData, requiredLevel: parseInt(e.target.value) || 1 })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">XP Reward</label>
            <input
              type="number"
              value={formData.xpReward}
              onChange={(e) => setFormData({ ...formData, xpReward: parseInt(e.target.value) || 10 })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              min="1"
              required
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              rows={2}
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.starterRecipe}
              onChange={(e) => setFormData({ ...formData, starterRecipe: e.target.checked })}
              className="rounded"
            />
            <span>Starter Recipe</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.discoverable}
              onChange={(e) => setFormData({ ...formData, discoverable: e.target.checked })}
              className="rounded"
            />
            <span>Discoverable</span>
          </label>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Input Items</h3>
            <button
              type="button"
              onClick={addInput}
              className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-md text-sm transition-colors"
            >
              Add Input
            </button>
          </div>

          {formData.inputs.map((input, index) => (
            <div key={index} className="grid grid-cols-3 gap-2 mb-2">
              <select
                value={input.itemId}
                onChange={(e) => updateInput(index, 'itemId', e.target.value)}
                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                required
              >
                <option value="">Select Item</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <input
                type="number"
                value={input.qty}
                onChange={(e) => updateInput(index, 'qty', parseInt(e.target.value) || 1)}
                placeholder="Quantity"
                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                min="1"
                required
              />
              <button
                type="button"
                onClick={() => removeInput(index)}
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
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors"
          >
            {blueprint ? 'Update' : 'Create'} Blueprint
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-md font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'materials':
      return 'bg-amber-500 dark:bg-amber-600 text-amber-100';
    case 'weapons':
      return 'bg-red-500 dark:bg-red-600 text-red-100';
    case 'armor':
      return 'bg-blue-500 dark:bg-blue-600 text-blue-100';
    case 'tools':
      return 'bg-yellow-500 dark:bg-yellow-600 text-yellow-100';
    case 'consumables':
      return 'bg-green-500 dark:bg-green-600 text-green-100';
    case 'mystical':
      return 'bg-purple-500 dark:bg-purple-600 text-purple-100';
    default:
      return 'bg-slate-500 dark:bg-slate-600 text-slate-100';
  }
}