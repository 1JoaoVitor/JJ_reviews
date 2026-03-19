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
   getEmailByUsername,
   isUsernameTaken,
   sendResetPasswordLink,
   signInWithEmailPassword,
   signUpWithUsername,
   signOutCurrentUser,
   subscribeToAuthStateChanges,
   updateCurrentUserPassword,
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

   it("returns false when username is not taken", async () => {
      maybeSingleMock.mockResolvedValue({ data: null, error: null });
      const taken = await isUsernameTaken("free_user");
      expect(taken).toBe(false);
   });

   it("signs in with email and password", async () => {
      signInWithPasswordMock.mockResolvedValue({ error: null });
      await expect(signInWithEmailPassword("a@a.com", "123456")).resolves.toBeUndefined();
   });

   it("signs up with username", async () => {
      signUpMock.mockResolvedValue({ error: null });
      await expect(signUpWithUsername("a@a.com", "123456", "jv")).resolves.toBeUndefined();
   });

   it("returns email by username", async () => {
      rpcMock.mockResolvedValue({ data: "mail@site.com", error: null });
      await expect(getEmailByUsername("jv")).resolves.toBe("mail@site.com");
   });

   it("returns null when username email is not found", async () => {
      rpcMock.mockResolvedValue({ data: null, error: null });
      await expect(getEmailByUsername("ghost")).resolves.toBeNull();
   });

   it("sends reset password link", async () => {
      resetPasswordForEmailMock.mockResolvedValue({ error: null });
      await expect(sendResetPasswordLink("a@a.com", "http://localhost/reset-password")).resolves.toBeUndefined();
   });

   it("updates current user password", async () => {
      updateUserMock.mockResolvedValue({ error: null });
      await expect(updateCurrentUserPassword("abcdef")).resolves.toBeUndefined();
   });

   it("signs out current user", async () => {
      signOutMock.mockResolvedValue({ error: null });
      await expect(signOutCurrentUser()).resolves.toBeUndefined();
   });

   it("throws when sign out fails", async () => {
      signOutMock.mockResolvedValue({ error: new Error("fail") });
      await expect(signOutCurrentUser()).rejects.toThrow("fail");
   });
});
