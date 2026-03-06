import { describe, it, expect, vi } from "vitest";
import { createImage } from "@/utils/cropImage";
import getCroppedImg from "@/utils/cropImage";

describe("createImage", () => {
   it("resolve com um HTMLImageElement quando a imagem carrega", async () => {
      const OriginalImage = globalThis.Image;
      
      let loadCallback: (() => void) | undefined;
      
      // Use a real class so `new Image()` works
      globalThis.Image = class MockImage {
         addEventListener = vi.fn((event: string, cb: () => void) => {
            if (event === "load") loadCallback = cb;
         });
         setAttribute = vi.fn();
         src = "";
      } as unknown as typeof Image;

      const promise = createImage("https://example.com/image.jpg");
      loadCallback?.();
      
      const result = await promise;
      expect(result.setAttribute).toHaveBeenCalledWith("crossOrigin", "anonymous");
      
      globalThis.Image = OriginalImage;
   });

   it("rejeita quando a imagem falha ao carregar", async () => {
      const OriginalImage = globalThis.Image;
      const mockError = new Event("error");

      globalThis.Image = class MockImage {
         addEventListener = vi.fn((event: string, cb: (e: Event) => void) => {
            if (event === "error") setTimeout(() => cb(mockError), 0);
         });
         setAttribute = vi.fn();
         src = "";
      } as unknown as typeof Image;

      await expect(createImage("https://example.com/bad.jpg")).rejects.toBeDefined();
      globalThis.Image = OriginalImage;
   });
});

describe("getCroppedImg", () => {
   it("retorna null quando canvas context não está disponível", async () => {
      const OriginalImage = globalThis.Image;
      
      let loadCallback: (() => void) | undefined;
      
      globalThis.Image = class MockImage {
         addEventListener = vi.fn((event: string, cb: () => void) => {
            if (event === "load") loadCallback = cb;
         });
         setAttribute = vi.fn();
         src = "";
      } as unknown as typeof Image;

      const mockCanvas = {
         getContext: vi.fn(() => null),
         width: 0,
         height: 0,
      };
      vi.spyOn(document, "createElement").mockReturnValue(mockCanvas as unknown as HTMLCanvasElement);

      const promise = getCroppedImg("https://example.com/image.jpg", {
         x: 0, y: 0, width: 100, height: 100,
      });

      loadCallback?.();
      const result = await promise;

      expect(result).toBeNull();
      
      globalThis.Image = OriginalImage;
   });
});
