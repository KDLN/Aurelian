import { CharacterAppearance } from './characterSprites';

// This would be used with Prisma client in a server environment
// For now, we'll use localStorage but structure it for future database integration

export interface DBCharacterAppearance extends CharacterAppearance {
  userId?: string;
  profileId?: string;
  characterId?: string;
}

export async function saveCharacterToDatabase(
  appearance: CharacterAppearance,
  userId?: string
): Promise<void> {
  // For now, save to localStorage 
  // In production, this would be a database call
  const dbAppearance: DBCharacterAppearance = {
    ...appearance,
    userId
  };
  
  localStorage.setItem('character_appearance_db', JSON.stringify(dbAppearance));
  
  // TODO: When implementing with Supabase/Prisma, use something like:
  /*
  const { data: profile, error } = await supabase
    .from('Profile')
    .update({ 
      avatar: {
        base: appearance.base,
        outfit: appearance.outfit,
        hair: appearance.hair,
        hat: appearance.hat,
        name: appearance.name
      }
    })
    .eq('userId', userId)
    .single();
    
  if (error) {
    throw new Error(`Failed to save character appearance: ${error.message}`);
  }
  */
}

export async function loadCharacterFromDatabase(
  userId?: string
): Promise<CharacterAppearance | null> {
  // For now, load from localStorage
  // In production, this would be a database call
  const saved = localStorage.getItem('character_appearance_db');
  if (saved) {
    const dbAppearance: DBCharacterAppearance = JSON.parse(saved);
    return {
      name: dbAppearance.name,
      base: dbAppearance.base,
      outfit: dbAppearance.outfit,
      hair: dbAppearance.hair,
      hat: dbAppearance.hat
    };
  }
  
  return null;
  
  // TODO: When implementing with Supabase/Prisma, use something like:
  /*
  const { data: profile, error } = await supabase
    .from('Profile')
    .select('avatar')
    .eq('userId', userId)
    .single();
    
  if (error || !profile?.avatar) {
    return null;
  }
  
  return {
    name: profile.avatar.name || 'Trader',
    base: profile.avatar.base || 'v01',
    outfit: profile.avatar.outfit,
    hair: profile.avatar.hair,
    hat: profile.avatar.hat
  };
  */
}

// Migration helper to move localStorage data to database format
export function migrateLocalStorageToDatabase(): CharacterAppearance | null {
  const oldFormat = localStorage.getItem('character_appearance');
  if (!oldFormat) return null;
  
  try {
    const appearance = JSON.parse(oldFormat);
    // Save in new database format
    saveCharacterToDatabase(appearance);
    return appearance;
  } catch (error) {
    console.warn('Failed to migrate character appearance:', error);
    return null;
  }
}