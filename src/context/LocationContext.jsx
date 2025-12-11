// site/src/context/LocationContext.jsx - NEW FILE
// Manages user geolocation and location-related state

import { createContext, useContext, useState } from 'react';

const LocationContext = createContext(null);

/**
 * LocationProvider Component
 * Provides geolocation and location-related functionality
 */
export function LocationProvider({ children }) {
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [hasAskedPermission, setHasAskedPermission] = useState(false);

  /**
   * Request user's current geolocation
   */
  const requestLocation = async () => {
    // Don't request again if already loading
    if (isLoadingLocation) return;

    setIsLoadingLocation(true);
    setLocationError(null);

    // Check if browser supports geolocation
    if (!navigator.geolocation) {
      const error = 'Geolocation is not supported by this browser';
      setLocationError(error);
      setIsLoadingLocation(false);
      console.warn('⚠️ Geolocation not available');
      return;
    }

    // Request permission
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Success callback
        const { latitude, longitude, accuracy } = position.coords;
        
        setUserLocation({
          latitude,
          longitude,
          accuracy,
          timestamp: new Date().toISOString()
        });
        
        setLocationError(null);
        setHasAskedPermission(true);
        setIsLoadingLocation(false);
        
        console.log('✅ Location obtained:', { latitude, longitude, accuracy });
      },
      (error) => {
        // Error callback
        let errorMessage = 'Failed to get location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable in browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
          default:
            errorMessage = error.message || 'Unknown error getting location';
        }
        
        setLocationError(errorMessage);
        setHasAskedPermission(true);
        setIsLoadingLocation(false);
        
        console.error('❌ Geolocation error:', errorMessage);
      },
      {
        enableHighAccuracy: false,  // Don't drain battery
        timeout: 10000,             // 10 seconds
        maximumAge: 300000          // Cache for 5 minutes
      }
    );
  };

  /**
   * Clear the stored location
   */
  const clearLocation = () => {
    setUserLocation(null);
    setLocationError(null);
    setHasAskedPermission(false);
  };

  /**
   * Check if location is within a distance threshold
   */
  const isWithinRadius = (targetLat, targetLng, radiusKm) => {
    if (!userLocation) return null;

    const { latitude, longitude } = userLocation;
    
    // Haversine formula for distance calculation
    const toRad = (degree) => degree * (Math.PI / 180);
    const R = 6371; // Earth's radius in km
    
    const dLat = toRad(targetLat - latitude);
    const dLng = toRad(targetLng - longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(latitude)) * Math.cos(toRad(targetLat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return {
      distance,
      isWithin: distance <= radiusKm
    };
  };

  // Context value
  const value = {
    userLocation,
    locationError,
    isLoadingLocation,
    hasAskedPermission,
    requestLocation,
    clearLocation,
    isWithinRadius,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

/**
 * Hook to use location context
 */
export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
}