/**
 * Share Page Footer Component
 *
 * Footer for shared timeline pages with branding and attribution
 */

import { Separator } from "@proto/ui/atoms";

interface SharePageFooterProps {
  className?: string;
  showPoweredBy?: boolean;
  additionalLinks?: Array<{
    label: string;
    href: string;
    external?: boolean;
  }>;
}

export function SharePageFooter({
  className = "",
  showPoweredBy = true,
  additionalLinks = [],
}: SharePageFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`bg-white border-t ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Separator className="mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left side - Branding */}
          <div className="flex flex-col sm:flex-row items-center gap-2 text-sm text-gray-500">
            {showPoweredBy && (
              <>
                <span>Powered by</span>
                <a
                  href="https://rabbit-hole.io"
                  className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Rabbit Hole
                </a>
                <span className="hidden sm:inline">•</span>
              </>
            )}
            <span>AI-powered entity research platform</span>
          </div>

          {/* Right side - Links */}
          <div className="flex items-center gap-4 text-sm">
            {additionalLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
              >
                {link.label}
              </a>
            ))}

            {additionalLinks.length > 0 && (
              <span className="text-gray-300">•</span>
            )}

            <span className="text-gray-400">© {currentYear}</span>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-center text-xs text-gray-400">
            <p>
              This timeline is shared publicly. Data visualization updates
              automatically.
            </p>
            <p className="mt-1">
              For questions about this data, please contact the person who
              shared this link with you.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
