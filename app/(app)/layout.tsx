import { Header } from "@/components/layout/header";

// Force dynamic rendering for all routes in this layout
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="container mx-auto max-w-7xl px-4 py-6">
        {children}
      </main>
    </>
  );
}

