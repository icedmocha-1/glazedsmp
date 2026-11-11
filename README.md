# GlazedSMP Website

The website for GlazedSMP, a Diamond-Only Survival SMP that supports Java and Bedrock players and is hosted in Singapore.

- Server address: `glazedsmpp.mcsh.gg`
- Discord: https://discord.gg/abCEXKVCAq
- Bedrock port: not published yet. Ask staff in Discord.

This is a small static site (one HTML file with its own CSS and JavaScript) plus an optional tiny Node server that handles staff login and publishing. There is no build step and nothing to compile.

## What is on the site

Public pages: Home, Information, Features, Community, Rules, FAQ, Players, Events and News. Navigation uses hash links (`#info`, `#players` and so on), so every page can be linked to directly.

A few things worth knowing about:

- **Live server status.** The Home page has a status card that asks the public mcstatus.io API about `glazedsmpp.mcsh.gg` once a minute. It shows Online with the player count and version, Offline, or "Status unavailable" if the lookup fails. It pauses while the browser tab is hidden and gives up on a request after 8 seconds. It never shows a made-up number.
- **Players page.** Shows who is online right now, using the same status feed (no second request). Names only appear if the server shares them. If the server shares the count but not the names, the page says so instead of guessing. Heads are loaded from mc-heads.net, and a letter tile is used if one fails to load.
- **Server specs.** The Information page lists CPU 200%, RAM 4 GB and Disk 20 GB. These are fixed values typed into the page, not live readings. A live CPU figure would need access to the hosting panel, which the site does not have.
- **Languages.** English, Chinese (Simplified), Filipino, Malay, Indonesian and Vietnamese. The choice is saved in the browser. Only short labels are translated so far (navigation, hero, buttons, a few headings and the status card). Longer paragraphs, rules, FAQ answers and the staff dashboard are still English. The translations were not checked by native speakers, so please have someone review them.
- **Top bar fitting.** Longer languages need more room, so the top bar steps down on its own: first it hides the small icons, then it switches to the menu button if it still does not fit.
- **Themes and extras.** Light and dark mode, reduced-motion support, copy-IP buttons that work from any page, and error notifications that shake and glow briefly so they are hard to miss.

## Staff dashboard

Click **Staff** in the top bar. The dashboard has seven tabs: Overview, Events, News, Discord, Site, Manage and Publish. It is used to edit events, news, rules, FAQ entries and site text, to build Discord embeds, and to publish changes.

Edits are saved in your own browser first. They do not change the live site until you publish.

## Two ways to run it

There are two versions of the page, and which one you want depends on where you host it.

| | Standalone (`index.html` on its own) | Server version (`glazedsmp/` folder) |
|---|---|---|
| Needs Node | No | Yes |
| Staff password checked by | The browser (falls back to this when no server is found) | The server only |
| Real protection for the dashboard | No | Yes |
| Publish button | Does not work without the server | Works |

If you host on plain web hosting, use the standalone file. Be aware that its password check only hides the editor from casual visitors. The password hash is in the page source and the check can be bypassed by anyone who knows how. Do not treat it as security.

If you can run Node, use the server version.

## Folder layout

```
glazedsmp/
  index.html          the site (server version)
  README.md
  server/
    server.js         the staff server (no dependencies)
    package.json
    .env              your private settings (never share or commit this)
    .env.example      a template for .env
    .gitignore
    data.json         created the first time you publish
  images/uploads/     created the first time you upload an image
index.html            the standalone version, kept outside the folder
```

## Setting up the server version

You need Node 18 or newer. Nothing needs to be installed with npm, because the server only uses what ships with Node.

1. Copy `server/.env.example` to `server/.env`.
2. Create a password hash:

   ```
   cd server
   node server.js --hash "your password here"
   ```

   It prints a long line that looks like `salt:hash`. Paste that whole line after `ADMIN_PASS_HASH=` in `.env`.
3. Set `SESSION_SECRET` in `.env` to a long random string, at least 32 characters. For example:

   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. Check that the password matches before you start:

   ```
   node server.js --check "your password here"
   ```
5. Start it:

   ```
   node server.js
   ```
6. Open `http://localhost:3000` in your browser and use **Staff**. Open it this way, not by double-clicking the HTML file.

Dotfiles such as `.env` are hidden on many systems and are often left out of zip downloads. If the server says settings are missing, check that `.env` exists in the `server` folder.

### Settings in `.env`

| Name | Required | What it does |
|---|---|---|
| `SESSION_SECRET` | Yes | Signs login cookies. 32 or more characters. |
| `ADMIN_PASS_HASH` | Yes | Hash of the staff password, from `--hash`. |
| `ADMIN_USER` | No | Defaults to `admin`. The login form only asks for a password. |
| `PORT` | No | Defaults to `3000`. |
| `DISCORD_WEBHOOK_URL` | No | Used only by the server's Discord relay. See Known gaps. |

To change the password later, run `--hash` again and replace `ADMIN_PASS_HASH`. Restart the server afterwards.

## How the server protects things

- Passwords are checked with scrypt and compared in constant time.
- A successful login sets an `HttpOnly`, `SameSite=Strict` cookie that lasts 8 hours. The cookie is marked `Secure` automatically when the request arrives over HTTPS.
- Every change request must carry a matching CSRF token and a JSON content type.
- Login attempts are limited to 10 per 15 minutes per IP address. Saving, uploads and the Discord relay have their own limits.
- Saves are capped at 1 MB. Image uploads must be `.webp` files saved under `images/uploads/` with a safe file name.
- The server will not serve `.env`, the `server` folder, dotfiles or anything outside the project folder.
- Each save keeps the previous version as `data.json.bak`.

### Endpoints

| Route | Who can call it | What it does |
|---|---|---|
| `POST /api/login` | Anyone, rate limited | Checks the password, sets the session cookie |
| `POST /api/logout` | Anyone | Clears the cookie |
| `GET /api/me` | Signed in | Confirms the session, returns the CSRF token |
| `PUT /api/content` | Signed in | Saves events and news to `data.json` |
| `POST /api/upload` | Signed in | Saves one `.webp` image |
| `POST /api/discord` | Signed in | Sends a message to the Discord webhook |
| `GET /data.json` | Anyone | Returns the published data |

## Putting it online

The server needs a host that can run a Node app, such as a VPS or a Node hosting service. A Minecraft server plan normally cannot run one, so check with your host before counting on it.

Some things to do when it goes public:

- Put it behind HTTPS. A reverse proxy such as nginx or Caddy is the usual way. Make sure it passes the `X-Forwarded-Proto` header so the cookie is marked `Secure`.
- Use a long, unique staff password. Rate limiting only slows guessing down.
- Keep the server running with something like systemd or pm2.
- Back up `server/data.json` and the `images/` folder.

One limitation to be aware of: the rate limiter looks at the connection address. Behind a reverse proxy, every visitor appears to come from the proxy, so they share one login allowance.

## Troubleshooting

**"No staff server found here."** The page is not being served by `server.js`. Start the server and open `http://localhost:3000` rather than the file, Live Server or normal web hosting.

**"Wrong password."** The server rejected it. Run `node server.js --check "the password"` to see whether it matches `.env`. Check capital letters and spaces.

**The server will not start.** `.env` is missing, `SESSION_SECRET` is under 32 characters, or `ADMIN_PASS_HASH` is empty.

**Status says "Status unavailable".** The browser could not reach `api.mcstatus.io`. Check your internet connection and look at the Network tab in the browser's developer tools. If it says Offline, the server really is not answering.

**Players page shows a count but no names.** The server is not sharing its player list publicly. That is a server setting, not a bug in the page.

## Known gaps

These are not finished, and I would rather say so than pretend:

- The Discord embed builder still sends through a webhook URL pasted into the browser. The server has a relay at `/api/discord` ready, but the dashboard is not connected to it yet. Do not paste a webhook URL on a shared computer.
- The dashboard's "Load from website" button still reads from GitHub instead of the server's `/data.json`. Some leftover GitHub code is still in the page. It no longer holds or sends a token.
- I have not confirmed that the public Events and News pages read from the server's `/data.json` after you publish. After your first publish, open `/data.json` and then view the site in a private window to check.
- There is no activity log and no separate staff roles. There is one admin password.
- The Bedrock status is not checked, because the Bedrock port is not known.
- Translations cover short labels only and have not been reviewed by native speakers.
- There is no sitemap or robots file yet, and no Lighthouse or performance audit was run.
- Testing was done in a headless browser with the status service mocked, because the test environment had no internet access. The real mcstatus.io lookup and the real Discord relay have not been exercised.

## Credits

GlazedSMP is not affiliated with Mojang or Microsoft. Fonts are Unbounded and DM Sans from Google Fonts. Player heads come from mc-heads.net and server status from mcstatus.io.
