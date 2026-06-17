import { createClient } from '@supabase/supabase-js';
import { Institution } from '@/types/institution';
import { SAMPLE_INSTITUTIONS } from './sample-data';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export async function fetchInstitutions(): Promise<Institution[]> {
  if (!supabase) {
    console.info('[DispatchMap] Supabase not configured — using sample data');
    return SAMPLE_INSTITUTIONS;
  }

  try {
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .order('name');

    if (error) {
      console.error('[DispatchMap] Supabase fetch error:', error.message);
      return SAMPLE_INSTITUTIONS;
    }

    return (data as Institution[]) ?? SAMPLE_INSTITUTIONS;
  } catch (err) {
    console.error('[DispatchMap] Unexpected fetch error:', err);
    return SAMPLE_INSTITUTIONS;
  }
}
