import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bliuwvkdtvxmteyzuzds.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaXV3dmtkdHZ4bXRleXp1emRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzQxNzIsImV4cCI6MjA4OTMxMDE3Mn0.chkEGIGUfKxyOLvD7UMD729j6kZ7cajdS9ifBaXNR5g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fetch Semi Job Cards (table: semi_job_card)
 */
export async function fetchSemiJobCards() {
  const { data, error } = await supabase
    .from('semi_job_card')
    .select('*')
    .range(0, 9999)
    .order('id', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Fetch Actual Production Entries (table: semi_actual)
 */
export async function fetchSemiActualEntries() {
  const { data, error } = await supabase
    .from('semi_actual')
    .select('*')
    .range(0, 9999)
    .order('id', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Fetch Crushing Department Records (table: crushing_actual)
 */
export async function fetchCrushingActualEntries() {
  const { data, error } = await supabase
    .from('crushing_actual')
    .select('*')
    .range(0, 9999)
    .order('id', { ascending: false });
  if (error) throw error;
  return data || [];
}

