// components/ServiceAreaCheck.jsx
import { AlertCircle, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Service Area Check Component
 * Shows warning banner if customer is outside delivery service area
 * Blocks checkout but allows browsing
 */
export default function ServiceAreaCheck({ showInCheckout = false }) {
  const { customer, isAuthenticated } = useAuth();

  // Don't show if not authenticated
  if (!isAuthenticated || !customer) {
    return null;
  }

  // Don't show if within service area
  if (customer.withinServiceArea) {
    return null;
  }

  // Banner for menu browsing (top of page)
  if (!showInCheckout) {
    return (
      <div className="bg-ht-gold2/60 border-2 border-ht-gold/50 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-ht-gold3 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-ht-gold3 font-semibold text-lg mb-1">
              Outside Delivery Service Area
            </h3>
            <p className="text-ht-ink text-sm mb-3">
              Your registered address is outside our standard delivery service area. 
              You can browse our menu, but you'll need to contact us directly to place an order.
            </p>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-ht-red" />
              <a 
                href="tel:8420822919" 
                className="text-ht-red hover:text-ht-red font-medium underline"
              >
                Call 8420822919 to Order
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Blocker for checkout page
  return (
    <div className="fixed inset-0 bg-ht-ink/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-ht-ivory rounded-2xl max-w-lg w-full p-8 border-2 border-ht-gold/50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-ht-gold2/60 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-ht-gold3" />
          </div>
          
          <h2 className="text-2xl font-bold text-ht-ink mb-3">
            Cannot Process Online Order
          </h2>
          
          <p className="text-ht-ink mb-6">
            Your delivery address ({customer.address}) is outside our standard delivery 
            service area (max 3.5 km). 
          </p>

          <div className="bg-ht-paper border border-ht-ink/15 rounded-xl p-6 mb-6">
            <p className="text-ht-ink mb-4">
              Please contact us directly to place your order:
            </p>
            <a 
              href="tel:8420822919"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-ht-red to-ht-red text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-ht-red/50 transition-all"
            >
              <Phone className="w-5 h-5" />
              Call 8420822919
            </a>
          </div>

          <p className="text-sm text-ht-mute">
            We appreciate your interest and will do our best to accommodate your order!
          </p>
        </div>
      </div>
    </div>
  );
}