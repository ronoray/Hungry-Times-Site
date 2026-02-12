// GA4 + Meta Pixel event tracking utility
// Both are loaded lazily in index.html — this safely wraps all calls

function track(eventName, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

function fbTrack(eventName, params = {}) {
  if (typeof window.fbq === 'function') {
    window.fbq('track', eventName, params);
  }
}

// ─── E-commerce funnel ───

export function trackViewItemList(categoryName, items = []) {
  track('view_item_list', {
    item_list_name: categoryName,
    items: items.slice(0, 10).map((item, i) => ({
      item_id: String(item.id),
      item_name: item.name,
      item_category: categoryName,
      price: item.basePrice || item.price || 0,
      index: i,
    })),
  });
}

export function trackViewItem(item, category) {
  const price = item.basePrice || item.price || 0;
  track('view_item', {
    currency: 'INR',
    value: price,
    items: [{
      item_id: String(item.id),
      item_name: item.name,
      item_category: category || '',
      price,
    }],
  });
  fbTrack('ViewContent', {
    content_name: item.name,
    content_category: category || '',
    content_ids: [String(item.id)],
    content_type: 'product',
    value: price,
    currency: 'INR',
  });
}

export function trackAddToCart(item, quantity = 1, category) {
  const price = item.basePrice || item.price || 0;
  track('add_to_cart', {
    currency: 'INR',
    value: price * quantity,
    items: [{
      item_id: String(item.id),
      item_name: item.name,
      item_category: category || '',
      price,
      quantity,
    }],
  });
  fbTrack('AddToCart', {
    content_name: item.name,
    content_ids: [String(item.id)],
    content_type: 'product',
    value: price * quantity,
    currency: 'INR',
  });
}

export function trackBeginCheckout(cartItems, total) {
  track('begin_checkout', {
    currency: 'INR',
    value: total,
    items: cartItems.map(ci => ({
      item_id: String(ci.id),
      item_name: ci.name,
      price: ci.price || 0,
      quantity: ci.quantity || 1,
    })),
  });
  fbTrack('InitiateCheckout', {
    content_ids: cartItems.map(ci => String(ci.id)),
    content_type: 'product',
    num_items: cartItems.length,
    value: total,
    currency: 'INR',
  });
}

export function trackPurchase(orderId, total, paymentMethod, items = []) {
  track('purchase', {
    transaction_id: String(orderId),
    currency: 'INR',
    value: total,
    payment_type: paymentMethod,
    items: items.map(ci => ({
      item_id: String(ci.id || ci.item_id),
      item_name: ci.name || ci.item_name,
      price: ci.price || 0,
      quantity: ci.quantity || 1,
    })),
  });
  fbTrack('Purchase', {
    content_ids: items.map(ci => String(ci.id || ci.item_id)),
    content_type: 'product',
    num_items: items.length,
    value: total,
    currency: 'INR',
  });
}

// ─── User interactions ───

export function trackSearch(searchTerm) {
  track('search', { search_term: searchTerm });
}

export function trackPhoneClick(location) {
  track('phone_click', { link_location: location });
}

export function trackWhatsAppClick(location) {
  track('whatsapp_click', { link_location: location });
}

export function trackCtaClick(ctaName, location) {
  track('cta_click', { cta_name: ctaName, link_location: location });
}

export function trackFavoriteToggle(itemName, isFavorite) {
  track('favorite_toggle', { item_name: itemName, is_favorite: isFavorite });
}

export function trackContactFormSubmit() {
  track('contact_form_submit');
}

export function trackReorder(orderId) {
  track('reorder', { original_order_id: String(orderId) });
}

export function trackShare(method, contentType) {
  track('share', { method, content_type: contentType });
}
