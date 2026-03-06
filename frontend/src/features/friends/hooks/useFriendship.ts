import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export type FriendshipState = "none" | "pending_sent" | "pending_received" | "accepted";

export function useFriendship(loggedUserId?: string, profileUserId?: string) {
   const [status, setStatus] = useState<FriendshipState>("none");
   const [loading, setLoading] = useState(true);

   const checkFriendship = useCallback(async () => {
      if (!loggedUserId || !profileUserId || loggedUserId === profileUserId) {
         setLoading(false);
         return;
      }

      try {
         // Busca se existe alguma relação entre os dois IDs
         const { data, error } = await supabase
            .from("friendships")
            .select("*")
            .or(`and(requester_id.eq.${loggedUserId},receiver_id.eq.${profileUserId}),and(requester_id.eq.${profileUserId},receiver_id.eq.${loggedUserId})`)
            .maybeSingle();

         if (error) throw error;

         if (!data) {
            setStatus("none");
         } else if (data.status === "accepted") {
            setStatus("accepted");
         } else if (data.requester_id === loggedUserId) {
            setStatus("pending_sent");
         } else {
            setStatus("pending_received");
         }
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
         setStatus("pending_sent");
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
         setStatus("accepted");
         toast.success("Pedido aceito! Agora vocês são amigos.");
      } catch (err) {
        if (err instanceof Error){
         toast.error("Erro ao aceitar pedido." + err.message);
        } else {
            toast.error("Ocorreu um erro desconhecido.");
         }
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

   return { status, loading, sendRequest, acceptRequest, removeOrCancel };
}