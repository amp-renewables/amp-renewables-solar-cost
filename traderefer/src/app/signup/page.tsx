import Link from "next/link";
import { redirect } from "next/navigation";
import { brand, formatMoney, totalPotentialPerJob } from "@/lib/brand";
import { getSessionUser } from "@/lib/auth";
import { SignupForm } from "./SignupForm";

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="bg-brand text-white px-8 py-12 flex flex-col justify-between">
        <Link href="/" className="font-bold text-xl">
          {brand.productName}
        </Link>
        <div className="my-12">
          <h1
            className="text-3xl sm:text-4xl font-bold mb-4 leading-tight"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Earn up to {formatMoney(totalPotentialPerJob())} per customer you
            refer.
          </h1>
          <p className="text-emerald-100">
            Already a partner?{" "}
            <Link
              href="/login"
              className="text-brand-accent font-medium underline"
              style={{ color: brand.colors.accent }}
            >
              Log in here
            </Link>
            .
          </p>
        </div>
        <p className="text-sm text-emerald-200">
          Questions? Email{" "}
          <a href={`mailto:${brand.supportEmail}`} className="underline">
            {brand.supportEmail}
          </a>
          .
        </p>
      </div>

      <div className="px-6 py-10 sm:px-12 flex items-center">
        <div className="w-full max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-brand mb-2">
            Become a partner
          </h2>
          <p className="text-slate-600 mb-6 text-sm">
            Sign up takes 30 seconds. No fees, no contracts.
          </p>
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
