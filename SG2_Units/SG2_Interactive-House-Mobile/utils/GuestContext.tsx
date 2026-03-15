import React, { createContext, useContext, useState } from 'react';

type GuestContextType = {
  isGuest: boolean;
  setIsGuest: (value: boolean) => void;
};

const GuestContext = createContext<GuestContextType>({
  isGuest: false,
  setIsGuest: () => {},
});

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [isGuest, setIsGuest] = useState(false);

  return (
    <GuestContext.Provider value={{ isGuest, setIsGuest }}>
      {children}
    </GuestContext.Provider>
  );
}

export const useGuest = () => useContext(GuestContext);
