import { beforeEach, describe, expect, it, vi } from "vitest";

const {
   fromMock,
   selectMock,
   eqMock,
   ilikeMock,
   singleMock,
   maybeSingleMock,
   getSessionMock,
   onAuthStateChangeMock,
   signOutMock,
   signUpMock,
   signInWithPasswordMock,
   resetPasswordForEmailMock,
   updateUserMock,
   rpcMock,
   unsubscribeMock,
} = vi.hoisted(() => ({
   fromMock: vi.fn(),
   selectMock: vi.fn(),
   eqMock: vi.fn(),
   ilikeMock: vi.fn(),
   singleMock: vi.fn(),
   maybeSingleMock: vi.fn(),
   getSessionMock: vi.fn(),
   onAuthStateChangeMock: vi.fn(),
   signOutMock: vi.fn(),
   signUpMock: vi.fn(),
   signInWithPasswordMock: vi.fn(),
   resetPasswordForEmailMock: vi.fn(),
   updateUserMock: vi.fn(),
   rpcMock: vi.fn(),
   unsubscribeMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
   supabase: {
      from: fromMock,
      rpc: rpcMock,
      auth: {
         getSession: getSessionMock,
         onAuthStateChange: onAuthStateChangeMock,
         signOut: signOutMock,
         signUp: signUpMock,
         signInWithPassword: signInWithPasswordMock,
         resetPasswordForEmail: resetPasswordForEmailMock,
         updateUser: updateUserMock,
      },
   },
}));

import {
   fetchProfileByUserId,
   getCurrentSession,
   isUsernameTaken,
   sendResetPasswordLink,
   signInWithEmailPassword,
   signOutCurrentUser,
   subscribeToAuthStateChanges,
} from "../authService";

describe("authService", () => {
   beforeEach(() => {
      vi.clearAllMocks();

      selectMock.mockReturnValue({ eq: eqMock, ilike: ilikeMock });
      eqMock.mockReturnValue({ single: singleMock, eq: eqMock, maybeSingle: maybeSingleMock });
      ilikeMock.mockReturnValue({ maybeSingle: maybeSingleMock });
      fromMock.mockReturnValue({ select: selectMock });

      onAuthStateChangeMock.mockReturnValue({
         data: { subscription: { unsubscribe: unsubscribeMock } },
      });
   });

   it("fetches profile by user id", async () => {
      singleMock.mockResolvedValue({ data: { username: "jv", avatar_url: null }, error: null });
      const profile = await fetchProfileByUserId("u1");
      expect(profile).toEqual({ username: "jv", avatar_url: null });
   });

   it("gets current session", async () => {
      getSessionMock.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
      const session = await getCurrentSession();
      expect(session?.user.id).toBe("u1");
   });

   it("subscribes and unsubscribes auth state changes", () => {
      const unsubscribe = subscribeToAuthStateChanges(() => undefined);
      expect(onAuthStateChangeMock).toHaveBeenCalled();
      unsubscribe();
      expect(unsubscribeMock).toHaveBeenCalled();
   });

   it("checks if username is taken", async () => {
      maybeSingleMock.mockResolvedValue({ data: { username: "taken" }, error: null });
      const taken = await isUsernameTaken("taken");
      expect(taken).toBe(true);
   });

   it("signs in with email and password", async () => {
      signInWithPasswordMock.mockResolvedValue({ error: null });
      await expect(signInWithEmailPassword("a@a.com", "123456")).resolves.toBeUndefined();
   });

   it("sends reset password link", async () => {
      resetPasswordForEmailMock.mockResolvedValue({ error: null });
      await expect(sendResetPasswordLink("a@a.com", "http://localhost/reset-password")).resolves.toBeUndefined();
   });

   it("signs out current user", async () => {
      signOutMock.mockResolvedValue({ error: null });
      await expect(signOutCurrentUser()).resolves.toBeUndefined();
   });
});
