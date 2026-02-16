// components/GoogleMapsAutocomplete.jsx - FIXED AUTOCOMPLETE
import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, AlertCircle, Check } from 'lucide-react';
import { loadGoogleMaps } from '../utils/scriptLoaders';

/**
 * Google Maps Autocomplete Component with Manual Fallback
 * Fixes: Autocomplete dropdown not appearing when typing
 */
export default function GoogleMapsAutocomplete({ onSelect, defaultValue = '' }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [searchText, setSearchText] = useState(defaultValue);
  const [hasSelected, setHasSelected] = useState(false);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Update searchText when defaultValue prop changes
  useEffect(() => {
    setSearchText(defaultValue);
    setHasSelected(false);
  }, [defaultValue]);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled) return;
        setIsLoaded(true);
        setManualMode(false);
        setTimeout(() => initAutocomplete(), 100);
      })
      .catch(() => {
        if (cancelled) return;
        console.warn('[Maps] Google Maps not available - switching to manual mode');
        setManualMode(true);
        setIsLoaded(true);
      });

    return () => {
      cancelled = true;
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const initAutocomplete = () => {
    if (!inputRef.current || !window.google) {
      console.error('[Maps] Cannot initialize - missing refs or Google Maps');
      return;
    }

    try {
      // Clear any existing autocomplete
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      // Initialize Google Places Autocomplete
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          componentRestrictions: { country: 'in' },
          fields: ['formatted_address', 'geometry', 'name', 'address_components', 'place_id'],
          types: ['address']
        }
      );

      // Listen for place selection
      autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
      
      console.log('[Maps] ✅ Autocomplete initialized successfully');
    } catch (error) {
      console.error('[Maps] ❌ Failed to initialize autocomplete:', error);
      setManualMode(true);
    }
  };

  const handlePlaceSelect = () => {
    if (!autocompleteRef.current) {
      console.error('[Maps] No autocomplete reference');
      return;
    }

    const place = autocompleteRef.current.getPlace();
    
    console.log('[Maps] Place changed:', place);

    if (!place.geometry || !place.geometry.location) {
      console.error('[Maps] ❌ No geometry for selected place');
      alert('Could not get location. Please select from the dropdown suggestions.');
      return;
    }

    const address = place.formatted_address || place.name || '';
    const latitude = place.geometry.location.lat();
    const longitude = place.geometry.location.lng();

    console.log('[Maps] ✅ Place selected:', { 
      address, 
      latitude, 
      longitude,
      place_id: place.place_id 
    });

    // Update UI
    setSearchText(address);
    setHasSelected(true);

    // Call parent callback with selected address data
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

    console.log('[Maps] Manual address entry:', searchText);

    // In manual mode, we don't have coordinates
    onSelect({
      address: searchText,
      latitude: null,
      longitude: null,
      name: null
    });

    setHasSelected(true);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    setHasSelected(false);
    
    // Log to verify input is working
    console.log('[Maps] Input changed:', value);
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
        
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg text-yellow-400 text-sm mb-2">
          <AlertCircle className="w-4 h-4 inline mr-1" />
          Google Maps unavailable. Manual entry mode.
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
        
        <p className="text-xs text-yellow-400">
          ⚠️ Without map pin, we cannot verify delivery distance
        </p>
      </div>
    );
  }

  // Google Maps loaded successfully
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-300 mb-2">
        <Search className="w-4 h-4 inline mr-1" />
        Search Address (Recommended)
      </label>
      
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
          <p className="text-green-400 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Location pinned! Address verified.
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
            Use "{searchText}" (without map pin)
          </button>
        </div>
      )}
    </div>
  );
}