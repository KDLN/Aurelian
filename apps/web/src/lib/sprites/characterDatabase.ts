import { CharacterAppearance } from './characterSprites';
import { supabase } from '../supabaseClient';

// Utility to get the current user's access token
async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(`Auth session error: ${error.message}`);
  }
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('No auth token found');
  }
  return token;
}

// Functions for saving/loading character appearance directly from the backend database

export async function saveCharacterToDatabase(
  appearance: CharacterAppearance,
  userId?: string
): Promise<void> {
  try {
    const token = await getAccessToken();

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
    const token = await getAccessToken();

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
        name: data.avatar.name || data.display || '',
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
