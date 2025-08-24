'use client';

import { useState } from 'react';
import GameButton from '@/components/ui/GameButton';
import GamePanel from '@/components/ui/GamePanel';

interface MissionTemplate {
  id: string;
  name: string;
  description: string;
  type: 'resource_collection' | 'exploration' | 'guild_cooperation' | 'seasonal';
  duration: number; // hours
  globalRequirements: any;
  rewards: any;
  tiers: any;
}

const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    id: 'iron_rush',
    name: 'The Great Iron Rush',
    description: 'The realm needs iron to fortify our defenses. All guilds must work together to gather the resources needed.',
    type: 'resource_collection',
    duration: 72,
    globalRequirements: {
      iron_ore: 50000,
      hide: 25000,
      herb: 15000
    },
    rewards: {
      gold_pool: 1000000,
      bonus_items: ['rare_pickaxe', 'mining_boost']
    },
    tiers: [
      { threshold: 0.25, name: 'Bronze', multiplier: 1.0 },
      { threshold: 0.50, name: 'Silver', multiplier: 1.2 },
      { threshold: 0.75, name: 'Gold', multiplier: 1.5 },
      { threshold: 1.00, name: 'Platinum', multiplier: 2.0 }
    ]
  },
  {
    id: 'relic_hunt',
    name: 'Ancient Relic Expedition',
    description: 'Mysterious artifacts have been discovered. Unite to uncover their secrets and claim their power.',
    type: 'exploration',
    duration: 96,
    globalRequirements: {
      relic_fragment: 10000,
      pearl: 5000,
      exploration_points: 25000
    },
    rewards: {
      gold_pool: 750000,
      bonus_items: ['ancient_map', 'explorer_badge']
    },
    tiers: [
      { threshold: 0.30, name: 'Seeker', multiplier: 1.0 },
      { threshold: 0.60, name: 'Explorer', multiplier: 1.3 },
      { threshold: 0.85, name: 'Pathfinder', multiplier: 1.6 },
      { threshold: 1.00, name: 'Legend', multiplier: 2.2 }
    ]
  },
  {
    id: 'guild_unity',
    name: 'Guild Unity Challenge',
    description: 'Test the bonds between guilds. Only through cooperation can we achieve greatness.',
    type: 'guild_cooperation',
    duration: 48,
    globalRequirements: {
      guild_participation: 20,
      cooperative_missions: 100,
      shared_resources: 75000
    },
    rewards: {
      gold_pool: 500000,
      bonus_items: ['unity_banner', 'cooperation_seal']
    },
    tiers: [
      { threshold: 0.40, name: 'Allied', multiplier: 1.1 },
      { threshold: 0.70, name: 'United', multiplier: 1.4 },
      { threshold: 1.00, name: 'Legendary Alliance', multiplier: 2.0 }
    ]
  },
  {
    id: 'harvest_festival',
    name: 'Autumn Harvest Festival',
    description: 'The season of abundance is here. Gather the harvest and celebrate our prosperity.',
    type: 'seasonal',
    duration: 120,
    globalRequirements: {
      herb: 40000,
      hide: 30000,
      festival_points: 50000
    },
    rewards: {
      gold_pool: 800000,
      bonus_items: ['harvest_crown', 'seasonal_blessing']
    },
    tiers: [
      { threshold: 0.20, name: 'Gatherer', multiplier: 1.0 },
      { threshold: 0.50, name: 'Harvester', multiplier: 1.3 },
      { threshold: 0.80, name: 'Festival Master', multiplier: 1.7 },
      { threshold: 1.00, name: 'Harvest Lord', multiplier: 2.5 }
    ]
  }
];

interface MissionTemplatesProps {
  onCreateMission: (template: MissionTemplate) => void;
}

export default function MissionTemplates({ onCreateMission }: MissionTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<MissionTemplate | null>(null);

  const handleLaunchMission = async (template: MissionTemplate) => {
    if (!confirm(`Launch "${template.name}"?\n\nThis will start a new server mission that all players can participate in.`)) {
      return;
    }

    try {
      onCreateMission(template);
    } catch (error) {
      console.error('Failed to launch mission:', error);
      alert('Failed to launch mission. Please try again.');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'resource_collection': return 'text-green-400';
      case 'exploration': return 'text-blue-400';
      case 'guild_cooperation': return 'text-purple-400';
      case 'seasonal': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'resource_collection': return '⛏️';
      case 'exploration': return '🗺️';
      case 'guild_cooperation': return '🤝';
      case 'seasonal': return '🍂';
      default: return '📋';
    }
  };

  return (
    <GamePanel>
      <div className="p-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6">Mission Templates</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MISSION_TEMPLATES.map((template) => (
            <div 
              key={template.id}
              className={`bg-gray-800 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                selectedTemplate?.id === template.id 
                  ? 'border-yellow-400 bg-gray-700' 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getTypeIcon(template.type)}</span>
                  <h3 className="text-lg font-bold text-yellow-400">{template.name}</h3>
                </div>
                <span className={`text-sm px-2 py-1 rounded ${getTypeColor(template.type)} bg-opacity-20`}>
                  {template.type.replace('_', ' ')}
                </span>
              </div>
              
              <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                {template.description}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-400">Duration</div>
                  <div className="text-white font-medium">{template.duration}h</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Tiers</div>
                  <div className="text-white font-medium">{template.tiers.length}</div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-2">Requirements</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(template.globalRequirements).map(([key, value]) => (
                    <span key={key} className="text-xs bg-gray-700 px-2 py-1 rounded">
                      {key}: {(value as number).toLocaleString()}
                    </span>
                  ))}
                </div>
              </div>
              
              <GameButton
                onClick={() => handleLaunchMission(template)}
                className="w-full"
                variant="primary"
              >
                🚀 Launch Mission
              </GameButton>
            </div>
          ))}
        </div>
        
        {selectedTemplate && (
          <div className="mt-8 bg-gray-800 p-6 rounded-lg border border-yellow-400">
            <h3 className="text-xl font-bold text-yellow-400 mb-4">
              {getTypeIcon(selectedTemplate.type)} {selectedTemplate.name}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Mission Details</h4>
                <p className="text-gray-300 mb-4">{selectedTemplate.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span className={`capitalize ${getTypeColor(selectedTemplate.type)}`}>
                      {selectedTemplate.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-white">{selectedTemplate.duration} hours</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Reward Tiers</h4>
                <div className="space-y-2">
                  {selectedTemplate.tiers.map((tier: any, index: number) => (
                    <div key={index} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                      <span className="text-white font-medium">{tier.name}</span>
                      <div className="text-right">
                        <div className="text-yellow-400">{Math.round(tier.threshold * 100)}%</div>
                        <div className="text-xs text-gray-400">{tier.multiplier}x rewards</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-600">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  Gold Pool: <span className="text-green-400 font-bold">
                    {selectedTemplate.rewards.gold_pool.toLocaleString()}
                  </span>
                </div>
                <GameButton
                  onClick={() => handleLaunchMission(selectedTemplate)}
                  variant="primary"
                  size="large"
                >
                  🚀 Launch "{selectedTemplate.name}"
                </GameButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </GamePanel>
  );
}