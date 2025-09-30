
export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  genre_ids: number[];
  genres?: Genre[];
  release_date?: string;
  first_air_date?: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface VideoResult {
  iso_639_1: string;
  iso_3166_1: string;
  name: string;
  key: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  published_at: string;
  id: string;
}

export interface VideosResponse {
  id: number;
  results: VideoResult[];
}

export enum ContentType {
    Movie = 'movie',
    TV = 'tv',
}

export interface FilterState {
    contentType: ContentType;
    genres: number[];
}
   