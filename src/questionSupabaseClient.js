import { createClient } from '@supabase/supabase-js';

// These keys are specifically for fetching QUESTIONS
const questionSupabaseUrl = import.meta.env.VITE_QUESTION_SUPABASE_URL;
const questionSupabaseKey = import.meta.env.VITE_QUESTION_SUPABASE_ANON_KEY;

export const questionSupabase = createClient(questionSupabaseUrl, questionSupabaseKey);

