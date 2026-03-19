import { useState, useEffect, useCallback } from "react";
import { mapFriendshipStatus, type DerivedFriendshipStatus } from "../logic/mapFriendshipStatus";
import {
   acceptFriendRequest,
   createFriendRequest,
   deleteFriendshipBetween,
   deleteIncomingFriendRequest,
   fetchFriendshipBetween,
   notifyFriendAccepted,
   notifyFriendRequest,
} from "../services/friendshipService";

export function useFriendship(loggedUserId?: string, profileUserId?: string) {
   const [status, setStatus] = useState<DerivedFriendshipStatus>("none");
   const [loading, setLoading] = useState(true);

   const checkFriendship = useCallback(async () => {
      if (!loggedUserId || !profileUserId) {
         setLoading(false);
         return;
      }

      try {
         const data = await fetchFriendshipBetween(loggedUserId, profileUserId);

         const derivedStatus = mapFriendshipStatus(loggedUserId, profileUserId, data);
         setStatus(derivedStatus);

      } catch (error) {
         console.error("Erro ao verificar amizade:", error);
      } finally {
         setLoading(false);
      }
   }, [loggedUserId, profileUserId]);

   useEffect(() => {
      checkFriendship();
   }, [checkFriendship]);

   const sendRequest = async () => {
      if (!loggedUserId || !profileUserId) return { success: false, error: "Usuários inválidos." };
      try {
         await createFriendRequest(loggedUserId, profileUserId);
         await notifyFriendRequest(profileUserId, loggedUserId);

         setStatus("request_sent");
         return { success: true };
      } catch (err) {
         const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
         return { success: false, error: `Erro ao enviar pedido: ${errorMessage}` };
      }
   };
   
   const acceptRequest = async () => {
      if (!loggedUserId || !profileUserId) return { success: false, error: "Usuários inválidos." };
      try {
         await acceptFriendRequest(profileUserId, loggedUserId);
         await notifyFriendAccepted(profileUserId, loggedUserId);

         setStatus("friends");
         return { success: true };
      } catch (err) {
         const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
         return { success: false, error: `Erro ao aceitar pedido: ${errorMessage}` };
      }
   };

   const rejectRequest = async () => {
      if (!loggedUserId || !profileUserId) return { success: false, error: "Usuários inválidos." };
      try {
         await deleteIncomingFriendRequest(profileUserId, loggedUserId);
         setStatus("none");
         return { success: true };
      } catch (err) {
         console.error("Erro ao recusar pedido:", err);
         return { success: false, error: "Erro ao recusar pedido." };
      }
   };

   const removeOrCancel = async () => {
      if (!loggedUserId || !profileUserId) return { success: false, error: "Usuários inválidos." };
      try {
         await deleteFriendshipBetween(loggedUserId, profileUserId);
         setStatus("none");
         return { success: true };
      } catch (err) {
         const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
         return { success: false, error: `Erro ao processar ação: ${errorMessage}` };
      }
   };

   return { status, loading, sendRequest, acceptRequest, rejectRequest, removeOrCancel };
}