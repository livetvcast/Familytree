"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { FamilyData, FamilyMember } from "@/lib/types";
import { demoData } from "@/lib/demoData";
import { clearFamily, loadFamily, saveFamily } from "@/lib/storage";
import { linkParent, removeMember, upsertMember } from "@/lib/familyOps";
import { newId } from "@/lib/utils";
import Toolbar from "@/components/Toolbar";
import FamilyTree, { type FocusRequest } from "@/components/FamilyTree";
import MemberProfile, { type RelativeKind } from "@/components/MemberProfile";
import MemberForm, { type MemberFormValues } from "@/components/MemberForm";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";

type AddState = {
  initial?: Partial<FamilyMember>;
  relation?: { kind: RelativeKind; baseId: string };
};

type Toast = { type: "error" | "info"; text: string };

const kindLabel: Record<RelativeKind, string> = {
  father: "Father",
  mother: "Mother",
  spouse: "Husband / Wife",
  son: "Son",
  daughter: "Daughter",
  brother: "Brother",
  sister: "Sister",
};

function buildRelativeInitial(
  kind: RelativeKind,
  base: FamilyMember
): Partial<FamilyMember> {
  const firstSpouse = base.spouseIds[0];
  switch (kind) {
    case "father":
      return {
        gender: "male",
        spouseIds: base.motherId ? [base.motherId] : [],
      };
    case "mother":
      return {
        gender: "female",
        spouseIds: base.fatherId ? [base.fatherId] : [],
      };
    case "spouse":
      return {
        gender:
          base.gender === "male"
            ? "female"
            : base.gender === "female"
              ? "male"
              : undefined,
        spouseIds: [base.id],
      };
    case "son":
    case "daughter": {
      const gender = kind === "son" ? "male" : "female";
      return base.gender === "female"
        ? { gender, motherId: base.id, fatherId: firstSpouse }
        : { gender, fatherId: base.id, motherId: firstSpouse };
    }
    case "brother":
      return { gender: "male", fatherId: base.fatherId, motherId: base.motherId };
    case "sister":
      return {
        gender: "female",
        fatherId: base.fatherId,
        motherId: base.motherId,
      };
  }
}

export default function Home() {
  const [data, setData] = useState<FamilyData>(demoData);
  const [loaded, setLoaded] = useState(false);
  const [dark, setDark] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchIds, setSearchIds] = useState<string[]>([]);
  const [pinId, setPinId] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const [adding, setAdding] = useState<AddState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    data: FamilyData;
    warnings: string[];
  } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const saveErrorShown = useRef(false);

  const members = data.members;

  // প্রথমবার খুললে: saved data আর theme পড়া
  useEffect(() => {
    const result = loadFamily();
    setData(result.data);
    if (result.message) setToast({ type: "error", text: result.message });
    setDark(document.documentElement.classList.contains("dark"));
    setLoaded(true);
  }, []);

  // প্রতিবার বদলালে save করা
  useEffect(() => {
    if (!loaded) return;
    const err = saveFamily(data);
    if (err && !saveErrorShown.current) {
      saveErrorShown.current = true;
      setToast({ type: "error", text: err });
    }
  }, [data, loaded]);

  // Toast নিজে থেকে মিলিয়ে যাওয়া
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const rootId = useMemo(
    () => members.find((m) => m.id === "me")?.id ?? members[0]?.id,
    [members]
  );

  const highlightIds = useMemo(
    () => (pinId ? [...searchIds, pinId] : searchIds),
    [searchIds, pinId]
  );

  const onSearchResults = useCallback((ids: string[]) => {
    setSearchIds((prev) =>
      prev.length === ids.length && prev.every((v, i) => v === ids[i])
        ? prev
        : ids
    );
  }, []);

  const requestFocus = (id: string) =>
    setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }));

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem("family-tree-theme", next ? "dark" : "light");
    } catch {
      // ignore
    }
  };

  const selected = members.find((m) => m.id === selectedId) ?? null;
  const editing = members.find((m) => m.id === editingId) ?? null;
  const deleting = members.find((m) => m.id === deletingId) ?? null;

  const handleAddSubmit = (values: MemberFormValues) => {
    const id = newId();
    const relation = adding?.relation;
    setData((d) => {
      let list = upsertMember(d.members, { id, ...values });
      if (relation?.kind === "father") {
        list = linkParent(list, relation.baseId, id, "father");
      } else if (relation?.kind === "mother") {
        list = linkParent(list, relation.baseId, id, "mother");
      }
      return { ...d, members: list };
    });
    setAdding(null);
    setSelectedId(null);
    setPinId(id);
    requestFocus(id);
    setToast({ type: "info", text: `${values.name} যোগ করা হয়েছে।` });
  };

  const handleEditSubmit = (values: MemberFormValues) => {
    if (!editing) return;
    setData((d) => ({
      ...d,
      members: upsertMember(d.members, { id: editing.id, ...values }),
    }));
    setEditingId(null);
    setToast({ type: "info", text: "পরিবর্তন save হয়েছে।" });
  };

  const handleDelete = () => {
    if (!deleting) return;
    const name = deleting.name;
    setData((d) => ({ ...d, members: removeMember(d.members, deleting.id) }));
    setDeletingId(null);
    setSelectedId(null);
    setPinId(null);
    setToast({ type: "info", text: `${name} মুছে ফেলা হয়েছে।` });
  };

  const handleReset = () => {
    clearFamily();
    setData(demoData);
    setResetting(false);
    setSelectedId(null);
    setPinId(null);
    saveErrorShown.current = false;
    setToast({ type: "info", text: "Demo family ফিরিয়ে আনা হয়েছে।" });
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    const { data: imported, warnings } = pendingImport;
    setData(imported);
    setPendingImport(null);
    setSelectedId(null);
    setPinId(null);
    setToast({
      type: "info",
      text:
        warnings.length > 0
          ? `Import হয়েছে (${warnings.length}টি ছোট সমস্যা ঠিক করা হয়েছে)।`
          : "Import সফল হয়েছে।",
    });
  };

  const noOtherModal =
    !adding && !editing && !deleting && !resetting && !pendingImport;

  return (
    <div className="flex h-dvh flex-col">
      <Toolbar
        members={members}
        data={data}
        dark={dark}
        onToggleTheme={toggleTheme}
        onAdd={() => setAdding({})}
        onSearchSelect={(id) => {
          setSelectedId(id);
          setPinId(id);
          requestFocus(id);
        }}
        onSearchResults={onSearchResults}
        onImport={(imported, warnings) =>
          setPendingImport({ data: imported, warnings })
        }
        onError={(text) => setToast({ type: "error", text })}
      />

      <main className="relative min-h-0 flex-1">
        {loaded ? (
          <FamilyTree
            members={members}
            rootId={rootId}
            highlightIds={highlightIds}
            selectedId={selectedId}
            focusRequest={focus}
            dark={dark}
            onSelect={(id) => {
              setSelectedId(id);
              setPinId(null);
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
            লোড হচ্ছে…
          </div>
        )}
      </main>

      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white/85 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/85 dark:text-slate-400">
        <span>Family Tree • Local &amp; Private</span>
        <button
          type="button"
          onClick={() => setResetting(true)}
          aria-label="Reset Demo Data"
          className="flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <RotateCcw size={14} /> Reset Demo Data
        </button>
      </footer>

      {selected && noOtherModal && (
        <MemberProfile
          member={selected}
          members={members}
          onClose={() => setSelectedId(null)}
          onEdit={() => setEditingId(selected.id)}
          onDelete={() => setDeletingId(selected.id)}
          onAddRelative={(kind) =>
            setAdding({
              initial: buildRelativeInitial(kind, selected),
              relation: { kind, baseId: selected.id },
            })
          }
          onViewInTree={() => {
            setSelectedId(null);
            setPinId(selected.id);
            requestFocus(selected.id);
          }}
          onSelectMember={(id) => setSelectedId(id)}
        />
      )}

      {adding && (
        <Modal
          title={
            adding.relation
              ? `Add ${kindLabel[adding.relation.kind]}`
              : "Add Family Member"
          }
          onClose={() => setAdding(null)}
        >
          <MemberForm
            members={members}
            initial={adding.initial}
            submitLabel="Save"
            onSubmit={handleAddSubmit}
            onCancel={() => setAdding(null)}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Member" onClose={() => setEditingId(null)}>
          <MemberForm
            members={members}
            initial={editing}
            editingId={editing.id}
            submitLabel="Save Changes"
            onSubmit={handleEditSubmit}
            onCancel={() => setEditingId(null)}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete Member"
          message={`“${deleting.name}” কে মুছে ফেলবেন? এটি আর ফেরানো যাবে না। তার সন্তানরা tree-তে থাকবে, শুধু এই সম্পর্কের link সরে যাবে।`}
          confirmLabel="হ্যাঁ, মুছুন"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {resetting && (
        <ConfirmDialog
          title="Reset Demo Data"
          message="আপনার সব তথ্য মুছে demo family ফিরে আসবে। আগে Export করে backup রাখুন। এগিয়ে যাবেন?"
          confirmLabel="হ্যাঁ, Reset করুন"
          danger
          onConfirm={handleReset}
          onCancel={() => setResetting(false)}
        />
      )}

      {pendingImport && (
        <ConfirmDialog
          title="Import Family Tree"
          message={`ফাইলে ${pendingImport.data.members.length} জন সদস্য আছে। Import করলে বর্তমান tree বদলে যাবে। এগিয়ে যাবেন?`}
          confirmLabel="Import করুন"
          onConfirm={confirmImport}
          onCancel={() => setPendingImport(null)}
        />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-16 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-xl ${
            toast.type === "error" ? "bg-red-600" : "bg-slate-800"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
