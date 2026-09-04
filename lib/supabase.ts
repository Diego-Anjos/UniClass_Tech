import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("URL DO SUPABASE:", process.env.NEXT_PUBLIC_SUPABASE_URL);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
