import { demoData } from "./demoData";
import { parseFamilyData } from "./validate";
import type { FamilyData } from "./types";

const KEY = "family-tree-data-v1";

export type LoadResult = { data: FamilyData; message?: string };

export function loadFamily(): LoadResult {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { data: demoData };
    const result = parseFamilyData(JSON.parse(raw));
    if (result.ok) return { data: result.data };
    return {
      data: demoData,
      message: "সংরক্ষিত তথ্য নষ্ট ছিল, তাই demo family দেখানো হচ্ছে।",
    };
  } catch {
    return {
      data: demoData,
      message: "Browser storage ব্যবহার করা যাচ্ছে না। তথ্য save হবে না।",
    };
  }
}

export function saveFamily(data: FamilyData): string | null {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
    return null;
  } catch {
    return "Save করা যায়নি। Storage ভরে গেছে বা বন্ধ আছে।";
  }
}

export function clearFamily(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
