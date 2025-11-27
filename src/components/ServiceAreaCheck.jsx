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
      <div className="bg-yellow-500/10 border-2 border-yellow-500/50 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-yellow-400 font-semibold text-lg mb-1">
              Outside Delivery Service Area
            </h3>
            <p className="text-neutral-300 text-sm mb-3">
              Your registered address is outside our standard delivery service area. 
              You can browse our menu, but you'll need to contact us directly to place an order.
            </p>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-orange-400" />
              <a 
                href="tel:8420822919" 
                className="text-orange-400 hover:text-orange-300 font-medium underline"
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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl max-w-lg w-full p-8 border-2 border-yellow-500/50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/20 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">
            Cannot Process Online Order
          </h2>
          
          <p className="text-neutral-300 mb-6">
            Your delivery address ({customer.address}) is outside our standard delivery 
            service area (max 3.5 km). 
          </p>

          <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 mb-6">
            <p className="text-neutral-300 mb-4">
              Please contact us directly to place your order:
            </p>
            <a 
              href="tel:8420822919"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/50 transition-all"
            >
              <Phone className="w-5 h-5" />
              Call 8420822919
            </a>
          </div>

          <p className="text-sm text-neutral-400">
            We appreciate your interest and will do our best to accommodate your order!
          </p>
        </div>
      </div>
    </div>
  );
}