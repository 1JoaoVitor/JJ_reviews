export interface TmdbCrew {
   job: string;
   name: string;
}

export interface TmdbCast {
   name: string;
}

export interface TmdbCountry {
   iso_3166_1: string;
   name: string;
}

export interface MovieData {
   id: number;
   tmdb_id: number;
   rating: number;
   review: string;
   recommended: string;
   created_at: string;
   title?: string;
   poster_path?: string;
   release_date?: string;
   overview?: string;
   director?: string;
   cast?: string[];
   countries?: string[];
   isNational?: boolean;
   isOscar?: boolean;
}

export interface TmdbSearchResult {
   id: number;
   title: string;
   release_date: string;
   poster_path: string | null;
}
