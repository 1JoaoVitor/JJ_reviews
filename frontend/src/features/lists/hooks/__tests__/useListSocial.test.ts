import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DuplicateResult, ShareResult, ToggleLikeResult } from "../useListSocial";

const {
  toggleListLikeMock,
  cloneListServiceMock,
} = vi.hoisted(() => ({
  toggleListLikeMock: vi.fn(),
  cloneListServiceMock: vi.fn(),
}));

vi.mock("../../services/listSocialService", () => ({
  toggleListLike: toggleListLikeMock,
  cloneListService: cloneListServiceMock,
}));

import { useListSocial } from "../useListSocial";

describe("useListSocial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleToggleLike", () => {
    it("returns error when not authenticated", async () => {
      const { result } = renderHook(() =>
        useListSocial({
          listId: "list1",
          initialLikes: 5,
          isInitialLiked: false,
          ownerUsername: "joao",
          currentUserId: undefined,
        })
      );

      const response = await result.current.handleToggleLike();

      expect(response.success).toBe(false);
      expect(response.error).toBe("Usuário não autenticado.");
      expect(toggleListLikeMock).not.toHaveBeenCalled();
    });

    it("updates state optimistically and confirms via service", async () => {
      toggleListLikeMock.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useListSocial({
          listId: "list1",
          initialLikes: 5,
          isInitialLiked: false,
          ownerUsername: "joao",
          currentUserId: "user1",
        })
      );

      expect(result.current.isLiked).toBe(false);
      expect(result.current.likesCount).toBe(5);

      let response: ToggleLikeResult | undefined;
      await act(async () => {
        response = await result.current.handleToggleLike();
      });

      expect(result.current.isLiked).toBe(true);
      expect(result.current.likesCount).toBe(6);
      expect(response?.success).toBe(true);
      expect(toggleListLikeMock).toHaveBeenCalledWith("list1");
    });

    it("rolls back state on service failure", async () => {
      toggleListLikeMock.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() =>
        useListSocial({
          listId: "list1",
          initialLikes: 5,
          isInitialLiked: false,
          ownerUsername: "joao",
          currentUserId: "user1",
        })
      );

      let response: ToggleLikeResult | undefined;
      await act(async () => {
        response = await result.current.handleToggleLike();
      });

      expect(result.current.isLiked).toBe(false);
      expect(result.current.likesCount).toBe(5);
      expect(response?.success).toBe(false);
      expect(response?.error).toBe("Erro ao processar curtida.");
    });

    it("correctly toggles from liked to unliked", async () => {
      toggleListLikeMock.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useListSocial({
          listId: "list1",
          initialLikes: 10,
          isInitialLiked: true,
          ownerUsername: "joao",
          currentUserId: "user1",
        })
      );

      expect(result.current.likesCount).toBe(10);

      let response: ToggleLikeResult | undefined;
      await act(async () => {
        response = await result.current.handleToggleLike();
      });

      expect(result.current.isLiked).toBe(false);
      expect(result.current.likesCount).toBe(9);
      expect(response?.success).toBe(true);
    });
  });

  describe("handleShare", () => {
    it("successfully copies share URL to clipboard", async () => {
      const mockClipboard = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: mockClipboard },
      });

      const { result } = renderHook(() =>
        useListSocial({
          listId: "list1",
          initialLikes: 5,
          isInitialLiked: false,
          ownerUsername: "joao",
          currentUserId: "user1",
        })
      );

      let response: ShareResult | undefined;
      await act(async () => {
        response = await result.current.handleShare();
      });

      const expectedUrl = `${window.location.origin}/perfil/joao?aba=lists&listId=list1`;

      expect(response?.success).toBe(true);
      expect(response?.url).toBe(expectedUrl);
      expect(mockClipboard).toHaveBeenCalledWith(expectedUrl);
    });

    it("returns error when clipboard API fails but includes URL", async () => {
      const mockClipboard = vi
        .fn()
        .mockRejectedValue(new Error("Clipboard denied"));
      Object.assign(navigator, {
        clipboard: { writeText: mockClipboard },
      });

      const { result } = renderHook(() =>
        useListSocial({
          listId: "list1",
          initialLikes: 5,
          isInitialLiked: false,
          ownerUsername: "joao",
          currentUserId: "user1",
        })
      );

      let response: ShareResult | undefined;
      await act(async () => {
        response = await result.current.handleShare();
      });

      const expectedUrl = `${window.location.origin}/perfil/joao?aba=lists&listId=list1`;

      expect(response?.success).toBe(false);
      expect(response?.url).toBe(expectedUrl);
      expect(response?.error).toBe("Erro ao compartilhar lista.");
    });
  });

  describe("handleDuplicate", () => {
    it("returns error when not authenticated", async () => {
      const { result } = renderHook(() =>
        useListSocial({
          listId: "list1",
          initialLikes: 5,
          isInitialLiked: false,
          ownerUsername: "joao",
          currentUserId: undefined,
        })
      );

      let response: DuplicateResult | undefined;
      await act(async () => {
        response = await result.current.handleDuplicate("My List");
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe("Usuário não autenticado.");
      expect(cloneListServiceMock).not.toHaveBeenCalled();
    });

    it("uses provided title and calls clone service", async () => {
      const mockNewList = { id: "list2", owner_id: "user1", name: "My List (Cópia)" };
      cloneListServiceMock.mockResolvedValue(mockNewList);

      const { result } = renderHook(() =>
        useListSocial({
          listId: "list1",
          initialLikes: 5,
          isInitialLiked: false,
          ownerUsername: "joao",
          currentUserId: "user1",
        })
      );

      let response: DuplicateResult | undefined;
      await act(async () => {
        response = await result.current.handleDuplicate("My List");
      });

      expect(response?.success).toBe(true);
      expect(response?.data).toEqual(mockNewList);
      expect(cloneListServiceMock).toHaveBeenCalledWith(
        "list1",
        "user1",
        "My List",
        "private",
        undefined
      );
    });

    it("accepts custom list type", async () => {
      const mockNewList = { id: "list2", owner_id: "user1", name: "My List (Cópia)" };
      cloneListServiceMock.mockResolvedValue(mockNewList);

      const { result } = renderHook(() =>
        useListSocial({
          listId: "list1",
          initialLikes: 5,
          isInitialLiked: false,
          ownerUsername: "joao",
          currentUserId: "user1",
        })
      );

      let response: DuplicateResult | undefined;
      await act(async () => {
        response = await result.current.handleDuplicate("My List", "partial_shared");
      });

      expect(cloneListServiceMock).toHaveBeenCalledWith(
        "list1",
        "user1",
        "My List",
        "partial_shared",
        undefined
      );
      expect(response?.success).toBe(true);
    });

    it("returns error on clone failure", async () => {
      cloneListServiceMock.mockRejectedValue(new Error("Clone failed"));

      const { result } = renderHook(() =>
        useListSocial({
          listId: "list1",
          initialLikes: 5,
          isInitialLiked: false,
          ownerUsername: "joao",
          currentUserId: "user1",
        })
      );

      let response: DuplicateResult | undefined;
      await act(async () => {
        response = await result.current.handleDuplicate("My List");
      });

      expect(response?.success).toBe(false);
      expect(response?.data).toBeNull();
      expect(response?.error).toBe("Erro ao duplicar a lista.");
    });

    it("ensures isActionLoading is reset to false in finally block", async () => {
      cloneListServiceMock.mockRejectedValue(new Error("Clone failed"));

      const { result } = renderHook(() =>
        useListSocial({
          listId: "list1",
          initialLikes: 5,
          isInitialLiked: false,
          ownerUsername: "joao",
          currentUserId: "user1",
        })
      );

      expect(result.current.isActionLoading).toBe(false);

      await act(async () => {
        await result.current.handleDuplicate("My List");
      });

      expect(result.current.isActionLoading).toBe(false);
    });
  });

  describe("hook interface", () => {
    it("returns all expected properties", () => {
      const { result } = renderHook(() =>
        useListSocial({
          listId: "list1",
          initialLikes: 5,
          isInitialLiked: false,
          ownerUsername: "joao",
          currentUserId: "user1",
        })
      );

      expect(result.current).toHaveProperty("isLiked");
      expect(result.current).toHaveProperty("likesCount");
      expect(result.current).toHaveProperty("isActionLoading");
      expect(result.current).toHaveProperty("handleToggleLike");
      expect(result.current).toHaveProperty("handleShare");
      expect(result.current).toHaveProperty("handleDuplicate");
    });
  });
});
