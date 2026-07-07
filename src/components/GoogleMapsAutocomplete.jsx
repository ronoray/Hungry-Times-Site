// components/GoogleMapsAutocomplete.jsx
// Address input: Google autocomplete + GPS + manual entry, with a visible
// draggable pin map (PinConfirmMap) so the customer can always see AND correct
// their delivery pin. Never blocks: typed address with no pin still proceeds.
import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Check, LocateFixed, Loader, Map as MapIcon } from 'lucide-react';
import { loadGoogleMaps } from '../utils/scriptLoaders';
import { reverseGeocode } from '../utils/geo';
import PinConfirmMap from './PinConfirmMap';

/**
 * @param {function} onSelect - ({ address, latitude, longitude, name, place_id? })
 * @param {string} defaultValue - prefill address text (edit flows)
 * @param {{latitude:number|null, longitude:number|null}|null} defaultCoords - prefill pin (edit flows)
 */
export default function GoogleMapsAutocomplete({ onSelect, defaultValue = '', defaultCoords = null }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [searchText, setSearchText] = useState(defaultValue);
  const [hasSelected, setHasSelected] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState(() =>
    defaultCoords?.latitude != null && defaultCoords?.longitude != null
      ? { lat: defaultCoords.latitude, lng: defaultCoords.longitude }
      : null
  );
  const [showMap, setShowMap] = useState(false);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const cancelledRef = useRef(false);
  const searchTextRef = useRef(defaultValue);
  searchTextRef.current = searchText;

  // Update searchText/pin when defaults change (parent starts a new add/edit)
  useEffect(() => {
    setSearchText(defaultValue);
    setHasSelected(false);
  }, [defaultValue]);

  useEffect(() => {
    if (defaultCoords?.latitude != null && defaultCoords?.longitude != null) {
      setCoords({ lat: defaultCoords.latitude, lng: defaultCoords.longitude });
    }
  }, [defaultCoords?.latitude, defaultCoords?.longitude]);

  useEffect(() => {
    cancelledRef.current = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelledRef.current) return;
        setIsLoaded(true);
        setManualMode(false);
        setTimeout(() => initAutocomplete(), 100);
      })
      .catch(() => {
        if (cancelledRef.current) return;
        console.warn('[Maps] Google Maps not available - switching to manual mode');
        setManualMode(true);
        setIsLoaded(true);
      });

    return () => {
      cancelledRef.current = true;
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const initAutocomplete = async () => {
    if (cancelledRef.current || !inputRef.current || !window.google?.maps?.importLibrary) return;

    try {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      // Try new importLibrary first; fall back to classic namespace (loaded via libraries=places)
      let Autocomplete;
      try {
        const lib = await window.google.maps.importLibrary('places');
        Autocomplete = lib.Autocomplete;
      } catch {
        Autocomplete = window.google.maps.places?.Autocomplete;
      }
      if (!Autocomplete) throw new Error('Places Autocomplete not available');

      if (cancelledRef.current || !inputRef.current) return;

      autocompleteRef.current = new Autocomplete(
        inputRef.current,
        {
          componentRestrictions: { country: 'in' },
          fields: ['formatted_address', 'geometry', 'name', 'address_components', 'place_id'],
          types: ['address']
        }
      );

      autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
    } catch (error) {
      console.error('[Maps] Failed to initialize autocomplete:', error);
      if (!cancelledRef.current) setManualMode(true);
    }
  };

  const handlePlaceSelect = () => {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();

    if (!place.geometry || !place.geometry.location) {
      // No geometry — keep the typed text, customer can still proceed manually
      return;
    }

    const address = place.formatted_address || place.name || '';
    const latitude = place.geometry.location.lat();
    const longitude = place.geometry.location.lng();

    setSearchText(address);
    setHasSelected(true);
    setCoords({ lat: latitude, lng: longitude });
    setShowMap(true);

    onSelect({
      address,
      latitude,
      longitude,
      name: place.name,
      place_id: place.place_id
    });
  };

  const handleManualSelect = () => {
    if (!searchText.trim()) {
      alert('Please enter an address');
      return;
    }

    setHasSelected(true);

    // Keep any pin the customer already placed on the map
    onSelect({
      address: searchText,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      name: null
    });
  };

  const handleInputChange = (e) => {
    setSearchText(e.target.value);
    setHasSelected(false);
  };

  // One-tap GPS pin — most reliable for Indian addresses Google can't autocomplete.
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Your browser does not support location. Please type your address instead.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        const resolved = await reverseGeocode(latitude, longitude);
        // Keep any details the customer already typed (flat/floor) by prepending it.
        const typed = searchTextRef.current.trim();
        const address = typed && !typed.startsWith('Pinned location')
          ? `${typed} (near ${resolved})`
          : resolved;
        setSearchText(address);
        setHasSelected(true);
        setCoords({ lat: latitude, lng: longitude });
        setShowMap(true);
        setLocating(false);
        onSelect({ address, latitude, longitude, name: null });
      },
      (err) => {
        setLocating(false);
        const msg = err.code === err.PERMISSION_DENIED
          ? 'Location permission was blocked. Allow it in your browser, or just type your address below.'
          : 'Could not get your location. Please type your address below.';
        alert(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Customer dragged the pin or tapped the map — this is the source of truth.
  const handlePinChange = async (lat, lng) => {
    setCoords({ lat, lng });
    setHasSelected(true);
    let address = searchTextRef.current.trim();
    if (!address) {
      address = await reverseGeocode(lat, lng);
      setSearchText(address);
    }
    onSelect({ address, latitude: lat, longitude: lng, name: null });
  };

  const LocationButton = () => (
    <button
      type="button"
      onClick={handleUseMyLocation}
      disabled={locating}
      className="w-full py-2.5 flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors"
    >
      {locating
        ? (<><Loader className="w-4 h-4 animate-spin" /> Getting your location…</>)
        : (<><LocateFixed className="w-4 h-4" /> Use my current location</>)}
    </button>
  );

  // Pin map: always shown once we have coords; otherwise offered as an option.
  const MapSection = () => {
    if (coords || showMap) {
      return (
        <div className="mt-2">
          <PinConfirmMap
            lat={coords?.lat ?? null}
            lng={coords?.lng ?? null}
            onChange={handlePinChange}
          />
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setShowMap(true)}
        className="mt-1 w-full py-2 flex items-center justify-center gap-2 bg-neutral-800 border border-neutral-700 text-neutral-300 text-sm rounded-xl hover:border-orange-500 transition-colors"
      >
        <MapIcon className="w-4 h-4" />
        Set delivery pin on map (optional)
      </button>
    );
  };

  // Loading state
  if (!isLoaded && !manualMode) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          <Search className="w-4 h-4 inline mr-1" />
          Search Address
        </label>
        <div className="p-4 bg-neutral-800/50 border border-neutral-700 rounded-xl">
          <div className="flex items-center gap-3 text-neutral-400">
            <div className="animate-spin h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full"></div>
            <span className="text-sm">Loading address search...</span>
          </div>
        </div>
      </div>
    );
  }

  // Manual mode (Google Maps not available)
  if (manualMode) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          <MapPin className="w-4 h-4 inline mr-1" />
          Enter Address
        </label>

        <LocationButton />
        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px bg-neutral-700" />
          <span className="text-xs text-neutral-500">or type it</span>
          <div className="flex-1 h-px bg-neutral-700" />
        </div>

        <textarea
          value={searchText}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault();
              handleManualSelect();
            }
          }}
          placeholder="Enter your complete address&#10;Example: 21, Ramkrishna Pally, Kolkata 700078"
          className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          rows={3}
        />

        <button
          type="button"
          onClick={handleManualSelect}
          className="w-full py-2 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
        >
          Use This Address
        </button>

        <MapSection />

        <p className="text-xs text-neutral-500">
          Tip: "Use my current location" gives the most accurate delivery pin.
        </p>
      </div>
    );
  }

  // Google Maps loaded successfully
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-300 mb-2">
        <MapPin className="w-4 h-4 inline mr-1" />
        Delivery Address
      </label>

      <LocationButton />
      <div className="flex items-center gap-2 my-2">
        <div className="flex-1 h-px bg-neutral-700" />
        <span className="text-xs text-neutral-500">or search</span>
        <div className="flex-1 h-px bg-neutral-700" />
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchText}
          onChange={handleInputChange}
          placeholder="Start typing your address..."
          autoComplete="off"
          className={`w-full px-4 py-3 pl-10 pr-10 bg-neutral-800 border rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 transition-all ${
            hasSelected
              ? 'border-green-500 focus:ring-green-500'
              : 'border-neutral-700 focus:ring-orange-500'
          }`}
        />
        <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
          hasSelected ? 'text-green-500' : 'text-neutral-500'
        }`} />

        {hasSelected && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
        )}
      </div>

      <div className="flex items-start gap-2 text-xs">
        {hasSelected ? (
          <p className={coords ? 'text-green-400 flex items-center gap-1' : 'text-yellow-400 flex items-center gap-1'}>
            <Check className="w-3 h-3" />
            {coords ? 'Location pinned! Drag the pin below to fine-tune.' : "Address saved — no pin yet, we'll confirm on the call."}
          </p>
        ) : (
          <p className="text-neutral-500">
            📍 Start typing, then select from dropdown suggestions
          </p>
        )}
      </div>

      {/* Manual entry fallback */}
      {!hasSelected && searchText.length > 10 && (
        <div className="mt-3 p-3 bg-neutral-800 border border-neutral-700 rounded-xl">
          <p className="text-xs text-neutral-400 mb-2">
            Not seeing suggestions? Click to enter manually:
          </p>
          <button
            type="button"
            onClick={handleManualSelect}
            className="w-full py-2 bg-neutral-700 text-white text-sm rounded-lg hover:bg-neutral-600 transition-colors"
          >
            Use "{searchText}" as my address
          </button>
        </div>
      )}

      <MapSection />
    </div>
  );
}
