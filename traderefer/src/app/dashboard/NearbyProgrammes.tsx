import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCompanyMoney, payoutsForCompany } from "@/lib/company";
import { milesBetween, SUGGESTION_RADIUS_MILES } from "@/lib/geo";
import { canCompanyWrite } from "@/lib/stripe";

// "Programmes near you" — other companies on the platform within 50
// miles that this referrer hasn't joined yet. The network-effect play:
// a roofer referring to AMP probably knows customers a heat-pump firm
// two towns over would pay for, and joining is one click because
// they're already logged in.
//
// Anchor point: the referrer's own postcode if they've set one in
// account settings, otherwise their current company's location (most
// partners are local to whoever recruited them). No anchor or no
// matches → render nothing; the section earns its place or disappears.
export async function NearbyProgrammes({
  userId,
  currentCompanyId,
}: {
  userId: string;
  currentCompanyId: string;
}) {
  const [user, memberCompanyIds] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { latitude: true, longitude: true },
    }),
    prisma.membership
      .findMany({ where: { userId }, select: { companyId: true } })
      .then((rows) => rows.map((m) => m.companyId)),
  ]);

  let anchor =
    user?.latitude != null && user?.longitude != null
      ? { latitude: user.latitude, longitude: user.longitude }
      : null;
  if (!anchor) {
    const home = await prisma.company.findUnique({
      where: { id: currentCompanyId },
      select: { latitude: true, longitude: true },
    });
    anchor =
      home?.latitude != null && home?.longitude != null
        ? { latitude: home.latitude, longitude: home.longitude }
        : null;
  }
  if (!anchor) return null;

  // Tiny dataset (every geocoded company on the platform) — distance
  // maths in JS beats PostGIS-grade machinery until there are thousands.
  const candidates = await prisma.company.findMany({
    where: {
      id: { notIn: memberCompanyIds },
      status: { in: ["TRIAL", "ACTIVE"] },
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      geoDistrict: true,
      postcode: true,
      latitude: true,
      longitude: true,
      payoutAppointment: true,
      payoutJob: true,
      currencySymbol: true,
      services: true,
      // Needed to weed out programmes that can't actually operate — see
      // the canCompanyWrite filter below.
      status: true,
      isComped: true,
      trialEndsAt: true,
    },
  });

  const nearby = candidates
    // A raw status of TRIAL/ACTIVE isn't enough: an EXPIRED trial keeps
    // status="TRIAL" but is write-gated and can't take referrals. Only
    // suggest programmes that can actually operate, using the same gate
    // the rest of the app enforces — otherwise a partner joins a dead
    // programme (this is how a lapsed test tenant leaked into discovery).
    .filter((c) => canCompanyWrite(c))
    .map((c) => ({
      company: c,
      // latitude/longitude are non-null by the where clause above.
      miles: milesBetween(anchor, {
        latitude: c.latitude!,
        longitude: c.longitude!,
      }),
    }))
    .filter((x) => x.miles <= SUGGESTION_RADIUS_MILES)
    .sort((a, b) => a.miles - b.miles)
    .slice(0, 6);

  if (nearby.length === 0) return null;

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-brand">
          Programmes near you
        </h2>
        <p className="text-sm text-slate-600">
          Other companies paying for referrals within{" "}
          {SUGGESTION_RADIUS_MILES} miles. Same login — joining takes one
          click.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {nearby.map(({ company: c, miles }) => {
          const total = payoutsForCompany(c).total;
          return (
            <div
              key={c.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-brand">{c.name}</h3>
                <span className="text-xs text-slate-500 whitespace-nowrap mt-0.5">
                  {Math.round(miles)} mi
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {c.geoDistrict ?? c.postcode}
              </p>
              <p className="text-sm font-semibold text-brand mt-3">
                Earn up to {formatCompanyMoney(c, total)} per customer
              </p>
              {c.services.length > 0 && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {c.services.slice(0, 3).join(" · ")}
                </p>
              )}
              <Link
                href={`/${c.slug}/signup`}
                className="btn-primary text-center rounded-lg px-4 py-2 text-sm font-medium mt-4"
              >
                Join their programme →
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
