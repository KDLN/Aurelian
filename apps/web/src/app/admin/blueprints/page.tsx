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
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading blueprints...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Blueprint Management</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-[#8b6f31] hover:bg-[#c5a572] text-[#231913] px-4 py-2 rounded font-semibold transition-colors"
        >
          Create New Blueprint
        </button>
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

      <div className="bg-[#2a1f17] border border-[#8b6f31] rounded-lg">
        <div className="grid grid-cols-8 gap-2 p-4 border-b border-[#8b6f31] font-semibold text-sm">
          <div>Key</div>
          <div>Output</div>
          <div>Inputs</div>
          <div>Time</div>
          <div>Category</div>
          <div>Level</div>
          <div>XP</div>
          <div>Actions</div>
        </div>

        {blueprints.map((bp) => (
          <div
            key={bp.id}
            className="grid grid-cols-8 gap-2 p-4 border-b border-[#3d2f22] hover:bg-[#3d2f22] transition-colors text-sm"
          >
            <div className="font-mono">{bp.key}</div>
            <div>
              {getItemName(bp.outputId)} x{bp.outputQty}
            </div>
            <div className="text-xs">
              {bp.inputs.map((input, i) => (
                <div key={i} className="text-[#9a8464]">
                  {getItemName(input.itemId)} x{input.qty}
                </div>
              ))}
            </div>
            <div>{bp.timeMin}m</div>
            <div>
              <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(bp.category)}`}>
                {bp.category}
              </span>
            </div>
            <div>Lv{bp.requiredLevel}</div>
            <div>{bp.xpReward}</div>
            <div className="flex space-x-2">
              <button
                onClick={() => setEditingBlueprint(bp)}
                className="text-[#c5a572] hover:text-[#f1e5c8] text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => deleteBlueprint(bp.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-[#9a8464] text-sm">
        Total blueprints: {blueprints.length}
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
    <div className="bg-[#2a1f17] border border-[#8b6f31] rounded-lg p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">
        {blueprint ? 'Edit Blueprint' : 'Create New Blueprint'}
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
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
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
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
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
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
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
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
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
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
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
              className="w-full bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
              min="1"
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
              className="bg-[#5a4a3a] hover:bg-[#6b5a4a] text-[#f1e5c8] px-3 py-1 rounded text-sm transition-colors"
            >
              Add Input
            </button>
          </div>

          {formData.inputs.map((input, index) => (
            <div key={index} className="grid grid-cols-3 gap-2 mb-2">
              <select
                value={input.itemId}
                onChange={(e) => updateInput(index, 'itemId', e.target.value)}
                className="bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
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
                className="bg-[#3d2f22] border border-[#8b6f31] rounded px-3 py-2 text-[#f1e5c8]"
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
            className="bg-[#8b6f31] hover:bg-[#c5a572] text-[#231913] px-4 py-2 rounded font-semibold transition-colors"
          >
            {blueprint ? 'Update' : 'Create'} Blueprint
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

function getCategoryColor(category: string): string {
  switch (category) {
    case 'materials':
      return 'bg-brown-600 text-brown-100';
    case 'weapons':
      return 'bg-red-600 text-red-100';
    case 'armor':
      return 'bg-blue-600 text-blue-100';
    case 'tools':
      return 'bg-yellow-600 text-yellow-100';
    case 'consumables':
      return 'bg-green-600 text-green-100';
    case 'mystical':
      return 'bg-purple-600 text-purple-100';
    default:
      return 'bg-gray-600 text-gray-100';
  }
}