import { platform } from "./platform";

// The customer-facing referral link for a partner.
//
//   /<company-slug>/refer/<membershipId>
//
// The membership id doubles as the shareable code: an opaque, unguessable
// handle that maps to exactly one (partner, company) pair. A customer who
// opens it fills in their own details + consent, and the resulting Referral
// is credited to that partner. Using the id means no schema column / no
// migration; if prettier short codes are wanted later, add
// Membership.referralCode and swap the code produced here (the public route
// can be taught to accept either).

export function partnerReferralPath(slug: string, membershipId: string): string {
  return `/${slug}/refer/${membershipId}`;
}

export function partnerReferralUrl(slug: string, membershipId: string): string {
  // APP_URL is server-only; on the client it's undefined and we fall back
  // to the platform default, which is correct in production either way.
  const base = process.env.APP_URL || platform.url;
  return `${base}${partnerReferralPath(slug, membershipId)}`;
}
