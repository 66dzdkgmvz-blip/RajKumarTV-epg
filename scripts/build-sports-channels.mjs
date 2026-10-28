// Builds sports.channels.xml for the iptv-org/epg grabber: every sports channel (worldwide) that
// has a public guide source, tagged with the SAME channel IDs the IPTV-org playlist uses — so the
// generated guide matches RajKumarTV's channels automatically, by ID, with no hand-mapping.
//
// Selection is deliberately generous: IPTV-org's category data is patchy (e.g. Big Ten Network has
// no category at all), so a channel counts as sports if its category says so OR its name matches a
// sports keyword. Only channels that actually have a guide source are emitted.
import { writeFileSync } from 'node:fs';

const API = 'https://iptv-org.github.io/api';

async function getJson(file) {
  const res = await fetch(`${API}/${file}`);
  if (!res.ok) throw new Error(`Failed to fetch ${file}: HTTP ${res.status}`);
  return res.json();
}

const esc = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

// Name patterns for sports channels whose category is missing or wrong.
const SPORT_NAME =
  /\b(sports?|espn|fox ?sports?|sky ?sports?|bt ?sport|tnt ?sports?|bein|dazn|big ?ten|btn|sec ?network|acc ?network|pac-?12|longhorn|nba|nfl|nhl|mlb|mls|wnba|golf|tennis|willow|eurosport|supersport|ten ?sports?|star ?sports?|sony ?(sports?|ten)|sportsnet|\btsn\b|bally|fanduel|gol ?tv|premier ?sports?|viaplay ?sport|motogp|formula ?1|f1 ?tv|rugby|cricket|ufc|wwe|boxing|astro ?arena|elta ?sport|sport ?klub|nova ?sport|arena ?sport|match!|setanta|flosports|stadium|racing|speed)\b/i;

// Preferred listing sites (reliable, mostly English), best first. Anything else falls back to the
// channel's first available source.
const SITE_RANK = [
  'tvpassport.com', 'tvtv.us', 'tvguide.com', 'ontvtonight.com', 'sky.com', 'bein.com', 'dstv.com',
  'startv.com.tr', 'gatotv.com', 'mi.tv', 'elcinema.com', 'tvprofil.com', 'programtv.onet.pl', 'm.tv.sms.cz',
];
const rankOf = (site) => {
  const i = SITE_RANK.indexOf(site);
  return i === -1 ? SITE_RANK.length : i;
};

const [channels, guides] = await Promise.all([getJson('channels.json'), getJson('guides.json')]);

// Sports channels that are still on air and not adult.
const sports = new Map(); // id -> display name
for (const c of channels) {
  if (c.closed || c.is_nsfw) continue;
  const isSport = (Array.isArray(c.categories) && c.categories.includes('sports')) || SPORT_NAME.test(c.name || '');
  if (isSport) sports.set(c.id, c.name || c.id);
}

// Collect every guide source per sports channel, then keep the best-ranked one.
const byChannel = new Map(); // id -> best guide entry
for (const g of guides) {
  if (!sports.has(g.channel) || !g.site || g.site_id == null || g.site_id === '') continue;
  const cur = byChannel.get(g.channel);
  if (!cur || rankOf(g.site) < rankOf(cur.site)) byChannel.set(g.channel, g);
}

const lines = [];
for (const [id, g] of byChannel) {
  lines.push(
    `  <channel site="${esc(g.site)}" lang="${esc(g.lang || 'en')}" xmltv_id="${esc(id)}" site_id="${esc(g.site_id)}">${esc(sports.get(id))}</channel>`,
  );
}
lines.sort();

const out = process.argv[2] || 'sports.channels.xml';
writeFileSync(out, `<?xml version="1.0" encoding="UTF-8"?>\n<channels>\n${lines.join('\n')}\n</channels>\n`);
console.log(`Sports channels identified:   ${sports.size}`);
console.log(`With a public guide source:   ${byChannel.size}  (these will be grabbed)`);
console.log(`Without any guide source:     ${sports.size - byChannel.size}  (no listings exist anywhere)`);
console.log(`Wrote ${out}`);
if (byChannel.size === 0) throw new Error('No sports channels had a guide source — aborting.');
