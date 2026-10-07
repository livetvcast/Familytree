"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { Camera, Trash2 } from "lucide-react";
import type { FamilyMember, Gender } from "@/lib/types";
import { getInitials } from "@/lib/utils";

export type MemberFormValues = Omit<FamilyMember, "id">;

type Props = {
  members: FamilyMember[];
  initial?: Partial<FamilyMember>;
  editingId?: string;
  submitLabel: string;
  onSubmit: (values: MemberFormValues) => void;
  onCancel: () => void;
};

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

function clean(s: string): string | undefined {
  const t = s.trim();
  return t === "" ? undefined : t;
}

function descendantsOf(id: string, members: FamilyMember[]): Set<string> {
  const result = new Set<string>();
  const queue = [id];
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    for (const m of members) {
      if ((m.fatherId === cur || m.motherId === cur) && !result.has(m.id)) {
        result.add(m.id);
        queue.push(m.id);
      }
    }
  }
  return result;
}

function resizeImage(file: File, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load"));
    };
    img.src = url;
  });
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function MemberForm({
  members,
  initial,
  editingId,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [nickname, setNickname] = useState(initial?.nickname ?? "");
  const [gender, setGender] = useState<Gender | "">(initial?.gender ?? "");
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
  const [deathDate, setDeathDate] = useState(initial?.deathDate ?? "");
  const [photo, setPhoto] = useState<string | undefined>(initial?.photo);
  const [fatherId, setFatherId] = useState(initial?.fatherId ?? "");
  const [motherId, setMotherId] = useState(initial?.motherId ?? "");
  const [spouseIds, setSpouseIds] = useState<string[]>(
    initial?.spouseIds ?? []
  );
  const [biography, setBiography] = useState(initial?.biography ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // নিজে বা নিজের বংশধর কখনো বাবা-মা হতে পারবে না
  const blocked = new Set<string>();
  if (editingId) {
    blocked.add(editingId);
    descendantsOf(editingId, members).forEach((d) => blocked.add(d));
  }
  const candidates = members.filter((m) => !blocked.has(m.id));
  const fathers = candidates.filter(
    (m) => m.gender !== "female" || m.id === fatherId
  );
  const mothers = candidates.filter(
    (m) => m.gender !== "male" || m.id === motherId
  );
  const spouseCandidates = candidates.filter(
    (m) => m.id !== fatherId && m.id !== motherId
  );

  const toggleSpouse = (id: string) =>
    setSpouseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setPhoto(await resizeImage(file));
      setError(null);
    } catch {
      setError("ছবিটি পড়া যায়নি। অন্য একটি ছবি চেষ্টা করুন।");
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim() === "") {
      setError("নাম লিখুন।");
      return;
    }
    if (birthDate && deathDate && deathDate < birthDate) {
      setError("মৃত্যুর তারিখ জন্মের তারিখের আগে হতে পারে না।");
      return;
    }
    const validSpouses = spouseIds.filter((id) =>
      spouseCandidates.some((m) => m.id === id)
    );
    onSubmit({
      name: name.trim(),
      nickname: clean(nickname),
      gender: gender || undefined,
      birthDate: clean(birthDate),
      deathDate: clean(deathDate),
      photo,
      fatherId: clean(fatherId),
      motherId: clean(motherId),
      spouseIds: validSpouses,
      biography: clean(biography),
      phone: clean(phone),
      address: clean(address),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-2xl font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            getInitials(name || "?")
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Camera size={16} /> ছবি বাছুন
          </button>
          {photo && (
            <button
              type="button"
              onClick={() => setPhoto(undefined)}
              className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              <Trash2 size={16} /> মুছুন
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPhoto}
          aria-label="Photo upload"
        />
      </div>

      <Field label="Full Name *">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Nickname">
          <input
            className={inputCls}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field label="Gender">
          <select
            className={inputCls}
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender | "")}
          >
            <option value="">— বাছুন —</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of Birth">
          <input
            type="date"
            className={inputCls}
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </Field>
        <Field label="Date of Death">
          <input
            type="date"
            className={inputCls}
            value={deathDate}
            onChange={(e) => setDeathDate(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Father">
        <select
          className={inputCls}
          value={fatherId}
          onChange={(e) => setFatherId(e.target.value)}
        >
          <option value="">— নেই —</option>
          {fathers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Mother">
        <select
          className={inputCls}
          value={motherId}
          onChange={(e) => setMotherId(e.target.value)}
        >
          <option value="">— নেই —</option>
          {mothers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
          Spouse
        </legend>
        {spouseCandidates.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            বাছাই করার মতো কেউ নেই।
          </p>
        ) : (
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-300 p-2 dark:border-slate-600">
            {spouseCandidates.map((m) => (
              <label
                key={m.id}
                className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-blue-600"
                  checked={spouseIds.includes(m.id)}
                  onChange={() => toggleSpouse(m.id)}
                />
                <span className="text-sm text-slate-800 dark:text-slate-100">
                  {m.name}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <Field label="Biography / Notes">
        <textarea
          className={inputCls}
          rows={3}
          value={biography}
          onChange={(e) => setBiography(e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone (optional)">
          <input
            type="tel"
            className={inputCls}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Field label="Address (optional)">
          <input
            className={inputCls}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-3 border-t border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-slate-300 py-2.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 rounded-xl bg-brand-600 py-2.5 font-medium text-white shadow-soft hover:bg-brand-700 active:scale-[0.98]"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
