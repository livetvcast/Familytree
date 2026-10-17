"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  getRectOfNodes,
  useReactFlow,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  FileDown,
  Loader2,
  Maximize,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { FamilyMember } from "@/lib/types";
import { buildTreeLayout, NODE_H, NODE_W } from "@/lib/layout";
import { relationLabel } from "@/lib/utils";
import { nodeTypes, type MemberNodeData } from "./MemberCard";

export type FocusRequest = { id: string; n: number };

type Props = {
  members: FamilyMember[];
  rootId?: string;
  highlightIds: string[];
  selectedId?: string | null;
  focusRequest?: FocusRequest | null;
  dark: boolean;
  onSelect: (id: string) => void;
};

function TreeInner({
  members,
  rootId,
  highlightIds,
  selectedId,
  focusRequest,
  dark,
  onSelect,
}: Props) {
  const rf = useReactFlow();
  const [pdfBusy, setPdfBusy] = useState(false);

  const layout = useMemo(() => buildTreeLayout(members), [members]);

  const nodes = useMemo<Node[]>(
    () =>
      layout.nodes.map((n) => {
        if (n.type !== "member") return n;
        const data = n.data as MemberNodeData;
        return {
          ...n,
          selected: n.id === selectedId,
          data: {
            member: data.member,
            label: relationLabel(data.member, members, rootId),
            highlight: highlightIds.includes(n.id),
          } satisfies MemberNodeData,
        };
      }),
    [layout.nodes, members, rootId, highlightIds, selectedId]
  );

  const count = members.length;
  useEffect(() => {
    const t = setTimeout(
      () => rf.fitView({ padding: 0.2, maxZoom: 1, duration: 300 }),
      60
    );
    return () => clearTimeout(t);
  }, [count, rf]);

  useEffect(() => {
    if (!focusRequest) return;
    const target = layout.nodes.find((n) => n.id === focusRequest.id);
    if (!target) return;
    rf.setCenter(
      target.position.x + NODE_W / 2,
      target.position.y + NODE_H / 2,
      { zoom: 1.1, duration: 500 }
    );
  }, [focusRequest, layout.nodes, rf]);

  const fit = useCallback(
    () => rf.fitView({ padding: 0.2, maxZoom: 1, duration: 300 }),
    [rf]
  );

  const reset = useCallback(() => {
    const root = rootId
      ? layout.nodes.find((n) => n.id === rootId)
      : undefined;
    if (root) {
      rf.setCenter(
        root.position.x + NODE_W / 2,
        root.position.y + NODE_H / 2,
        { zoom: 1, duration: 300 }
      );
    } else {
      fit();
    }
  }, [rf, rootId, layout.nodes, fit]);

  const downloadPdf = useCallback(async () => {
    const el = document.querySelector<HTMLElement>(".react-flow__viewport");
    const all = rf.getNodes();
    if (!el || all.length === 0) return;
    setPdfBusy(true);
    try {
      const b = getRectOfNodes(all);
      const pad = 60;
      const w = Math.ceil(b.width + pad * 2);
      const h = Math.ceil(b.height + pad * 2);
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");

      const opts = {
        backgroundColor: dark ? "#020617" : "#f8fafc",
        width: w,
        height: h,
        pixelRatio: 1.5,
        skipFonts: true,
        style: {
          width: `${w}px`,
          height: `${h}px`,
          transform: `translate(${pad - b.x}px, ${pad - b.y}px) scale(1)`,
        },
      };

      // প্রথমবার অনেক সময় ফাঁকা আসে, তাই একবার গরম করে নেওয়া
      await toPng(el, opts).catch(() => undefined);
      const png = await toPng(el, opts);

      const pdf = new jsPDF({
        orientation: w >= h ? "landscape" : "portrait",
        unit: "px",
        format: [w, h],
      });
      pdf.addImage(png, "PNG", 0, 0, w, h);

      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "family-tree.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      alert(
        "PDF বানানো যায়নি: " +
          (e instanceof Error ? e.message : "অজানা সমস্যা")
      );
    } finally {
      setPdfBusy(false);
    }
  }, [rf, dark]);

  if (members.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-slate-500 dark:text-slate-400">
        এখনো কোনো সদস্য নেই। উপরের “Add” বাটনে চাপুন।
      </div>
    );
  }

  const btn =
    "flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-700 shadow-soft backdrop-blur transition hover:bg-white active:scale-95 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={layout.edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag
        zoomOnPinch
        zoomOnScroll
        onNodeClick={(_, node) => {
          if (node.type === "member") onSelect(node.id);
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={dark ? "#334155" : "#cbd5e1"}
        />
      </ReactFlow>

      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <button
          type="button"
          className={btn}
          onClick={() => rf.zoomIn({ duration: 200 })}
          aria-label="Zoom in"
          title="Zoom in"
        >
          <ZoomIn size={20} />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => rf.zoomOut({ duration: 200 })}
          aria-label="Zoom out"
          title="Zoom out"
        >
          <ZoomOut size={20} />
        </button>
        <button
          type="button"
          className={btn}
          onClick={fit}
          aria-label="Fit to screen"
          title="Fit to screen"
        >
          <Maximize size={20} />
        </button>
        <button
          type="button"
          className={btn}
          onClick={reset}
          aria-label="Reset view"
          title="Reset view"
        >
          <RotateCcw size={20} />
        </button>
        <button
          type="button"
          className={btn}
          onClick={downloadPdf}
          disabled={pdfBusy}
          aria-label="Download PDF"
          title="Download PDF"
        >
          {pdfBusy ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <FileDown size={20} />
          )}
        </button>
      </div>
    </div>
  );
}

export default function FamilyTree(props: Props) {
  return (
    <ReactFlowProvider>
      <TreeInner {...props} />
    </ReactFlowProvider>
  );
}
