# RajKumarTV Sports EPG

Generates a **worldwide sports** XMLTV guide once a day and publishes it to a public URL that
RajKumarTV can read. The guide uses the same channel IDs as the IPTV-org playlist, so sports
channels match automatically — no hand-mapping.

This repo is **public on purpose**: a free GitHub account can only serve GitHub Pages from a public
repo, and TV listings aren't sensitive. It contains no app source code and no product keys.

## One-time setup

1. Create this repo on GitHub as **public** (GitHub Desktop: add this folder, *create a repository*,
   then **Publish** with *Keep this code private* **unchecked**).
2. On github.com open **Settings → Pages**. Under **Build and deployment → Source**, choose
   **GitHub Actions**. (No other fields needed.)
3. Open the **Actions** tab → **Build sports EPG** → **Run workflow**. The first run takes a while
   (it scrapes listings for ~1,000 channels). You can also just wait for the daily 06:00 UTC run.
4. When it finishes, your guide is live at:

   ```
   https://<your-username>.github.io/RajKumarTV-epg/sports.xml.gz
   ```

5. In RajKumarTV: **Menu → 7 (Guide Data) → Add URL**, paste that link. It refreshes itself daily.

## What it covers

- Every sports channel in the IPTV-org database that has a public listings source (~1,000 of ~2,300).
- Channels with no listings anywhere can't be covered by any guide — that's a limit of the data, not
  this tool.
- The schedule is scraped from public TV-guide websites by the [iptv-org/epg](https://github.com/iptv-org/epg)
  project; this repo just selects the sports channels and runs it on a schedule.

## Tuning

- **More/less data:** edit `--days` in `.github/workflows/epg.yml` (default 2 days ahead).
- **Which channels:** `scripts/build-sports-channels.mjs` selects `categories` containing `sports`.
  Change that filter to cover other categories too.
