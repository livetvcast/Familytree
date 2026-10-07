import type { Edge, Node } from "reactflow";
import type { FamilyMember } from "./types";

export const NODE_W = 180;
export const NODE_H = 96;
export const JUNCTION_SIZE = 8;

const COUPLE_GAP = 48;
const SIBLING_GAP = 40;
const ROOT_GAP = 80;
const LEVEL_GAP = 190;

export type TreeLayout = { nodes: Node[]; edges: Edge[] };

type Unit = { id: number; memberIds: string[]; level: number };
type MemberMap = Map<string, FamilyMember>;
type SpouseMap = Map<string, Set<string>>;

function buildSpouseMap(members: FamilyMember[], byId: MemberMap): SpouseMap {
  const map: SpouseMap = new Map();
  members.forEach((m) => map.set(m.id, new Set()));
  for (const m of members) {
    for (const s of m.spouseIds) {
      if (s !== m.id && byId.has(s)) {
        map.get(m.id)?.add(s);
        map.get(s)?.add(m.id);
      }
    }
  }
  return map;
}

function computeLevels(
  members: FamilyMember[],
  spouses: SpouseMap
): Map<string, number> {
  const level = new Map<string, number>();
  members.forEach((m) => level.set(m.id, 0));

  for (let i = 0; i < members.length + 2; i++) {
    let changed = false;
    for (const m of members) {
      let lv = level.get(m.id) ?? 0;
      for (const pid of [m.fatherId, m.motherId]) {
        if (pid && level.has(pid)) {
          lv = Math.max(lv, (level.get(pid) ?? 0) + 1);
        }
      }
      for (const sid of Array.from(spouses.get(m.id) ?? [])) {
        lv = Math.max(lv, level.get(sid) ?? 0);
      }
      if (lv !== level.get(m.id)) {
        level.set(m.id, lv);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return level;
}

function genderRank(m?: FamilyMember): number {
  if (m?.gender === "male") return 0;
  if (m?.gender === "female") return 1;
  return 2;
}

function orderGroup(
  group: string[],
  byId: MemberMap,
  spouses: SpouseMap
): string[] {
  const sorted = [...group].sort((a, b) => {
    const ma = byId.get(a);
    const mb = byId.get(b);
    return (
      genderRank(ma) - genderRank(mb) ||
      (ma?.birthDate ?? "").localeCompare(mb?.birthDate ?? "")
    );
  });
  if (sorted.length <= 2) return sorted;

  // একজনের একাধিক spouse থাকলে তাকে মাঝখানে বসানো হবে
  let hub = sorted[0];
  for (const id of sorted) {
    if ((spouses.get(id)?.size ?? 0) > (spouses.get(hub)?.size ?? 0)) {
      hub = id;
    }
  }
  const others = sorted.filter((id) => id !== hub);
  const left = others.filter((_, i) => i % 2 === 0);
  const right = others.filter((_, i) => i % 2 === 1);
  return [...left, hub, ...right];
}

function buildUnits(
  members: FamilyMember[],
  byId: MemberMap,
  spouses: SpouseMap,
  levels: Map<string, number>
): Unit[] {
  const seen = new Set<string>();
  const units: Unit[] = [];
  for (const m of members) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    const stack = [m.id];
    const group: string[] = [];
    while (stack.length > 0) {
      const cur = stack.pop() as string;
      group.push(cur);
      for (const s of Array.from(spouses.get(cur) ?? [])) {
        if (!seen.has(s)) {
          seen.add(s);
          stack.push(s);
        }
      }
    }
    units.push({
      id: units.length,
      memberIds: orderGroup(group, byId, spouses),
      level: levels.get(m.id) ?? 0,
    });
  }
  return units;
}

function unitWidth(u: Unit): number {
  const n = u.memberIds.length;
  return n * NODE_W + (n - 1) * COUPLE_GAP;
}

function sortKey(u: Unit, byId: MemberMap): string {
  const dates = u.memberIds
    .map((id) => byId.get(id)?.birthDate)
    .filter((d): d is string => !!d)
    .sort();
  return dates[0] ?? "9999";
}

export function buildTreeLayout(members: FamilyMember[]): TreeLayout {
  const byId: MemberMap = new Map(members.map((m) => [m.id, m]));
  const spouses = buildSpouseMap(members, byId);
  const levels = computeLevels(members, spouses);
  const units = buildUnits(members, byId, spouses, levels);

  const unitOf = new Map<string, Unit>();
  units.forEach((u) => u.memberIds.forEach((id) => unitOf.set(id, u)));

  // কোন unit কার সন্তান
  const childrenOf = new Map<number, Unit[]>();
  const roots: Unit[] = [];
  for (const u of units) {
    let parent: Unit | undefined;
    for (const id of u.memberIds) {
      const m = byId.get(id);
      for (const pid of [m?.fatherId, m?.motherId]) {
        const pu = pid ? unitOf.get(pid) : undefined;
        if (pu && pu !== u && !parent) parent = pu;
      }
    }
    if (parent) {
      const list = childrenOf.get(parent.id) ?? [];
      list.push(u);
      childrenOf.set(parent.id, list);
    } else {
      roots.push(u);
    }
  }
  childrenOf.forEach((list) =>
    list.sort((a, b) => sortKey(a, byId).localeCompare(sortKey(b, byId)))
  );
  roots.sort((a, b) => sortKey(a, byId).localeCompare(sortKey(b, byId)));

  // প্রতিটি unit-এর জন্য কতটা চওড়া জায়গা লাগবে
  const widths = new Map<number, number>();
  const visiting = new Set<number>();
  const width = (u: Unit): number => {
    const cached = widths.get(u.id);
    if (cached !== undefined) return cached;
    if (visiting.has(u.id)) return unitWidth(u);
    visiting.add(u.id);
    const kids = childrenOf.get(u.id) ?? [];
    const kidsW =
      kids.reduce((sum, k) => sum + width(k), 0) +
      Math.max(0, kids.length - 1) * SIBLING_GAP;
    const w = Math.max(unitWidth(u), kidsW);
    visiting.delete(u.id);
    widths.set(u.id, w);
    return w;
  };

  // সবার অবস্থান ঠিক করা
  const pos = new Map<string, { x: number; y: number }>();
  const placed = new Set<number>();
  const place = (u: Unit, left: number) => {
    if (placed.has(u.id)) return;
    placed.add(u.id);
    const w = width(u);
    const y = u.level * LEVEL_GAP;
    let x = left + (w - unitWidth(u)) / 2;
    for (const id of u.memberIds) {
      pos.set(id, { x, y });
      x += NODE_W + COUPLE_GAP;
    }
    const kids = (childrenOf.get(u.id) ?? []).filter((k) => !placed.has(k.id));
    const kidsW =
      kids.reduce((sum, k) => sum + width(k), 0) +
      Math.max(0, kids.length - 1) * SIBLING_GAP;
    let cx = left + (w - kidsW) / 2;
    for (const k of kids) {
      place(k, cx);
      cx += width(k) + SIBLING_GAP;
    }
  };

  let cursor = 0;
  for (const u of [...roots, ...units]) {
    if (placed.has(u.id)) continue;
    place(u, cursor);
    cursor += width(u) + ROOT_GAP;
  }

  // Nodes
  const nodes: Node[] = members.map((m) => ({
    id: m.id,
    type: "member",
    position: pos.get(m.id) ?? { x: 0, y: 0 },
    data: { member: m },
  }));

  const edges: Edge[] = [];

  // Spouse (বিয়ের) লাইন
  spouses.forEach((set, a) => {
    set.forEach((b) => {
      if (a >= b) return;
      const pa = pos.get(a);
      const pb = pos.get(b);
      if (!pa || !pb) return;
      const [l, r] = pa.x <= pb.x ? [a, b] : [b, a];
      edges.push({
        id: `s-${a}-${b}`,
        source: l,
        target: r,
        sourceHandle: "right",
        targetHandle: "left",
        type: "straight",
        data: { kind: "spouse" },
        style: { stroke: "#ec4899", strokeWidth: 2, strokeDasharray: "6 4" },
      });
    });
  });

  // বাবা-মা থেকে সন্তান
  const isCouple = (a: string, b: string): boolean => {
    const pa = pos.get(a);
    const pb = pos.get(b);
    if (!pa || !pb || !spouses.get(a)?.has(b)) return false;
    return (
      pa.y === pb.y &&
      Math.abs(Math.abs(pa.x - pb.x) - (NODE_W + COUPLE_GAP)) < 1
    );
  };

  const parentStyle = { stroke: "#94a3b8", strokeWidth: 2 };
  const junctions = new Set<string>();

  for (const m of members) {
    const parents = [m.fatherId, m.motherId].filter(
      (p): p is string => !!p && pos.has(p)
    );
    if (parents.length === 0) continue;

    if (parents.length === 2 && isCouple(parents[0], parents[1])) {
      const [a, b] = [...parents].sort();
      const jid = `j-${a}-${b}`;
      if (!junctions.has(jid)) {
        junctions.add(jid);
        const pa = pos.get(a) as { x: number; y: number };
        const pb = pos.get(b) as { x: number; y: number };
        const mid = (Math.min(pa.x, pb.x) + Math.max(pa.x, pb.x) + NODE_W) / 2;
        nodes.push({
          id: jid,
          type: "junction",
          position: {
            x: mid - JUNCTION_SIZE / 2,
            y: pa.y + NODE_H / 2 - JUNCTION_SIZE / 2,
          },
          data: {},
          draggable: false,
          selectable: false,
        });
      }
      edges.push({
        id: `p-${jid}-${m.id}`,
        source: jid,
        target: m.id,
        sourceHandle: "bottom",
        targetHandle: "top",
        type: "smoothstep",
        style: parentStyle,
      });
    } else {
      for (const p of parents) {
        edges.push({
          id: `p-${p}-${m.id}`,
          source: p,
          target: m.id,
          sourceHandle: "bottom",
          targetHandle: "top",
          type: "smoothstep",
          style: parentStyle,
        });
      }
    }
  }

  return { nodes, edges };
}
