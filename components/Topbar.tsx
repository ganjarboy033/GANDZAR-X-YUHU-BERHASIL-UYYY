import Link from "next/link";
import { Github, Heart, Sparkles } from "lucide-react";
export function Topbar({ login }: { login?: string }) {
  return <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-8">
    <Link href="/" className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#292426] text-white"><Github size={21}/></span>
      <span><b className="block text-sm tracking-[.13em]">XIYU</b><small className="text-[10px] tracking-[.18em] text-[#987d7c]">GITHUB UPLOADER</small></span>
    </Link>
    <nav className="flex items-center gap-2 text-sm">
      {login ? <><Link className="hidden rounded-full px-4 py-2 text-[#755f61] hover:bg-white sm:block" href="/dashboard">Dashboard</Link><span className="rounded-full border border-[#eadbd4] bg-white/80 px-3 py-2 text-xs">@{login}</span><a className="rounded-full px-3 py-2 text-xs text-[#987d7c] hover:bg-white" href="/api/auth/logout">Sign out</a></> : <Link href="/login" className="btn-primary flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"><Github size={15}/> Sign in</Link>}
    </nav>
  </header>;
}
