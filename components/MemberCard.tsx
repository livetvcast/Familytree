"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { FamilyMember } from "@/lib/types";
import { formatLifespan, getInitials } from "@/lib/utils";

export type MemberNodeData = {
  member: FamilyMember;
  label?: string;
  highlight?: boolean;
};

const ring: Record<string, string> = {
  male: "ring-sky-400/70",
  female: "ring-pink-400/70",
  other: "ring-violet-400/70",
};

const hidden = { opacity: 0, pointerEvents: "none" as const };

function MemberNodeBase({ data, selected }: NodeProps<MemberNodeData>) {
  const { member, label, highlight } = data;
  const lifespan = formatLifespan(member);
  const genderRing = ring[member.gender ?? "other"];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${member.name}${label ? ", " + label : ""}`}
      className={`flex h-24 w-[180px] cursor-pointer items-center gap-3 rounded-2xl border bg-white px-3 shadow-soft transition-shadow dark:border-slate-700 dark:bg-slate-800 ${
        selected || highlight
          ? "border-brand-500 shadow-lg ring-2 ring-brand-500/40"
          : "border-slate-200 hover:shadow-lg"
      }`}
    >
      <Handle id="top" type="target" position={Position.Top} style={hidden} isConnectable={false} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={hidden} isConnectable={false} />
      <Handle id="left" type="target" position={Position.Left} style={hidden} isConnectable={false} />
      <Handle id="right" type="source" position={Position.Right} style={hidden} isConnectable={false} />

      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-lg font-semibold text-slate-600 ring-2 dark:bg-slate-700 dark:text-slate-200 ${genderRing}`}
      >
        {member.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.photo}
            alt={member.name}
            className="h-full w-full object-cover"
          />
        ) : (
          getInitials(member.name)
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {member.name}
        </p>
        {lifespan && (
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {lifespan}
          </p>
        )}
        {label && (
          <span className="mt-1 inline-block max-w-full truncate rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-slate-700 dark:text-sky-300">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

function JunctionNodeBase() {
  return (
    <div className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500">
      <Handle id="bottom" type="source" position={Position.Bottom} style={hidden} isConnectable={false} />
    </div>
  );
}

export const MemberNode = memo(MemberNodeBase);
export const JunctionNode = memo(JunctionNodeBase);

export const nodeTypes = {
  member: MemberNode,
  junction: JunctionNode,
};
