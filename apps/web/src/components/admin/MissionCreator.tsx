'use client';

import { useState } from 'react';
import GamePanel from '@/components/ui/GamePanel';
import GameButton from '@/components/ui/GameButton';

interface MissionCreatorProps {
  onSubmit: (missionData: any) => Promise<any>;
  onCancel: () => void;
  initialData?: any;
}

export default function MissionCreator({ onSubmit, onCancel, initialData }: MissionCreatorProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    type: initialData?.type || 'world_event',
    status: initialData?.status || 'scheduled',
    endsAt: initialData?.endsAt || '',
    
    // Requirements
    requiresItems: initialData?.globalRequirements?.items ? true : false,
    items: initialData?.globalRequirements?.items || {},
    requiresGold: initialData?.globalRequirements?.gold ? true : false,
    gold: initialData?.globalRequirements?.gold || 0,
    requiresTrades: initialData?.globalRequirements?.trades ? true : false,
    trades: initialData?.globalRequirements?.trades || 0,
    
    // Tiers (percentages)
    bronzeTier: initialData?.tiers?.bronze || 0.1,
    silverTier: initialData?.tiers?.silver || 0.25,
    goldTier: initialData?.tiers?.gold || 0.5,
    legendaryTier: initialData?.tiers?.legendary || 1.5,
    
    // Rewards
    bronzeGold: initialData?.rewards?.tiers?.bronze?.gold || 0,
    silverGold: initialData?.rewards?.tiers?.silver?.gold || 0,
    goldGold: initialData?.rewards?.tiers?.gold?.gold || 0,
    legendaryGold: initialData?.rewards?.tiers?.legendary?.gold || 0,
    
    // Server-wide rewards
    serverBonus: false,
    bonusType: 'trade',
    bonusAmount: 0.25,
    bonusDuration: 24
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemInputs, setItemInputs] = useState<{key: string, quantity: string}[]>([
    { key: '', quantity: '' }
  ]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addItemRequirement = () => {
    setItemInputs(prev => [...prev, { key: '', quantity: '' }]);
  };

  const removeItemRequirement = (index: number) => {
    setItemInputs(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemRequirement = (index: number, field: 'key' | 'quantity', value: string) => {
    setItemInputs(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!formData.name.trim()) {
      setError('Mission name is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Mission description is required');
      return;
    }

    if (!formData.endsAt) {
      setError('End date is required');
      return;
    }

    // Build requirements object
    const globalRequirements: any = {};

    if (formData.requiresItems) {
      const items: any = {};
      itemInputs.forEach(item => {
        if (item.key.trim() && item.quantity) {
          items[item.key.trim()] = parseInt(item.quantity);
        }
      });
      if (Object.keys(items).length > 0) {
        globalRequirements.items = items;
      }
    }

    if (formData.requiresGold && formData.gold > 0) {
      globalRequirements.gold = formData.gold;
    }

    if (formData.requiresTrades && formData.trades > 0) {
      globalRequirements.trades = formData.trades;
    }

    if (Object.keys(globalRequirements).length === 0) {
      setError('At least one requirement must be specified');
      return;
    }

    // Build tiers object
    const tiers = {
      bronze: formData.bronzeTier,
      silver: formData.silverTier,
      gold: formData.goldTier,
      legendary: formData.legendaryTier
    };

    // Build rewards object
    const rewards: any = {
      tiers: {}
    };

    if (formData.bronzeGold > 0) {
      rewards.tiers.bronze = { gold: formData.bronzeGold };
    }
    if (formData.silverGold > 0) {
      rewards.tiers.silver = { gold: formData.silverGold };
    }
    if (formData.goldGold > 0) {
      rewards.tiers.gold = { gold: formData.goldGold };
    }
    if (formData.legendaryGold > 0) {
      rewards.tiers.legendary = { gold: formData.legendaryGold };
    }

    if (formData.serverBonus) {
      rewards.serverWide = {
        [`${formData.bonusType}Bonus`]: formData.bonusAmount,
        duration: formData.bonusDuration
      };
    }

    const missionData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      type: formData.type,
      status: formData.status,
      endsAt: formData.endsAt,
      globalRequirements,
      rewards,
      tiers
    };

    try {
      setIsSubmitting(true);
      await onSubmit(missionData);
    } catch (err: any) {
      setError(err.message || 'Failed to create mission');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GamePanel>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-yellow-400">Create New Server Mission</h2>
          <GameButton variant="secondary" onClick={onCancel}>
            Cancel
          </GameButton>
        </div>

        {error && (
          <div className="bg-red-900 bg-opacity-50 border border-red-600 rounded p-3 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mission Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                placeholder="Enter mission name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mission Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="world_event">World Event</option>
                <option value="trade_festival">Trade Festival</option>
                <option value="resource_drive">Resource Drive</option>
                <option value="competition">Competition</option>
                <option value="seasonal">Seasonal Event</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              rows={3}
              placeholder="Describe the mission and its objectives"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End Date *
              </label>
              <input
                type="datetime-local"
                value={formData.endsAt}
                onChange={(e) => handleInputChange('endsAt', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Initial Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-400 mb-4">Mission Requirements</h3>

            {/* Item Requirements */}
            <div className="mb-4">
              <label className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  checked={formData.requiresItems}
                  onChange={(e) => handleInputChange('requiresItems', e.target.checked)}
                  className="rounded"
                />
                <span className="text-gray-300">Require Items</span>
              </label>

              {formData.requiresItems && (
                <div className="ml-6 space-y-2">
                  {itemInputs.map((item, index) => (
                    <div key={index} className="flex space-x-3 items-center">
                      <input
                        type="text"
                        placeholder="Item key (e.g., iron_ore)"
                        value={item.key}
                        onChange={(e) => updateItemRequirement(index, 'key', e.target.value)}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) => updateItemRequirement(index, 'quantity', e.target.value)}
                        className="w-24 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                      />
                      <GameButton
                        type="button"
                        size="small"
                        variant="danger"
                        onClick={() => removeItemRequirement(index)}
                        disabled={itemInputs.length === 1}
                      >
                        Remove
                      </GameButton>
                    </div>
                  ))}
                  <GameButton
                    type="button"
                    size="small"
                    onClick={addItemRequirement}
                  >
                    Add Item
                  </GameButton>
                </div>
              )}
            </div>

            {/* Gold Requirements */}
            <div className="mb-4">
              <label className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  checked={formData.requiresGold}
                  onChange={(e) => handleInputChange('requiresGold', e.target.checked)}
                  className="rounded"
                />
                <span className="text-gray-300">Require Gold</span>
              </label>

              {formData.requiresGold && (
                <div className="ml-6">
                  <input
                    type="number"
                    placeholder="Gold amount"
                    value={formData.gold}
                    onChange={(e) => handleInputChange('gold', parseInt(e.target.value) || 0)}
                    className="w-48 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                </div>
              )}
            </div>

            {/* Trade Requirements */}
            <div>
              <label className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  checked={formData.requiresTrades}
                  onChange={(e) => handleInputChange('requiresTrades', e.target.checked)}
                  className="rounded"
                />
                <span className="text-gray-300">Require Trades</span>
              </label>

              {formData.requiresTrades && (
                <div className="ml-6">
                  <input
                    type="number"
                    placeholder="Number of trades"
                    value={formData.trades}
                    onChange={(e) => handleInputChange('trades', parseInt(e.target.value) || 0)}
                    className="w-48 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tier Thresholds */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-400 mb-4">Tier Thresholds</h3>
            <p className="text-sm text-gray-400 mb-4">
              Thresholds are based on percentage of personal contribution goal (e.g., 0.1 = 10% of personal goal)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Bronze Tier</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bronzeTier}
                  onChange={(e) => handleInputChange('bronzeTier', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Silver Tier</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.silverTier}
                  onChange={(e) => handleInputChange('silverTier', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Gold Tier</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.goldTier}
                  onChange={(e) => handleInputChange('goldTier', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Legendary Tier</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.legendaryTier}
                  onChange={(e) => handleInputChange('legendaryTier', parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Tier Rewards */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-400 mb-4">Tier Rewards (Gold)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Bronze Gold</label>
                <input
                  type="number"
                  value={formData.bronzeGold}
                  onChange={(e) => handleInputChange('bronzeGold', parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Silver Gold</label>
                <input
                  type="number"
                  value={formData.silverGold}
                  onChange={(e) => handleInputChange('silverGold', parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Gold Gold</label>
                <input
                  type="number"
                  value={formData.goldGold}
                  onChange={(e) => handleInputChange('goldGold', parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Legendary Gold</label>
                <input
                  type="number"
                  value={formData.legendaryGold}
                  onChange={(e) => handleInputChange('legendaryGold', parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Server-wide Rewards */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-400 mb-4">Server-wide Rewards</h3>
            <label className="flex items-center space-x-2 mb-3">
              <input
                type="checkbox"
                checked={formData.serverBonus}
                onChange={(e) => handleInputChange('serverBonus', e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-300">Provide Server-wide Bonus</span>
            </label>

            {formData.serverBonus && (
              <div className="ml-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Bonus Type</label>
                  <select
                    value={formData.bonusType}
                    onChange={(e) => handleInputChange('bonusType', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  >
                    <option value="trade">Trade Bonus</option>
                    <option value="xp">XP Bonus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Bonus Amount (e.g., 0.25 = 25%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.bonusAmount}
                    onChange={(e) => handleInputChange('bonusAmount', parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Duration (hours)</label>
                  <input
                    type="number"
                    value={formData.bonusDuration}
                    onChange={(e) => handleInputChange('bonusDuration', parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-4 pt-6">
            <GameButton
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Creating Mission...' : 'Create Mission'}
            </GameButton>
            <GameButton
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </GameButton>
          </div>
        </form>
      </div>
    </GamePanel>
  );
}