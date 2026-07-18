"use client";

import type { MouseEvent, ReactNode } from "react";
import { Pin, RotateCcw, Trash2 } from "lucide-react";

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  isTrashed: boolean;
  updatedAt: string;
}

type NotesView = "notes" | "pinned" | "trash";
type LayoutMode = "grid" | "list";

interface NoteCardProps {
  note: Note;
  view: NotesView;
  layoutMode: LayoutMode;
  onOpen: (note: Note) => void;
  onDelete: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onRestore: (note: Note) => void;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("uz-UZ", {
  day: "2-digit",
  month: "short",
});

const COLOR_ALIASES: Record<string, string> = {
  gray: "#BDBDBD",
  yellow: "#FFC107",
  red: "#FFEBEE",
  blue: "#2196F3",
  dark: "#2C2C2C",
  light: "#E0E0E0",
  amber: "#FFC107",
  rose: "#FFEBEE",
  sky: "#2196F3",
};

function resolveColor(color: string) {
  return COLOR_ALIASES[color] ?? color ?? "#BDBDBD";
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length === 3) {
    const [r, g, b] = normalized.split("").map((part) => part + part);
    return {
      r: Number.parseInt(r, 16),
      g: Number.parseInt(g, 16),
      b: Number.parseInt(b, 16),
    };
  }

  if (normalized.length !== 6) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function isDarkColor(color: string) {
  const rgb = hexToRgb(resolveColor(color));
  if (!rgb) return false;

  const luminance =
    (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;

  return luminance < 0.55;
}

function formatDate(value: string) {
  return DATE_FORMATTER.format(new Date(value));
}

function ActionButton({
  label,
  children,
  onClick,
  danger = false,
  darkSurface = false,
}: {
  label: string;
  children: ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  danger?: boolean;
  darkSurface?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
        danger
          ? darkSurface
            ? "text-red-200 hover:bg-red-500/15 hover:text-red-100"
            : "text-red-600 hover:bg-red-500/10 hover:text-red-700"
          : darkSurface
            ? "text-[#E0E0E0] hover:bg-white/10 hover:text-white"
            : "text-[#121212] hover:bg-black/10 hover:text-black"
      }`}
    >
      {children}
    </button>
  );
}

export function NoteCard({
  note,
  view,
  layoutMode,
  onOpen,
  onDelete,
  onTogglePin,
  onRestore,
}: NoteCardProps) {
  const background = resolveColor(note.color);
  const darkSurface = isDarkColor(background);
  const textColor = darkSurface ? "#E0E0E0" : "#121212";
  const mutedColor = darkSurface ? "rgba(224,224,224,0.72)" : "rgba(18,18,18,0.72)";
  const borderColor = darkSurface
    ? "rgba(255,255,255,0.12)"
    : "rgba(18,18,18,0.12)";
  const overlay = darkSurface
    ? "linear-gradient(135deg, rgba(255,255,255,0.14), rgba(0,0,0,0.08))"
    : "linear-gradient(135deg, rgba(255,255,255,0.35), rgba(255,255,255,0.08))";

  return (
    <article
      onClick={() => {
        if (view !== "trash") {
          onOpen(note);
        }
      }}
      className={`group relative overflow-hidden rounded-[28px] border shadow-[0_12px_32px_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(0,0,0,0.26)] ${
        layoutMode === "list" ? "min-h-[172px]" : "min-h-[212px]"
      }`}
      style={{
        backgroundColor: background,
        color: textColor,
        borderColor,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ background: overlay }}
      />

      <div className="flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {note.isPinned ? (
              <Pin
                className="h-4 w-4 -rotate-45"
                style={{ color: darkSurface ? "#FFA500" : "#FFA500" }}
              />
            ) : (
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: mutedColor }}
              />
            )}
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: mutedColor }}
            >
              {view === "trash" ? "trash" : note.isPinned ? "pinned" : "note"}
            </span>
          </div>

          {view === "trash" ? (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{
                backgroundColor: darkSurface
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(18,18,18,0.06)",
                color: mutedColor,
              }}
            >
              deleted
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (view !== "trash") {
              onOpen(note);
            }
          }}
          className="mt-4 flex flex-1 flex-col items-start text-left"
        >
          <h3
            className={`line-clamp-2 font-semibold tracking-tight ${
              layoutMode === "list" ? "text-[18px]" : "text-[19px]"
            }`}
            style={{ color: textColor }}
          >
            {note.title || "Yozuv"}
          </h3>
          {note.content ? (
            <p
              className="mt-3 whitespace-pre-wrap text-sm leading-6"
              style={{
                color: mutedColor,
                WebkitLineClamp: layoutMode === "list" ? 4 : 6,
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {note.content}
            </p>
          ) : (
            <p className="mt-3 text-sm" style={{ color: mutedColor }}>
              Matn yo'q
            </p>
          )}
        </button>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs font-medium" style={{ color: mutedColor }}>
            {formatDate(note.updatedAt)}
          </span>

          {view === "trash" ? (
            <div className="flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
              <ActionButton
                label="Restore note"
                darkSurface={darkSurface}
                onClick={(event) => {
                  event.stopPropagation();
                  onRestore(note);
                }}
              >
                <RotateCcw className="h-4 w-4" />
              </ActionButton>
              <ActionButton
                label="Delete permanently"
                danger
                darkSurface={darkSurface}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(note);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </ActionButton>
            </div>
          ) : (
            <div className="flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
              <ActionButton
                label={note.isPinned ? "Unpin note" : "Pin note"}
                darkSurface={darkSurface}
                onClick={(event) => {
                  event.stopPropagation();
                  onTogglePin(note);
                }}
              >
                <Pin
                  className="h-4 w-4 -rotate-45"
                  style={{
                    color: note.isPinned
                      ? "#FFA500"
                      : darkSurface
                        ? "#E0E0E0"
                        : "#121212",
                  }}
                />
              </ActionButton>
              <ActionButton
                label="Move to trash"
                danger
                darkSurface={darkSurface}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(note);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </ActionButton>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
