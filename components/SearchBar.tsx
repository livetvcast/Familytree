"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { FamilyMember } from "@/lib/types";
import { formatLifespan, getInitials } from "@/lib/utils";

type Props = {
  members: FamilyMember[];
  onSelect: (id: string) => void;
  onResults?: (ids: string[]) => void;
};

export default function SearchBar({ members, onSelect, onResults }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(t) ||
          (m.nickname ?? "").toLowerCase().includes(t)
      )
      .slice(0, 8);
  }, [q, members]);

  useEffect(() => {
    onResults?.(results.map((m) => m.id));
  }, [results, onResults]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const choose = (id: string) => {
    onSelect(id);
    setQ("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <Search
        size={18}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && results[0]) choose(results[0].id);
        }}
        placeholder="নাম দিয়ে খুঁজুন…"
        aria-label="Search family members"
        className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-base text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      />
      {q && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setOpen(false);
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <X size={16} />
        </button>
      )}

      {open && q.trim() !== "" && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
        >
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
              কাউকে পাওয়া যায়নি।
            </li>
          ) : (
            results.map((m) => (
              <li key={m.id} role="option" aria-selected="false">
                <button
                  type="button"
                  onClick={() => choose(m.id)}
                  className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    {m.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      getInitials(m.name)
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {m.name}
                    </span>
                    {formatLifespan(m) && (
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {formatLifespan(m)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
