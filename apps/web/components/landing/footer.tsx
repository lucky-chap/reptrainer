import Link from "next/link";
import { Zap } from "lucide-react";

const footerPages = [
  { label: "Home", href: "/" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

const footerMore = [
  { label: "Dashboard", href: "/dashboard/train" },
  { label: "Contact", href: "#contact" },
  { label: "Privacy Policy", href: "#" },
];

const footerSocial = [
  { label: "X (Twitter)", href: "https://x.com" },
  { label: "LinkedIn", href: "https://linkedin.com" },
  { label: "GitHub", href: "https://github.com" },
];

export function Footer() {
  return (
    <footer className="bg-charcoal text-cream/90" id="contact">
      {/* CTA Band */}
      <div className="landing-section py-20 md:py-28 border-b border-white/10">
        <div className="max-w-3xl">
          <h2 className="heading-serif text-3xl md:text-5xl lg:text-6xl text-cream mb-6">
            Ready to <em>sharpen</em> your sales edge?
          </h2>
          <p className="text-cream/60 text-lg md:text-xl max-w-xl mb-8">
            Join sales teams already training smarter with AI-powered roleplay
            simulations.
          </p>
          <Link
            href="/dashboard/train"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-cream text-charcoal text-sm font-medium hover:bg-cream-dark transition-colors"
          >
            Start training free
          </Link>
        </div>
      </div>

      {/* Footer Grid */}
      <div className="landing-section py-14 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="size-8 rounded-lg bg-cream/10 flex items-center justify-center">
                <Zap className="size-4 text-cream" />
              </div>
              <span className="text-base font-semibold text-cream">
                Reptrainer
              </span>
            </div>
            <p className="text-sm text-cream/50 leading-relaxed">
              AI-powered sales roleplay that evolves with you. Practice
              high-pressure conversations anytime.
            </p>
          </div>

          {/* Pages */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-widest text-cream/40 mb-4">
              Pages
            </h4>
            <ul className="space-y-3">
              {footerPages.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-cream/60 hover:text-cream transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* More */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-widest text-cream/40 mb-4">
              More
            </h4>
            <ul className="space-y-3">
              {footerMore.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-cream/60 hover:text-cream transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-widest text-cream/40 mb-4">
              Social
            </h4>
            <ul className="space-y-3">
              {footerSocial.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-cream/60 hover:text-cream transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-cream/40">
            © {new Date().getFullYear()} Reptrainer. All rights reserved.
          </p>
          <Link
            href="#"
            className="text-xs text-cream/40 hover:text-cream/60 transition-colors"
          >
            Privacy policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
