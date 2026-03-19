import { describe, it, expect } from "vitest";
import {
   sanitizeUsername,
   validatePasswordChange,
   validateUsername,
} from "../profileInput";

describe("profileInput logic", () => {
   it("sanitizes username", () => {
      expect(sanitizeUsername("Joao.Vitor_123!!")).toBe("joaovitor_123");
   });

   it("validates username length", () => {
      expect(validateUsername("ab")).toEqual({
         valid: false,
         error: "O nome de usuário deve ter pelo menos 3 caracteres.",
      });

      expect(validateUsername("abc")).toEqual({ valid: true, error: null });
   });

   it("validates password change rules", () => {
      expect(validatePasswordChange("", "123456", "123456")).toEqual({
         valid: false,
         error: "Digite a sua senha atual para continuar.",
      });

      expect(validatePasswordChange("old", "123456", "12345")).toEqual({
         valid: false,
         error: "As novas senhas não coincidem!",
      });

      expect(validatePasswordChange("old", "123", "123")).toEqual({
         valid: false,
         error: "A nova senha deve ter pelo menos 6 caracteres.",
      });

      expect(validatePasswordChange("old", "123456", "123456")).toEqual({
         valid: true,
         error: null,
      });
   });
});
