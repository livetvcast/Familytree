"use client";

import { Moon, Plus, Sun, TreeDeciduous } from "lucide-react";
import type { FamilyData, FamilyMember } from "@/lib/types";
import SearchBar from "./SearchBar";
import ImportExport from "./ImportExport";

type Props = {
  members: FamilyMember[];
  data: FamilyData;
  dark: boolean;
  onToggleTheme: () => void;
  onAdd: () => void;
  onSearchSelect: (id: string) => void;
  onSearchResults: (ids: string[]) => void;
  onImport: (data: FamilyData, warnings: string[]) => void;
  onError: (message: string) => void;
};

export default function Toolbar({
  members,
  data,
  dark,
  onToggleTheme,
  onAdd,
  onSearchSelect,
  onSearchResults,
  onImport,
  onError,
}: Props) {
  return (
    <header className="z-30 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:px-5">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <TreeDeciduous size={22} className="text-brand-600" />
          <span className="gradient-text">My Family Tree</span>
        </h1>

        <div className="order-3 w-full md:order-2 md:mx-auto md:w-auto md:max-w-sm md:flex-1">
          <SearchBar
            members={members}
            onSelect={onSearchSelect}
            onResults={onSearchResults}
          />
        </div>

        <div className="order-2 ml-auto flex items-center gap-2 md:order-3">
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add Family Member"
            className="btn-gradient flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium text-white active:scale-95"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Member</span>
            <span className="sm:hidden">Add</span>
          </button>
          <ImportExport data={data} onImport={onImport} onError={onError} />
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Light mode" : "Dark mode"}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}