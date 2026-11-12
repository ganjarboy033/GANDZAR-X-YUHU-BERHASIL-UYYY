import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { Topbar } from "@/components/Topbar";
import { Decor } from "@/components/Decor";
import { FolderGit2, UploadCloud, History, Sparkles, Github, ArrowUpRight } from "lucide-react";
export default async function Dashboard() {
  const s = await getSession(); if (!s.accessToken) redirect("/login");
  return <main className="relative min-h-screen"><Decor/><Topbar login={s.login}/><div className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-6 md:px-8">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs tracking-[.22em] text-[#ad898a]">YOUR LITTLE WORKSPACE ✿</p><h1 className="serif mt-2 text-4xl md:text-5xl">Welcome back, {s.name || s.login}.</h1><p className="mt-2 text-sm text-[#8b7a7a]">Ready to make something lovely today?</p></div><div className="flex items-center gap-3 rounded-2xl border border-[#eadbd4] bg-white/80 p-3"><Image src={s.avatarUrl || "/xiyu-photo.jpg"} alt="GitHub avatar" width={42} height={42} className="rounded-full"/><div><b className="block text-sm">@{s.login}</b><small className="text-[#9b8988]">GitHub connected</small></div></div></div>
    <div className="grid gap-4 md:grid-cols-3">
      {[{icon:FolderGit2,label:"Connected account",value:s.login || "GitHub",sub:"Your repositories are ready"},{icon:UploadCloud,label:"Upload center",value:"Ready",sub:"ZIP · folder · project files"},{icon:History,label:"Activity",value:"New",sub:"Your next upload starts here"}].map(x=><div key={x.label} className="soft-card rounded-3xl p-6"><x.icon className="mb-5 text-[#b18c8d]" size={23}/><p className="text-xs text-[#9a8585]">{x.label}</p><p className="serif mt-1 text-2xl">{x.value}</p><p className="mt-2 text-xs text-[#a18d8c]">{x.sub}</p></div>)}
    </div>
    <div className="mt-7 grid gap-5 md:grid-cols-[1.25fr_.75fr]"><div className="soft-card rounded-3xl p-6 md:p-8"><div className="flex items-center justify-between"><div><p className="text-xs tracking-[.2em] text-[#ad898a]">LET’S GET STARTED</p><h2 className="serif mt-2 text-3xl">Your next project awaits.</h2></div><span className="text-3xl">🌷</span></div><p className="mt-3 max-w-lg text-sm leading-6 text-[#8b7a7a]">Create a repository or choose one you already own. Then upload your ZIP and we’ll prepare the files for a GitHub commit.</p><Link href="/upload" className="btn-primary mt-7 inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-semibold"><UploadCloud size={17}/> Open uploader <ArrowUpRight size={16}/></Link></div><div className="rounded-3xl bg-[#292426] p-6 text-white"><Sparkles className="mb-4 text-[#d7bb82]" size={22}/><p className="serif text-2xl">A tiny reminder</p><p className="mt-3 text-sm leading-6 text-white/65">Your ideas deserve a home. Keep building, one little commit at a time.</p><p className="mt-7 text-sm text-[#e3c8c6]">화이팅! ♡</p></div></div>
  </div></main>;
}
