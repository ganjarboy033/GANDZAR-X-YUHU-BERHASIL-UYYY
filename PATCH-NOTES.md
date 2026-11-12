# Catatan perbaikan login

File yang diubah (credit, lisensi, dan desain tidak disentuh):
- lib/session.ts, lib/oauth.ts (baru)
- app/api/auth/github/route.ts, app/api/auth/github/callback/route.ts
- app/login/page.tsx (kini menampilkan alasan gagal login)
- .env.example, package.json (next/react dinaikkan ke versi yang sudah ditambal)

Env var di Vercel: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_PASSWORD.
GITHUB_CALLBACK_URL dan NEXT_PUBLIC_APP_URL tidak dipakai lagi.
