// server/routes/gallery.js — GET /api/gallery
//
// Everything the home-page gallery shows, from two places:
//  1. Files in public/media/gallery/. Drop an image or video in and it appears.
//     The file name says what it is:  archive_title.ext
//     e.g. freshbaked_ostrich-runway.jpg → archive "freshbaked", title "Ostrich runway"
//  2. Featured posts in the database that have a YouTube video.

import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from '../db.js';
import { youtubeId } from '../links.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GALLERY_DIR = path.join(__dirname, '..', '..', 'public', 'media', 'gallery');

const IMAGE = /\.(jpe?g|png|webp|avif|gif)$/i;
const VIDEO = /\.(mp4|webm|mov)$/i;

// "ostrich-runway" → "Ostrich runway"
const pretty = (s) => {
  const t = s.replace(/[-_]+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

router.get('/', async (req, res, next) => {
  try {
    const items = [];

    // 1. Files
    let files = [];
    try { files = await fs.readdir(GALLERY_DIR); } catch { /* folder missing = no files */ }
    for (const file of files.sort()) {
      const type = IMAGE.test(file) ? 'image' : VIDEO.test(file) ? 'video' : null;
      if (!type) continue;
      const name = file.replace(/\.[^.]+$/, '');
      const cut = name.indexOf('_');
      items.push({
        type,
        src: `/media/gallery/${encodeURIComponent(file)}`,
        archive: cut > 0 ? pretty(name.slice(0, cut)) : 'Archive',
        title: pretty(cut > 0 ? name.slice(cut + 1) : name),
      });
    }

    // 2. Featured posts with a YouTube video
    try {
      const posts = await query(
        "SELECT id, title, category, video_url FROM posts WHERE featured = true AND video_url IS NOT NULL ORDER BY created_at DESC",
      );
      for (const p of posts) {
        const id = youtubeId(p.video_url);
        if (id) items.push({ type: 'youtube', youtube: id, src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, title: p.title, archive: p.category, post: p.id });
      }
    } catch (err) {
      console.warn('Gallery: could not read featured posts', err.message);
    }

    res.json(items);
  } catch (err) { next(err); }
});

export default router;
