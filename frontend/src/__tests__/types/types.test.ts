import { describe, it, expect } from "vitest";
import type {
   MovieData,
   CustomList,
   ListCollaborator,
   ListReview,
   AppNotification,
   FriendProfile,
   Friendship,
   TmdbProvider,
   TmdbSearchResult,
   TmdbGenre,
   TmdbCrew,
   TmdbCast,
   TmdbCountry,
   ListMovie,
} from "@/types";

describe("Types - Validação de estrutura", () => {
   it("MovieData - permite rating null para watchlist", () => {
      const movie: MovieData = {
         id: 1,
         tmdb_id: 100,
         rating: null,
         review: "",
         recommended: "",
         created_at: "2025-01-01",
         status: "watchlist",
      };
      expect(movie.rating).toBeNull();
      expect(movie.status).toBe("watchlist");
   });

   it("MovieData - campos opcionais podem ser undefined", () => {
      const movie: MovieData = {
         id: 1,
         tmdb_id: 100,
         rating: 8,
         review: "Bom",
         recommended: "Vale a pena",
         created_at: "2025-01-01",
      };
      expect(movie.title).toBeUndefined();
      expect(movie.poster_path).toBeUndefined();
      expect(movie.genres).toBeUndefined();
   });

   it("CustomList - aceita todos os tipos de lista", () => {
      const types: CustomList["type"][] = ["private", "partial_shared", "full_shared"];
      types.forEach(type => {
         const list: CustomList = {
            id: "1",
            owner_id: "user-1",
            name: "Lista",
            type,
            created_at: "2025-01-01",
         };
         expect(list.type).toBe(type);
      });
   });

   it("ListCollaborator - aceita status pending e accepted", () => {
      const statuses: ListCollaborator["status"][] = ["pending", "accepted"];
      statuses.forEach(status => {
         const collab: ListCollaborator = {
            id: "1",
            list_id: "l1",
            user_id: "u1",
            role: "member",
            status,
            created_at: "2025-01-01",
         };
         expect(collab.status).toBe(status);
      });
   });

   it("ListCollaborator - aceita roles owner e member", () => {
      const roles: ListCollaborator["role"][] = ["owner", "member"];
      roles.forEach(role => {
         const collab: ListCollaborator = {
            id: "1",
            list_id: "l1",
            user_id: "u1",
            role,
            status: "accepted",
            created_at: "2025-01-01",
         };
         expect(collab.role).toBe(role);
      });
   });

   it("ListReview - user_id pode ser null (full_shared)", () => {
      const review: ListReview = {
         id: "1",
         list_id: "l1",
         tmdb_id: 100,
         user_id: null,
         rating: 8,
         review: "Grupo review",
         created_at: "2025-01-01",
      };
      expect(review.user_id).toBeNull();
   });

   it("AppNotification - aceita todos os tipos", () => {
      const types: AppNotification["type"][] = ["friend_request", "list_invite", "movie_added", "general"];
      types.forEach(type => {
         const notif: AppNotification = {
            id: "1",
            user_id: "u1",
            type,
            message: "Teste",
            is_read: false,
            created_at: "2025-01-01",
         };
         expect(notif.type).toBe(type);
      });
   });

   it("Friendship - aceita status pending, accepted, declined", () => {
      const statuses: Friendship["status"][] = ["pending", "accepted", "declined"];
      statuses.forEach(status => {
         const friendship: Friendship = {
            id: "1",
            requester_id: "u1",
            receiver_id: "u2",
            status,
            created_at: "2025-01-01",
         };
         expect(friendship.status).toBe(status);
      });
   });

   it("FriendProfile - inclui is_requester", () => {
      const fp: FriendProfile = {
         friendship_id: "1",
         user_id: "u1",
         username: "john",
         avatar_url: null,
         status: "accepted",
         is_requester: true,
      };
      expect(fp.is_requester).toBe(true);
   });

   it("TmdbProvider - tem campos obrigatórios", () => {
      const provider: TmdbProvider = {
         provider_id: 1,
         provider_name: "Netflix",
         logo_path: "/logo.png",
      };
      expect(provider.provider_name).toBe("Netflix");
   });

   it("TmdbSearchResult - poster_path pode ser null", () => {
      const result: TmdbSearchResult = {
         id: 1,
         title: "Teste",
         release_date: "2025-01-01",
         poster_path: null,
      };
      expect(result.poster_path).toBeNull();
   });

   it("TmdbGenre - contém id e name", () => {
      const genre: TmdbGenre = { id: 28, name: "Ação" };
      expect(genre.name).toBe("Ação");
   });

   it("TmdbCrew / TmdbCast / TmdbCountry - campos básicos", () => {
      const crew: TmdbCrew = { job: "Director", name: "Nolan" };
      const cast: TmdbCast = { name: "DiCaprio" };
      const country: TmdbCountry = { iso_3166_1: "BR", name: "Brasil" };

      expect(crew.job).toBe("Director");
      expect(cast.name).toBe("DiCaprio");
      expect(country.iso_3166_1).toBe("BR");
   });

   it("ListMovie - propriedades obrigatórias", () => {
      const lm: ListMovie = {
         list_id: "l1",
         tmdb_id: 100,
         added_by: "u1",
         created_at: "2025-01-01",
      };
      expect(lm.list_id).toBe("l1");
      expect(lm.tmdb_id).toBe(100);
   });
});
