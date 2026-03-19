import { useState } from "react";
import { toggleListLike, cloneListService } from "../services/listSocialService";
import { buildListShareUrl } from "../logic/listSocial";
import type { ListType } from "../logic/listSocial";
import type { CustomList } from "@/types";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

interface UseListSocialProps {
  listId: string;
  initialLikes: number;
  isInitialLiked: boolean;
  ownerUsername: string;
  currentUserId?: string;
}

export interface ToggleLikeResult {
  success: boolean;
  error: string | null;
}

export interface ShareResult {
  success: boolean;
  url: string;
  error: string | null;
}

export interface DuplicateResult {
  success: boolean;
  data: CustomList | null;
  error: string | null;
}

export interface DuplicateOptions {
  collaboratorIds?: string[];
  copyRatings?: boolean;
  ratingsExclusiveToList?: boolean;
}

export function useListSocial({
  listId,
  initialLikes,
  isInitialLiked,
  ownerUsername,
  currentUserId
}: UseListSocialProps) {

  
  const [isLiked, setIsLiked] = useState(isInitialLiked);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleToggleLike = async (): Promise<ToggleLikeResult> => {
    if (!currentUserId) return { success: false, error: "Usuário não autenticado." };

    const previousLiked = isLiked;
    const previousCount = likesCount;
    
    setIsLiked(!previousLiked);
    setLikesCount(prev => previousLiked ? prev - 1 : prev + 1);

    try {
      await toggleListLike(listId);
      return { success: true, error: null };
    } catch (error) {
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      console.error("Erro ao curtir lista:", error);
      return { success: false, error: "Erro ao processar curtida." };
    }
  };

  const handleShare = async (): Promise<ShareResult> => {
    const url = buildListShareUrl(listId, ownerUsername);

    try {
      const title = "Compartilhar lista";
      const text = "Veja esta lista no JJ Reviews";

      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title,
          text,
          url,
          dialogTitle: "Compartilhar Lista",
        });
        return { success: true, url, error: null };
      }

      if (navigator.share) {
        await navigator.share({ title, text, url });
        return { success: true, url, error: null };
      }

      await navigator.clipboard.writeText(url);
      return { success: true, url, error: null };
    } catch (err) {
      console.error("Erro ao copiar link:", err);

      try {
        await navigator.clipboard.writeText(url);
        return { success: true, url, error: null };
      } catch {
        return { success: false, url, error: "Erro ao compartilhar lista." };
      }
    }
  };

  const handleDuplicate = async (
    newTitle: string,
    selectedType: ListType = "private",
    options?: DuplicateOptions
  ): Promise<DuplicateResult> => {
    if (!currentUserId) return { success: false, data: null, error: "Usuário não autenticado." };

    setIsActionLoading(true);
    try {
      const newList = await cloneListService(
        listId,
        currentUserId,
        newTitle,
        selectedType,
        options
      );
      
      return { success: true, data: newList, error: null };
    } catch (error) {
      console.error("Erro ao duplicar lista:", error);
      return { success: false, data: null, error: "Erro ao duplicar a lista." };
    } finally {
      setIsActionLoading(false);
    }
  };

  return {
    isLiked,
    likesCount,
    isActionLoading,
    handleToggleLike,
    handleShare,
    handleDuplicate
  };
}