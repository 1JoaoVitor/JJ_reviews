import { describe, it, expect } from "vitest";
import { shouldRefreshProfileOnPath, toAuthProfile } from "../profileSync";

describe("profileSync logic", () => {
   it("refreshes profile on home and battle routes", () => {
      expect(shouldRefreshProfileOnPath("/")).toBe(true);
      expect(shouldRefreshProfileOnPath("/batalha")).toBe(true);
   });

   it("does not refresh profile on external pages", () => {
      expect(shouldRefreshProfileOnPath("/perfil")).toBe(false);
      expect(shouldRefreshProfileOnPath("/support")).toBe(false);
      expect(shouldRefreshProfileOnPath("/perfil/alguem")).toBe(false);
   });

   it("normalizes profile payload from Supabase", () => {
      expect(toAuthProfile({ username: "joao", avatar_url: "http://img" })).toEqual({
         username: "joao",
         avatarUrl: "http://img",
      });
      expect(toAuthProfile({ username: null, avatar_url: null })).toEqual({
         username: "",
         avatarUrl: null,
      });
      expect(toAuthProfile(null)).toEqual({
         username: "",
         avatarUrl: null,
      });
   });
});
