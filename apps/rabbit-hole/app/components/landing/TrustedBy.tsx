/**
 * TrustedBy Component
 *
 * Modular component displaying companies/organizations using the platform.
 * Can be easily toggled on/off via the `visible` prop.
 * Features animated marquee scrolling for a modern look.
 *
 * @example
 * ```tsx
 * // Show with default companies
 * <TrustedBy visible={true} />
 *
 * // Hide the section
 * <TrustedBy visible={false} />
 *
 * // Custom companies with logos
 * <TrustedBy
 *   visible={true}
 *   title="Trusted by industry leaders"
 *   companies={[
 *     { name: "Acme Corp", logo: "/logos/acme.svg" },
 *     { name: "TechCo", logo: "/logos/techco.svg" },
 *   ]}
 * />
 *
 * // Custom companies without logos (text only)
 * <TrustedBy
 *   visible={true}
 *   companies={[
 *     { name: "Company A" },
 *     { name: "Company B" },
 *   ]}
 * />
 * ```
 */

import {
  Marquee,
  MarqueeContent,
  MarqueeFade,
  MarqueeItem,
} from "@proto/ui/molecules";

interface TrustedByProps {
  /** Controls visibility of the entire component */
  visible?: boolean;
  /** Title text displayed above the company logos */
  title?: string;
  /** Array of companies/organizations to display */
  companies?: Array<{
    /** Company name (used for alt text and fallback display) */
    name: string;
    /** Optional logo image URL */
    logo?: string;
  }>;
  /** Enable animated marquee scrolling (default: true) */
  animated?: boolean;
}

const DEFAULT_COMPANIES = [
  { name: "Stanford Research Labs" },
  { name: "MIT Knowledge Systems" },
  { name: "Oxford Analytics" },
  { name: "Berkeley AI Research" },
  { name: "Carnegie Mellon" },
  { name: "Princeton Institute" },
  { name: "Harvard Medical School" },
  { name: "Yale Center for AI" },
];

export function TrustedBy({
  visible = true,
  title = "Trusted by leading research institutions",
  companies = DEFAULT_COMPANIES,
  animated = true,
}: TrustedByProps) {
  if (!visible) return null;

  return (
    <section className="w-full max-w-6xl mx-auto mt-16 rounded-xl bg-muted/30 py-8 px-4">
      <p className="text-center text-sm font-medium text-muted-foreground mb-8">
        {title}
      </p>

      {animated ? (
        <div className="flex size-full items-center justify-center">
          <Marquee>
            <MarqueeFade className="from-muted/30" side="left" />
            <MarqueeFade className="from-muted/30" side="right" />
            <MarqueeContent pauseOnHover={true} duration={30}>
              {companies.map((company, idx) => (
                <MarqueeItem className="mx-8" key={idx}>
                  <div className="flex items-center justify-center px-6 py-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50 hover:bg-background hover:border-border transition-all">
                    {company.logo ? (
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="h-8 opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all"
                      />
                    ) : (
                      <span className="text-sm font-medium text-foreground/80 whitespace-nowrap">
                        {company.name}
                      </span>
                    )}
                  </div>
                </MarqueeItem>
              ))}
            </MarqueeContent>
          </Marquee>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-center justify-items-center">
          {companies.map((company, idx) => (
            <div
              key={idx}
              className="flex items-center justify-center px-6 py-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50 hover:bg-background hover:border-border transition-all"
            >
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={company.name}
                  className="h-8 opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all"
                />
              ) : (
                <span className="text-sm font-medium text-foreground/80 whitespace-nowrap">
                  {company.name}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
