"use client";

import { useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { Maximize, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
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

  // সদস্য সংখ্যা বদলালে পুরো tree পর্দায় ধরিয়ে দেওয়া
  const count = members.length;
  useEffect(() => {
    const t = setTimeout(
      () => rf.fitView({ padding: 0.2, maxZoom: 1, duration: 300 }),
      60
    );
    return () => clearTimeout(t);
  }, [count, rf]);

  // "View in Tree": নির্দিষ্ট সদস্যের উপর focus
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

  if (members.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-slate-500 dark:text-slate-400">
        এখনো কোনো সদস্য নেই। উপরের “Add Member” বাটনে চাপুন।
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
