"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Eraser, FileCode2 } from "lucide-react";

const DEFAULT_FG = "#0f172a";
const DEFAULT_BG = "#ffffff";

function saveFile(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function QrPage() {
  const [text, setText] = useState("");
  const [fg, setFg] = useState(DEFAULT_FG);
  const [bg, setBg] = useState(DEFAULT_BG);
  const [src, setSrc] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!text.trim()) {
      setSrc("");
      setError(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(text, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: fg, light: bg },
    })
      .then((url) => {
        if (cancelled) return;
        setSrc(url);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setSrc("");
        setError("QR বানানো যায়নি। লেখা ছোট করে দেখুন।");
      });
    return () => {
      cancelled = true;
    };
  }, [text, fg, bg]);

  const downloadPng = () => {
    if (src) saveFile(src, "qr-code.png");
  };

  const downloadSvg = async () => {
    if (!text.trim()) return;
    try {
      const svg = await QRCode.toString(text, {
        type: "svg",
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: fg, light: bg },
      });
      const url = URL.createObjectURL(
        new Blob([svg], { type: "image/svg+xml" })
      );
      saveFile(url, "qr-code.svg");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setError("SVG বানানো যায়নি।");
    }
  };

  const colorInput =
    "h-11 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-800";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-8">
      <h1 className="text-center text-2xl font-semibold">
        <span className="gradient-text">QR Code Generator</span>
      </h1>

      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-soft backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
        <div className="mx-auto flex h-64 w-64 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-700">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="QR code" className="h-full w-full" />
          ) : (
            <span className="px-4 text-center text-sm text-slate-400">
              নিচে যেকোনো লেখা বা লিংক দিন
            </span>
          )}
        </div>

        <label className="block">
          <span className="mb-1 flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
            <span>লেখা / লিংক / নম্বর</span>
            <span className="text-xs text-slate-400">{text.length}/1000</span>
          </span>
          <textarea
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            rows={4}
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="https://example.com"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              QR-এর রঙ
            </span>
            <input
              type="color"
              className={colorInput}
              value={fg}
              onChange={(e) => setFg(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              পেছনের রঙ
            </span>
            <input
              type="color"
              className={colorInput}
              value={bg}
              onChange={(e) => setBg(e.target.value)}
            />
          </label>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          স্ক্যান ঠিকমতো হতে QR গাঢ় আর পেছন হালকা রাখুন।
        </p>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={downloadPng}
            disabled={!src}
            className="btn-gradient flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Download size={16} /> PNG
          </button>
          <button
            type="button"
            onClick={downloadSvg}
            disabled={!src}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FileCode2 size={16} /> SVG
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setText("");
            setFg(DEFAULT_FG);
            setBg(DEFAULT_BG);
          }}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Eraser size={16} /> সব মুছুন
        </button>
      </div>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        QR আপনার ফোনেই তৈরি হয়, কিছু কোথাও পাঠানো হয় না।
      </p>
    </main>
  );
}