import type { FamilyMember } from "./types";

// সদস্য যোগ বা বদল করে, আর spouse সম্পর্ক দুই দিকেই মিলিয়ে দেয়
export function upsertMember(
  list: FamilyMember[],
  member: FamilyMember
): FamilyMember[] {
  const exists = list.some((m) => m.id === member.id);
  const ids = new Set([...list.map((m) => m.id), member.id]);
  const spouseIds = Array.from(new Set(member.spouseIds)).filter(
    (id) => id !== member.id && ids.has(id)
  );
  const clean: FamilyMember = { ...member, spouseIds };

  const base = exists
    ? list.map((m) => (m.id === member.id ? clean : m))
    : [...list, clean];

  return base.map((m) => {
    if (m.id === member.id) return m;
    const has = m.spouseIds.includes(member.id);
    const want = spouseIds.includes(m.id);
    if (has === want) return m;
    return {
      ...m,
      spouseIds: want
        ? [...m.spouseIds, member.id]
        : m.spouseIds.filter((id) => id !== member.id),
    };
  });
}

// সদস্য মুছে দেয়, আর অন্যদের থেকে তার সব link সরিয়ে দেয়
export function removeMember(
  list: FamilyMember[],
  id: string
): FamilyMember[] {
  return list
    .filter((m) => m.id !== id)
    .map((m) => ({
      ...m,
      fatherId: m.fatherId === id ? undefined : m.fatherId,
      motherId: m.motherId === id ? undefined : m.motherId,
      spouseIds: m.spouseIds.filter((s) => s !== id),
    }));
}

// কোনো সদস্যের বাবা বা মা হিসেবে অন্য একজনকে জুড়ে দেয়
export function linkParent(
  list: FamilyMember[],
  childId: string,
  parentId: string,
  role: "father" | "mother"
): FamilyMember[] {
  return list.map((m) => {
    if (m.id !== childId) return m;
    return role === "father"
      ? { ...m, fatherId: parentId }
      : { ...m, motherId: parentId };
  });
}
