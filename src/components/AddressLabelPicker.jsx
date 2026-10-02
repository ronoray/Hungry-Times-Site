import React, { useRef } from 'react';

/**
 * Label input for a saved address: preset chips over a free-text field.
 *
 * Why chips: the label was a bare text box with an "e.g., Home, Office"
 * placeholder, duplicated across three forms on this site and one more in the
 * ops panel, and in practice almost nothing got labelled — 396 of 397 saved
 * addresses had no name. A tap is cheaper than typing on a phone at checkout,
 * and consistent labels are what make the address list readable when someone
 * has three entries that all start with a flat number.
 *
 * Free text stays first-class. The chips are a shortcut, not a vocabulary: a
 * chip fills the field, "Other" clears it and focuses the input, and tapping the
 * active chip again removes the label entirely.
 */

const PRESETS = ['Home', 'Office', 'Parents'];

export default function AddressLabelPicker({
  value = '',
  onChange,
  placeholder = 'e.g., Home, Office',
  className = '',
  inputClassName = 'w-full bg-ht-ink/15 border border-ht-ink/25 rounded-lg px-4 py-2 text-ht-ink',
}) {
  const inputRef = useRef(null);
  const current = (value || '').trim();
  const matchesPreset = PRESETS.some((p) => p.toLowerCase() === current.toLowerCase());

  const pick = (preset) => {
    // Tapping the applied chip clears it — otherwise there is no way back to
    // "no label" without selecting the text and deleting it.
    onChange(current.toLowerCase() === preset.toLowerCase() ? '' : preset);
  };

  const pickOther = () => {
    if (matchesPreset) onChange('');
    inputRef.current?.focus();
  };

  const chip = (active) =>
    `px-3 py-1 text-xs rounded-full border transition-colors ${
      active
        ? 'bg-ht-red border-ht-red text-white'
        : 'bg-ht-ink/10 border-ht-ink/25 text-ht-ink hover:border-ht-ink/25'
    }`;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => pick(p)}
            className={chip(current.toLowerCase() === p.toLowerCase())}
          >
            {p}
          </button>
        ))}
        <button type="button" onClick={pickOther} className={chip(!!current && !matchesPreset)}>
          Other
        </button>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClassName}
      />
    </div>
  );
}
