import { requireAdmin } from "@/lib/auth";
import { Nav } from "@/components/Nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  return (
    <div className="min-h-screen flex flex-col">
      <Nav user={user} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
