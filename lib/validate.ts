import type { FamilyData, FamilyMember, Gender } from "./types";

export type ParseResult =
  | { ok: true; data: FamilyData; warnings: string[] }
  | { ok: false; error: string };

const genders: Gender[] = ["male", "female", "other"];

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

export function parseFamilyData(raw: unknown): ParseResult {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !Array.isArray((raw as { members?: unknown }).members)
  ) {
    return { ok: false, error: "এটি সঠিক Family Tree ফাইল নয়।" };
  }

  const list = (raw as { members: unknown[] }).members;
  const warnings: string[] = [];
  const ids = new Set<string>();
  const members: FamilyMember[] = [];

  for (const item of list) {
    if (typeof item !== "object" || item === null) {
      return { ok: false, error: "একজন সদস্যের তথ্য ভুল আছে।" };
    }
    const m = item as Record<string, unknown>;
    const id = str(m.id);
    const name = str(m.name);
    if (!id || !name) {
      return { ok: false, error: "কোনো সদস্যের ID বা নাম নেই।" };
    }
    if (ids.has(id)) {
      return { ok: false, error: `একই ID দুইবার আছে: ${id}` };
    }
    ids.add(id);
    members.push({
      id,
      name,
      nickname: str(m.nickname),
      gender: genders.includes(m.gender as Gender)
        ? (m.gender as Gender)
        : undefined,
      birthDate: str(m.birthDate),
      deathDate: str(m.deathDate),
      photo: str(m.photo),
      fatherId: str(m.fatherId),
      motherId: str(m.motherId),
      spouseIds: Array.isArray(m.spouseIds)
        ? m.spouseIds.filter((x): x is string => typeof x === "string")
        : [],
      biography: str(m.biography),
      phone: str(m.phone),
      address: str(m.address),
    });
  }

  const cleaned = members.map((m) => {
    let { fatherId, motherId } = m;
    if (fatherId && !ids.has(fatherId)) {
      warnings.push(`${m.name}: বাবার তথ্য পাওয়া যায়নি, বাদ দেওয়া হয়েছে।`);
      fatherId = undefined;
    }
    if (motherId && !ids.has(motherId)) {
      warnings.push(`${m.name}: মায়ের তথ্য পাওয়া যায়নি, বাদ দেওয়া হয়েছে।`);
      motherId = undefined;
    }
    const spouseIds = m.spouseIds.filter((s) => s !== m.id && ids.has(s));
    if (spouseIds.length !== m.spouseIds.length) {
      warnings.push(`${m.name}: ভুল spouse link বাদ দেওয়া হয়েছে।`);
    }
    return { ...m, fatherId, motherId, spouseIds };
  });

  return { ok: true, data: { version: 1, members: cleaned }, warnings };
}
