import { useCallback, useEffect, useState } from "react";
import {
  deleteDiaryEntry,
  getDiaryEntries,
  getDiaryPreference,
  saveDiaryEntry,
  updateDiaryPreference,
  type DiaryEntryRow,
} from "../services/diaryService";

interface UseDiaryState {
  entries: DiaryEntryRow[];
  loading: boolean;
  error: string | null;
  shareDiaryActivity: boolean;
  notifyFriendActivity: boolean;
}

export function useDiary(userId: string | undefined) {
  const [state, setState] = useState<UseDiaryState>({
    entries: [],
    loading: false,
    error: null,
    shareDiaryActivity: true,
    notifyFriendActivity: false,
  });

  const refresh = useCallback(async () => {
    if (!userId) {
      setState((previous) => ({
        ...previous,
        entries: [],
        loading: false,
      }));
      return;
    }

    setState((previous) => ({ ...previous, loading: true, error: null }));

    try {
      const [entries, preference] = await Promise.all([
        getDiaryEntries(userId),
        getDiaryPreference(userId),
      ]);

      setState((previous) => ({
        ...previous,
        entries,
        shareDiaryActivity: preference.share_diary_activity,
        notifyFriendActivity: preference.notify_friend_activity,
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao carregar diary.";
      setState((previous) => ({ ...previous, loading: false, error: message }));
    }
  }, [userId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refresh]);

  const addEntry = useCallback(
    async (tmdbId: number, watchedDate: string) => {
      if (!userId) return;
      await saveDiaryEntry(userId, tmdbId, watchedDate);
      await refresh();
    },
    [refresh, userId]
  );

  const removeEntry = useCallback(
    async (entryId: string) => {
      if (!userId) return;
      await deleteDiaryEntry(userId, entryId);
      await refresh();
    },
    [refresh, userId]
  );

  const setShareDiaryActivity = useCallback(
    async (enabled: boolean) => {
      if (!userId) return;
      await updateDiaryPreference(userId, { share_diary_activity: enabled });
      setState((previous) => ({ ...previous, shareDiaryActivity: enabled }));
    },
    [userId]
  );

  const setNotifyFriendActivity = useCallback(
    async (enabled: boolean) => {
      if (!userId) return;
      await updateDiaryPreference(userId, { notify_friend_activity: enabled });
      setState((previous) => ({ ...previous, notifyFriendActivity: enabled }));
    },
    [userId]
  );

  return {
    entries: state.entries,
    loading: state.loading,
    error: state.error,
    shareDiaryActivity: state.shareDiaryActivity,
    notifyFriendActivity: state.notifyFriendActivity,
    refresh,
    addEntry,
    removeEntry,
    setShareDiaryActivity,
    setNotifyFriendActivity,
  };
}
