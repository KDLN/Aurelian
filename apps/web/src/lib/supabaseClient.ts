
import { createClient } from '@supabase/supabase-js';

// Clean and validate environment variables
const cleanEnvVar = (value: string | undefined): string => {
  if (!value) return '';
  // Remove ALL whitespace including newlines, tabs, spaces
  return value.replace(/[\s\n\r\t]+/g, '');
};

// Get and clean environment variables
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Clean the values
const supabaseUrl = cleanEnvVar(rawUrl);
const supabaseAnonKey = cleanEnvVar(rawKey);

// Use placeholder values if not set or invalid
const finalUrl = supabaseUrl && supabaseUrl.startsWith('http') 
  ? supabaseUrl 
  : 'https://placeholder.supabase.co';
  
const finalKey = supabaseAnonKey || 'placeholder-key';

if (finalUrl === 'https://placeholder.supabase.co' || finalKey === 'placeholder-key') {
  console.warn('Supabase environment variables are not properly configured. Authentication features will not work.');
  if (rawUrl && rawUrl.includes('\n')) {
    console.error('NEXT_PUBLIC_SUPABASE_URL contains line breaks. Please fix in Vercel Environment Variables.');
  }
}

export const supabase = createClient(finalUrl, finalKey);
