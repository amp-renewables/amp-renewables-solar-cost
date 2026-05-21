import { requireCompanyAdmin } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/company";
import { Nav } from "@/components/Nav";

export default async function CompanyAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCompanyAdmin();
  const company = await getCurrentCompany();
  return (
    <div className="min-h-screen flex flex-col">
      <style
        dangerouslySetInnerHTML={{
          __html: company
            ? `:root { --brand-primary: ${company.primaryColor}; --brand-accent: ${company.accentColor}; }`
            : "",
        }}
      />
      <Nav user={user} company={company} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
