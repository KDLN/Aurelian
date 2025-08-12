// Caravan Slot Management Utilities

export interface CaravanSlot {
  slotNumber: number;
  isOccupied: boolean;
  mission?: {
    id: string;
    name: string;
    endTime: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  timeRemaining?: number; // seconds remaining
}

export interface CaravanStatus {
  totalSlots: number;
  occupiedSlots: number;
  availableSlots: number;
  slots: CaravanSlot[];
}

export function getCaravanStatus(
  activeMissions: Array<{
    id: string;
    caravanSlot: number;
    endTime: string;
    mission?: {
      name: string;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    };
  }>,
  totalSlots: number = 3
): CaravanStatus {
  const slots: CaravanSlot[] = [];
  
  // Create slots 1 through totalSlots
  for (let i = 1; i <= totalSlots; i++) {
    const mission = activeMissions.find(m => m.caravanSlot === i);
    
    if (mission) {
      const endTime = new Date(mission.endTime);
      const timeRemaining = Math.max(0, Math.ceil((endTime.getTime() - Date.now()) / 1000));
      
      slots.push({
        slotNumber: i,
        isOccupied: true,
        mission: {
          id: mission.id,
          name: mission.mission?.name || 'Unknown Mission',
          endTime: mission.endTime,
          riskLevel: mission.mission?.riskLevel || 'MEDIUM'
        },
        timeRemaining
      });
    } else {
      slots.push({
        slotNumber: i,
        isOccupied: false
      });
    }
  }
  
  return {
    totalSlots,
    occupiedSlots: activeMissions.length,
    availableSlots: totalSlots - activeMissions.length,
    slots
  };
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Ready';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

export function getRiskColor(riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  switch (riskLevel) {
    case 'LOW': return '#4ade80'; // green-400
    case 'MEDIUM': return '#f59e0b'; // amber-500  
    case 'HIGH': return '#ef4444'; // red-500
    default: return '#6b7280'; // gray-500
  }
}

export function getNextAvailableSlot(occupiedSlots: number[], totalSlots: number = 3): number | null {
  for (let slot = 1; slot <= totalSlots; slot++) {
    if (!occupiedSlots.includes(slot)) {
      return slot;
    }
  }
  return null;
}

export const CARAVAN_SLOT_NAMES = [
  'First Caravan',
  'Second Caravan', 
  'Third Caravan',
  'Premium Caravan' // 4th slot for premium users
];

export function getCaravanSlotName(slotNumber: number): string {
  return CARAVAN_SLOT_NAMES[slotNumber - 1] || `Caravan ${slotNumber}`;
}