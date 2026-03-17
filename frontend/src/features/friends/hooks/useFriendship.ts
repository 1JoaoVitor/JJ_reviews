import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
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
      if (!loggedUserId || !profileUserId) return;
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
         toast.success("Pedido enviado!");
      } catch (err) {
         if (err instanceof Error) {
            toast.error("Erro ao enviar pedido: " + err.message);
         } else {
            toast.error("Ocorreu um erro desconhecido.");
         }
      }
   };
   
   const acceptRequest = async () => {
      if (!loggedUserId || !profileUserId) return;
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
         toast.success("Pedido aceite! Agora vocês são amigos.");
      } catch (err) {
        if (err instanceof Error){
         toast.error("Erro ao aceitar pedido: " + err.message);
        } else {
            toast.error("Ocorreu um erro desconhecido.");
         }
      }
   };

   const rejectRequest = async () => {
      if (!loggedUserId || !profileUserId) return;
      try {
         const { error } = await supabase
            .from("friendships")
            .delete()
            .match({ requester_id: profileUserId, receiver_id: loggedUserId });
         
         if (error) throw error;
         setStatus("none");
         toast.success("Pedido recusado.");
      } catch (err) {
         console.error("Erro ao recusar pedido:", err);
         toast.error("Erro ao recusar pedido.");
      }
   };

   const removeOrCancel = async () => {
      if (!loggedUserId || !profileUserId) return;
      try {
         const { error } = await supabase
            .from("friendships")
            .delete()
            .or(`and(requester_id.eq.${loggedUserId},receiver_id.eq.${profileUserId}),and(requester_id.eq.${profileUserId},receiver_id.eq.${loggedUserId})`);
         
         if (error) throw error;
         setStatus("none");
         toast.success("Amizade/Pedido desfeito.");
      } catch (err) {
         if (err instanceof Error) {
            toast.error("Erro ao processar ação: " + err.message);
         } else {
            toast.error("Ocorreu um erro desconhecido.");
         }
      }
   };

   return { status, loading, sendRequest, acceptRequest, rejectRequest, removeOrCancel };
}