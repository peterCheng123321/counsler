"use client";

import { Header } from "@/components/layout/header";
import { AICommandPalette, useAICommandPalette } from "@/components/ai/ai-command-palette";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { open, setOpen } = useAICommandPalette();

  return (
    <>
      <Header onCommandPaletteOpen={() => setOpen(true)} />
      <main className="container mx-auto max-w-7xl px-4 py-6">
        {children}
      </main>

      {/* Global AI Command Palette (Space bar) */}
      <AICommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}

