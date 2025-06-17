
// /lib/log-usage.js
// Logs an analytics event to Supabase

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export async function logUsage(event, userId) {
  if (!userId || !event) return;
  await supabase.from('analytics').insert({
    event,
    user_id: userId,
    timestamp: new Date().toISOString()
  });
}
