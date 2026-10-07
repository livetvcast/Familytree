import type { FamilyMember } from "./types";

export function newId(): string {
  return (
    "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  );
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "?";
  if (parts.length === 1) return first.toUpperCase();
  const last = Array.from(parts[parts.length - 1])[0] ?? "";
  return (first + last).toUpperCase();
}

export function formatYear(date?: string): string {
  if (!date) return "";
  const m = /^\d{4}/.exec(date);
  return m ? m[0] : "";
}

export function formatLifespan(m: FamilyMember): string {
  const b = formatYear(m.birthDate);
  const d = formatYear(m.deathDate);
  if (b && d) return `${b} – ${d}`;
  if (b) return `জন্ম ${b}`;
  if (d) return `মৃত্যু ${d}`;
  return "";
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDate(date?: string): string {
  if (!date) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : date;
}

export function relationLabel(
  target: FamilyMember,
  members: FamilyMember[],
  rootId?: string
): string {
  if (!rootId) return "";
  const byId = new Map(members.map((m) => [m.id, m]));
  const root = byId.get(rootId);
  if (!root) return "";
  if (target.id === root.id) return "Me";

  const g = target.gender;
  const pick = (male: string, female: string, other: string) =>
    g === "male" ? male : g === "female" ? female : other;
  const parentsOf = (m: FamilyMember): string[] =>
    [m.fatherId, m.motherId].filter((p): p is string => !!p);

  const rootParents = parentsOf(root);
  const targetParents = parentsOf(target);

  if (rootParents.includes(target.id)) return pick("Father", "Mother", "Parent");
  if (root.spouseIds.includes(target.id) || target.spouseIds.includes(root.id))
    return pick("Husband", "Wife", "Spouse");
  if (targetParents.includes(root.id)) return pick("Son", "Daughter", "Child");
  if (targetParents.some((p) => rootParents.includes(p)))
    return pick("Brother", "Sister", "Sibling");

  const grandparents = rootParents.flatMap((p) => {
    const pm = byId.get(p);
    return pm ? parentsOf(pm) : [];
  });
  if (grandparents.includes(target.id))
    return pick("Grandfather", "Grandmother", "Grandparent");

  const isGrandchild = targetParents.some((p) => {
    const pm = byId.get(p);
    return pm ? parentsOf(pm).includes(root.id) : false;
  });
  if (isGrandchild) return pick("Grandson", "Granddaughter", "Grandchild");

  if (targetParents.some((p) => grandparents.includes(p)))
    return pick("Uncle", "Aunt", "Uncle/Aunt");
  const marriedToParentSibling = target.spouseIds.some((s) => {
    const sm = byId.get(s);
    return sm ? parentsOf(sm).some((p) => grandparents.includes(p)) : false;
  });
  if (marriedToParentSibling) return pick("Uncle", "Aunt", "Uncle/Aunt");

  return "";
}
