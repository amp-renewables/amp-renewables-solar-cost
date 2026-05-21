import Link from "next/link";
import { brand, formatMoney, totalPotentialPerJob } from "@/lib/brand";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");

  return (
    <div className="min-h-screen">
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="font-bold text-xl text-brand">
          {brand.productName}
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className="px-4 py-2 text-brand hover:underline">
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-lg btn-primary font-medium"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <section className="bg-brand text-white">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <span className="inline-block bg-brand-accent text-brand px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
            Partner Programme
          </span>
          <h1
            className="text-4xl sm:text-5xl font-bold leading-tight mb-6"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Refer customers to {brand.companyName}. Earn up to{" "}
            {formatMoney(totalPotentialPerJob())} per job.
          </h1>
          <p className="text-lg text-emerald-100 max-w-2xl mx-auto mb-10">
            A simple referral programme for roofing companies and other trades.
            Send us a lead — we book the appointment and pay you {" "}
            {formatMoney(brand.payouts.perAppointment)}. If the job sells,
            you earn another {formatMoney(brand.payouts.perJob)}.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="bg-brand-accent text-brand font-semibold px-6 py-3 rounded-lg w-full sm:w-auto"
            >
              Become a partner →
            </Link>
            <Link
              href="/login"
              className="border border-emerald-200 text-emerald-100 px-6 py-3 rounded-lg w-full sm:w-auto hover:bg-white/5"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2
          className="text-3xl font-bold text-brand text-center mb-12"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          How it works
        </h2>
        <div className="grid sm:grid-cols-3 gap-8">
          <Step
            n={1}
            title="Send a referral"
            body="Spot a customer who could benefit from solar, batteries, EV charging or a heat pump? Submit their details in under a minute."
          />
          <Step
            n={2}
            title="We book the appointment"
            body={`Our team contacts the customer and books a free survey. You earn ${formatMoney(brand.payouts.perAppointment)} the moment that appointment is confirmed.`}
          />
          <Step
            n={3}
            title="They go ahead — you get paid again"
            body={`If the customer goes ahead with the install, you earn an additional ${formatMoney(brand.payouts.perJob)}. Up to ${formatMoney(totalPotentialPerJob())} per referred customer.`}
          />
        </div>
      </section>

      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2
            className="text-2xl font-bold text-brand mb-4"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Built for tradesmen, not paperwork
          </h2>
          <ul className="text-left space-y-3 max-w-md mx-auto text-slate-700">
            <li>✓ Track every referral in real time</li>
            <li>✓ See exactly what you&apos;re owed</li>
            <li>✓ Ready-to-send SMS &amp; email templates</li>
            <li>✓ No targets, no tie-ins — refer when it suits you</li>
          </ul>
        </div>
      </section>

      <section className="bg-brand text-white">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2
            className="text-3xl font-bold mb-4"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Ready to start earning?
          </h2>
          <p className="text-emerald-100 mb-8">
            Sign up takes 30 seconds. No fees, no contracts.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-brand-accent text-brand font-semibold px-6 py-3 rounded-lg"
          >
            Sign up now
          </Link>
        </div>
      </section>

      <footer className="text-center text-sm text-slate-500 py-8 px-6">
        <p>
          {brand.productName} is the partner referral platform for{" "}
          {brand.companyName}. Questions? Email{" "}
          <a
            href={`mailto:${brand.supportEmail}`}
            className="text-brand underline"
          >
            {brand.supportEmail}
          </a>{" "}
          or call {brand.supportPhone}.
        </p>
      </footer>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div>
      <div className="w-10 h-10 rounded-full bg-brand-accent text-brand font-bold flex items-center justify-center mb-4">
        {n}
      </div>
      <h3 className="font-semibold text-brand text-lg mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{body}</p>
    </div>
  );
}
