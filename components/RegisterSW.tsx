"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        // PDF বানানোর অংশ আগেভাগে নামিয়ে ফোনে জমিয়ে রাখা
        const warm = () => {
          import("@/lib/pdfExport").catch(() => undefined);
          import("jspdf").catch(() => undefined);
        };
        setTimeout(warm, 3000);
      })
      .catch(() => undefined);
  }, []);

  return null;
}
