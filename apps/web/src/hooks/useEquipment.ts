import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { EquipmentSlot, ItemRarity, AgentType } from '@prisma/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface EquipmentDef {
  id: string;
  itemKey: string;
  name: string;
  description?: string;
  slot: EquipmentSlot;
  rarity: ItemRarity;
  successBonus: number;
  speedBonus: number;
  rewardBonus: number;
  minLevel: number;
  agentType?: AgentType;
  craftingLevel?: number;
  materials?: any;
  createdAt: string;
}

export function useEquipment() {
  const [equipment, setEquipment] = useState<EquipmentDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEquipment = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/equipment', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch equipment');
      }

      const data = await response.json();
      setEquipment(data.equipment);
      setError(null);
    } catch (err) {
      console.error('Error fetching equipment:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  return {
    equipment,
    isLoading,
    error,
    refetch: fetchEquipment
  };
}