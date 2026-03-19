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
   location?: string;
   runtime?: number;
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
   list_type?: "private" | "partial_shared" | "full_shared";
   list_average_rating?: number;
   list_average_recommended?: string;
   list_group_reviews?: {
      user_id?: string | null;
      rating?: number;
      review?: string;
      recommended?: string;
      user?: { username: string; avatar_url: string | null };
   }[];
   attachment_url?: string | null;
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


export interface AppNotification {
   id: string;
   user_id: string;
   sender_id?: string;
   reference_id?: string;
   type: "friend_request" | "list_invite" | "movie_added" | "general";
   message: string;
   is_read: boolean;
   created_at: string;
   sender?: {
      username: string;
      avatar_url: string;
   };
}

export interface ListMovie {
   list_id: string;
   tmdb_id: number;
   added_by: string;
   created_at: string;
}

export interface CustomList {
   id: string;
   owner_id: string;
   name: string;
   description?: string;
   type: "private" | "partial_shared" | "full_shared"; 
   created_at: string;
   movie_count?: number; 
   has_rating?: boolean;
   rating_type?: "manual" | "average" | null;
   manual_rating?: number | null;
   auto_sync?: boolean;
   likes_count?: number;
   is_liked?: boolean;
}

export interface ListCollaborator {
   id: string;
   list_id: string;
   user_id: string;
   role: "owner" | "member";
   status: "pending" | "accepted";
   created_at: string;
   user?: {
      username: string;
      avatar_url: string;
   };
}

export interface ListReview {
   id: string;
   list_id: string;
   tmdb_id: number;
   user_id?: string | null;
   rating?: number;
   review?: string;
   created_at: string;
   user?: {
      username: string;
      avatar_url: string;
   };
}