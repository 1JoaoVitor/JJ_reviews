import { describe, it, expect } from "vitest";
import {
   buildSupportEmailPayload,
   mapSupportEmailApiResult,
   mapSupportEmailUnknownError,
   validateSupportMessage,
} from "../sendSupportEmail";

describe("support logic", () => {
   it("validates empty message", () => {
      expect(validateSupportMessage("   ")).toEqual({
         success: false,
         error: "A mensagem não pode estar vazia.",
      });
   });

   it("builds payload with defaults", () => {
      const payload = buildSupportEmailPayload("key", "Ajuda", "bug");
      expect(payload.access_key).toBe("key");
      expect(payload.email).toBe("anonimo@jjreviews.com");
      expect(payload.subject).toContain("BUG");
   });

   it("maps success and failure api responses", () => {
      expect(mapSupportEmailApiResult(true, { success: true })).toEqual({
         success: true,
         error: null,
      });

      expect(mapSupportEmailApiResult(false, { success: false, message: "bad request" })).toEqual({
         success: false,
         error: "Falha ao enviar email: bad request",
      });
   });

   it("maps unknown error", () => {
      expect(mapSupportEmailUnknownError(new Error("timeout"))).toEqual({
         success: false,
         error: "Falha ao enviar email: timeout",
      });
   });
});
