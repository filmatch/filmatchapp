export interface Movie {
  id: number;
  title: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids?: number[];
  tmdb_id: number;
  year: number;
  genres?: string[];
  runtime?: number;
  rating: number;
  director?: string;
  cast?: string[];
}

export interface MovieWithUserData extends Movie {
  userRating?: number;
  userStatus?: UserStatus;
}

export type UserStatus = 'watched' | 'watchlist' | null;