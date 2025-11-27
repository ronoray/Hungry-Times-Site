import React, { createContext, useContext, useState } from 'react';

const LocationContext = createContext();

export const useLocationStore = () => useContext(LocationContext);

export function LocationProvider({ children }) {
  // Stores the geocoded address object: { fullAddress, latitude, longitude, name }
  const [primaryAddress, setPrimaryAddress] = useState({});

  const clearPrimaryAddress = () => setPrimaryAddress({});
  
  // NOTE: In a full app, you'd also load/manage multiple saved addresses here.

  const value = {
    primaryAddress,
    setPrimaryAddress,
    clearPrimaryAddress,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}