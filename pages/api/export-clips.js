
// /pages/api/export-clips.js
// Generates a zip file of all clips for a given userId from /public/clips

import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const clipsDir = path.join(process.cwd(), 'public', 'clips');
  const files = fs.readdirSync(clipsDir);

  const userFiles = files.filter(file => file.includes(userId) && file.endsWith('.mp4'));
  if (userFiles.length === 0) {
    return res.status(404).json({ error: 'No clips found for this user' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="clipstorm_clips.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  for (const file of userFiles) {
    const filePath = path.join(clipsDir, file);
    archive.file(filePath, { name: file });
  }

  archive.finalize();
}
