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
   rating: number | null;
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
   status?: "watched" | "watchlist";
   isNational?: boolean;
   isOscar?: boolean;
   genres?: string[];
   providers?: TmdbProvider[];
}

export interface TmdbProvider {
   provider_id: number;
   provider_name: string;
   logo_path: string;
}

export interface TmdbSearchResult {
   id: number;
   title: string;
   release_date: string;
   poster_path: string | null;
}

export interface TmdbGenre {
   id: number;
   name: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

// Tipagem para juntar a amizade com os dados do perfil do amigo
export interface FriendProfile {
  friendship_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  status: 'pending' | 'accepted' | 'declined';
  is_requester: boolean; 
}