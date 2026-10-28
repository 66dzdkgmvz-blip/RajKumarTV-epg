// Builds sports.channels.xml for the iptv-org/epg grabber: every sports channel (worldwide) that
// has a public guide source, tagged with the SAME channel IDs the IPTV-org playlist uses — so the
// generated guide matches RajKumarTV's channels automatically, by ID, with no hand-mapping.
import { writeFileSync } from 'node:fs';

const API = 'https://iptv-org.github.io/api';

async function getJson(file) {
  const res = await fetch(`${API}/${file}`);
  if (!res.ok) throw new Error(`Failed to fetch ${file}: HTTP ${res.status}`);
  return res.json();
}

const esc = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

const [channels, guides] = await Promise.all([getJson('channels.json'), getJson('guides.json')]);

// Sports channels that are still on air and not adult.
const sports = new Map(); // id -> display name
for (const c of channels) {
  if (c.closed || c.is_nsfw) continue;
  if (Array.isArray(c.categories) && c.categories.includes('sports')) sports.set(c.id, c.name || c.id);
}

// One guide source per channel (first one wins). Skip entries without a usable site/site_id.
const seen = new Set();
const lines = [];
for (const g of guides) {
  if (!sports.has(g.channel) || seen.has(g.channel)) continue;
  if (!g.site || g.site_id == null || g.site_id === '') continue;
  seen.add(g.channel);
  lines.push(
    `  <channel site="${esc(g.site)}" lang="${esc(g.lang || 'en')}" xmltv_id="${esc(g.channel)}" site_id="${esc(g.site_id)}">${esc(sports.get(g.channel))}</channel>`,
  );
}

const out = process.argv[2] || 'sports.channels.xml';
writeFileSync(out, `<?xml version="1.0" encoding="UTF-8"?>\n<channels>\n${lines.join('\n')}\n</channels>\n`);
console.log(`Sports channels total:        ${sports.size}`);
console.log(`With a public guide source:   ${seen.size}  (these will be grabbed)`);
console.log(`Without any guide source:     ${sports.size - seen.size}  (no listings exist anywhere)`);
console.log(`Wrote ${out}`);
if (seen.size === 0) throw new Error('No sports channels had a guide source — aborting.');
