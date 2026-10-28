# RajKumarTV Guide Data (sports + news)

Generates a **worldwide sports and news** XMLTV guide once a day and publishes it to a public URL
that RajKumarTV can read. The guide uses the same channel IDs as the IPTV-org playlist, so channels
match automatically — no hand-mapping.

This repo is **public on purpose**: a free GitHub account can only serve GitHub Pages from a public
repo, and TV listings aren't sensitive. It contains no app source code and no product keys.

## One-time setup

1. Create this repo on GitHub as **public** (GitHub Desktop: add this folder, *create a repository*,
   then **Publish** with *Keep this code private* **unchecked**).
2. On github.com open **Settings → Pages**. Under **Build and deployment → Source**, choose
   **GitHub Actions**.
3. Open the **Actions** tab → **Build sports EPG** → **Run workflow** (or just push a change — it
   rebuilds automatically). The first run takes a while (it scrapes listings for ~1,700 channels).
4. When it finishes, your guide is live at:

   ```
   https://<your-username>.github.io/RajKumarTV-epg/guide.xml.gz
   ```

   `sports.xml.gz` also works as an alias, so an older link keeps functioning.

5. In RajKumarTV: **Menu → 7 (Guide Data) → Add URL**, paste that link. It refreshes itself daily.

## What it covers

- Every **sports** and **news** channel in the IPTV-org database (US and international) that has a
  public listings source — about 1,700 of ~4,700.
- The major **US broadcast networks** (ABC, NBC, CBS, Fox, The CW, PBS, Telemundo, Univision). Their
  local affiliates (e.g. `ABC.us@KAAL`) match the network's national schedule by base channel id, so
  the affiliate shows ABC's line-up — not its local news, which isn't published anywhere.
- Channels with no listings anywhere can't be covered by any guide — that's a limit of the data.
- Schedules are scraped from public TV-guide websites by the [iptv-org/epg](https://github.com/iptv-org/epg)
  project; this repo selects the channels and runs it on a schedule.

## Tuning

- **Which channels:** `scripts/build-channels.mjs` selects channels whose category is sports/news or
  whose name matches sports/news keywords. Edit the keyword lists or categories to add more.
- **How many days ahead:** change `--days` in `.github/workflows/epg.yml` (default 2).
- **Source quality:** `SITE_RANK` in the script prefers listing sites with rolling, current-time
  coverage (tvguide.com, tvtv.us) over ones with overnight gaps (tvpassport.com).
