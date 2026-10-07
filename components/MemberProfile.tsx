"use client";

import { useState, type ReactNode } from "react";
import { LocateFixed, Pencil, Trash2, UserPlus } from "lucide-react";
import type { FamilyMember } from "@/lib/types";
import { formatDate, getInitials } from "@/lib/utils";
import Modal from "./Modal";

export type RelativeKind =
  | "father"
  | "mother"
  | "spouse"
  | "son"
  | "daughter"
  | "brother"
  | "sister";

const relativeOptions: { kind: RelativeKind; label: string }[] = [
  { kind: "father", label: "Father" },
  { kind: "mother", label: "Mother" },
  { kind: "spouse", label: "Husband / Wife" },
  { kind: "son", label: "Son" },
  { kind: "daughter", label: "Daughter" },
  { kind: "brother", label: "Brother" },
  { kind: "sister", label: "Sister" },
];

type Props = {
  member: FamilyMember;
  members: FamilyMember[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddRelative: (kind: RelativeKind) => void;
  onViewInTree: () => void;
  onSelectMember: (id: string) => void;
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-2">
      <dt className="w-24 shrink-0 text-sm text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm text-slate-900 dark:text-slate-100">
        {children}
      </dd>
    </div>
  );
}

export default function MemberProfile({
  member,
  members,
  onClose,
  onEdit,
  onDelete,
  onAddRelative,
  onViewInTree,
  onSelectMember,
}: Props) {
  const [showRelatives, setShowRelatives] = useState(false);

  const byId = new Map(members.map((m) => [m.id, m]));
  const father = member.fatherId ? byId.get(member.fatherId) : undefined;
  const mother = member.motherId ? byId.get(member.motherId) : undefined;
  const spouses = member.spouseIds
    .map((id) => byId.get(id))
    .filter((m): m is FamilyMember => !!m);
  const children = members.filter(
    (m) => m.fatherId === member.id || m.motherId === member.id
  );

  const link = (m: FamilyMember) => (
    <button
      key={m.id}
      type="button"
      onClick={() => onSelectMember(m.id)}
      className="mr-2 mb-1 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 hover:bg-brand-100 dark:bg-slate-800 dark:text-sky-300 dark:hover:bg-slate-700"
    >
      {m.name}
    </button>
  );

  const genderText =
    member.gender === "male"
      ? "Male"
      : member.gender === "female"
        ? "Female"
        : member.gender === "other"
          ? "Other"
          : "";

  const actionBtn =
    "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium active:scale-[0.98]";

  return (
    <Modal title="Profile" onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-3xl font-semibold text-slate-500 shadow-soft dark:bg-slate-800 dark:text-slate-300">
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
        <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
          {member.name}
        </h3>
        {member.nickname && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            “{member.nickname}”
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onViewInTree}
          className={`${actionBtn} bg-brand-600 text-white shadow-soft hover:bg-brand-700`}
        >
          <LocateFixed size={16} /> View in Tree
        </button>
        <button
          type="button"
          onClick={onEdit}
          className={`${actionBtn} border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800`}
        >
          <Pencil size={16} /> Edit
        </button>
        <button
          type="button"
          onClick={() => setShowRelatives((v) => !v)}
          aria-expanded={showRelatives}
          className={`${actionBtn} border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800`}
        >
          <UserPlus size={16} /> Add Relative
        </button>
        <button
          type="button"
          onClick={onDelete}
          className={`${actionBtn} border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950`}
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>

      {showRelatives && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="col-span-2 text-xs text-slate-500 dark:text-slate-400">
            {member.name}-এর কে যোগ করবেন?
          </p>
          {relativeOptions.map((o) => (
            <button
              key={o.kind}
              type="button"
              onClick={() => onAddRelative(o.kind)}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:border-brand-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      <dl className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {genderText && <Row label="Gender">{genderText}</Row>}
        {member.birthDate && (
          <Row label="Born">{formatDate(member.birthDate)}</Row>
        )}
        {member.deathDate && (
          <Row label="Died">{formatDate(member.deathDate)}</Row>
        )}
        {father && <Row label="Father">{link(father)}</Row>}
        {mother && <Row label="Mother">{link(mother)}</Row>}
        {spouses.length > 0 && <Row label="Spouse">{spouses.map(link)}</Row>}
        {children.length > 0 && (
          <Row label="Children">{children.map(link)}</Row>
        )}
        {member.phone && <Row label="Phone">{member.phone}</Row>}
        {member.address && <Row label="Address">{member.address}</Row>}
        {member.biography && (
          <Row label="Biography">
            <p className="whitespace-pre-wrap">{member.biography}</p>
          </Row>
        )}
      </dl>
    </Modal>
  );
}
