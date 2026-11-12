import Link from "next/link";
import { Github, Heart, ShieldCheck, ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { Decor } from "@/components/Decor";
import { getSession } from "@/lib/session";
const ERRORS: Record<string, string> = {
  oauth_not_configured: "GitHub login isn’t configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in Vercel, then redeploy.",
  invalid_oauth_state: "The login check failed (the security cookie wasn’t found). Open this site from the same domain registered in your GitHub OAuth App and try again.",
  oauth_exchange_failed: "GitHub rejected the sign-in. Make sure the Client ID and Client Secret come from the same OAuth App and the callback URL matches exactly.",
  github_profile_failed: "Signed in, but your GitHub profile couldn’t be read. Try again.",
  session_config: "SESSION_PASSWORD is missing or shorter than 32 characters in Vercel. Add it, then redeploy.",
  session_save_failed: "Signed in, but the session couldn’t be saved. Try again.",
  access_denied: "GitHub access was cancelled.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; detail?: string }> }) {
  const q = await searchParams;
  const s = await getSession();
  return <main className="relative min-h-screen overflow-hidden"><Decor/><Topbar login={s.login}/><div className="relative z-10 mx-auto flex min-h-[75vh] max-w-xl items-center px-5 py-12"><div className="soft-card w-full rounded-[2rem] p-7 text-center md:p-10">
    <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-[#292426] text-white"><Github size={30}/></div>
    <p className="text-xs tracking-[.25em] text-[#ad898a]">WELCOME TO XIYU</p><h1 className="serif mt-3 text-4xl">Let’s get you connected.</h1>
    <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[#8b7a7a]">Sign in with GitHub to create repositories and upload your project files.</p>
    {q.error && <div role="alert" className="mt-6 rounded-2xl bg-[#fdeeee] p-4 text-left text-sm text-[#9b3b3b]"><b className="block">Couldn’t sign in</b>{ERRORS[q.error] || "Something went wrong. Please try again."}{q.detail && <span className="mt-2 block text-xs opacity-80">GitHub says: {q.detail}</span>}</div>}
    {s.login ? <div className="mt-7 rounded-2xl bg-[#f8efeb] p-4 text-sm">You’re signed in as <b>@{s.login}</b>.<Link className="ml-2 underline" href="/dashboard">Open dashboard</Link></div> : <a href="/api/auth/github" className="btn-primary mt-8 flex w-full items-center justify-center gap-3 rounded-full px-6 py-4 text-sm font-semibold"><Github size={19}/> Continue with GitHub</a>}
    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#9a8585]"><ShieldCheck size={14}/> Secure authorization · No password shared</div>
    <Link href="/" className="mt-8 inline-flex items-center gap-2 text-xs text-[#9a8585]"><ArrowLeft size={14}/> Back home</Link>
  </div></div></main>;
}
