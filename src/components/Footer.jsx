import { Link } from "react-router-dom";
import { MapPin, Instagram } from "lucide-react";
import { BRAND, SOCIAL } from "../lib/constants";
import { trackPhoneClick } from "../utils/analytics";

// "84208 22919" from "+91-8420822919" — how the number is said out loud.
const spoken = (p) => {
  const d = String(p).replace(/\D/g, "").slice(-10);
  return `${d.slice(0, 5)} ${d.slice(5)}`;
};

const linkCls = "text-ht-ivory/85 hover:text-ht-gold2 transition-colors";

// DNA v2 footer: red2 ground under a paar band; red-ground lockup is the gold
// phoenix above the two-tier wordmark (docs/DESIGN_DNA.md §4.5).
export default function Footer() {
  return (
    // Phones: body pads 9rem + safe area under everything for the bottom nav
    // and cart bar (styles/index.css). The footer pulls itself down over that
    // padding and refills it with red, so no strip of paper shows under it.
    <footer className="mt-10 -mb-[calc(9rem+env(safe-area-inset-bottom,0px))] md:mb-0">
      <div className="paar" />
      <div className="bg-ht-red2 px-5 pb-[calc(9rem+env(safe-area-inset-bottom,0px))] pt-8 text-center text-ht-ivory md:px-8 md:pb-0 md:pt-12 md:text-left">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3 md:gap-10">

          {/* Lockup + address */}
          <div className="flex flex-col items-center md:items-start">
            <img src="/ht_phoenix.png" alt="" className="mb-2.5 h-[76px] w-auto" width="64" height="76" loading="lazy" />
            <div className="flex flex-col items-center leading-none">
              <span className="font-display text-[30px] tracking-[-.01em] text-ht-gold">HUNGRY</span>
              <span className="mt-0.5 pl-[.32em] text-[19px] font-light tracking-[.32em] text-ht-gold">Times</span>
              <span className="mt-2 font-serif text-lg italic text-ht-gold2">Chinese &amp; Continental</span>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-ht-ivory/85">
              32/12A, Gariahat Road South, Ground Floor<br />Kolkata 700031
            </p>
            <p className="mt-2 text-sm text-ht-ivory/85">Open every day · 12 PM – 11 PM</p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[.08em] text-ht-gold">
              Dine-in · Takeaway · Delivery
            </p>
          </div>

          {/* Phones + quick links */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-lg font-bold text-ht-gold2 md:justify-start">
              <a href={`tel:${BRAND.phone1}`} onClick={() => trackPhoneClick('footer')} className="inline-flex min-h-11 items-center hover:underline">
                {spoken(BRAND.phone1)}
              </a>
              <span aria-hidden="true" className="inline-flex min-h-11 items-center text-ht-gold/60">·</span>
              <a href={`tel:${BRAND.phone2}`} onClick={() => trackPhoneClick('footer')} className="inline-flex min-h-11 items-center hover:underline">
                {spoken(BRAND.phone2)}
              </a>
            </div>
            <p className="text-sm text-ht-ivory/70">{BRAND.email}</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-1">
              <li><Link to="/menu" className={linkCls}>Menu</Link></li>
              <li><Link to="/offers" className={linkCls}>Offers &amp; rewards</Link></li>
              <li><Link to="/reservation" className={linkCls}>Reserve a table</Link></li>
              <li><Link to="/gallery" className={linkCls}>Gallery</Link></li>
              <li><Link to="/testimonials" className={linkCls}>Reviews</Link></li>
              <li><Link to="/contact" className={linkCls}>Contact</Link></li>
              <li><Link to="/feedback" className={linkCls}>Feedback</Link></li>
            </ul>
            <div className="mt-4 flex gap-1">
              <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid h-11 w-11 place-items-center text-ht-gold2 hover:text-ht-gold">
                <Instagram className="h-5 w-5" />
              </a>
              <a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid h-11 w-11 place-items-center text-ht-gold2 hover:text-ht-gold">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href={SOCIAL.maps} target="_blank" rel="noopener noreferrer" aria-label="Google Maps" className="grid h-11 w-11 place-items-center text-ht-gold2 hover:text-ht-gold">
                <MapPin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Policies (static HTML) + registration */}
          <div className="flex flex-col items-center md:items-start">
            <ul className="space-y-1 text-sm">
              <li><a href="/policy/terms-and-conditions.html" className={linkCls}>Terms &amp; Conditions</a></li>
              <li><a href="/policy/privacy-policy.html" className={linkCls}>Privacy Policy</a></li>
              <li><a href="/policy/shipping-delivery.html" className={linkCls}>Delivery Policy</a></li>
              <li><a href="/policy/cancellation-refund.html" className={linkCls}>Cancellation &amp; Refunds</a></li>
              <li><a href="/policy/contact-us.html" className={linkCls}>Contact (Policy)</a></li>
            </ul>
            <p className="mt-4 text-xs text-ht-ivory/65">FSSAI Lic. {BRAND.fssai}</p>
            <p className="text-xs text-ht-ivory/65">GSTIN {BRAND.gstin}</p>
          </div>
        </div>

        {/* Bottom bar. Phones: body already pads 9rem for the bottom nav and
            cart bar, so the footer only needs its own breathing room. */}
        <div className="mx-auto mt-8 max-w-6xl border-t border-ht-ivory/15 py-5 text-center text-xs text-ht-ivory/60">
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
