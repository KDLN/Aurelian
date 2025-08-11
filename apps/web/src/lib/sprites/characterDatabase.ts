import { CharacterAppearance } from './characterSprites';

// Functions for saving/loading character appearance directly from the backend database

export async function saveCharacterToDatabase(
  appearance: CharacterAppearance,
  userId?: string
): Promise<void> {
  try {
    // Get the auth token from localStorage (Supabase stores it there)
    const token =
      localStorage.getItem('supabase.auth.token') ||
      JSON.parse(
        localStorage.getItem('sb-apoboundupzmulkqxkxw-auth-token') || '{}'
      )?.access_token;

    if (!token) {
      throw new Error('No auth token found');
    }

    const response = await fetch('/api/user/avatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        avatar: appearance,
        display: appearance.name
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to save avatar to database');
    }
  } catch (error) {
    console.error('Error saving character to database:', error);
    throw error;
  }
}

export async function loadCharacterFromDatabase(
  userId?: string
): Promise<CharacterAppearance | null> {
  try {
    // Get the auth token from localStorage
    const token =
      localStorage.getItem('supabase.auth.token') ||
      JSON.parse(
        localStorage.getItem('sb-apoboundupzmulkqxkxw-auth-token') || '{}'
      )?.access_token;

    if (!token) {
      throw new Error('No auth token found');
    }

    const response = await fetch('/api/user/avatar', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to load avatar from database');
    }

    const data = await response.json();
    if (data.avatar) {
      return {
        name: data.avatar.name || data.display || 'Trader',
        base: data.avatar.base || 'v01',
        outfit: data.avatar.outfit || 'fstr_v01',
        hair: data.avatar.hair || 'bob1_v01',
        hat: data.avatar.hat || ''
      };
    }
  } catch (error) {
    console.error('Error loading character from database:', error);
  }

  return null;
}
