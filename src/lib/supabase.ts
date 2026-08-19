import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type SupabaseClient = typeof supabase;

// Client secondaire utilisé pour la création de comptes par l'administrateur
// (signUp) sans altérer la session de l'utilisateur courant.
export const adminSupabase = createClient(supabaseUrl, supabaseKey);
