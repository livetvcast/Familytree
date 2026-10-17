import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Family Tree",
  description: "A private family tree that stays in your browser.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

// পাতা খোলার সময় সাদা ঝলক এড়াতে আগেই theme ঠিক করে নেয়
const themeScript = `(function(){try{var t=localStorage.getItem('family-tree-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
