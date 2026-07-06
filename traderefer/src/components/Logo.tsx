import Link from "next/link";
import { platform } from "@/lib/platform";

// Two Trade Refer wordmark variants live in /public:
//   /trade-refer-logo-black-transparent.png  → for light backgrounds
//   /trade-refer-logo-white-transparent.png  → for dark backgrounds (the
//                                              hero panels, signup splash)
//
// The `variant` prop picks which one to render. Falls back to a styled text
// wordmark if the image fails to load, so the page never looks broken.

type Variant = "dark" | "light";
type Size = "sm" | "md" | "lg";

const SRC: Record<Variant, string> = {
  dark: "/trade-refer-logo-black-transparent.png",
  light: "/trade-refer-logo-white-transparent.png",
};

// A notch larger than the usual scale — the wordmark's roof glyph over
// the T turns to mush below ~28px, reading as a stray mark rather than
// a roof. The source PNGs are 2508px wide, so there's no upscaling.
const HEIGHT: Record<Size, string> = {
  sm: "h-7",
  md: "h-10",
  lg: "h-12",
};

export function Logo({
  variant = "dark",
  size = "md",
  link = true,
  className = "",
}: {
  variant?: Variant;
  size?: Size;
  link?: boolean;
  className?: string;
}) {
  const img = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={SRC[variant]}
      alt={platform.name}
      className={`${HEIGHT[size]} w-auto ${className}`}
    />
  );
  if (!link) return img;
  return (
    <Link href="/" className="inline-flex items-center" aria-label={platform.name}>
      {img}
    </Link>
  );
}
