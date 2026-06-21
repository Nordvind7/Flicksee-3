import React, { createContext, useCallback, useContext, useState } from 'react';

// Session-wide sound state, shared across all trailer cards so the user's
// choice (and the one-time autoplay "unlock" from the first tap) persists as
// they swipe.
interface SoundState {
  /** User's sound preference (default on). */
  soundOn: boolean;
  setSoundOn: (on: boolean) => void;
  /** True once the user has made a gesture that unlocks autoplay-with-sound. */
  unlocked: boolean;
  unlock: () => void;
}

const SoundContext = createContext<SoundState | undefined>(undefined);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [soundOn, setSoundOn] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const unlock = useCallback(() => setUnlocked(true), []);

  return (
    <SoundContext.Provider value={{ soundOn, setSoundOn, unlocked, unlock }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound(): SoundState {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used within SoundProvider');
  return ctx;
}
