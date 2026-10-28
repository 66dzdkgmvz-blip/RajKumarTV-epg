// Builds channels.xml for the iptv-org/epg grabber: every SPORTS, NEWS and KIDS channel (worldwide,
// US and international) that has a public guide source, tagged with the SAME channel IDs the IPTV-org
// playlist uses — so the generated guide matches RajKumarTV's channels automatically, by ID.
//
// Selection is deliberately generous: IPTV-org's category data is patchy (e.g. Big Ten Network has
// no category at all), so a channel counts if its category says sports/news/kids OR its name matches a
// sports/news/kids keyword. Only channels that actually have a guide source are emitted.
import { writeFileSync } from 'node:fs';

const API = 'https://iptv-org.github.io/api';

async function getJson(file) {
  const res = await fetch(`${API}/${file}`);
  if (!res.ok) throw new Error(`Failed to fetch ${file}: HTTP ${res.status}`);
  return res.json();
}

const esc = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

const WANT_CATEGORIES = new Set(['sports', 'news', 'kids']);

// Major US broadcast networks, by exact channel id (the "network" field is inconsistent). Their local
// affiliates in the playlist are tagged like "ABC.us@KAAL" (channel ABC.us, feed KAAL). Few affiliates
// have a local guide, but the network schedule exists and matches every affiliate via the base channel
// id — so the national line-up shows for all of them.
const US_BROADCAST_IDS = new Set([
  'ABC.us', 'NBC.us', 'CBS.us', 'Fox.us', 'TheCW.us', 'PBS.us', 'PBSKids.us', 'Telemundo.us', 'Univision.us', 'UniMas.us',
]);

// Names of sports channels whose category is missing or wrong.
const SPORT_NAME =
  /\b(sports?|espn|fox ?sports?|sky ?sports?|bt ?sport|tnt ?sports?|bein|dazn|big ?ten|btn|sec ?network|acc ?network|pac-?12|longhorn|nba|nfl|nhl|mlb|mls|wnba|golf|tennis|willow|eurosport|supersport|ten ?sports?|star ?sports?|sony ?(sports?|ten)|sportsnet|\btsn\b|bally|fanduel|gol ?tv|premier ?sports?|viaplay ?sport|motogp|formula ?1|f1 ?tv|rugby|cricket|ufc|wwe|boxing|astro ?arena|elta ?sport|sport ?klub|nova ?sport|arena ?sport|match!|setanta|flosports|stadium|racing|speed)\b/i;

// Names of news channels whose category is missing or wrong. Deliberately brand-led to avoid
// sweeping in general-entertainment networks (e.g. plain "NBC"/"BBC One" don't match; "...News" does).
const NEWS_NAME =
  /\b(news|noticias|not[ií]cias|nachrichten|actualit[eé]s?|haberler?|novosti|zpr[aá]vy|wiadomo[sś]ci|notizie|telejornal|jornal|al ?jazeera|cnn|msnbc|cnbc|bloomberg|euronews|france ?24|sky ?news|fox ?news|newsmax|news ?nation|\boan\b|c-?span|cgtn|press ?tv|i24|gb ?news|africanews|tolo ?news|wion|ndtv|aaj ?tak|times ?now|republic|trt ?world|dw ?news|deutsche ?welle|nhk ?world|arirang|24 ?horas|rai ?news|tgcom)\b/i;

// Names of kids/children's channels whose category is missing or wrong. Brand-led to catch the major
// children's networks (Disney, Nickelodeon, Cartoon Network and their siblings) worldwide, however the
// listing site spells them.
const KIDS_NAME =
  /\b(disney|nick ?jr|nickelodeon|nicktoons|teen ?nick|cartoon ?network|cartoonito|boomerang|pbs ?kids|baby ?tv|boing|cbeebies|cbbc|tiny ?pop|pop ?(kids|fun|max)|nick ?music|duck ?tv|jim ?jam|baby ?first|da ?vinci ?kids|clan|cocomelon|kids?|ni[nñ]os?|enfants?|kinder|crian[cç]as|gulli|toonami|junior)\b/i;

// Preferred listing sites, best first. tvguide.com and tvtv.us give rolling coverage from midnight
// (so "now" is always covered); tvpassport.com only lists from ~6am local, leaving an overnight gap,
// so it ranks below them. Anything unranked falls back to the channel's first available source.
const SITE_RANK = [
  'tvguide.com', 'tvtv.us', 'ontvtonight.com', 'tvpassport.com', 'sky.com', 'bein.com', 'dstv.com',
  'startv.com.tr', 'gatotv.com', 'mi.tv', 'elcinema.com', 'tvprofil.com', 'programtv.onet.pl', 'm.tv.sms.cz',
];
const rankOf = (site) => {
  const i = SITE_RANK.indexOf(site);
  return i === -1 ? SITE_RANK.length : i;
};

const [channels, guides] = await Promise.all([getJson('channels.json'), getJson('guides.json')]);

// Wanted channels (sports or news), still on air and not adult.
const wanted = new Map(); // id -> display name
let nSports = 0;
let nNews = 0;
let nKids = 0;
let nBroadcast = 0;
for (const c of channels) {
  if (c.closed || c.is_nsfw) continue;
  const name = c.name || '';
  const cats = Array.isArray(c.categories) ? c.categories : [];
  const isSport = cats.includes('sports') || SPORT_NAME.test(name);
  const isNews = cats.includes('news') || NEWS_NAME.test(name);
  const isKids = cats.includes('kids') || KIDS_NAME.test(name);
  const isBroadcast = US_BROADCAST_IDS.has(c.id);
  if (!isSport && !isNews && !isKids && !isBroadcast) continue;
  wanted.set(c.id, name || c.id);
  if (isSport) nSports++;
  if (isNews) nNews++;
  if (isKids) nKids++;
  if (isBroadcast) nBroadcast++;
}

// Best-ranked guide source per wanted channel.
const byChannel = new Map(); // id -> best guide entry
for (const g of guides) {
  if (!wanted.has(g.channel) || !g.site || g.site_id == null || g.site_id === '') continue;
  const cur = byChannel.get(g.channel);
  if (!cur || rankOf(g.site) < rankOf(cur.site)) byChannel.set(g.channel, g);
}

const lines = [];
for (const [id, g] of byChannel) {
  lines.push(
    `  <channel site="${esc(g.site)}" lang="${esc(g.lang || 'en')}" xmltv_id="${esc(id)}" site_id="${esc(g.site_id)}">${esc(wanted.get(id))}</channel>`,
  );
}
lines.sort();

const out = process.argv[2] || 'channels.xml';
writeFileSync(out, `<?xml version="1.0" encoding="UTF-8"?>\n<channels>\n${lines.join('\n')}\n</channels>\n`);
console.log(`Channels wanted: ${wanted.size}  (sports≈${nSports}, news≈${nNews}, kids≈${nKids}, US broadcast≈${nBroadcast})`);
console.log(`With a public guide source:   ${byChannel.size}  (these will be grabbed)`);
console.log(`Without any guide source:     ${wanted.size - byChannel.size}  (no listings exist anywhere)`);
console.log(`Wrote ${out}`);
if (byChannel.size === 0) throw new Error('No channels had a guide source — aborting.');
