import { useCallback, useEffect, useState } from "react";
import { getFriendDiaryActivities, type FriendDiaryActivityRow } from "../services/diaryService";

interface State {
  activities: FriendDiaryActivityRow[];
  loading: boolean;
  error: string | null;
}

export function useFriendDiaryActivities(userId: string | undefined, enabled = true) {
  const [state, setState] = useState<State>({
    activities: [],
    loading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!userId || !enabled) {
      setState({ activities: [], loading: false, error: null });
      return;
    }

    setState((previous) => ({ ...previous, loading: true, error: null }));

    try {
      const activities = await getFriendDiaryActivities(userId);
      setState({ activities, loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao carregar atividade dos amigos.";
      setState({ activities: [], loading: false, error: message });
    }
  }, [enabled, userId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refresh]);

  return {
    activities: state.activities,
    loading: state.loading,
    error: state.error,
    refresh,
  };
}
