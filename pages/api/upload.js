
// /pages/api/upload.js
// Enhanced: Save metadata to Supabase, auto-cleanup old clips

import formidable from 'formidable';
import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function transcribeWithTimestamps(filePath) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-1',
    response_format: 'verbose_json'
  });
  return transcription.segments.map(seg => ({
    text: seg.text.trim(),
    start: seg.start,
    end: seg.end
  }));
}

function detectHighlights(segments) {
  return segments
    .filter(s => s.text.length > 30)
    .sort((a, b) => b.text.length - a.text.length)
    .slice(0, 5);
}

function generateClip(inputPath, start, end, outPath, subtitleText = '') {
  return new Promise((resolve, reject) => {
    const subtitleFile = `${outPath.replace('.mp4', '.srt')}`;
    fs.writeFileSync(subtitleFile, `1\n00:00:00,000 --> 00:00:${String(Math.floor(end - start)).padStart(2, '0')},000\n${subtitleText}`);
    const cmd = `ffmpeg -ss ${start} -to ${end} -i "${inputPath}" -vf "scale=720:1280,subtitles=${subtitleFile}" -c:v libx264 -c:a aac -y "${outPath}"`;
    exec(cmd, (error) => {
      fs.unlinkSync(subtitleFile);
      if (error) return reject(error);
      resolve(outPath);
    });
  });
}

function cleanOldClips(dirPath, maxAgeMs = 24 * 60 * 60 * 1000) {
  const now = Date.now();
  fs.readdirSync(dirPath).forEach(file => {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > maxAgeMs) fs.unlinkSync(filePath);
  });
}

export default async function handler(req, res) {
  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Error parsing form data' });

    const file = files.video;
    const userId = fields.userId;
    if (!file || !userId) return res.status(400).json({ error: 'Missing video or userId' });

    try {
      const segments = await transcribeWithTimestamps(file.filepath);
      const highlights = detectHighlights(segments);

      const clipDir = path.join(process.cwd(), 'public', 'clips');
      if (!fs.existsSync(clipDir)) fs.mkdirSync(clipDir);
      cleanOldClips(clipDir); // Clean before adding new

      const clipPaths = [];
      for (let i = 0; i < highlights.length; i++) {
        const clipName = `clip_${userId}_${Date.now()}_${i}.mp4`;
        const clipPath = path.join(clipDir, clipName);

        await generateClip(file.filepath, highlights[i].start, highlights[i].end, clipPath, highlights[i].text);
        const url = `/clips/${clipName}`;
        clipPaths.push({ url, text: highlights[i].text });

        // Store metadata in Supabase
        await supabase.from('clips').insert({
          user_id: userId,
          url,
          caption: highlights[i].text
        });
      }

      fs.unlinkSync(file.filepath);
      return res.status(200).json({ clips: clipPaths });
    } catch (error) {
      console.error('Processing error:', error);
      return res.status(500).json({ error: 'Failed to process video' });
    }
  });
}
