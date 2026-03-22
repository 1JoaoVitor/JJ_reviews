import { supabase } from "@/lib/supabase";

export interface DiaryEntryRow {
  id: string;
  user_id: string;
  tmdb_id: number;
  watched_date: string;
  created_at: string;
}

export interface FriendDiaryActivityRow extends DiaryEntryRow {
  friend_username: string;
  friend_avatar_url: string | null;
  friend_id: string;
  rating: number | null;
}

interface FriendshipRow {
  requester_id: string;
  receiver_id: string;
}

interface ProfileRow {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface ReviewRatingRow {
  user_id: string;
  tmdb_id: number;
  rating: number | null;
}

interface DiaryPreferenceRow {
  user_id: string;
  share_diary_activity: boolean;
  notify_friend_activity: boolean;
}

function buildFriendIds(currentUserId: string, rows: FriendshipRow[]): string[] {
  const ids = rows
    .map((row) => (row.requester_id === currentUserId ? row.receiver_id : row.requester_id))
    .filter(Boolean);

  return Array.from(new Set(ids));
}

export async function getDiaryEntries(userId: string, limit = 100): Promise<DiaryEntryRow[]> {
  const { data, error } = await supabase
    .from("diary_entries")
    .select("id, user_id, tmdb_id, watched_date, created_at")
    .eq("user_id", userId)
    .order("watched_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as DiaryEntryRow[]) || [];
}

export async function saveDiaryEntry(userId: string, tmdbId: number, watchedDate: string): Promise<void> {
  const { error } = await supabase.from("diary_entries").upsert(
    {
      user_id: userId,
      tmdb_id: tmdbId,
      watched_date: watchedDate,
    },
    {
      onConflict: "user_id,tmdb_id,watched_date",
      ignoreDuplicates: true,
    }
  );

  if (error) throw error;

  try {
    await notifyFriendsDiaryActivity(userId, watchedDate);
  } catch (notifyError) {
    console.error("Falha ao notificar amigos sobre atividade no diary:", notifyError);
  }
}

export async function notifyFriendsDiaryActivity(
  senderId: string,
  watchedDate: string
): Promise<void> {
  const { data: friendshipData, error: friendshipError } = await supabase
    .from("friendships")
    .select("requester_id, receiver_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${senderId},receiver_id.eq.${senderId}`);

  if (friendshipError) throw friendshipError;

  const friends = buildFriendIds(senderId, (friendshipData as FriendshipRow[]) || []);
  if (friends.length === 0) return;

  let optedInFriendIds = [...friends];
  try {
    const { data: preferenceData, error: preferenceError } = await supabase
      .from("diary_preferences")
      .select("user_id, notify_friend_activity")
      .in("user_id", friends);

    if (preferenceError) {
      throw preferenceError;
    }

    const preferenceMap = new Map<string, boolean>();
    for (const row of ((preferenceData as Array<{ user_id: string; notify_friend_activity: boolean }>) || [])) {
      preferenceMap.set(row.user_id, row.notify_friend_activity);
    }

    // Missing preference row defaults to enabled to avoid silently breaking local/dev environments.
    optedInFriendIds = friends.filter((friendId) => preferenceMap.get(friendId) !== false);
  } catch (preferenceLookupError) {
    console.warn("Falha ao carregar diary_preferences; enviando notificação para todos os amigos aceitos.", preferenceLookupError);
  }

  if (optedInFriendIds.length === 0) return;

  // Format date to DD/MM/YYYY
  const formattedDate = (() => {
    const date = new Date(`${watchedDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return watchedDate;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  })();

  const payload = optedInFriendIds.map((userId) => ({
    user_id: userId,
    sender_id: senderId,
    type: "movie_added",
    message: `registrou um filme no diary em ${formattedDate}.`,
  }));

  const { error: notifyError } = await supabase.from("notifications").insert(payload);
  if (notifyError) throw notifyError;
}

export async function deleteDiaryEntry(userId: string, entryId: string): Promise<void> {
  const { error } = await supabase
    .from("diary_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function getDiaryPreference(userId: string): Promise<DiaryPreferenceRow> {
  try {
    const { data, error } = await supabase
      .from("diary_preferences")
      .select("user_id, share_diary_activity, notify_friend_activity")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        user_id: userId,
        share_diary_activity: true,
        notify_friend_activity: false,
      };
    }

    return data as DiaryPreferenceRow;
  } catch {
    return {
      user_id: userId,
      share_diary_activity: true,
      notify_friend_activity: false,
    };
  }
}

export async function updateDiaryPreference(
  userId: string,
  updates: Partial<Pick<DiaryPreferenceRow, "share_diary_activity" | "notify_friend_activity">>
): Promise<void> {
  const payload: Partial<DiaryPreferenceRow> = {
    user_id: userId,
    ...updates,
  };

  const { error } = await supabase
    .from("diary_preferences")
    .upsert(payload, { onConflict: "user_id" });

  if (error) throw error;
}

export async function getFriendDiaryActivities(
  currentUserId: string,
  limit = 60
): Promise<FriendDiaryActivityRow[]> {
  const { data: friendships, error: friendshipError } = await supabase
    .from("friendships")
    .select("requester_id, receiver_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

  if (friendshipError) throw friendshipError;

  const friendIds = buildFriendIds(currentUserId, (friendships as FriendshipRow[]) || []);
  if (friendIds.length === 0) {
    return [];
  }

  const { data: diaryData, error: diaryError } = await supabase
    .from("diary_entries")
    .select("id, user_id, tmdb_id, watched_date, created_at")
    .in("user_id", friendIds)
    .order("watched_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (diaryError) throw diaryError;

  const diaryEntries = ((diaryData as DiaryEntryRow[]) || []);
  if (diaryEntries.length === 0) {
    return [];
  }

  let friendVisibilityMap = new Map<string, boolean>();
  try {
    const { data: prefData } = await supabase
      .from("diary_preferences")
      .select("user_id, share_diary_activity")
      .in("user_id", friendIds);

    for (const pref of ((prefData as Array<{ user_id: string; share_diary_activity: boolean }>) || [])) {
      friendVisibilityMap.set(pref.user_id, pref.share_diary_activity);
    }
  } catch {
    friendVisibilityMap = new Map<string, boolean>();
  }

  const visibleEntries = diaryEntries.filter((entry) => {
    const isVisible = friendVisibilityMap.get(entry.user_id);
    return isVisible !== false;
  });

  if (visibleEntries.length === 0) {
    return [];
  }

  const visibleFriendIds = Array.from(new Set(visibleEntries.map((entry) => entry.user_id)));
  const visibleTmdbIds = Array.from(new Set(visibleEntries.map((entry) => entry.tmdb_id)));

  const [{ data: profileData, error: profileError }, { data: reviewData, error: reviewError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", visibleFriendIds),
    supabase
      .from("reviews")
      .select("user_id, tmdb_id, rating")
      .in("user_id", visibleFriendIds)
      .in("tmdb_id", visibleTmdbIds),
  ]);

  if (profileError) throw profileError;
  if (reviewError) throw reviewError;

  const profileMap = new Map<string, ProfileRow>();
  for (const profile of ((profileData as ProfileRow[]) || [])) {
    profileMap.set(profile.id, profile);
  }

  const ratingMap = new Map<string, number | null>();
  for (const review of ((reviewData as ReviewRatingRow[]) || [])) {
    ratingMap.set(`${review.user_id}|${review.tmdb_id}`, review.rating ?? null);
  }

  return visibleEntries.map((entry) => {
    const profile = profileMap.get(entry.user_id);
    return {
      ...entry,
      friend_id: entry.user_id,
      friend_username: profile?.username || "usuario",
      friend_avatar_url: profile?.avatar_url || null,
      rating: ratingMap.get(`${entry.user_id}|${entry.tmdb_id}`) ?? null,
    };
  });
}
