import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
   getCurrentSessionMock,
   fetchProfileByUserIdMock,
   subscribeToAuthStateChangesMock,
   signOutCurrentUserMock,
   unsubscribeMock,
} = vi.hoisted(() => ({
   getCurrentSessionMock: vi.fn(),
   fetchProfileByUserIdMock: vi.fn(),
   subscribeToAuthStateChangesMock: vi.fn(),
   signOutCurrentUserMock: vi.fn(),
   unsubscribeMock: vi.fn(),
}));

vi.mock("../../services/authService", () => ({
   getCurrentSession: getCurrentSessionMock,
   fetchProfileByUserId: fetchProfileByUserIdMock,
   subscribeToAuthStateChanges: subscribeToAuthStateChangesMock,
   signOutCurrentUser: signOutCurrentUserMock,
}));

import { useAuthState } from "../useAuthState";

describe("useAuthState", () => {
   beforeEach(() => {
      vi.clearAllMocks();
      subscribeToAuthStateChangesMock.mockReturnValue(unsubscribeMock);
   });

   it("loads session profile on startup", async () => {
      getCurrentSessionMock.mockResolvedValue({ user: { id: "u1" } });
      fetchProfileByUserIdMock.mockResolvedValue({ username: "joao", avatar_url: "avatar.png" });

      const { result } = renderHook(() => useAuthState());

      await waitFor(() => {
         expect(result.current.loading).toBe(false);
         expect(result.current.username).toBe("joao");
         expect(result.current.avatarUrl).toBe("avatar.png");
      });
   });

   it("reacts to auth state changes", async () => {
      let authListener: ((session: { user: { id: string } } | null) => void) | undefined;

      getCurrentSessionMock.mockResolvedValue(null);
      fetchProfileByUserIdMock.mockResolvedValue({ username: "maria", avatar_url: null });
      subscribeToAuthStateChangesMock.mockImplementation((callback: (session: { user: { id: string } } | null) => void) => {
         authListener = callback;
         return unsubscribeMock;
      });

      const { result } = renderHook(() => useAuthState());

      await waitFor(() => {
         expect(result.current.loading).toBe(false);
         expect(result.current.username).toBe("");
      });

      act(() => {
         authListener?.({ user: { id: "u2" } });
      });

      await waitFor(() => {
         expect(fetchProfileByUserIdMock).toHaveBeenCalledWith("u2");
         expect(result.current.username).toBe("maria");
      });

      act(() => {
         authListener?.(null);
      });

      await waitFor(() => {
         expect(result.current.username).toBe("");
         expect(result.current.avatarUrl).toBeNull();
      });
   });

   it("logout delegates to auth service", async () => {
      getCurrentSessionMock.mockResolvedValue(null);
      signOutCurrentUserMock.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthState());

      await act(async () => {
         await result.current.logout();
      });

      expect(signOutCurrentUserMock).toHaveBeenCalled();
   });
});
