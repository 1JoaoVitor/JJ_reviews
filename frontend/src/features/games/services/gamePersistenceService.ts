import { supabase } from "@/lib/supabase";

export type PersistedGameType = "battle" | "daily_cover" | "daily_riddle";
export type PersistedGameStatus = "in_progress" | "won" | "lost" | "abandoned";

interface StartGameSessionInput {
  userId: string;
  gameType: PersistedGameType;
  sourceMode: string;
  dateKey: string;
  targetTmdbId?: number;
  maxLives?: number;
  livesLeft?: number;
  metadata?: Record<string, unknown>;
}

interface FinishGameSessionInput {
  sessionId: string;
  status: Exclude<PersistedGameStatus, "in_progress">;
  livesLeft?: number;
  attemptsCount?: number;
  metadata?: Record<string, unknown>;
}

interface PersistDailyAttemptInput {
  sessionId: string;
  userId: string;
  attemptIndex: number;
  guessedTmdbId?: number;
  guessTitle: string;
  isCorrect: boolean;
  livesAfter: number;
  fields: unknown;
}

interface PersistBattleMatchInput {
  sessionId: string;
  userId: string;
  roundSize: number;
  matchIndex: number;
  movieATmdbId: number;
  movieBTmdbId: number;
  winnerTmdbId: number;
}

export async function startGameSession(input: StartGameSessionInput): Promise<string | null> {
  const { data, error } = await supabase
    .from("game_sessions")
    .insert({
      user_id: input.userId,
      game_type: input.gameType,
      source_mode: input.sourceMode,
      status: "in_progress",
      date_key: input.dateKey,
      target_tmdb_id: input.targetTmdbId,
      max_lives: input.maxLives,
      lives_left: input.livesLeft,
      metadata: input.metadata || {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao iniciar sessão de jogo:", error);
    return null;
  }

  return data?.id || null;
}

export async function updateGameSessionProgress(
  sessionId: string,
  livesLeft: number,
  attemptsCount: number
): Promise<void> {
  const { error } = await supabase
    .from("game_sessions")
    .update({ lives_left: livesLeft, attempts_count: attemptsCount })
    .eq("id", sessionId);

  if (error) {
    console.error("Erro ao atualizar progresso da sessão:", error);
  }
}

export async function finishGameSession(input: FinishGameSessionInput): Promise<void> {
  const { error } = await supabase
    .from("game_sessions")
    .update({
      status: input.status,
      lives_left: input.livesLeft,
      attempts_count: input.attemptsCount,
      metadata: input.metadata,
      ended_at: new Date().toISOString(),
    })
    .eq("id", input.sessionId);

  if (error) {
    console.error("Erro ao finalizar sessão de jogo:", error);
  }
}

export async function persistDailyAttempt(input: PersistDailyAttemptInput): Promise<void> {
  const { error } = await supabase.from("game_daily_attempts").insert({
    session_id: input.sessionId,
    user_id: input.userId,
    attempt_index: input.attemptIndex,
    guessed_tmdb_id: input.guessedTmdbId,
    guess_title: input.guessTitle,
    is_correct: input.isCorrect,
    lives_after: input.livesAfter,
    fields: input.fields,
  });

  if (error) {
    console.error("Erro ao persistir tentativa diária:", error);
  }
}

export async function persistBattleMatch(input: PersistBattleMatchInput): Promise<void> {
  const { error } = await supabase.from("game_battle_matches").insert({
    session_id: input.sessionId,
    user_id: input.userId,
    round_size: input.roundSize,
    match_index: input.matchIndex,
    movie_a_tmdb_id: input.movieATmdbId,
    movie_b_tmdb_id: input.movieBTmdbId,
    winner_tmdb_id: input.winnerTmdbId,
  });

  if (error) {
    console.error("Erro ao persistir duelo da batalha:", error);
  }
}
