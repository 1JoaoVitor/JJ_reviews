import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { mapFriendshipStatus, type DerivedFriendshipStatus } from "../logic/mapFriendshipStatus";

export function useFriendship(loggedUserId?: string, profileUserId?: string) {
   const [status, setStatus] = useState<DerivedFriendshipStatus>("none");
   const [loading, setLoading] = useState(true);

   const checkFriendship = useCallback(async () => {
      if (!loggedUserId || !profileUserId) {
         setLoading(false);
         return;
      }

      try {
         const { data, error } = await supabase
            .from("friendships")
            .select("*")
            .or(`and(requester_id.eq.${loggedUserId},receiver_id.eq.${profileUserId}),and(requester_id.eq.${profileUserId},receiver_id.eq.${loggedUserId})`)
            .maybeSingle();

         if (error) throw error;

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
         const { error } = await supabase.from("friendships").insert({
            requester_id: loggedUserId,
            receiver_id: profileUserId,
         });
         if (error) throw error;

         const { error: notifError } = await supabase.from("notifications").insert({
            user_id: profileUserId, 
            sender_id: loggedUserId, 
            type: "friend_request",
            message: "enviou-te um pedido de amizade!",
         });
         if (notifError) console.error("Erro ao criar notificação de amizade:", notifError);

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
         const { error } = await supabase
            .from("friendships")
            .update({ status: "accepted" })
            .match({ requester_id: profileUserId, receiver_id: loggedUserId });
         
         if (error) throw error;

         const { error: notifError } = await supabase.from("notifications").insert({
            user_id: profileUserId, 
            sender_id: loggedUserId, 
            type: "friend_request", 
            message: "aceitou o teu pedido de amizade!",
         });
         if (notifError) console.error("Erro ao criar notificação de aceitação:", notifError);

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
         const { error } = await supabase
            .from("friendships")
            .delete()
            .match({ requester_id: profileUserId, receiver_id: loggedUserId });
         
         if (error) throw error;
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
         const { error } = await supabase
            .from("friendships")
            .delete()
            .or(`and(requester_id.eq.${loggedUserId},receiver_id.eq.${profileUserId}),and(requester_id.eq.${profileUserId},receiver_id.eq.${loggedUserId})`);
         
         if (error) throw error;
         setStatus("none");
         return { success: true };
      } catch (err) {
         const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
         return { success: false, error: `Erro ao processar ação: ${errorMessage}` };
      }
   };

   return { status, loading, sendRequest, acceptRequest, rejectRequest, removeOrCancel };
}