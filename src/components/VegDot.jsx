// Green dot = veg, Red dot = non-veg (Indian food standard)
export default function VegDot({ isVeg }) {
  if (isVeg === null || isVeg === undefined) return null;

  const color = isVeg ? '#22c55e' : '#ef4444';
  const label = isVeg ? 'Vegetarian' : 'Non-vegetarian';

  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 border rounded-sm flex-shrink-0"
      style={{ borderColor: color }}
      title={label}
      aria-label={label}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}
