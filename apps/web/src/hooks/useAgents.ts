import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Agent, AgentType, EquipmentSlot } from '@prisma/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AgentWithMissionCount extends Agent {
  _count: {
    missions: number;
  };
}

interface AgentsData {
  agents: AgentWithMissionCount[];
}

export function useAgents() {
  const [agents, setAgents] = useState<AgentWithMissionCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/agents', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }

      const data: AgentsData = await response.json();
      setAgents(data.agents);
      setError(null);
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  return {
    agents,
    isLoading,
    error,
    refetch: fetchAgents
  };
}

export function useHireAgent() {
  const [isHiring, setIsHiring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hireAgent = async (agentType: AgentType): Promise<boolean> => {
    setIsHiring(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return false;
      }

      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to hire agent');
      }

      const data = await response.json();
      console.log(data.message);
      alert(`✅ Success: ${data.message}`);
      return true;
    } catch (err) {
      console.error('Error hiring agent:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      alert(`❌ Hiring failed: ${errorMessage}`);
      return false;
    } finally {
      setIsHiring(false);
    }
  };

  return {
    hireAgent,
    isHiring,
    error
  };
}

export function useEquipAgent() {
  const [isEquipping, setIsEquipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const equipItem = async (agentId: string, itemKey: string, slot: EquipmentSlot): Promise<boolean> => {
    setIsEquipping(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return false;
      }

      const response = await fetch(`/api/agents/${agentId}/equip`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemKey, slot }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to equip item');
      }

      const data = await response.json();
      console.log(data.message);
      return true;
    } catch (err) {
      console.error('Error equipping item:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsEquipping(false);
    }
  };

  return {
    equipItem,
    isEquipping,
    error
  };
}

export function useStarterGear() {
  const [isGivingGear, setIsGivingGear] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const giveStarterGear = async (): Promise<boolean> => {
    setIsGivingGear(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return false;
      }

      const response = await fetch('/api/agents/starter-gear', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to give starter gear');
      }

      const data = await response.json();
      console.log('Starter gear given:', data.message);
      return true;
    } catch (err) {
      console.error('Error giving starter gear:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsGivingGear(false);
    }
  };

  return {
    giveStarterGear,
    isGivingGear,
    error
  };
}