// components/StarRating.jsx
// Read-only star display. Extracted because the same 5-star SVG loop was
// hand-rolled inline on Home and is needed again by the testimonial carousel
// and the /testimonials page.
//
// Supports fractional values (4.7 -> four full stars and one 70% star) so the
// aggregate rating headline doesn't have to round away real information.

export default function StarRating({ value = 0, size = 'w-4 h-4', className = '' }) {
  const stars = [0, 1, 2, 3, 4];

  return (
    <div className={`flex items-center gap-0.5 ${className}`} aria-hidden="true">
      {stars.map(i => {
        // Fraction of THIS star that should be filled: 1 when fully below the
        // value, 0 when fully above, the remainder for the one it lands inside.
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className={`relative inline-block ${size}`}>
            <svg className={`${size} text-neutral-700 absolute inset-0`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <svg className={`${size} text-yellow-500`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
