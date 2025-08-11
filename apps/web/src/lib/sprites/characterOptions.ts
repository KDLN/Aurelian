export interface CustomizationOption {
  id: string;
  name: string;
  preview?: string;
}

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
}

export const CHARACTER_OPTIONS = {
  base: [
    { id: 'v00', name: 'Light Skin' },
    { id: 'v01', name: 'Medium Skin' },
    { id: 'v02', name: 'Dark Skin' },
    { id: 'v03', name: 'Pale Skin' },
    { id: 'v04', name: 'Tan Skin' },
    { id: 'v05', name: 'Olive Skin' },
  ],
  
  outfit: [
    { id: 'boxr_v01', name: 'Boxer Shorts' },
    { id: 'fstr_v01', name: 'Farmer Shirt - Green' },
    { id: 'fstr_v02', name: 'Farmer Shirt - Blue' },
    { id: 'fstr_v03', name: 'Farmer Shirt - Red' },
    { id: 'fstr_v04', name: 'Farmer Shirt - Yellow' },
    { id: 'fstr_v05', name: 'Farmer Shirt - Purple' },
    { id: 'pfpn_v01', name: 'Peasant Pants - Brown' },
    { id: 'pfpn_v02', name: 'Peasant Pants - Grey' },
    { id: 'pfpn_v03', name: 'Peasant Pants - Blue' },
    { id: 'pfpn_v04', name: 'Peasant Pants - Green' },
    { id: 'pfpn_v05', name: 'Peasant Pants - Black' },
    { id: 'undi_v01', name: 'Basic Underwear' },
  ],
  
  hair: [
    { id: 'bob1_v00', name: 'Short Bob - Natural' },
    { id: 'bob1_v01', name: 'Short Bob - Brown' },
    { id: 'bob1_v02', name: 'Short Bob - Blonde' },
    { id: 'bob1_v03', name: 'Short Bob - Black' },
    { id: 'bob1_v04', name: 'Short Bob - Red' },
    { id: 'bob1_v05', name: 'Short Bob - Grey' },
    { id: 'bob1_v06', name: 'Short Bob - White' },
    { id: 'bob1_v07', name: 'Short Bob - Blue' },
    { id: 'bob1_v08', name: 'Short Bob - Green' },
    { id: 'bob1_v09', name: 'Short Bob - Purple' },
    { id: 'bob1_v10', name: 'Short Bob - Pink' },
    { id: 'bob1_v11', name: 'Short Bob - Orange' },
    { id: 'bob1_v12', name: 'Short Bob - Cyan' },
    { id: 'bob1_v13', name: 'Short Bob - Yellow' },
    { id: 'dap1_v00', name: 'Slicked Back - Natural' },
    { id: 'dap1_v01', name: 'Slicked Back - Brown' },
    { id: 'dap1_v02', name: 'Slicked Back - Blonde' },
    { id: 'dap1_v03', name: 'Slicked Back - Black' },
    { id: 'dap1_v04', name: 'Slicked Back - Red' },
    { id: 'dap1_v05', name: 'Slicked Back - Grey' },
    { id: 'dap1_v06', name: 'Slicked Back - White' },
    { id: 'dap1_v07', name: 'Slicked Back - Blue' },
    { id: 'dap1_v08', name: 'Slicked Back - Green' },
    { id: 'dap1_v09', name: 'Slicked Back - Purple' },
    { id: 'dap1_v10', name: 'Slicked Back - Pink' },
    { id: 'dap1_v11', name: 'Slicked Back - Orange' },
    { id: 'dap1_v12', name: 'Slicked Back - Cyan' },
    { id: 'dap1_v13', name: 'Slicked Back - Yellow' },
  ],
  
  hat: [
    { id: '', name: 'None' },
    { id: 'pfht_v01', name: 'Peasant Farmer Hat - Brown' },
    { id: 'pfht_v02', name: 'Peasant Farmer Hat - Straw' },
    { id: 'pfht_v03', name: 'Peasant Farmer Hat - Grey' },
    { id: 'pfht_v04', name: 'Peasant Farmer Hat - Black' },
    { id: 'pfht_v05', name: 'Peasant Farmer Hat - Red' },
    { id: 'pnty_v01', name: 'Wizard Hat - Blue' },
    { id: 'pnty_v02', name: 'Wizard Hat - Red' },
    { id: 'pnty_v03', name: 'Wizard Hat - Green' },
    { id: 'pnty_v04', name: 'Wizard Hat - Purple' },
    { id: 'pnty_v05', name: 'Wizard Hat - Black' },
  ],
};

import { saveCharacterToDatabase, loadCharacterFromDatabase } from './characterDatabase';
import { CharacterAppearance } from './characterSprites';

export async function saveCharacterAppearance(appearance: CharacterAppearance) {
  await saveCharacterToDatabase(appearance);
}

export function loadCharacterAppearance(): CharacterAppearance {
  return {
    name: 'Trader',
    base: 'v01',
    outfit: 'fstr_v01',
    hair: 'bob1_v01',
    hat: ''
  };
}

export async function loadCharacterAppearanceAsync(
  userId?: string
): Promise<CharacterAppearance> {
  const dbAppearance = await loadCharacterFromDatabase(userId);
  if (dbAppearance) {
    return dbAppearance;
  }

  return loadCharacterAppearance();
}