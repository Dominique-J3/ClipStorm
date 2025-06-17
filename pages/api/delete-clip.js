
// /pages/api/delete-clip.js
// Deletes a clip from Supabase and local storage

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, url } = req.body;
  if (!userId || !url) {
    return res.status(400).json({ error: 'Missing userId or url' });
  }

  const fileName = path.basename(url);
  const filePath = path.join(process.cwd(), 'public', 'clips', fileName);

  try {
    await supabase.from('clips').delete().eq('user_id', userId).eq('url', url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete clip' });
  }
}
