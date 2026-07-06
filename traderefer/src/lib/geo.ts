// UK postcode geocoding + distance maths for the "programmes near you"
// suggestions. Geocoding happens once at SAVE time (company settings /
// partner account settings) via postcodes.io — free, no API key, no
// rate-limit drama at our scale. Lat/lng are cached on the row so
// rendering suggestions is pure arithmetic, never a network call.

import "server-only";

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  // Human-readable area, e.g. "Sunderland" or "Newcastle upon Tyne" —
  // shown on suggestion cards so partners see a town, not a postcode.
  district: string | null;
  // The API's canonical formatting of the postcode ("ne372sh" → "NE37 2SH").
  postcode: string;
};

// Look up a UK postcode. Returns null for anything postcodes.io doesn't
// recognise (invalid, terminated, non-UK) or on network failure — the
// caller stores nulls and the company/partner simply doesn't appear in
// distance-based suggestions until a valid postcode is saved.
export async function geocodePostcode(
  postcode: string,
): Promise<GeocodeResult | null> {
  const cleaned = postcode.trim().replace(/\s+/g, "");
  if (!/^[A-Za-z]{1,2}\d[A-Za-z\d]?\d[A-Za-z]{2}$/.test(cleaned)) {
    return null;
  }
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      result?: {
        latitude: number | null;
        longitude: number | null;
        admin_district: string | null;
        postcode: string;
      };
    };
    const r = body.result;
    if (!r || r.latitude == null || r.longitude == null) return null;
    return {
      latitude: r.latitude,
      longitude: r.longitude,
      district: r.admin_district,
      postcode: r.postcode,
    };
  } catch {
    return null;
  }
}

// Great-circle distance in miles (haversine). Good to ~0.1% — far more
// precision than "within 50 miles" needs.
export function milesBetween(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.8; // Earth radius, miles
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const SUGGESTION_RADIUS_MILES = 50;
