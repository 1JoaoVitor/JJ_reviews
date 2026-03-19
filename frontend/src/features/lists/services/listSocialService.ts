import { supabase } from "@/lib/supabase";
import { addCollaboratorsToList, createListRecord, notifyListCollaborators } from "./listsService";
import type { CustomList } from "@/types";

interface CloneListOptions {
  collaboratorIds?: string[];
  copyRatings?: boolean;
  ratingsExclusiveToList?: boolean;
}

interface SourceListMeta {
  owner_id: string;
  description: string | null;
  has_rating: boolean | null;
  rating_type: "manual" | "average" | null;
  manual_rating: number | null;
  auto_sync: boolean | null;
  type: "private" | "partial_shared" | "full_shared";
}

export interface ListLiker {
  id: string;
  username: string;
  avatar_url: string | null;
  liked_at: string;
}

export async function toggleListLike(listId: string, userId?: string): Promise<boolean> {
  let { data, error } = await supabase.rpc("toggle_list_like", {
    p_list_id: listId,
  });

  const rpcCode = (error as { code?: string } | null)?.code;
  const rpcMessage = (error as { message?: string } | null)?.message?.toLowerCase() || "";
  const needsLegacyParams =
    Boolean(userId) &&
    Boolean(error) &&
    (
      rpcCode === "42883" ||
      rpcCode === "PGRST202" ||
      rpcMessage.includes("p_user_id") ||
      rpcMessage.includes("toggle_list_like(uuid) does not exist")
    );

  if (needsLegacyParams) {
    const legacyResponse = await supabase.rpc("toggle_list_like", {
      p_list_id: listId,
      p_user_id: userId,
    });
    data = legacyResponse.data;
    error = legacyResponse.error;
  }

  if (error) {
    // Local environments may not have the RPC created yet.
    if ((error as { code?: string }).code === "404") {
      try {
        if (!userId) {
          throw error;
        }
        return await toggleListLikeFallback(listId, userId);
      } catch (fallbackError) {
        const fallbackCode = (fallbackError as { code?: string }).code;
        const fallbackMessage = (fallbackError as { message?: string }).message?.toLowerCase() || "";
        const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";

        if (isLocal && (fallbackCode === "42P01" || fallbackMessage.includes("does not exist"))) {
          console.warn("List likes tables/RPC are not available in localhost. Skipping persistence.");
          return true;
        }

        throw fallbackError;
      }
    }
    throw error;
  }
  return Boolean(data);
}

async function toggleListLikeFallback(listId: string, userId: string): Promise<boolean> {
  const { data: existingLike, error: fetchError } = await supabase
    .from("list_likes")
    .select("list_id")
    .eq("list_id", listId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existingLike) {
    const { error: deleteError } = await supabase
      .from("list_likes")
      .delete()
      .eq("list_id", listId)
      .eq("user_id", userId);

    if (deleteError) throw deleteError;
    return false;
  }

  const { error: insertError } = await supabase
    .from("list_likes")
    .insert({ list_id: listId, user_id: userId });

  if (insertError) throw insertError;
  return true;
}

export async function fetchListLikers(listId: string): Promise<ListLiker[]> {
  const { data: likesData, error: likesError } = await supabase
    .from("list_likes")
    .select("user_id, created_at")
    .eq("list_id", listId)
    .order("created_at", { ascending: false });

  if (likesError) throw likesError;

  const likes = (likesData || []) as { user_id: string; created_at: string }[];
  if (likes.length === 0) return [];

  const userIds = Array.from(new Set(likes.map((like) => like.user_id)));

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const profileById = new Map(
    ((profilesData || []) as { id: string; username: string; avatar_url: string | null }[]).map((profile) => [
      profile.id,
      profile,
    ])
  );

  return likes
    .map((like) => {
      const profile = profileById.get(like.user_id);
      if (!profile) return null;
      return {
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        liked_at: like.created_at,
      };
    })
    .filter((liker): liker is ListLiker => liker !== null);
}

/**
 * Clona uma lista existente aproveitando o serviço de criação oficial.
 */
export async function cloneListService(
  sourceListId: string,
  newUserId: string,
  newTitle: string,
  listType: "private" | "partial_shared" | "full_shared",
  options: CloneListOptions = {}
): Promise<CustomList> {
  const collaboratorIds = options.collaboratorIds || [];
  const shouldCopyRatings = options.copyRatings ?? true;
  const ratingsExclusiveToList = options.ratingsExclusiveToList ?? true;

  if (listType !== "private" && collaboratorIds.length === 0) {
    throw new Error("Listas compartilhadas exigem pelo menos um colaborador.");
  }

  let sourceMeta: SourceListMeta | null = null;
  if (shouldCopyRatings) {
    const { data: sourceList, error: sourceListError } = await supabase
      .from("lists")
      .select("owner_id, description, has_rating, rating_type, manual_rating, auto_sync, type")
      .eq("id", sourceListId)
      .single();

    if (sourceListError || !sourceList) throw sourceListError || new Error("Lista de origem não encontrada.");
    sourceMeta = sourceList as SourceListMeta;
  }

  
  // Reutiliza o serviço de criação que já existe e está testado
  const newList = await createListRecord({
    ownerId: newUserId,
    name: newTitle,
    description: sourceMeta?.description || "",
    type: listType,
    has_rating: sourceMeta?.has_rating ?? false,
    rating_type: sourceMeta?.rating_type ?? null,
    manual_rating: sourceMeta?.manual_rating ?? null,
    auto_sync: listType === "full_shared" ? (sourceMeta?.auto_sync ?? false) : false
  });

  if (listType !== "private") {
    await addCollaboratorsToList(newList.id, collaboratorIds);
    await notifyListCollaborators(newUserId, newList.id, listType, collaboratorIds);
  }

  // Busca os filmes da lista de origem
  const { data: movies, error: fetchError } = await supabase
    .from("list_movies")
    .select("tmdb_id")
    .eq("list_id", sourceListId);

  if (fetchError) throw fetchError;

  // Insere os filmes na nova lista se houver filmes
  if (movies && movies.length > 0) {
    const toInsert = movies.map(m => ({ 
      list_id: newList.id, 
      tmdb_id: m.tmdb_id 
    }));
    
    const { error: insError } = await supabase
      .from("list_movies")
      .insert(toInsert);

    if (insError) throw insError;
  }

  if (shouldCopyRatings && sourceMeta) {
    const tmdbIds = (movies || []).map((movie) => movie.tmdb_id);
    await copyRatingsDuringClone({
      sourceListId,
      sourceMeta,
      targetListId: newList.id,
      targetUserId: newUserId,
      targetListType: listType,
      tmdbIds,
      ratingsExclusiveToList,
    });
  }

  return newList;
}

interface CloneRatingsPayload {
  sourceListId: string;
  sourceMeta: SourceListMeta;
  targetListId: string;
  targetUserId: string;
  targetListType: "private" | "partial_shared" | "full_shared";
  tmdbIds: number[];
  ratingsExclusiveToList: boolean;
}

interface ReviewSnapshot {
  tmdb_id: number;
  rating: number | null;
  review: string | null;
  recommended: string | null;
  location?: string | null;
  runtime?: number | null;
}

async function copyRatingsDuringClone(payload: CloneRatingsPayload): Promise<void> {
  const { sourceListId, sourceMeta, targetListId, targetUserId, targetListType, tmdbIds, ratingsExclusiveToList } = payload;
  if (tmdbIds.length === 0) return;

  const snapshots =
    sourceMeta.type === "private"
      ? await readRatingsFromPrivateSource(sourceMeta.owner_id, tmdbIds)
      : await readRatingsFromSharedSource(sourceListId, sourceMeta.owner_id, tmdbIds);

  if (snapshots.length === 0) return;

  if (targetListType === "partial_shared") {
    await supabase.from("list_reviews").insert(
      snapshots.map((item) => ({
        list_id: targetListId,
        tmdb_id: item.tmdb_id,
        user_id: targetUserId,
        rating: item.rating,
        review: item.review,
        recommended: item.recommended,
        location: item.location || null,
        runtime: item.runtime || null,
      }))
    );
  }

  if (targetListType === "full_shared") {
    await supabase.from("list_reviews").insert(
      snapshots.map((item) => ({
        list_id: targetListId,
        tmdb_id: item.tmdb_id,
        user_id: null,
        rating: item.rating,
        review: item.review,
        recommended: item.recommended,
      }))
    );
  }

  const shouldCopyToProfile = targetListType === "private" || !ratingsExclusiveToList;
  if (shouldCopyToProfile) {
    await supabase.from("reviews").upsert(
      snapshots.map((item) => ({
        user_id: targetUserId,
        tmdb_id: item.tmdb_id,
        rating: item.rating,
        review: item.review,
        recommended: item.recommended,
        location: item.location || null,
        runtime: item.runtime || null,
        status: "watched",
      })),
      { onConflict: "user_id,tmdb_id" }
    );
  }
}

async function readRatingsFromPrivateSource(ownerId: string, tmdbIds: number[]): Promise<ReviewSnapshot[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("tmdb_id, rating, review, recommended, location, runtime")
    .eq("user_id", ownerId)
    .in("tmdb_id", tmdbIds);

  if (error) throw error;
  return (data || []) as ReviewSnapshot[];
}

async function readRatingsFromSharedSource(
  sourceListId: string,
  sourceOwnerId: string,
  tmdbIds: number[]
): Promise<ReviewSnapshot[]> {
  const { data, error } = await supabase
    .from("list_reviews")
    .select("tmdb_id, user_id, rating, review, recommended, location, runtime")
    .eq("list_id", sourceListId)
    .in("tmdb_id", tmdbIds);

  if (error) throw error;

  const grouped = new Map<number, Array<ReviewSnapshot & { user_id?: string | null }>>();
  for (const row of (data || []) as Array<ReviewSnapshot & { user_id?: string | null }>) {
    const list = grouped.get(row.tmdb_id) || [];
    list.push(row);
    grouped.set(row.tmdb_id, list);
  }

  const snapshots: ReviewSnapshot[] = [];
  for (const [tmdbId, rows] of grouped.entries()) {
    const groupRow = rows.find((item) => item.user_id == null);
    const ownerRow = rows.find((item) => item.user_id === sourceOwnerId);
    const chosen = groupRow || ownerRow || rows[0];
    if (!chosen) continue;
    snapshots.push({
      tmdb_id: tmdbId,
      rating: chosen.rating,
      review: chosen.review,
      recommended: chosen.recommended,
      location: chosen.location || null,
      runtime: chosen.runtime || null,
    });
  }

  return snapshots;
}