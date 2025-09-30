
import { TMDB_API_KEY, TMDB_API_BASE_URL } from '../constants';
import type { Movie, VideosResponse, Genre, FilterState } from '../types';
import { ContentType, VideoResult } from '../types';

const BASE_PARAMS = `api_key=${TMDB_API_KEY}&language=ru-RU`;

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
    const responseAny = await fetch(`${TMDB_API_BASE_URL}/${contentType}/${id}/videos?api_key=${TMDB_API_KEY}`);
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
