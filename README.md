# GlazedSMP

The official community website for **GlazedSMP**, a Minecraft Java Edition SMP.

**Live site:** https://icedmocha-1.github.io/glazedsmp/
**Discord:** https://discord.gg/p4rVnZR2EF

## Server details

| | |
| --- | --- |
| Address | `glazedsmpp.joinmc.world` |
| Edition | Minecraft Java Edition |
| Version | 1.21.11 |

These details are static text. The website does not connect to the Minecraft server and shows no live status or player counts.

## What's on the site

- **Home:** server info, a one-click copy for the server address, and how to join.
- **Events:** upcoming and past events with countdowns that adjust to the visitor's timezone.
- **News:** announcements from the staff, with optional images.
- **Community:** links to the Discord and community info.
- **Rules and FAQ:** the server rules and common questions.
- **Themes and motion:** dark and light themes, an animated topographic background that adjusts to the visitor's device, and support for reduced-motion settings.
- **Staff panel:** a Discord-login panel for managing events, news and site text, with owner, admin and staff roles.

## How it's built

A static site on GitHub Pages with one small backend for staff actions.

```
index.html                              The website (HTML, CSS and JavaScript in one file)
data.json                               Events, news and site text shown to visitors
backend/worker.js                       Staff API (Cloudflare Worker)
backend/wrangler.toml                   Worker configuration
.github/workflows/deploy-worker.yml     Deploys the staff API from GitHub
images/                                 Optional images for news posts
```

Visitors only ever read `index.html` and `data.json`. Staff changes are published through the staff API, which checks the person's Discord login and role before updating `data.json`. No passwords, tokens or webhooks are stored in the website files.

## Data format

`data.json` has four fields:

```json
{ "events": [], "news": [], "site": null, "updated": "" }
```

- `events` and `news` are lists, each item with at least a `title`.
- `site` holds the banner text, rules and FAQ, or `null`.
- `updated` is a timestamp set automatically on each publish.

## For staff

1. Click **Staff** on the site and sign in with Discord.
2. Create or edit events, news and site text. Changes are saved in your browser first.
3. Open the **Sync** tab and press **Publish to everyone**. The change appears on the live site in about a minute.
4. Use the Discord options in the Event and News tabs to post announcements.

Roles:
- **Owner:** full control, including adding staff and reading the audit log.
- **Admin:** publishing, Discord posts and `@everyone` pings.
- **Staff:** publishing and Discord posts.

## Setting it up yourself

You'll need a GitHub account, a free Cloudflare account and a Discord application.

1. Put the files in a GitHub repository and turn on GitHub Pages (Settings, Pages, `main` branch, root folder).
2. In the Discord Developer Portal, create an application and add this OAuth2 redirect: `https://icedmocha-1.github.io/glazedsmp/` (use your own site address if different). Put its Client ID in `DISCORD_CLIENT_ID` in `index.html`.
3. In your repository, go to Settings, Secrets and variables, Actions, and add these secrets:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Lets GitHub deploy the staff API |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account |
| `GH_PUBLISH_TOKEN` | Fine-grained GitHub token for this repository, with Contents read and write |
| `DISCORD_WEBHOOK` | Webhook for announcements |
| `OWNER_IDS` | Discord user ID of the owner (comma-separate several) |
| `STAFF_IDS` | Extra staff IDs, or `0` if none |

4. Open the Actions tab and run **Deploy staff API**. Copy the Worker URL it creates and paste it into `var API=''` in `index.html`.
5. Sign in on the site and publish a test event to confirm everything works.

Never put tokens, webhooks or the Discord Client Secret in the website files.

## Troubleshooting

- **Discord says the redirect is invalid:** the redirect URL must exactly match your site address, including the trailing slash.
- **"Not authorised":** your Discord user ID isn't on the staff list. The panel shows your ID after you sign in.
- **"Staff API is not set up":** the `API` value in `index.html` is empty.
- **"data.json changed since you last loaded it":** someone else published first. Press **Load from website** and redo your change.

## Contributing

Suggestions and bug reports are welcome through the Discord. Please don't commit secrets, and keep the server rules unchanged unless the staff have approved a change.
