import type { jsPDF } from "jspdf";
import type { FamilyMember } from "./types";
import { buildTreeLayout, JUNCTION_SIZE, NODE_H, NODE_W } from "./layout";
import { formatYear, getInitials, relationLabel } from "./utils";

const LATIN = /^[\x20-\x7E\u00A0-\u00FF]*$/;
const SCALE = 6;
const FAMILY = '"Noto Sans Bengali","Noto Sans",system-ui,sans-serif';

type TextOpts = {
  size: number;
  color: string;
  bold?: boolean;
  maxW: number;
  align?: "left" | "center";
};

// ইংরেজি লেখা আসল text হিসেবে, বাংলা লেখা খুব বেশি মানের ছবি হিসেবে বসে
function drawText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  o: TextOpts
): void {
  if (!text) return;
  const align = o.align ?? "left";

  if (LATIN.test(text)) {
    pdf.setFont("helvetica", o.bold ? "bold" : "normal");
    let size = o.size;
    pdf.setFontSize(size);
    while (size > 7 && pdf.getTextWidth(text) > o.maxW) {
      size -= 0.5;
      pdf.setFontSize(size);
    }
    let t = text;
    if (pdf.getTextWidth(t) > o.maxW) {
      while (t.length > 1 && pdf.getTextWidth(t + "...") > o.maxW) {
        t = t.slice(0, -1);
      }
      t += "...";
    }
    pdf.setTextColor(o.color);
    pdf.text(t, x, y, { align });
    return;
  }

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) return;
  const font = (s: number) => `${o.bold ? "bold " : ""}${s * SCALE}px ${FAMILY}`;
  let size = o.size;
  measure.font = font(size);
  while (size > 7 && measure.measureText(text).width / SCALE > o.maxW) {
    size -= 0.5;
    measure.font = font(size);
  }
  let t = text;
  if (measure.measureText(t).width / SCALE > o.maxW) {
    let chars = Array.from(t);
    while (
      chars.length > 1 &&
      measure.measureText(chars.join("") + "...").width / SCALE > o.maxW
    ) {
      chars = chars.slice(0, -1);
    }
    t = chars.join("") + "...";
  }
  const wPt = measure.measureText(t).width / SCALE;
  if (wPt <= 0) return;
  const hPt = size * 1.7;

  const c = document.createElement("canvas");
  c.width = Math.ceil(wPt * SCALE) + 2;
  c.height = Math.ceil(hPt * SCALE);
  const ctx = c.getContext("2d");
  if (!ctx) return;
  ctx.font = font(size);
  ctx.fillStyle = o.color;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(t, 0, size * 1.3 * SCALE);
  const left = align === "center" ? x - wPt / 2 : x;
  pdf.addImage(c.toDataURL("image/png"), "PNG", left, y - size * 1.3, wPt, hPt);
}

function circleImage(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const s = 240;
      const c = document.createElement("canvas");
      c.width = s;
      c.height = s;
      const ctx = c.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const side = Math.min(img.width, img.height);
      ctx.drawImage(
        img,
        (img.width - side) / 2,
        (img.height - side) / 2,
        side,
        side,
        0,
        0,
        s,
        s
      );
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function lifespan(m: FamilyMember): string {
  const b = formatYear(m.birthDate);
  const d = formatYear(m.deathDate);
  if (b && d) return `${b} - ${d}`;
  if (b) return `b. ${b}`;
  if (d) return `d. ${d}`;
  return "";
}

const ringColor: Record<string, string> = {
  male: "#38bdf8",
  female: "#f472b6",
  other: "#a78bfa",
};

export async function exportTreePdf(
  members: FamilyMember[],
  rootId?: string
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { nodes, edges } = buildTreeLayout(members);
  if (nodes.length === 0) return;

  const pad = 50;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const w = n.type === "member" ? NODE_W : JUNCTION_SIZE;
    const h = n.type === "member" ? NODE_H : JUNCTION_SIZE;
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + w);
    maxY = Math.max(maxY, n.position.y + h);
  }
  const W = Math.ceil(maxX - minX + pad * 2);
  const H = Math.ceil(maxY - minY + pad * 2);
  const ox = pad - minX;
  const oy = pad - minY;

  const pdf = new jsPDF({
    orientation: W >= H ? "landscape" : "portrait",
    unit: "pt",
    format: [W, H],
  });

  const byId = new Map(nodes.map((n) => [n.id, n]));
  pdf.setLineCap("round");
  pdf.setLineWidth(1.6);

  // লাইন
  for (const e of edges) {
    const s = byId.get(e.source);
    const t = byId.get(e.target);
    if (!s || !t) continue;

    if ((e.data as { kind?: string } | undefined)?.kind === "spouse") {
      pdf.setDrawColor("#ec4899");
      pdf.setLineDashPattern([6, 4], 0);
      const y = s.position.y + NODE_H / 2 + oy;
      pdf.line(s.position.x + NODE_W + ox, y, t.position.x + ox, y);
      pdf.setLineDashPattern([], 0);
      continue;
    }

    pdf.setDrawColor("#94a3b8");
    const sx =
      s.type === "junction"
        ? s.position.x + JUNCTION_SIZE / 2 + ox
        : s.position.x + NODE_W / 2 + ox;
    const sy =
      s.type === "junction"
        ? s.position.y + JUNCTION_SIZE / 2 + oy
        : s.position.y + NODE_H + oy;
    const tx = t.position.x + NODE_W / 2 + ox;
    const ty = t.position.y + oy;
    const mid = (sy + ty) / 2;
    pdf.line(sx, sy, sx, mid);
    pdf.line(sx, mid, tx, mid);
    pdf.line(tx, mid, tx, ty);
  }

  // জোড়ার মাঝের ছোট বিন্দু
  pdf.setFillColor("#94a3b8");
  for (const n of nodes) {
    if (n.type !== "junction") continue;
    pdf.circle(
      n.position.x + JUNCTION_SIZE / 2 + ox,
      n.position.y + JUNCTION_SIZE / 2 + oy,
      3.5,
      "F"
    );
  }

  // সদস্যদের card
  for (const n of nodes) {
    if (n.type !== "member") continue;
    const m = (n.data as { member: FamilyMember }).member;
    const x = n.position.x + ox;
    const y = n.position.y + oy;

    pdf.setLineWidth(1);
    pdf.setFillColor("#ffffff");
    pdf.setDrawColor("#e2e8f0");
    pdf.roundedRect(x, y, NODE_W, NODE_H, 14, 14, "FD");

    const cx = x + 12 + 28;
    const cy = y + NODE_H / 2;
    pdf.setFillColor("#f1f5f9");
    pdf.setDrawColor(ringColor[m.gender ?? "other"]);
    pdf.setLineWidth(2);
    pdf.circle(cx, cy, 27, "FD");

    let photoDrawn = false;
    if (m.photo) {
      const url = await circleImage(m.photo);
      if (url) {
        pdf.addImage(url, "PNG", cx - 26, cy - 26, 52, 52);
        photoDrawn = true;
      }
    }
    if (!photoDrawn) {
      drawText(pdf, getInitials(m.name), cx, cy + 5, {
        size: 16,
        color: "#475569",
        bold: true,
        maxW: 44,
        align: "center",
      });
    }

    const tx = x + 80;
    const tw = NODE_W - 80 - 10;
    drawText(pdf, m.name, tx, y + 38, {
      size: 11,
      color: "#0f172a",
      bold: true,
      maxW: tw,
    });
    const span = lifespan(m);
    if (span) {
      drawText(pdf, span, tx, y + 53, {
        size: 9,
        color: "#64748b",
        maxW: tw,
      });
    }
    const label = relationLabel(m, members, rootId);
    if (label) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      const lw = Math.min(tw, pdf.getTextWidth(label) + 12);
      pdf.setFillColor("#eef6ff");
      pdf.roundedRect(tx, y + 62, lw, 14, 7, 7, "F");
      drawText(pdf, label, tx + 6, y + 72, {
        size: 8,
        color: "#1d4ed8",
        maxW: lw - 12,
      });
    }
  }

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "family-tree.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
