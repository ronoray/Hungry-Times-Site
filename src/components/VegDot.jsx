// FSSAI mark: green square = veg, brown square = non-veg (DNA v2 §2 —
// these two colours are used for this mark only).
export default function VegDot({ isVeg }) {
  if (isVeg === null || isVeg === undefined) return null;

  const color = isVeg ? '#1F7A3A' : '#8A3B12';
  const label = isVeg ? 'Vegetarian' : 'Non-vegetarian';

  return (
    <span
      className="inline-flex items-center justify-center w-[14px] h-[14px] border-[1.5px] flex-shrink-0"
      style={{ borderColor: color }}
      title={label}
      aria-label={label}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}
