import { useState, useEffect, useCallback, useRef } from 'react';
import type { Movie, FilterState } from '../types';
import { fetchDiscoverContent } from '../services/tmdb';

// Helper function to robustly compare filter states
const areFiltersEqual = (a: FilterState, b: FilterState): boolean => {
  if (!a || !b) return false;
  if (a.contentType !== b.contentType) return false;
  if (a.genres.length !== b.genres.length) return false;

  // To compare genre arrays regardless of order, we sort them first.
  const sortedA = [...a.genres].sort();
  const sortedB = [...b.genres].sort();

  return sortedA.every((value, index) => value === sortedB[index]);
};

// Когда TMDB page после фильтрации по excludedIds даёт 0 — это часто значит
// что юзер уже свайпнул всех популярных в начале списка, а свежие лежат
// глубже. Пытаемся подряд ещё несколько страниц, пока не наберём что-то
// показать или не упрёмся в потолок.
const MAX_PAGE_HOPS = 5;
// TMDB разумная глубина: после ~page 50 идёт мусор с низкими рейтингами.
const MAX_TMDB_PAGE = 50;

const useMovies = (filters: FilterState, excludedIds: Set<number> = new Set()) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Held in a ref so that updating the excluded set on every swipe does not
  // retrigger the fetch effect — we just read the latest value when fetching.
  const excludedRef = useRef(excludedIds);
  useEffect(() => {
    excludedRef.current = excludedIds;
  }, [excludedIds]);

  // Effect for handling initial load, state restoration, and filter changes.
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      // 1. Try to restore state from localStorage. We ALSO re-filter the
      //    restored deck against the current excludedIds — иначе старый кеш
      //    с уже-свайпнутыми фильмами утечёт в дека (бывает после быстрой
      //    серии свайпов или синка с другого устройства).
      try {
        const savedStateRaw = localStorage.getItem('flicksee_swipe_state');
        if (savedStateRaw) {
          const savedState = JSON.parse(savedStateRaw);
          if (savedState.filters && areFiltersEqual(savedState.filters, filters)) {
            const restored: Movie[] = (savedState.movies || []).filter(
              (m: Movie) => !excludedRef.current.has(m.id),
            );
            // Если после фильтрации почти ничего не осталось — restore не имеет
            // смысла (currentIndex почти наверняка укажет за конец). Падаем в
            // свежий fetch ниже.
            if (restored.length >= 3) {
              if (isMounted) {
                setMovies(restored);
                setPage(savedState.page || 1);
                setHasMore(true);
                setIsLoading(false);
                // Перезаписываем стор отфильтрованной версией, чтобы дальнейшие
                // повторные restore-ы тоже стартовали с чистого листа.
                localStorage.setItem(
                  'flicksee_swipe_state',
                  JSON.stringify({ movies: restored, page: savedState.page || 1, filters }),
                );
              }
              return;
            }
          }
        }
      } catch (e) {
        console.error("Failed to restore swipe state from localStorage", e);
      }

      // 2. If not restored, fetch fresh data — possibly hopping pages forward
      //    if the first page is entirely already-swiped.
      if (isMounted) {
        localStorage.removeItem('flicksee_swipe_state');
        localStorage.removeItem('flicksee_swipe_currentIndex');
        setMovies([]);
        setPage(1);
        setHasMore(true);
        setIsLoading(true);
        setError(null);
      }

      try {
        let currentPage = 1;
        let collected: Movie[] = [];
        let exhausted = false;

        for (let hop = 0; hop < MAX_PAGE_HOPS && collected.length === 0; hop++) {
          if (currentPage > MAX_TMDB_PAGE) {
            exhausted = true;
            break;
          }
          const fetched = await fetchDiscoverContent(currentPage, filters);
          collected = fetched.filter((m) => !excludedRef.current.has(m.id));
          currentPage++;
        }

        if (isMounted) {
          if (collected.length === 0) {
            exhausted = true;
          }
          setMovies(collected);
          setPage(currentPage);
          setHasMore(!exhausted);

          const stateToSave = { movies: collected, page: currentPage, filters };
          localStorage.setItem('flicksee_swipe_state', JSON.stringify(stateToSave));
        }
      } catch (e) {
        if (isMounted) {
          setError('Не удалось загрузить фильмы.');
          console.error(e);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [filters]);

  const loadMoreMovies = useCallback(async () => {
    if (isLoading || !hasMore) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Skip forward through TMDB pages that are entirely already-swiped.
      // Без этого юзер с длинной историей упирается в "пусто" даже когда
      // фактически есть свежий контент на page+2, page+3...
      let currentPage = page;
      let newMovies: Movie[] = [];
      for (let hop = 0; hop < MAX_PAGE_HOPS && newMovies.length === 0; hop++) {
        if (currentPage > MAX_TMDB_PAGE) break;
        const fetched = await fetchDiscoverContent(currentPage, filters);
        newMovies = fetched.filter((m) => !excludedRef.current.has(m.id));
        currentPage++;
      }

      // Истинный конец каталога: либо упёрлись в потолок, либо MAX_PAGE_HOPS
      // подряд страниц без единого нового фильма.
      if (newMovies.length === 0 || currentPage > MAX_TMDB_PAGE) {
        setHasMore(false);
      }

      setMovies(prevMovies => {
        const moviesToSet = [...prevMovies, ...newMovies];
        const uniqueIds = new Set();
        const uniqueMovies = moviesToSet.filter(movie => {
            if (uniqueIds.has(movie.id)) {
                return false;
            }
            uniqueIds.add(movie.id);
            return true;
        });

        try {
            const stateToSave = { movies: uniqueMovies, page: currentPage, filters };
            localStorage.setItem('flicksee_swipe_state', JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Failed to save swipe state to localStorage", e);
        }
        return uniqueMovies;
      });
      setPage(currentPage);
    } catch (e) {
      setError('Не удалось загрузить фильмы.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page, filters]);

  return { movies, isLoading, error, loadMoreMovies, hasMore };
};

export default useMovies;