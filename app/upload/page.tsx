
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import { Topbar } from "@/components/Topbar";
import { Decor } from "@/components/Decor";
import {
  UploadCloud,
  Folder,
  Link2,
  FileCode2,
  Loader2,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

type Repo = {
  id: number;
  fullName: string;
  name: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
};

type Entry = {
  path: string;
  contentBase64: string;
  size: number;
  selected: boolean;
};

type SourceMode = "archive" | "folder" | "link" | "paste";

const MAX_ARCHIVE = 150 * 1024 * 1024;
const MAX_FILES = 1500;
const MAX_FILE = 12 * 1024 * 1024;

const SKIP =
  /(^|\/)(node_modules|dist|build|coverage|\.next|\.vercel|__MACOSX|\.idea|\.vscode)(\/|$)|(^|\/)(\.DS_Store|Thumbs\.db)$/i;

const shouldSkip = (path: string, removeGit: boolean) =>
  SKIP.test(path) ||
  (removeGit && /(^|\/)\.git(\/|$)/i.test(path));

const normalizeRepositoryName = (value: string) =>
  value.trim().replace(/\s+/g, "-");

const isValidRepositoryName = (value: string) =>
  /^[A-Za-z0-9._-]{1,100}$/.test(value);

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";

  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }

  return btoa(binary);
};

const sizeLabel = (n: number) =>
  n < 1024
    ? `${n} B`
    : n < 1024 * 1024
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1024 / 1024).toFixed(2)} MB`;

const cleanPath = (s: string) =>
  s.replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "");

async function fileToEntry(
  file: File,
  path = file.webkitRelativePath || file.name
): Promise<Entry> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes.byteLength > MAX_FILE) {
    throw new Error(`${path} melebihi batas 12 MB per file.`);
  }

  return {
    path: cleanPath(path),
    contentBase64: toBase64(bytes),
    size: bytes.byteLength,
    selected: true,
  };
}

async function extractTar(
  file: File,
  removeGit: boolean
): Promise<Entry[]> {
  let bytes = new Uint8Array(await file.arrayBuffer());

  if (/\.(tgz|tar\.gz)$/i.test(file.name)) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error(
        "Browser ini belum mendukung ekstraksi gzip. Gunakan browser terbaru."
      );
    }

    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));

    bytes = new Uint8Array(
      await new Response(stream).arrayBuffer()
    );
  }

  const out: Entry[] = [];
  let offset = 0;

  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);

    if (header.every((v) => v === 0)) break;

    const readString = (start: number, len: number) =>
      new TextDecoder()
        .decode(header.subarray(start, start + len))
        .replace(/\0.*$/, "");

    const name = readString(0, 100);
    const prefix = readString(345, 155);
    const path = cleanPath(prefix ? `${prefix}/${name}` : name);

    const sizeText = readString(124, 12)
      .trim()
      .replace(/\0/g, "");

    const size = parseInt(sizeText || "0", 8) || 0;
    const type = readString(156, 1);

    offset += 512;

    if (!name) break;

    if (
      type !== "5" &&
      !path.endsWith("/") &&
      !shouldSkip(path, removeGit)
    ) {
      if (size > MAX_FILE) {
        throw new Error(`${path} melebihi batas 12 MB per file.`);
      }

      if (offset + size > bytes.length) {
        throw new Error(`Archive TAR rusak saat membaca ${path}.`);
      }

      const data = bytes.slice(offset, offset + size);

      out.push({
        path,
        contentBase64: toBase64(data),
        size: data.byteLength,
        selected: true,
      });
    }

    offset += Math.ceil(size / 512) * 512;

    if (out.length > MAX_FILES) {
      throw new Error("Maksimal 1.500 file per upload.");
    }
  }

  return out;
}

export default function UploadPage() {
  const [login, setLogin] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [repoName, setRepoName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [repoId, setRepoId] = useState("");
  const [branch, setBranch] = useState("main");
  const [message, setMessage] = useState(
    "Initial commit from XIYU GITHUB UPLOADER"
  );

  const [source, setSource] = useState<SourceMode>("archive");
  const [archive, setArchive] = useState<File | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [search, setSearch] = useState("");

  const [linkUrl, setLinkUrl] = useState("");
  const [pastePath, setPastePath] = useState("README.md");
  const [pasteContent, setPasteContent] = useState("");

  const [readme, setReadme] = useState("starter");
  const [license, setLicense] = useState("MIT");
  const [gitignore, setGitignore] = useState("Node");
  const [removeGit, setRemoveGit] = useState(true);

  const folderInput = useRef<HTMLInputElement>(null);

  const normalizedRepoName = useMemo(
    () => normalizeRepositoryName(repoName),
    [repoName]
  );

  const repoNameValid =
    normalizedRepoName.length > 0 &&
    isValidRepositoryName(normalizedRepoName);

  const selectedRepo = useMemo(
    () => repos.find((r) => r.fullName === repoId),
    [repos, repoId]
  );

  const chosen = useMemo(
    () => entries.filter((e) => e.selected),
    [entries]
  );

  const chosenBytes = useMemo(
    () => chosen.reduce((n, e) => n + e.size, 0),
    [chosen]
  );

  const visibleEntries = useMemo(
    () =>
      entries.filter((e) =>
        e.path.toLowerCase().includes(search.toLowerCase())
      ),
    [entries, search]
  );

  useEffect(() => {
    fetch("/api/github/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setLogin(d.login))
      .catch(() => window.location.assign("/login"));

    fetch("/api/github/repos")
      .then((r) => (r.ok ? r.json() : []))
      .then(setRepos)
      .catch(() => setRepos([]));
  }, []);

  function validateEntries(items: Entry[]) {
    if (!items.length) {
      throw new Error("Tidak ada file yang bisa di-upload setelah cleanup.");
    }

    if (items.length > MAX_FILES) {
      throw new Error(`Maksimal ${MAX_FILES.toLocaleString("en-US")} file.`);
    }

    const seen = new Set<string>();

    for (const item of items) {
      if (
        !item.path ||
        item.path.split("/").some((p) => p === "..") ||
        item.path.startsWith("/")
      ) {
        throw new Error(`Path tidak valid: ${item.path}`);
      }

      if (item.size > MAX_FILE) {
        throw new Error(`${item.path} melebihi batas 12 MB per file.`);
      }

      if (seen.has(item.path)) {
        throw new Error(`Nama/path file duplikat: ${item.path}`);
      }

      seen.add(item.path);
    }

    return items;
  }

  async function loadArchive(file: File) {
    setError("");
    setSuccess("");
    setEntries([]);
    setArchive(file);

    if (file.size > MAX_ARCHIVE) {
      setError("Archive melebihi batas 150 MB.");
      return;
    }

    const lower = file.name.toLowerCase();

    if (!/\.(zip|tar|tgz|tar\.gz)$/.test(lower)) {
      setError("Format yang didukung: .zip, .tar, .tgz, .tar.gz.");
      return;
    }

    setBusy(true);
    setStage("Extracting archive");
    setProgress(0);

    try {
      let output: Entry[];

      if (lower.endsWith(".zip")) {
        const zip = await JSZip.loadAsync(file);

        const files = Object.values(zip.files).filter(
          (x) => !x.dir && !shouldSkip(x.name, removeGit)
        );

        if (files.length > MAX_FILES) {
          throw new Error("Maksimal 1.500 file per upload.");
        }

        output = [];

        for (let i = 0; i < files.length; i++) {
          const item = files[i];
          const data = await item.async("uint8array");

          if (data.byteLength > MAX_FILE) {
            throw new Error(
              `${item.name} melebihi batas 12 MB per file.`
            );
          }

          output.push({
            path: cleanPath(item.name),
            contentBase64: toBase64(data),
            size: data.byteLength,
            selected: true,
          });

          setProgress(
            Math.round(((i + 1) / files.length) * 100)
          );
        }
      } else {
        output = await extractTar(file, removeGit);
      }

      const firstSegments = output.map(
        (e) => e.path.split("/")[0]
      );

      if (
        firstSegments.length &&
        firstSegments.every((x) => x === firstSegments[0]) &&
        output.every((e) => e.path.includes("/"))
      ) {
        output = output.map((e) => ({
          ...e,
          path: e.path.slice(firstSegments[0].length + 1),
        }));
      }

      setEntries(validateEntries(output));
      setStage("");
      setProgress(0);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Gagal membaca archive."
      );
      setStage("");
    } finally {
      setBusy(false);
    }
  }

  async function loadFolder(files: FileList | null) {
    if (!files?.length) return;

    setError("");
    setSuccess("");
    setArchive(null);
    setEntries([]);
    setBusy(true);
    setStage("Reading folder");

    try {
      if (files.length > MAX_FILES) {
        throw new Error("Maksimal 1.500 file.");
      }

      const out: Entry[] = [];

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const path = f.webkitRelativePath.replace(/^[^/]+\//, "");

        if (!shouldSkip(path, removeGit)) {
          out.push(await fileToEntry(f, path));
        }

        setProgress(
          Math.round(((i + 1) / files.length) * 100)
        );
      }

      setEntries(validateEntries(out));
      setStage("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Gagal membaca folder."
      );
      setStage("");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  async function importLink() {
    setError("");
    setSuccess("");

    let url: URL;

    try {
      url = new URL(linkUrl);
    } catch {
      setError("Masukkan URL arsip yang valid.");
      return;
    }

    if (!["http:", "https:"].includes(url.protocol)) {
      setError("Hanya URL HTTP/HTTPS yang didukung.");
      return;
    }

    setBusy(true);
    setStage("Downloading archive");

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(
          `Download gagal (${response.status}). Host harus mengizinkan akses CORS.`
        );
      }

      const blob = await response.blob();

      if (blob.size > MAX_ARCHIVE) {
        throw new Error("Archive dari link melebihi 150 MB.");
      }

      const name = decodeURIComponent(
        url.pathname.split("/").pop() || "download.zip"
      );

      await loadArchive(
        new File([blob], name, { type: blob.type })
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Tidak bisa mengambil file dari link. Coba direct-download URL yang mengizinkan CORS."
      );
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  async function addPaste() {
    setError("");

    try {
      const path = cleanPath(pastePath.trim());

      if (!path || !pasteContent) {
        throw new Error("Isi path dan konten file terlebih dahulu.");
      }

      const blob = new Blob([pasteContent]);
      const f = new File(
        [blob],
        path.split("/").pop() || "pasted.txt"
      );

      const entry = await fileToEntry(f, path);

      setEntries((old) =>
        validateEntries([
          ...old.filter((e) => e.path !== path),
          entry,
        ])
      );

      setPasteContent("");
      setSuccess(`File ${path} ditambahkan.`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Gagal menambahkan file."
      );
    }
  }

  function addGeneratedFiles(items: Entry[]) {
    const extras: Entry[] = [];

    if (
      readme !== "none" &&
      !items.some((e) => e.path.toLowerCase() === "readme.md")
    ) {
      const text =
        `# ${normalizedRepoName || "My Project"}\n\n` +
        `${description || "Project uploaded with XIYU GITHUB UPLOADER."}\n`;

      const bytes = new TextEncoder().encode(text);

      extras.push({
        path: "README.md",
        contentBase64: toBase64(bytes),
        size: bytes.length,
        selected: true,
      });
    }

    if (
      license !== "None" &&
      !items.some((e) => e.path.toUpperCase() === "LICENSE")
    ) {
      const year = new Date().getFullYear();

      const text =
        license === "MIT"
          ? `MIT License

Copyright (c) ${year}

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
`
          : `${license} License\n\nCopyright (c) ${year}\n`;

      const bytes = new TextEncoder().encode(text);

      extras.push({
        path: "LICENSE",
        contentBase64: toBase64(bytes),
        size: bytes.length,
        selected: true,
      });
    }

    if (
      gitignore !== "None" &&
      !items.some((e) => e.path === ".gitignore")
    ) {
      const templates: Record<string, string> = {
        Node: "node_modules/\n.env\n.env.*\n!.env.example\n*.log\ndist/\nbuild/\n.next/\n",
        "Vite / React": "node_modules/\ndist/\n.env\n.env.*\n",
        "Next.js": "node_modules/\n.next/\nout/\n.env\n.env.*\n",
        Python: "__pycache__/\n*.py[cod]\n.venv/\nvenv/\n.env\n",
        "Java / Gradle": ".gradle/\nbuild/\n*.class\n",
        Unity: "Library/\nTemp/\nObj/\nBuild/\nLogs/\nUserSettings/\n",
      };

      const bytes = new TextEncoder().encode(
        templates[gitignore] || ""
      );

      extras.push({
        path: ".gitignore",
        contentBase64: toBase64(bytes),
        size: bytes.length,
        selected: true,
      });
    }

    return [...items, ...extras];
  }

  async function push() {
    setError("");
    setSuccess("");

    const selected = entries.filter((e) => e.selected);

    if (!selected.length) {
      setError("Pilih minimal satu file.");
      return;
    }

    let owner = "";
    let repo = "";

    if (mode === "new") {
      if (!repoName.trim()) {
        setError("Isi repository name.");
        return;
      }

      if (!repoNameValid) {
        setError(
          "Nama repository hanya boleh berisi huruf, angka, titik, tanda hubung, dan underscore. Maksimal 100 karakter."
        );
        return;
      }

      owner = login;
      repo = normalizedRepoName;
    } else {
      if (!selectedRepo) {
        setError("Pilih repository tujuan.");
        return;
      }

      [owner, repo] = selectedRepo.fullName.split("/");
    }

    setBusy(true);
    setProgress(0);

    try {
      if (mode === "new") {
        setStage("Creating repository");

        const r = await fetch("/api/github/repos/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: normalizedRepoName,
            description,
            private: isPrivate,
          }),
        });

        const d = await r.json();

        if (!r.ok) {
          throw new Error(d.error || "Could not create repository.");
        }

        repo = d.name || normalizedRepoName;
      }

      const finalEntries = validateEntries(
        addGeneratedFiles(selected)
      );

      const uploaded: { path: string; sha: string }[] = [];

      for (let i = 0; i < finalEntries.length; i++) {
        const e = finalEntries[i];

        setStage(
          `Uploading ${i + 1}/${finalEntries.length}: ${e.path}`
        );

        const r = await fetch("/api/github/blob", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner,
            repo,
            path: e.path,
            contentBase64: e.contentBase64,
          }),
        });

        const d = await r.json();

        if (!r.ok) {
          throw new Error(d.error || `Failed uploading ${e.path}`);
        }

        uploaded.push({
          path: e.path,
          sha: d.sha,
        });

        setProgress(
          Math.round(((i + 1) / finalEntries.length) * 85)
        );
      }

      setStage("Creating commit");

      const targetBranch =
        mode === "existing"
          ? branch.trim() || selectedRepo?.defaultBranch || "main"
          : "main";

      const commit = await fetch("/api/github/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo,
          branch: targetBranch,
          message,
          entries: uploaded,
        }),
      });

      const cd = await commit.json();

      if (!commit.ok) {
        throw new Error(cd.error || "Commit failed.");
      }

      setProgress(100);
      setStage("Complete");
      setSuccess(
        `Berhasil push ${cd.fileCount} file ke ${owner}/${repo}.`
      );

      window.open(
        cd.repoUrl || `https://github.com/${owner}/${repo}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Upload gagal."
      );
      setStage("Stopped");
    } finally {
      setBusy(false);
    }
  }

  const tabs: {
    id: SourceMode;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "archive",
      label: "Archive",
      icon: <UploadCloud size={17} />,
    },
    {
      id: "folder",
      label: "Folder",
      icon: <Folder size={17} />,
    },
    {
      id: "link",
      label: "From a link",
      icon: <Link2 size={17} />,
    },
    {
      id: "paste",
      label: "Paste files",
      icon: <FileCode2 size={17} />,
    },
  ];

  return (
    <main className="relative min-h-screen">
      <Decor />
      <Topbar login={login} />

      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-20 pt-8 md:px-8">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-xs text-[#9a8585]"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>

        <div className="mb-8">
          <p className="text-xs tracking-[.22em] text-[#ad898a]">
            YOUR PROJECT, YOUR LITTLE SPACE ✿
          </p>

          <h1 className="serif mt-2 text-4xl md:text-5xl">
            Push to GitHub
          </h1>

          <p className="mt-2 text-sm text-[#8b7a7a]">
            Archive, folder, link or pasted files — read in your browser,
            pushed only when you say so.
          </p>
        </div>

        <section className="soft-card rounded-3xl p-5 md:p-7">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                disabled={busy}
                onClick={() => setSource(t.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm ${
                  source === t.id
                    ? "btn-primary border-transparent"
                    : "border-[#eadbd4] bg-white/70"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {source === "archive" && (
            <label className="mt-5 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#dfc5c2] bg-[#fffaf7] p-6 text-center hover:bg-[#f9efed]">
              <UploadCloud
                size={34}
                className="mb-4 text-[#a77e82]"
              />

              <b>{archive?.name || "Drop your .zip or .tar.gz here"}</b>

              <span className="mt-2 text-sm text-[#9a8585]">
                {archive
                  ? `${sizeLabel(archive.size)} · ${entries.length} files extracted`
                  : "or click to browse — up to 150 MB, 1,500 files, 12 MB each"}
              </span>

              <input
                type="file"
                accept=".zip,.tar,.tgz,.tar.gz,application/zip,application/gzip"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  loadArchive(e.target.files[0])
                }
              />
            </label>
          )}

          {source === "folder" && (
            <div className="mt-5 rounded-3xl border-2 border-dashed border-[#dfc5c2] bg-[#fffaf7] p-8 text-center">
              <Folder
                size={34}
                className="mx-auto mb-4 text-[#a77e82]"
              />

              <b>Select a project folder</b>

              <p className="mt-2 text-sm text-[#9a8585]">
                Folder structure is preserved. Maximum 1,500 files and
                12 MB each.
              </p>

              <input
                ref={folderInput}
                type="file"
                multiple
                className="hidden"
                {...({ webkitdirectory: "" } as any)}
                onChange={(e) => loadFolder(e.target.files)}
              />

              <button
                onClick={() => folderInput.current?.click()}
                className="btn-primary mt-4 rounded-full px-5 py-3 text-sm"
              >
                Choose folder
              </button>
            </div>
          )}

          {source === "link" && (
            <div className="mt-5 rounded-3xl border border-[#eadbd4] bg-[#fffaf7] p-5">
              <label className="text-sm font-semibold">
                Archive URL
              </label>

              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com/project.zip"
                className="mt-2 w-full rounded-xl border border-[#eadbd4] bg-white px-4 py-3 text-sm"
              />

              <button
                onClick={importLink}
                disabled={busy || !linkUrl.trim()}
                className="btn-primary mt-3 rounded-full px-5 py-3 text-sm disabled:opacity-40"
              >
                Fetch and extract
              </button>

              <p className="mt-3 text-xs leading-5 text-[#9a8585]">
                GitHub, GitLab, Google Drive direct-download, and other
                HTTP(S) archive links. The remote host must permit browser
                CORS access.
              </p>
            </div>
          )}

          {source === "paste" && (
            <div className="mt-5 rounded-3xl border border-[#eadbd4] bg-[#fffaf7] p-5">
              <label className="text-sm font-semibold">
                File path
              </label>

              <input
                value={pastePath}
                onChange={(e) => setPastePath(e.target.value)}
                placeholder="src/index.js"
                className="mt-2 w-full rounded-xl border border-[#eadbd4] bg-white px-4 py-3 text-sm"
              />

              <label className="mt-4 block text-sm font-semibold">
                File content
              </label>

              <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                rows={7}
                placeholder="Paste your source code here…"
                className="mt-2 w-full rounded-xl border border-[#eadbd4] bg-white px-4 py-3 font-mono text-xs"
              />

              <button
                onClick={addPaste}
                className="btn-primary mt-3 rounded-full px-5 py-3 text-sm"
              >
                Add file
              </button>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#9a8585]">
            <span>150 MB archive</span>
            <span>·</span>
            <span>1,500 files</span>
            <span>·</span>
            <span>12 MB each</span>
          </div>

          {busy && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-[#f1e5e1]">
                <div
                  className="progress h-full rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="mt-2 text-xs text-[#9a8585]">
                {stage}
              </p>
            </div>
          )}
        </section>

        {entries.length > 0 && (
          <section className="soft-card mt-6 rounded-3xl p-5 md:p-7">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="font-semibold">
                Files to push — {chosen.length} of {entries.length} selected
                ({sizeLabel(chosenBytes)})
              </span>

              {expanded ? <ChevronUp /> : <ChevronDown />}
            </button>

            {expanded && (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      setEntries((es) =>
                        es.map((e) => ({ ...e, selected: true }))
                      )
                    }
                    className="rounded-full border border-[#eadbd4] px-4 py-2 text-xs"
                  >
                    Select all
                  </button>

                  <button
                    onClick={() =>
                      setEntries((es) =>
                        es.map((e) => ({ ...e, selected: false }))
                      )
                    }
                    className="rounded-full border border-[#eadbd4] px-4 py-2 text-xs"
                  >
                    Clear all
                  </button>

                  <div className="ml-auto flex items-center gap-2 rounded-full border border-[#eadbd4] bg-white px-3">
                    <Search size={14} />

                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search files"
                      className="w-28 py-2 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 max-h-80 overflow-auto rounded-2xl border border-[#eadbd4] bg-white/70 p-3">
                  {visibleEntries.map((e) => (
                    <label
                      key={e.path}
                      className="flex cursor-pointer items-center gap-3 border-b border-[#f1e7e2] py-2 last:border-0"
                    >
                      <input
                        type="checkbox"
                        checked={e.selected}
                        onChange={(v) =>
                          setEntries((es) =>
                            es.map((x) =>
                              x.path === e.path
                                ? { ...x, selected: v.target.checked }
                                : x
                            )
                          )
                        }
                      />

                      <span className="min-w-0 flex-1 truncate font-mono text-xs">
                        {e.path}
                      </span>

                      <span className="text-xs text-[#9a8585]">
                        {sizeLabel(e.size)}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        <section className="soft-card mt-6 rounded-3xl p-5 md:p-7">
          <h2 className="serif text-2xl">Where to push</h2>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => setMode("new")}
              className={`rounded-full border px-5 py-3 text-sm ${
                mode === "new"
                  ? "btn-primary border-transparent"
                  : "border-[#eadbd4] bg-white/70"
              }`}
            >
              New repository
            </button>

            <button
              disabled={busy}
              onClick={() => setMode("existing")}
              className={`rounded-full border px-5 py-3 text-sm ${
                mode === "existing"
                  ? "btn-primary border-transparent"
                  : "border-[#eadbd4] bg-white/70"
              }`}
            >
              Existing repository
            </button>
          </div>

          {mode === "new" ? (
            <div className="mt-5 grid gap-4">
              <Field label="Repository name">
                <input
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="YOUR PROJECT NAME"
                  className="field"
                  maxLength={100}
                />

                {repoName.trim() && (
                  <div className="rounded-xl border border-[#eadbd4] bg-white/70 px-4 py-3 text-xs">
                    <span className="text-[#9a8585]">
                      Repository name preview
                    </span>

                    <p className="mt-1 break-all font-mono font-semibold text-[#816d6e]">
                      {normalizedRepoName}
                    </p>

                    {!repoNameValid && (
                      <p className="mt-2 text-red-600">
                        Gunakan hanya huruf, angka, titik, tanda hubung,
                        atau underscore. Maksimal 100 karakter.
                      </p>
                    )}
                  </div>
                )}
              </Field>

              <Field label="Description (optional)">
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this project is"
                  className="field"
                />
              </Field>

              <Field label="Branch">
                <input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value || "main")}
                  className="field"
                />
              </Field>
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              <Field label="Repository">
                <select
                  value={repoId}
                  onChange={(e) => {
                    setRepoId(e.target.value);

                    const r = repos.find(
                      (x) => x.fullName === e.target.value
                    );

                    if (r) setBranch(r.defaultBranch);
                  }}
                  className="field"
                >
                  <option value="">Select repository…</option>

                  {repos.map((r) => (
                    <option key={r.id} value={r.fullName}>
                      {r.fullName}
                      {r.private ? " · private" : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Branch">
                <input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="field"
                />
              </Field>
            </div>
          )}

          <div className="mt-4">
            <Field label="Commit message">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="field"
              />
            </Field>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="README">
              <div className="flex flex-wrap gap-2">
                {[
                  ["none", "Don't add one"],
                  ["starter", "Starter README"],
                  ["ai", "AI-written README"],
                ].map(([v, l]) => (
                  <Choice
                    key={v}
                    active={readme === v}
                    onClick={() => setReadme(v)}
                  >
                    {l}
                  </Choice>
                ))}
              </div>
            </Field>

            <Field label="Licence">
              <div className="flex flex-wrap gap-2">
                {["None", "MIT", "Apache 2.0", "GPL 3.0", "Unlicense"].map(
                  (v) => (
                    <Choice
                      key={v}
                      active={license === v}
                      onClick={() => setLicense(v)}
                    >
                      {v}
                    </Choice>
                  )
                )}
              </div>
            </Field>

            <Field label=".gitignore template">
              <div className="flex flex-wrap gap-2">
                {[
                  "None",
                  "Node",
                  "Vite / React",
                  "Next.js",
                  "Python",
                  "Java / Gradle",
                  "Unity",
                ].map((v) => (
                  <Choice
                    key={v}
                    active={gitignore === v}
                    onClick={() => setGitignore(v)}
                  >
                    {v}
                  </Choice>
                ))}
              </div>
            </Field>

            <Field label="Visibility">
              <div className="flex gap-2">
                <Choice
                  active={isPrivate}
                  onClick={() => setIsPrivate(true)}
                >
                  Private
                </Choice>

                <Choice
                  active={!isPrivate}
                  onClick={() => setIsPrivate(false)}
                >
                  Public
                </Choice>
              </div>
            </Field>
          </div>

          <label className="mt-6 flex items-start gap-3 rounded-2xl border border-[#eadbd4] bg-white/70 p-4 text-sm">
            <input
              type="checkbox"
              checked={removeGit}
              onChange={(e) => setRemoveGit(e.target.checked)}
              className="mt-1"
            />

            <span>
              <b>Remove nested .git folders</b>

              <span className="mt-1 block text-xs text-[#9a8585]">
                Avoid importing nested Git history from source folders.
              </span>
            </span>
          </label>

          <button
            disabled={
              busy ||
              chosen.length === 0 ||
              (mode === "new" && !repoNameValid)
            }
            onClick={push}
            className="btn-primary mt-6 flex w-full items-center justify-center gap-3 rounded-full px-5 py-4 text-sm font-semibold disabled:opacity-40"
          >
            {busy ? (
              <>
                <Loader2 className="animate-spin" size={17} />
                {stage || "Working…"}
              </>
            ) : (
              <>
                <UploadCloud size={17} />
                Create repo and push
                <Sparkles size={16} />
              </>
            )}
          </button>

          {(busy || progress > 0) && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-[#f1e5e1]">
                <div
                  className="progress h-full rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-2 flex justify-between text-xs text-[#9a8585]">
                <span>{stage}</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800">
              {success}
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-[11px] text-[#a18d8c]">
          Made with ♡ · 안녕, happy coding ✿
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold text-[#816d6e]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs ${
        active
          ? "btn-primary border-transparent"
          : "border-[#eadbd4] bg-white/70"
      }`}
    >
      {children}
    </button>
  );
}
