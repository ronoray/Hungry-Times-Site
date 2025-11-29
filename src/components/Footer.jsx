import { Link } from "react-router-dom";
import { BRAND } from "../lib/constants";

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-neutral-800">
      <div className="container-section py-10 grid md:grid-cols-4 gap-8 text-sm">

        {/* Column 1 — Brand */}
        <div>
          <h4 className="font-semibold mb-2">{BRAND.name}</h4>
          <p className="text-neutral-400">
            Chinese-Continental fusion in {BRAND.city}. Cozy, air-conditioned dining and takeaway.
          </p>
          <p className="text-neutral-400 mt-2">{BRAND.address}</p>
        </div>

        {/* Column 2 — Quick Links */}
        <div>
          <h4 className="font-semibold mb-2">Quick Links</h4>
          <ul className="space-y-1 text-neutral-300">
            <li><Link to="/menu" className="hover:text-white">Menu</Link></li>
            <li><Link to="/reservation" className="hover:text-white">Reservation</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link to="/feedback" className="hover:text-white">Feedback</Link></li>
          </ul>
        </div>

        {/* Column 3 — Policy Links (STATIC HTML) */}
        <div>
          <h4 className="font-semibold mb-2">Policies</h4>
          <ul className="space-y-1 text-neutral-300">
            <li>
              <a href="/policy/terms-and-conditions.html" className="hover:text-white">Terms & Conditions</a>
            </li>
            <li>
              <a href="/policy/privacy-policy.html" className="hover:text-white">Privacy Policy</a>
            </li>
            <li>
              <a href="/policy/shipping-delivery.html" className="hover:text-white">Delivery Policy</a>
            </li>
            <li>
              <a href="/policy/cancellation-refund.html" className="hover:text-white">Cancellation & Refunds</a>
            </li>
            <li>
              <a href="/policy/contact-us.html" className="hover:text-white">Contact (Policy)</a>
            </li>
          </ul>
        </div>

        {/* Column 4 — Contact */}
        <div>
          <h4 className="font-semibold mb-2">Contact</h4>
          <p className="text-neutral-400">Phone: {BRAND.phone1}</p>
          <p className="text-neutral-400">Phone: {BRAND.phone2}</p>
          <p className="text-neutral-400">Email: {BRAND.email}</p>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="text-center text-xs text-neutral-500 py-4 border-t border-neutral-800">
        © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
      </div>
    </footer>
  );
}
