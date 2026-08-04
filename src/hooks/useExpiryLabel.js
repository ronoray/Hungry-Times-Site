// src/hooks/useExpiryLabel.js
// Live-ticking wrapper around expiryLabel(). Refreshes once a minute, which is
// the finest granularity the label actually shows ("5h left!"), so a faster
// timer would just be wasted renders.

import { useEffect, useState } from 'react';
import { expiryLabel } from '../utils/offerCountdown';

export function useExpiryLabel(validTill) {
  const [label, setLabel] = useState(() => expiryLabel(validTill));

  useEffect(() => {
    if (!validTill) {
      setLabel('');
      return undefined;
    }
    const update = () => setLabel(expiryLabel(validTill));
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [validTill]);

  return label;
}

export default useExpiryLabel;
