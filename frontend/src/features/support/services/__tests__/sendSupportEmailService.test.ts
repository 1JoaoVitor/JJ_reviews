import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendSupportEmail } from "../sendSupportEmailService";

describe("sendSupportEmailService", () => {
   const originalFetch = globalThis.fetch;

   beforeEach(() => {
      vi.restoreAllMocks();
   });

   afterEach(() => {
      globalThis.fetch = originalFetch;
   });

   it("returns validation error for empty message", async () => {
      const result = await sendSupportEmail("key", "   ", "bug");
      expect(result).toEqual({
         success: false,
         error: "A mensagem não pode estar vazia.",
      });
   });

   it("returns success when web3forms request succeeds", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
         ok: true,
         json: async () => ({ success: true }),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await sendSupportEmail("abc", "Erro no login", "bug", "user@mail.com", "u-1");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true, error: null });
   });

   it("returns mapped error on api rejection", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
         ok: false,
         json: async () => ({ success: false, message: "bad request" }),
      }) as unknown as typeof fetch;

      const result = await sendSupportEmail("abc", "Teste", "other");

      expect(result).toEqual({
         success: false,
         error: "Falha ao enviar email: bad request",
      });
   });

   it("returns mapped error on thrown exception", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch;

      const result = await sendSupportEmail("abc", "Teste", "other");

      expect(result).toEqual({
         success: false,
         error: "Falha ao enviar email: network",
      });
   });
});
