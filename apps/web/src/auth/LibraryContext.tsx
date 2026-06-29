import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useLibrary } from '../hooks/useLibrary';
import type { Movie } from '../types';
import type { MatchPayload } from '../components/MatchOverlay';

// Library lives at the app shell so any route (including /blog) can read
// the user's excluded set and call handleLike — needed so movie-pick cards
// inside articles can add titles to the watchlist in-place.
interface LibraryValue {
  likedMovies: Movie[];
  watchedMovies: Movie[];
  excludedIds: Set<number>;
  handleLike: (movie: Movie) => void;
  handleDislike: (movie: Movie) => void;
  handleWatched: (movie: Movie) => void;
  handleRecommend: (movie: Movie) => void;
  handleUndo: (movie: Movie) => Promise<void> | void;
  pendingMatch: MatchPayload | null;
  dismissMatch: () => void;
  /** Wipes all swipes server-side + clears local state. Used by EmptyDeck. */
  resetAll: () => Promise<void>;
  /** Counter bumped on every resetAll(). Use as React `key` on SwipeContainer
   *  to force-remount the deck after history wipe. */
  resetVersion: number;
}

const LibraryContext = createContext<LibraryValue | null>(null);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const lib = useLibrary(user, loading);
  return <LibraryContext.Provider value={lib}>{children}</LibraryContext.Provider>;
};

export function useLibraryContext(): LibraryValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibraryContext must be used inside <LibraryProvider>');
  return ctx;
}
