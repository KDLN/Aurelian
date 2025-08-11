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
  // Save to localStorage for immediate access
  const dbAppearance: DBCharacterAppearance = {
    ...appearance,
    userId
  };
  localStorage.setItem('character_appearance_db', JSON.stringify(dbAppearance));
  
  // Save to database via API
  try {
    // Get the auth token from localStorage (Supabase stores it there)
    const token = localStorage.getItem('supabase.auth.token') || 
                  JSON.parse(localStorage.getItem('sb-apoboundupzmulkqxkxw-auth-token') || '{}')?.access_token;
    
    if (token) {
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          avatar: appearance,
          display: appearance.name
        })
      });

      if (!response.ok) {
        console.error('Failed to save avatar to database:', await response.text());
      }
    }
  } catch (error) {
    console.error('Error saving character to database:', error);
    // Don't throw - localStorage save was successful
  }
}

export async function loadCharacterFromDatabase(
  userId?: string
): Promise<CharacterAppearance | null> {
  try {
    // Get the auth token from localStorage
    const token = localStorage.getItem('supabase.auth.token') || 
                  JSON.parse(localStorage.getItem('sb-apoboundupzmulkqxkxw-auth-token') || '{}')?.access_token;
    
    if (token) {
      const response = await fetch('/api/user/avatar', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.avatar) {
          // Save to localStorage for offline access
          const appearance = {
            name: data.avatar.name || data.display || 'Trader',
            base: data.avatar.base || 'v01',
            outfit: data.avatar.outfit || 'fstr_v01',
            hair: data.avatar.hair || 'bob1_v01',
            hat: data.avatar.hat || ''
          };
          localStorage.setItem('character_appearance_db', JSON.stringify(appearance));
          return appearance;
        }
      }
    }
  } catch (error) {
    console.error('Error loading character from database:', error);
  }
  
  // Fallback to localStorage
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