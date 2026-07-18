"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutGrid,
  LayoutList,
  LogIn,
  LogOut,
  Menu,
  Palette,
  Pin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { NoteCard, Note } from "@/components/NoteCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const SESSION_KEY = "notes-session";

type SessionUser = {
  id: string;
  email: string;
};

type AuthMode = "login" | "register";
type NotesView = "notes" | "pinned" | "trash";
type LayoutMode = "grid" | "list";

type NoteForm = {
  title: string;
  content: string;
  color: string;
};

const VIEW_META: Record<
  NotesView,
  { label: string; subtitle: string; icon: typeof Sparkles }
> = {
  notes: {
    label: "Notes",
    subtitle: "Barcha faol yozuvlar shu yerda jamlanadi",
    icon: Sparkles,
  },
  pinned: {
    label: "saralanganlar",
    subtitle: "Muhim yozuvlarni tez topish uchun",
    icon: Pin,
  },
  trash: {
    label: "o'chirilganlar",
    subtitle: "Tiklash yoki butunlay o'chirish mumkin",
    icon: Trash2,
  },
};

const NOTE_COLORS = [
  { name: "Sariq", value: "#FFC107" },
  { name: "Kulrang", value: "#BDBDBD" },
  { name: "Och qizil", value: "#FFEBEE" },
  { name: "Ko'k", value: "#2196F3" },
  { name: "Qoramtir", value: "#2C2C2C" },
  { name: "Och kulrang", value: "#E0E0E0" },
];

const EMPTY_FORM: NoteForm = {
  title: "",
  content: "",
  color: "#FFC107",
};

async function readResponseError(response: Response) {
  try {
    const data = await response.json();
    return typeof data?.error === "string"
      ? data.error
      : "Kutilmagan xatolik yuz berdi";
  } catch {
    return "Kutilmagan xatolik yuz berdi";
  }
}

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [view, setView] = useState<NotesView>("notes");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("grid");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [search, setSearch] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerSaving, setComposerSaving] = useState(false);
  const [composerError, setComposerError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NoteForm>(EMPTY_FORM);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const contentInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        setUser(JSON.parse(saved) as SessionUser);
      } catch {
        window.localStorage.removeItem(SESSION_KEY);
      }
    }

    const updateLayout = () => {
      setLayoutMode(window.innerWidth < 1024 ? "list" : "grid");
    };

    updateLayout();
    setSidebarCollapsed(window.innerWidth < 1180);

    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  async function fetchNotes(userId: string, currentView: NotesView) {
    setLoadingNotes(true);
    setNotesError("");

    try {
      const response = await fetch(
        `${API_URL}/notes/${userId}?view=${currentView}`
      );

      if (!response.ok) {
        throw new Error(await readResponseError(response));
      }

      const data = (await response.json()) as Note[];
      setNotes(Array.isArray(data) ? data : []);
    } catch (error) {
      setNotes([]);
      setNotesError(
        error instanceof Error ? error.message : "Yozuvlarni yuklab bo'lmadi"
      );
    } finally {
      setLoadingNotes(false);
    }
  }

  async function refreshNotes() {
    if (!user) return;
    await fetchNotes(user.id, view);
  }

  async function handleAuthSubmit() {
    if (!authForm.email.trim() || !authForm.password.trim()) {
      setAuthError("Email va parol kiritish kerak");
      return;
    }

    setAuthLoading(true);
    setAuthError("");

    try {
      const response = await fetch(`${API_URL}/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response));
      }

      const session = (await response.json()) as SessionUser;
      setUser(session);
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setAuthForm({ email: "", password: "" });
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Kirish amalga oshmadi"
      );
    } finally {
      setAuthLoading(false);
    }
  }

  function openComposer(note?: Note) {
    setComposerError("");
    setEditingId(note?.id ?? null);
    setFormData(
      note
        ? {
            title: note.title,
            content: note.content,
            color: note.color || "#FFC107",
          }
        : EMPTY_FORM
    );
    setComposerOpen(true);
  }

  function closeComposer() {
    setComposerOpen(false);
    setComposerError("");
    setEditingId(null);
    setFormData(EMPTY_FORM);
  }

  function logout() {
    setUser(null);
    setNotes([]);
    setView("notes");
    setSearch("");
    setComposerOpen(false);
    setComposerError("");
    setEditingId(null);
    window.localStorage.removeItem(SESSION_KEY);
  }

  async function saveNote() {
    if (!user || composerSaving) return;

    const title = formData.title.trim();
    const content = formData.content.trim();

    if (!editingId && !title && !content) {
      setComposerError("Hech bo'lmaganda title yoki matn yozing");
      return;
    }

    setComposerSaving(true);
    setComposerError("");

    try {
      const response = await fetch(
        editingId ? `${API_URL}/notes/${editingId}` : `${API_URL}/notes`,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            title: formData.title,
            content: formData.content,
            color: formData.color,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await readResponseError(response));
      }

      closeComposer();
      await refreshNotes();
    } catch (error) {
      setComposerError(
        error instanceof Error ? error.message : "Yozuv saqlanmadi"
      );
    } finally {
      setComposerSaving(false);
    }
  }

  async function togglePin(note: Note) {
    if (!user) return;

    try {
      const response = await fetch(`${API_URL}/notes/${note.id}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response));
      }

      await refreshNotes();
    } catch (error) {
      setNotesError(
        error instanceof Error ? error.message : "Pin holati yangilanmadi"
      );
    }
  }

  async function restoreNote(note: Note) {
    if (!user) return;

    try {
      const response = await fetch(`${API_URL}/notes/${note.id}/restore`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response));
      }

      await refreshNotes();
    } catch (error) {
      setNotesError(
        error instanceof Error ? error.message : "Yozuv tiklanmadi"
      );
    }
  }

  async function deleteNote(note: Note) {
    if (!user) return;

    try {
      const response = await fetch(`${API_URL}/notes/${note.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok && response.status !== 204) {
        throw new Error(await readResponseError(response));
      }

      await refreshNotes();
    } catch (error) {
      setNotesError(
        error instanceof Error ? error.message : "Yozuv o'chirilmadi"
      );
    }
  }

  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }

    void fetchNotes(user.id, view);
  }, [user, view]);

  useEffect(() => {
    if (!composerOpen) return;

    const timeout = window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [composerOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (event.key === "Escape") {
        if (composerOpen) {
          closeComposer();
        } else {
          setSearch("");
          searchInputRef.current?.blur();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        if (composerOpen && !composerSaving) {
          event.preventDefault();
          void saveNote();
        }
        return;
      }

      if (!typing && event.key.toLowerCase() === "n" && !composerOpen) {
        event.preventDefault();
        openComposer();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [composerOpen, composerSaving, closeComposer, openComposer, saveNote]);

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return notes;

    return notes.filter((note) => {
      return (
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
      );
    });
  }, [notes, search]);

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0f0f0f] px-4 py-8 text-[#E0E0E0] sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
          <section className="grid w-full gap-6 overflow-hidden rounded-[32px] border border-white/10 bg-[#121212] shadow-[0_30px_90px_rgba(0,0,0,0.45)] lg:grid-cols-[1.1fr_0.9fr]">
            <div className="border-b border-white/5 p-8 sm:p-10 lg:border-b-0 lg:border-r">
              <p className="text-xs uppercase tracking-[0.5em] text-[#FFA500]">
                Notes workspace
              </p>
              <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight text-[#E0E0E0] sm:text-5xl">
                Google Keep uslubidagi tezkor va yengil notes ilovasi
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-white/65">
                Kirish yoki ro'yxatdan o'ting, keyin yozuvlarni ranglar bilan
                saqlang, pin qiling, trashga yuboring va qayta tiklang.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <InfoChip label="Saqlash" value="PostgreSQL + Prisma" />
                <InfoChip label="Backend" value="Fastify API" />
                <InfoChip label="Frontend" value="Next.js + shadcn" />
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="rounded-[28px] border border-white/10 bg-[#0f0f0f] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFA500] text-[#121212]">
                    <LogIn className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-[#FFA500]/80">
                      Access
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-[#E0E0E0]">
                      Hisobga kirish
                    </h2>
                  </div>
                </div>

                <div className="mt-6 flex rounded-full border border-white/10 bg-[#121212] p-1">
                  <AuthToggle
                    active={authMode === "login"}
                    label="Kirish"
                    onClick={() => setAuthMode("login")}
                  />
                  <AuthToggle
                    active={authMode === "register"}
                    label="Ro'yxat"
                    onClick={() => setAuthMode("register")}
                  />
                </div>

                <div className="mt-6 space-y-4">
                  <AuthField
                    label="Email"
                    value={authForm.email}
                    placeholder="user@example.com"
                    onChange={(value) =>
                      setAuthForm((current) => ({ ...current, email: value }))
                    }
                  />
                  <AuthField
                    label="Parol"
                    value={authForm.password}
                    placeholder="••••••••"
                    type="password"
                    onChange={(value) =>
                      setAuthForm((current) => ({ ...current, password: value }))
                    }
                  />
                </div>

                {authError ? (
                  <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {authError}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => void handleAuthSubmit()}
                  disabled={authLoading}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFC107] px-5 py-3.5 text-sm font-semibold text-[#121212] transition hover:bg-[#ffca28] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{authMode === "login" ? "Kirish" : "Ro'yxatdan o'tish"}</span>
                  <LogIn className="h-4 w-4" />
                </button>

                <p className="mt-5 text-sm leading-7 text-white/55">
                  Saqlangan sessiya brauzerda qoladi. Keyinroq noteslarni
                  to'liq ochib tahrirlash, pinlash va trashdan tiklash mumkin.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const viewMeta = VIEW_META[view];
  const ViewIcon = viewMeta.icon;
  const sidebarWidth = sidebarCollapsed ? "w-[92px]" : "w-[282px]";
  const mainColumns = layoutMode === "grid" ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1";

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-[#E0E0E0]">
      <div className="flex min-h-screen">
        <aside
          className={`hidden border-r border-white/5 bg-[#121212] transition-[width] duration-300 lg:flex ${sidebarWidth}`}
        >
          <div className="flex w-full flex-col gap-6 p-4">
            <div className="flex items-center gap-3 rounded-[24px] border border-white/5 bg-[#0f0f0f] px-4 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFA500] text-[#121212]">
                <Sparkles className="h-5 w-5" />
              </div>
              {!sidebarCollapsed ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.45em] text-[#FFA500]">
                    Notes
                  </p>
                  <p className="mt-1 text-sm text-white/60">Workspace</p>
                </div>
              ) : null}
            </div>

            <nav className="space-y-2">
              {(
                [
                  ["notes", "yozilganlar", Sparkles],
                  ["pinned", "saralanganlar", Pin],
                  ["trash", "o'chirilganlar", Trash2],
                ] as const
              ).map(([key, label, icon: Icon]) => {
                const active = view === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setView(key)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                      active
                        ? "bg-[#2C2C2C] text-[#FFA500] shadow-[inset_0_0_0_1px_rgba(255,165,0,0.28)]"
                        : "text-white/70 hover:bg-white/5 hover:text-[#E0E0E0]"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!sidebarCollapsed ? (
                      <span className="text-sm font-medium">{label}</span>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            {!sidebarCollapsed ? (
              <div className="rounded-[24px] border border-white/5 bg-[#0f0f0f] p-4">
                <p className="text-xs uppercase tracking-[0.35em] text-white/35">
                  Shortcuts
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-white/55">
                  <li>Ctrl/Cmd + K - qidiruv</li>
                  <li>N - yangi note</li>
                  <li>Ctrl/Cmd + Enter - saqlash</li>
                </ul>
              </div>
            ) : null}

            <div className="mt-auto rounded-[24px] border border-white/5 bg-[#0f0f0f] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2C2C2C] text-[#E0E0E0]">
                  <User className="h-4 w-4" />
                </div>
                {!sidebarCollapsed ? (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#E0E0E0]">
                      {user.email}
                    </p>
                    <p className="text-xs text-white/45">Sessiya faol</p>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={logout}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#121212] px-4 py-2.5 text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-[#E0E0E0]"
              >
                <LogOut className="h-4 w-4" />
                {!sidebarCollapsed ? "Chiqish" : null}
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/5 bg-[#121212]/95 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => setSidebarCollapsed((current) => !current)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#2C2C2C] text-[#E0E0E0] transition hover:bg-white/10"
                aria-label="Sidebarni kichraytirish"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="relative min-w-0 flex-1 max-w-2xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" />
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Qidiruv"
                  className="h-11 w-full rounded-2xl border border-white/8 bg-[#2C2C2C] pl-11 pr-4 text-sm text-[#E0E0E0] outline-none placeholder:text-white/35 focus:border-[#FFA500]/60"
                />
              </div>

              <div className="order-3 flex w-full items-center gap-3 sm:order-none sm:w-auto">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0f0f0f] px-4 py-2 text-sm text-[#FFA500]">
                  <ViewIcon className="h-4 w-4" />
                  <span className="capitalize">{viewMeta.label}</span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setLayoutMode((current) => (current === "grid" ? "list" : "grid"))
                  }
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#2C2C2C] text-[#E0E0E0] transition hover:bg-white/10"
                  aria-label="Layoutni almashtirish"
                >
                  {layoutMode === "grid" ? (
                    <LayoutList className="h-5 w-5" />
                  ) : (
                    <LayoutGrid className="h-5 w-5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => openComposer()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#FFC107] px-5 py-3 text-sm font-semibold text-[#121212] transition hover:bg-[#ffca28]"
                >
                  <Plus className="h-4 w-4" />
                  Yangi yozuv
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-[#121212] px-4 text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-[#E0E0E0]"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Chiqish</span>
                </button>
              </div>
            </div>
          </header>

          <section className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.45em] text-[#FFA500]">
                  Workspace
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#E0E0E0]">
                  {viewMeta.label}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
                  {viewMeta.subtitle}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatBadge label="Jami" value={notes.length} />
                <StatBadge label="Ko'rinyapti" value={filteredNotes.length} />
                <StatBadge label="Rejim" value={layoutMode === "grid" ? "Grid" : "List"} />
                <StatBadge label="Status" value={loadingNotes ? "Yuklanmoqda" : "Tayyor"} />
              </div>
            </div>

            {notesError ? (
              <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {notesError}
              </div>
            ) : null}

            {loadingNotes ? (
              <div className="rounded-[28px] border border-white/8 bg-[#121212] p-8 text-sm text-white/55">
                Yozuvlar yuklanmoqda...
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-dashed border-white/10 bg-[#121212] px-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[#2C2C2C] text-[#FFA500]">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h2 className="mt-6 text-2xl font-semibold text-[#E0E0E0]">
                  Hozircha yozuv yo'q
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-white/55">
                  Yuqoridagi "Yangi yozuv" tugmasi orqali birinchi notesni
                  yarating. Rang tanlang, matn yozing va saqlang.
                </p>
              </div>
            ) : (
              <div className={`grid gap-4 ${mainColumns}`}>
                {filteredNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    view={view}
                    layoutMode={layoutMode}
                    onOpen={openComposer}
                    onDelete={deleteNote}
                    onTogglePin={togglePin}
                    onRestore={restoreNote}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {composerOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
          onClick={closeComposer}
        >
          <form
            className="relative w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/10 bg-[#121212] shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void saveNote();
            }}
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs uppercase tracking-[0.45em] text-[#FFA500]">
                  Composer
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#E0E0E0]">
                  {editingId ? "Yozuvni tahrirlash" : "Yangi yozuv"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeComposer}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#2C2C2C] text-[#E0E0E0] transition hover:bg-white/10"
                aria-label="Composerni yopish"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              {composerError ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {composerError}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm text-white/65">
                      Sarlavha
                    </span>
                    <input
                      ref={titleInputRef}
                      value={formData.title}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Masalan: Kundalik reja"
                      className="h-12 w-full rounded-2xl border border-white/10 bg-[#2C2C2C] px-4 text-[#E0E0E0] outline-none placeholder:text-white/35 focus:border-[#FFA500]/60"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm text-white/65">Matn</span>
                    <textarea
                      ref={contentInputRef}
                      value={formData.content}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          content: event.target.value,
                        }))
                      }
                      rows={11}
                      placeholder="Yozuvni shu yerga kiriting..."
                      className="w-full rounded-2xl border border-white/10 bg-[#2C2C2C] px-4 py-3 text-[#E0E0E0] outline-none placeholder:text-white/35 focus:border-[#FFA500]/60"
                    />
                  </label>
                </div>

                <div className="space-y-4 rounded-[28px] border border-white/8 bg-[#0f0f0f] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-[#E0E0E0]">
                    <Palette className="h-4 w-4 text-[#FFA500]" />
                    Rang tanlash
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {NOTE_COLORS.map((color) => {
                      const selected = formData.color === color.value;

                      return (
                        <button
                          key={color.value}
                          type="button"
                          title={color.name}
                          onClick={() =>
                            setFormData((current) => ({
                              ...current,
                              color: color.value,
                            }))
                          }
                          className={`relative h-16 rounded-2xl border transition ${
                            selected
                              ? "border-[#FFA500] ring-2 ring-[#FFA500]/40"
                              : "border-white/10 hover:border-white/20"
                          }`}
                          style={{ backgroundColor: color.value }}
                        >
                          {selected ? (
                            <span className="absolute inset-0 rounded-2xl bg-black/10" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-[24px] border border-white/8 bg-[#121212] p-4">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/35">
                      Preview
                    </p>
                    <div
                      className="mt-3 rounded-[24px] border border-white/10 p-4"
                      style={{ backgroundColor: formData.color }}
                    >
                      <div className="h-1.5 w-12 rounded-full bg-[#2196F3]" />
                      <p className="mt-4 text-sm font-semibold" style={{ color: "#121212" }}>
                        {formData.title.trim() || "Yangi note"}
                      </p>
                      <p className="mt-2 text-sm leading-7" style={{ color: "#121212" }}>
                        {formData.content.trim() || "Matn yozib ko'ring. Saqlashdan oldin rangni ham o'zgartirishingiz mumkin."}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/8 bg-[#121212] p-4 text-sm leading-7 text-white/55">
                    <p className="font-medium text-[#E0E0E0]">Qisqa maslahat</p>
                    <p className="mt-2">
                      Ctrl/Cmd + Enter bilan saqlash mumkin. Esc esa
                      oynani yopadi.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 px-5 py-4 sm:px-6">
              <p className="text-sm text-white/45">
                Rangli notes, tez saqlash va oddiy boshqaruv.
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeComposer}
                  className="rounded-2xl border border-white/10 bg-[#2C2C2C] px-5 py-3 text-sm font-medium text-[#E0E0E0] transition hover:bg-white/10"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={composerSaving}
                  className="rounded-2xl bg-[#FFC107] px-5 py-3 text-sm font-semibold text-[#121212] transition hover:bg-[#ffca28] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {composerSaving
                    ? "Saqlanmoqda..."
                    : editingId
                      ? "Yangilash"
                      : "Saqlash"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}

function InfoChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-[#0f0f0f] p-4">
      <p className="text-xs uppercase tracking-[0.35em] text-white/35">
        {label}
      </p>
      <p className="mt-3 text-sm font-medium text-[#E0E0E0]">{value}</p>
    </div>
  );
}

function AuthToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[#FFA500] text-[#121212]"
          : "text-white/60 hover:text-[#E0E0E0]"
      }`}
    >
      {label}
    </button>
  );
}

function AuthField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-white/65">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-white/10 bg-[#2C2C2C] px-4 text-[#E0E0E0] outline-none placeholder:text-white/35 focus:border-[#FFA500]/60"
      />
    </label>
  );
}

function StatBadge({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="min-w-[110px] rounded-[22px] border border-white/8 bg-[#121212] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.35em] text-white/35">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[#E0E0E0]">{value}</p>
    </div>
  );
}
