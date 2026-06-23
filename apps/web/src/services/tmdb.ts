import { TMDB_API_BASE_URL } from '../constants';
import type { Movie, VideosResponse, Genre, FilterState } from '../types';
import { ContentType, VideoResult } from '../types';

// api_key is added by the server-side proxy; the client only controls language.
const BASE_PARAMS = `language=ru-RU`;

export const fetchDiscoverContent = async (page: number, filters: FilterState): Promise<Movie[]> => {
  try {
    const genreQuery = filters.genres.length > 0 ? `&with_genres=${filters.genres.join(',')}` : '';
    const response = await fetch(
      `${TMDB_API_BASE_URL}/discover/${filters.contentType}?${BASE_PARAMS}&sort_by=popularity.desc&page=${page}${genreQuery}&vote_count.gte=100`
    );
    if (!response.ok) throw new Error('Failed to fetch content');
    const data = await response.json();
    return data.results.map((item: any) => ({
      ...item,
      title: item.title || item.name,
      contentType: filters.contentType, // Ensure content type is part of the movie object
    }));
  } catch (error) {
    console.error('Error fetching discover content:', error);
    return [];
  }
};

const findBestTrailer = (videos: VideoResult[]): VideoResult | undefined => {
    // Prioritize official trailers, then any trailer, then any Russian video, then any YouTube video.
    return videos.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official) 
        || videos.find(v => v.type === 'Trailer' && v.site === 'YouTube')
        || videos.find(v => v.iso_639_1 === 'ru' && v.site === 'YouTube')
        || videos.find(v => v.site === 'YouTube');
};


export const fetchTrailerKey = async (id: number, contentType: ContentType): Promise<string | null> => {
  try {
    // 1. Fetch Russian videos
    const responseRu = await fetch(`${TMDB_API_BASE_URL}/${contentType}/${id}/videos?${BASE_PARAMS}`);
    if (responseRu.ok) {
        const dataRu: VideosResponse = await responseRu.json();
        const trailer = findBestTrailer(dataRu.results);
        if (trailer) return trailer.key;
    } else {
        console.warn(`Failed to fetch Russian videos for ${contentType} ID ${id}.`);
    }

    // 2. Fallback: Fetch videos in any language (primarily English)
    console.log(`No Russian trailer for ${contentType} ID ${id}. Fetching any language as a fallback.`);
    const responseAny = await fetch(`${TMDB_API_BASE_URL}/${contentType}/${id}/videos`);
    if (responseAny.ok) {
        const dataAny: VideosResponse = await responseAny.json();
        const trailer = findBestTrailer(dataAny.results);
        if (trailer) return trailer.key;
    } else {
         console.error(`Failed to fetch any-language videos for ${contentType} ID ${id}.`);
    }

    return null; // No trailer found in any language
  } catch (error) {
    console.error(`Error fetching trailer for ID ${id}:`, error);
    return null;
  }
};

export const fetchGenres = async (contentType: ContentType): Promise<Genre[]> => {
    try {
        const response = await fetch(`${TMDB_API_BASE_URL}/genre/${contentType}/list?${BASE_PARAMS}`);
        if (!response.ok) throw new Error('Failed to fetch genres');
        const data = await response.json();
        return data.genres;
    } catch (error) {
        console.error('Error fetching genres:', error);
        return [];
    }
};

// "Где смотреть" — RU streaming providers from TMDB /watch/providers.
export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}
export interface WatchProviders {
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
  link: string | null;
}

export const fetchWatchProviders = async (
  id: number,
  contentType: ContentType,
): Promise<WatchProviders | null> => {
  try {
    const res = await fetch(`${TMDB_API_BASE_URL}/${contentType}/${id}/watch/providers`);
    if (!res.ok) return null;
    const data = await res.json();
    const ru = data?.results?.RU;
    if (!ru) return null;
    return {
      flatrate: ru.flatrate ?? [],
      rent: ru.rent ?? [],
      buy: ru.buy ?? [],
      link: ru.link ?? null,
    };
  } catch {
    return null;
  }
};

// "Похожие" — TMDB recommendations (CF-based, higher quality than /similar).
export const fetchRecommendations = async (
  id: number,
  contentType: ContentType,
): Promise<Movie[]> => {
  try {
    const res = await fetch(`${TMDB_API_BASE_URL}/${contentType}/${id}/recommendations?${BASE_PARAMS}&page=1`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).slice(0, 12).map((item: any) => ({
      ...item,
      title: item.title || item.name,
      contentType,
    }));
  } catch {
    return [];
  }
};

// Search by title across both movies and TV via /search/multi.
export interface SearchResult {
  id: number;
  title: string;
  contentType: ContentType;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  overview: string;
}
export const searchTitles = async (query: string): Promise<SearchResult[]> => {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `${TMDB_API_BASE_URL}/search/multi?${BASE_PARAMS}&query=${encodeURIComponent(query)}&page=1`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? [])
      .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
      .slice(0, 10)
      .map((r: any) => ({
        id: r.id,
        title: r.title || r.name,
        contentType: (r.media_type === 'tv' ? ContentType.TV : ContentType.Movie),
        poster_path: r.poster_path,
        release_date: r.release_date,
        first_air_date: r.first_air_date,
        vote_average: r.vote_average ?? 0,
        overview: r.overview ?? '',
      }));
  } catch {
    return [];
  }
};