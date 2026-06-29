import React, { useEffect, useRef } from 'react';
import SwipeContainer from '../../components/SwipeContainer';
import { useLibraryContext } from '../../auth/LibraryContext';
import { ContentType, type FilterState } from '../../types';

interface Props {
  /** Fired once when the user crosses the conversion threshold:
   *  2nd swipe OR a LIKE/RECOMMEND. Caller opens the login modal. */
  onIntent: () => void;
}

const DEFAULT_FILTERS: FilterState = {
  contentType: ContentType.Movie,
  genres: [],
};

const EmbeddedDeck: React.FC<Props> = ({ onIntent }) => {
  const {
    handleLike,
    handleDislike,
    handleWatched,
    handleRecommend,
    handleUndo,
    excludedIds,
  } = useLibraryContext();

  const swipeCount = useRef(0);
  const intentFired = useRef(false);

  const noteSwipe = (highIntent: boolean) => {
    swipeCount.current += 1;
    if (intentFired.current) return;
    if (highIntent || swipeCount.current >= 2) {
      intentFired.current = true;
      onIntent();
    }
  };

  const wrappedLike = (m: Parameters<typeof handleLike>[0]) => {
    handleLike(m);
    noteSwipe(true);
  };
  const wrappedRecommend = (m: Parameters<typeof handleRecommend>[0]) => {
    handleRecommend(m);
    noteSwipe(true);
  };
  const wrappedDislike = (m: Parameters<typeof handleDislike>[0]) => {
    handleDislike(m);
    noteSwipe(false);
  };
  const wrappedWatched = (m: Parameters<typeof handleWatched>[0]) => {
    handleWatched(m);
    noteSwipe(false);
  };

  useEffect(() => {
    // Reset when the deck is re-mounted via key change.
    swipeCount.current = 0;
    intentFired.current = false;
  }, []);

  return (
    <div className="w-full max-w-md mx-auto" style={{ height: 'min(600px, 80vh)' }}>
      <SwipeContainer
        onLike={wrappedLike}
        onDislike={wrappedDislike}
        onWatched={wrappedWatched}
        onRecommend={wrappedRecommend}
        onUndo={handleUndo}
        onResetHistory={async () => {}}
        onOpenFilters={() => {}}
        filters={DEFAULT_FILTERS}
        genreMap={new Map()}
        excludedIds={excludedIds}
      />
    </div>
  );
};

export default EmbeddedDeck;
