"use client";

import { useRef, type ChangeEvent } from "react";
import { Download, Upload } from "lucide-react";
import type { FamilyData } from "@/lib/types";
import { parseFamilyData } from "@/lib/validate";

type Props = {
  data: FamilyData;
  onImport: (data: FamilyData, warnings: string[]) => void;
  onError: (message: string) => void;
};

const btn =
  "flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-95 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

export default function ImportExport({ data, onImport, onError }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `family-tree-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      onError("Export করা যায়নি। আবার চেষ্টা করুন।");
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        onError("ফাইলটি সঠিক JSON নয়।");
        return;
      }
      const result = parseFamilyData(json);
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onImport(result.data, result.warnings);
    } catch {
      onError("ফাইলটি পড়া যায়নি।");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={btn}
        aria-label="Import Family Tree"
        title="Import Family Tree"
      >
        <Upload size={18} />
        <span className="hidden lg:inline">Import</span>
      </button>
      <button
        type="button"
        onClick={exportJson}
        className={btn}
        aria-label="Export Family Tree"
        title="Export Family Tree"
      >
        <Download size={18} />
        <span className="hidden lg:inline">Export</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onFile}
        aria-label="Import file"
      />
    </>
  );
}
