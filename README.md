XIYU GITHUB UPLOADER

Mobile-first GitHub archive uploader with a custom cream / blush / black / gold design.

Copyright & Ownership

© 2026 EMISSARY XIYU · XIYU CODEX · AIRAE XIYU. All Rights Reserved.

This project and its original source code, architecture, design, branding, and documentation are protected by copyright.

Mandatory Credit & Attribution

- All original creator credits and copyright notices must remain intact.
- Strictly prohibited to remove, modify, replace, obscure, or falsify the original creator identities.
- Rebranding or claiming this project as your own original work is prohibited.
- Redistribution or modification must retain all original copyright notices and attribution.
- No one is permitted to misrepresent the original authorship or ownership of this project.

OFFICIAL CREDITS:

- EMISSARY XIYU
- XIYU CODEX
- AIRAE XIYU

Unauthorized removal or alteration of these credits is strictly prohibited.

Current upload UI

- Archive: ".zip", ".tar", ".tgz", ".tar.gz" (browser-side extraction)
- Folder selection (directory input supported by Chromium-based browsers)
- From a link (remote host must allow browser CORS)
- Paste files
- ZIP/archive maximum: 150 MB
- Maximum 1,500 extracted files
- Maximum 12 MB per individual file
- File selection, Select all, Clear all, path search, per-file size display
- New/existing repository selection
- Description, branch, commit message, README starter, license, ".gitignore", visibility, nested ".git" cleanup option
- GitHub OAuth token remains in the encrypted HTTP-only server session

Important deployment limitation

The browser extracts archives locally. However, this starter still posts each selected file's base64 content to a Next.js API route before the server creates GitHub blobs. A 12 MB file becomes a larger base64 request and can exceed serverless request-body limits (including Vercel's). Therefore, the UI limits are implemented, but reliable end-to-end pushes at the full 150 MB archive limit are not yet guaranteed by this starter.

To make the 150 MB limit production-reliable, configure a private temporary object-storage bucket (for example, Cloudflare R2 or Vercel Blob) with short-lived signed upload URLs, then process uploaded objects in a background worker that has access to the encrypted server-side GitHub session/token. Do not expose GitHub OAuth access tokens to browser JavaScript and do not put them in localStorage. A worker/storage adapter is a required next backend step before advertising the full 150 MB capacity as production-ready.

The "From a link" browser importer also depends on CORS permission from the remote host. Google Drive sharing links are not always direct-download links and may require conversion or a dedicated server-side importer with strict host allowlisting and SSRF protection.

Setup

npm install
cp .env.example .env.local
npm run dev

Set the OAuth environment variables in ".env.local" and in Vercel. See ".env.example".

GitHub OAuth

Create an OAuth App at https://github.com/settings/developers and use:

- Homepage URL: your deployed app URL
- Callback URL: "https://YOUR-DOMAIN/api/auth/github/callback"

Never commit the Client Secret or session password.

---

EMISSARY XIYU · XIYU CODEX · AIRAE XIYU
Original Authorship. Official Credits. Protected Identity.
