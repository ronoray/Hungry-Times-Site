// The quotable text of a published review, or '' when there is none.
//
// Shared by TestimonialCarousel.jsx and the Testimonials page, which render the
// same rows in two layouts. They used to inline `t.testimonial_text || t.text`
// each, which meant a wordless review drew a card containing an empty pair of
// quote marks — on 16 Aug 2026 ten such cards were live, and before that
// twenty-nine.
//
// Most reviewers leave stars and no words, and every published rating stays on
// the page unless the owner deletes it, so this is the normal case rather than
// an edge one. Callers render the quote block only when this returns something.
//
// TRIM MATTERS: '   ' is truthy in JS, so a bare `text || ''` check lets a
// whitespace-only row through and the empty-quote card comes back.
//
// The API sends the same string under two names — `testimonial_text` is the
// legacy field name kept for backward compatibility, `text` the newer one — and
// either may be null. Both are read here so neither page has to know that.
export function quoteOf(review) {
  if (!review) return '';
  const raw = review.testimonial_text || review.text || '';
  return String(raw).trim();
}

export default quoteOf;
