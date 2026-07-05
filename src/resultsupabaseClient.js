import { createClient } from '@supabase/supabase-js';

// Access environment variables provided by Vite
const resultsupabaseUrl = import.meta.env.VITE_RESULT_SUPABASE_URL;
const resultsupabaseKey = import.meta.env.VITE_RESULT_SUPABASE_ANON_KEY;

// Create a single supabase client for interacting with your database
export const resultsupabase = createClient(resultsupabaseUrl, resultsupabaseKey);
