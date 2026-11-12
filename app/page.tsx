import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Github, Heart, Sparkles, UploadCloud, FolderGit2, ShieldCheck } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { Decor } from "@/components/Decor";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  return <main className="relative min-h-screen overflow-hidden">
    <Decor/><Topbar login={session.login}/>
    <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-8 md:grid-cols-[1.05fr_.95fr] md:px-8 md:pt-16">
      <div className="order-2 md:order-1">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#eadbd4] bg-white/70 px-4 py-2 text-xs text-[#927779]"><Sparkles size={14} className="text-[#c8a96b]"/> A little space for your projects <span>♡</span></div>
        <h1 className="serif max-w-2xl text-5xl leading-[1.08] tracking-tight md:text-7xl">Upload your project.<br/><span className="text-[#bd8e91]">Make it yours.</span></h1>
        <p className="mt-6 max-w-lg text-sm leading-7 text-[#827476] md:text-base">A cozy and simple way to send your project files to GitHub. Create a repository, upload your ZIP, and let the little magic happen.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={session.login ? "/upload" : "/login"} className="btn-primary inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-semibold shadow-lg shadow-[#292426]/10"><Github size={18}/> {session.login ? "Start uploading" : "Continue with GitHub"} <ArrowRight size={16}/></Link>
          <Link href="/dashboard" className="btn-soft inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold">Explore dashboard</Link>
        </div>
        <div className="mt-9 flex flex-wrap gap-5 text-xs text-[#927f7e]"><span className="flex items-center gap-2"><ShieldCheck size={15}/> Secure GitHub login</span><span className="flex items-center gap-2"><Heart size={14}/> Made with care</span></div>
        <div className="mt-12 flex gap-3 text-xs text-[#aa8b8b]"><span>안녕</span><span>✿</span><span>사랑</span><span>♡</span><span>귀여워</span></div>
      </div>
      <div className="order-1 mx-auto w-full max-w-[490px] md:order-2">
        <div className="relative">
          <div className="absolute -left-5 top-10 z-10 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 text-xs text-[#8d7376] shadow-soft float">hello, lovely coder ♡</div>
          <div className="absolute -right-4 top-1/3 z-10 rounded-2xl bg-[#292426] px-4 py-3 text-xs text-white shadow-soft float-delay">upload with love ✧</div>
          <div className="absolute -bottom-5 left-8 z-10 rounded-2xl border border-[#eadbd4] bg-[#fffaf4] px-4 py-3 text-xs text-[#987d7c] shadow-soft">꽃처럼 예쁘게 🌸</div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2.4rem] border-[8px] border-white/80 bg-[#eadbd4] shadow-[0_30px_90px_rgba(90,60,60,.18)]">
            <Image src="/xiyu-photo.jpg" alt="XIYU GITHUB UPLOADER aesthetic portrait" fill priority sizes="(max-width: 768px) 90vw, 490px" className="object-cover"/>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#292426]/55 to-transparent p-7 pt-24 text-white"><p className="serif text-3xl">Create something lovely.</p><p className="mt-1 text-xs tracking-widest text-white/80">XIYU GITHUB UPLOADER</p></div>
          </div>
          <span className="absolute -right-7 -top-7 text-5xl text-[#c8a96b] drift">✿</span>
          <span className="absolute -bottom-10 right-10 text-4xl float">🌷</span>
        </div>
      </div>
    </section>
    <section className="relative z-10 mx-auto grid max-w-7xl gap-4 px-5 pb-20 md:grid-cols-3 md:px-8">
      {[{icon:UploadCloud,title:"Easy ZIP upload",desc:"Drop a ZIP file and preview the contents before pushing."},{icon:FolderGit2,title:"Your repositories",desc:"Create a new repository or use one you already own."},{icon:ShieldCheck,title:"Your GitHub account",desc:"Authorize securely and keep your credentials on the server."}].map((item)=><div key={item.title} className="soft-card rounded-3xl p-6"><div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-[#f5e4e3] text-[#9b7377]"><item.icon size={21}/></div><h2 className="serif text-xl">{item.title}</h2><p className="mt-2 text-sm leading-6 text-[#8b7a7a]">{item.desc}</p></div>)}
    </section>
    <footer className="relative z-10 border-t border-[#eadbd4] px-5 py-7 text-center text-xs text-[#a18c89]">Made with ♡ by XIYU · 안녕, happy coding ✿</footer>
  </main>;
}
