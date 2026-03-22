import { beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: fromMock,
  },
}));

import {
  deleteDiaryEntry,
  getDiaryEntries,
  getDiaryPreference,
  getFriendDiaryActivities,
  notifyFriendsDiaryActivity,
  saveDiaryEntry,
  updateDiaryPreference,
} from "../diaryService";

describe("diaryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getDiaryEntries retorna lista ordenada", async () => {
    const limitMock = vi.fn().mockResolvedValue({
      data: [
        { id: "d1", user_id: "u1", tmdb_id: 603, watched_date: "2026-03-20", created_at: "2026-03-21" },
      ],
      error: null,
    });
    const orderMock = vi.fn(() => ({ order: orderMock, limit: limitMock }));
    const eqMock = vi.fn(() => ({ order: orderMock, limit: limitMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));

    fromMock.mockImplementation((table: string) => {
      if (table === "diary_entries") {
        return { select: selectMock };
      }
      throw new Error(`Tabela inesperada: ${table}`);
    });

    const result = await getDiaryEntries("u1", 10);

    expect(result).toHaveLength(1);
    expect(result[0].tmdb_id).toBe(603);
    expect(limitMock).toHaveBeenCalledWith(10);
  });

  it("saveDiaryEntry faz upsert e nao quebra se notificar amigos falhar", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const friendshipOrMock = vi.fn().mockResolvedValue({ data: null, error: new Error("friendship query failed") });
    const friendshipEqMock = vi.fn(() => ({ or: friendshipOrMock }));
    const friendshipSelectMock = vi.fn(() => ({ eq: friendshipEqMock }));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    fromMock.mockImplementation((table: string) => {
      if (table === "diary_entries") {
        return { upsert: upsertMock };
      }
      if (table === "friendships") {
        return { select: friendshipSelectMock };
      }
      throw new Error(`Tabela inesperada: ${table}`);
    });

    await expect(saveDiaryEntry("u1", 603, "2026-03-22")).resolves.toBeUndefined();

    expect(upsertMock).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("notifyFriendsDiaryActivity envia apenas para amigos opt-in e formata data DD/MM/YYYY", async () => {
    const friendshipOrMock = vi.fn().mockResolvedValue({
      data: [
        { requester_id: "sender", receiver_id: "friend-off" },
        { requester_id: "friend-on", receiver_id: "sender" },
      ],
      error: null,
    });
    const friendshipEqMock = vi.fn(() => ({ or: friendshipOrMock }));
    const friendshipSelectMock = vi.fn(() => ({ eq: friendshipEqMock }));

    const prefInMock = vi.fn().mockResolvedValue({
      data: [{ user_id: "friend-off", notify_friend_activity: false }],
      error: null,
    });
    const prefSelectMock = vi.fn(() => ({ in: prefInMock }));

    const insertMock = vi.fn().mockResolvedValue({ error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === "friendships") {
        return { select: friendshipSelectMock };
      }
      if (table === "diary_preferences") {
        return { select: prefSelectMock };
      }
      if (table === "notifications") {
        return { insert: insertMock };
      }
      throw new Error(`Tabela inesperada: ${table}`);
    });

    await expect(notifyFriendsDiaryActivity("sender", "2026-03-22")).resolves.toBeUndefined();

    expect(insertMock).toHaveBeenCalledTimes(1);
    const payload = insertMock.mock.calls[0][0] as Array<{ user_id: string; message: string }>;
    expect(payload).toHaveLength(1);
    expect(payload[0].user_id).toBe("friend-on");
    expect(payload[0].message).toContain("22/03/2026");
  });

  it("notifyFriendsDiaryActivity envia para todos quando falha lookup de preferencias", async () => {
    const friendshipOrMock = vi.fn().mockResolvedValue({
      data: [{ requester_id: "sender", receiver_id: "friend-a" }],
      error: null,
    });
    const friendshipEqMock = vi.fn(() => ({ or: friendshipOrMock }));
    const friendshipSelectMock = vi.fn(() => ({ eq: friendshipEqMock }));

    const prefInMock = vi.fn().mockResolvedValue({ data: null, error: new Error("prefs-down") });
    const prefSelectMock = vi.fn(() => ({ in: prefInMock }));

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    fromMock.mockImplementation((table: string) => {
      if (table === "friendships") return { select: friendshipSelectMock };
      if (table === "diary_preferences") return { select: prefSelectMock };
      if (table === "notifications") return { insert: insertMock };
      throw new Error(`Tabela inesperada: ${table}`);
    });

    await expect(notifyFriendsDiaryActivity("sender", "2026-03-22")).resolves.toBeUndefined();

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("deleteDiaryEntry remove entrada do usuario", async () => {
    const eqUserMock = vi.fn().mockResolvedValue({ error: null });
    const eqIdMock = vi.fn(() => ({ eq: eqUserMock }));
    const deleteMock = vi.fn(() => ({ eq: eqIdMock }));

    fromMock.mockImplementation((table: string) => {
      if (table === "diary_entries") {
        return { delete: deleteMock };
      }
      throw new Error(`Tabela inesperada: ${table}`);
    });

    await expect(deleteDiaryEntry("u1", "entry-1")).resolves.toBeUndefined();
    expect(deleteMock).toHaveBeenCalled();
  });

  it("getDiaryPreference retorna defaults quando nao ha registro", async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));

    fromMock.mockImplementation((table: string) => {
      if (table === "diary_preferences") {
        return { select: selectMock };
      }
      throw new Error(`Tabela inesperada: ${table}`);
    });

    const pref = await getDiaryPreference("u-default");

    expect(pref).toEqual({
      user_id: "u-default",
      share_diary_activity: true,
      notify_friend_activity: false,
    });
  });

  it("getDiaryPreference retorna defaults quando consulta falha", async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: new Error("db-down") });
    const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));

    fromMock.mockImplementation((table: string) => {
      if (table === "diary_preferences") return { select: selectMock };
      throw new Error(`Tabela inesperada: ${table}`);
    });

    const pref = await getDiaryPreference("u-fallback");
    expect(pref).toEqual({
      user_id: "u-fallback",
      share_diary_activity: true,
      notify_friend_activity: false,
    });
  });

  it("updateDiaryPreference faz upsert por user_id", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === "diary_preferences") {
        return { upsert: upsertMock };
      }
      throw new Error(`Tabela inesperada: ${table}`);
    });

    await expect(updateDiaryPreference("u1", { notify_friend_activity: true })).resolves.toBeUndefined();
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", notify_friend_activity: true }),
      { onConflict: "user_id" }
    );
  });

  it("getFriendDiaryActivities retorna feed enriquecido com perfil e nota", async () => {
    const friendshipOrMock = vi.fn().mockResolvedValue({
      data: [{ requester_id: "u1", receiver_id: "f1" }],
      error: null,
    });
    const friendshipEqMock = vi.fn(() => ({ or: friendshipOrMock }));
    const friendshipSelectMock = vi.fn(() => ({ eq: friendshipEqMock }));

    const diaryLimitMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: "d1",
          user_id: "f1",
          tmdb_id: 603,
          watched_date: "2026-03-20",
          created_at: "2026-03-21",
        },
      ],
      error: null,
    });
    const diaryOrderMock = vi.fn(() => ({ order: diaryOrderMock, limit: diaryLimitMock }));
    const diaryInMock = vi.fn(() => ({ order: diaryOrderMock, limit: diaryLimitMock }));
    const diarySelectMock = vi.fn(() => ({ in: diaryInMock }));

    const prefInMock = vi.fn().mockResolvedValue({
      data: [{ user_id: "f1", share_diary_activity: true }],
      error: null,
    });
    const prefSelectMock = vi.fn(() => ({ in: prefInMock }));

    const profileInMock = vi.fn().mockResolvedValue({
      data: [{ id: "f1", username: "amigo", avatar_url: "a.png" }],
      error: null,
    });
    const profileSelectMock = vi.fn(() => ({ in: profileInMock }));

    const reviewInSecondMock = vi.fn().mockResolvedValue({
      data: [{ user_id: "f1", tmdb_id: 603, rating: 4.5 }],
      error: null,
    });
    const reviewInFirstMock = vi.fn(() => ({ in: reviewInSecondMock }));
    const reviewSelectMock = vi.fn(() => ({ in: reviewInFirstMock }));

    fromMock.mockImplementation((table: string) => {
      if (table === "friendships") {
        return { select: friendshipSelectMock };
      }
      if (table === "diary_entries") {
        return { select: diarySelectMock };
      }
      if (table === "diary_preferences") {
        return { select: prefSelectMock };
      }
      if (table === "profiles") {
        return { select: profileSelectMock };
      }
      if (table === "reviews") {
        return { select: reviewSelectMock };
      }
      throw new Error(`Tabela inesperada: ${table}`);
    });

    const activities = await getFriendDiaryActivities("u1", 20);

    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      friend_id: "f1",
      friend_username: "amigo",
      friend_avatar_url: "a.png",
      rating: 4.5,
      tmdb_id: 603,
    });
  });

  it("getFriendDiaryActivities retorna vazio quando usuario nao possui amigos", async () => {
    const friendshipOrMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const friendshipEqMock = vi.fn(() => ({ or: friendshipOrMock }));
    const friendshipSelectMock = vi.fn(() => ({ eq: friendshipEqMock }));

    fromMock.mockImplementation((table: string) => {
      if (table === "friendships") return { select: friendshipSelectMock };
      throw new Error(`Tabela inesperada: ${table}`);
    });

    const activities = await getFriendDiaryActivities("u-sem-amigos", 20);
    expect(activities).toEqual([]);
  });

  it("getFriendDiaryActivities usa fallback de perfil/rating quando dados nao existem", async () => {
    const friendshipOrMock = vi.fn().mockResolvedValue({
      data: [{ requester_id: "u1", receiver_id: "f2" }],
      error: null,
    });
    const friendshipEqMock = vi.fn(() => ({ or: friendshipOrMock }));
    const friendshipSelectMock = vi.fn(() => ({ eq: friendshipEqMock }));

    const diaryLimitMock = vi.fn().mockResolvedValue({
      data: [{ id: "d2", user_id: "f2", tmdb_id: 27205, watched_date: "2026-03-20", created_at: "2026-03-21" }],
      error: null,
    });
    const diaryOrderMock = vi.fn(() => ({ order: diaryOrderMock, limit: diaryLimitMock }));
    const diaryInMock = vi.fn(() => ({ order: diaryOrderMock, limit: diaryLimitMock }));
    const diarySelectMock = vi.fn(() => ({ in: diaryInMock }));

    const prefInMock = vi.fn().mockRejectedValue(new Error("prefs-timeout"));
    const prefSelectMock = vi.fn(() => ({ in: prefInMock }));

    const profileInMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const profileSelectMock = vi.fn(() => ({ in: profileInMock }));

    const reviewInSecondMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const reviewInFirstMock = vi.fn(() => ({ in: reviewInSecondMock }));
    const reviewSelectMock = vi.fn(() => ({ in: reviewInFirstMock }));

    fromMock.mockImplementation((table: string) => {
      if (table === "friendships") return { select: friendshipSelectMock };
      if (table === "diary_entries") return { select: diarySelectMock };
      if (table === "diary_preferences") return { select: prefSelectMock };
      if (table === "profiles") return { select: profileSelectMock };
      if (table === "reviews") return { select: reviewSelectMock };
      throw new Error(`Tabela inesperada: ${table}`);
    });

    const activities = await getFriendDiaryActivities("u1", 20);

    expect(activities).toHaveLength(1);
    expect(activities[0].friend_username).toBe("usuario");
    expect(activities[0].friend_avatar_url).toBeNull();
    expect(activities[0].rating).toBeNull();
  });
});
