import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { AppNotification } from "@/types";

export function useNotifications(userId?: string) {
   const [notifications, setNotifications] = useState<AppNotification[]>([]);
   const [unreadCount, setUnreadCount] = useState(0);
   const [loading, setLoading] = useState(false);

   const fetchNotifications = useCallback(async () => {
      if (!userId) return;
      setLoading(true);
      
      try {
         // Traz as notificações ordenadas das mais recentes para as mais antigas
         // E faz um JOIN (select sender(...)) para pegar a foto e nome de quem enviou
         const { data, error } = await supabase
            .from("notifications")
            .select(`
               *,
               sender:profiles!notifications_sender_id_fkey(username, avatar_url)
            `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(50); // Pega as últimas 50 para não pesar

         if (error) throw error;

         if (data) {
            setNotifications(data as unknown as AppNotification[]);
            setUnreadCount(data.filter((n) => !n.is_read).length);
         }
      } catch (error) {
         console.error("Erro ao buscar notificações:", error);
      } finally {
         setLoading(false);
      }
   }, [userId]);

   // Marca uma notificação específica como lida
   const markAsRead = async (notificationId: string) => {
      try {
         const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", notificationId);

         if (error) throw error;

         setNotifications((prev) =>
            prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
         );
         setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
         console.error("Erro ao marcar como lida:", error);
      }
   };

   // Marca TODAS como lidas de uma vez
   const markAllAsRead = async () => {
      if (!userId || unreadCount === 0) return;
      try {
         const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", userId)
            .eq("is_read", false);

         if (error) throw error;

         setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
         setUnreadCount(0);
      } catch (error) {
         console.error("Erro ao marcar todas como lidas:", error);
      }
   };

   useEffect(() => {
      fetchNotifications();

      if (!userId) return;

      // Inscreve o site no canal de Tempo Real do Supabase
      const subscription = supabase
         .channel("realtime:notifications")
         .on(
            "postgres_changes",
            {
               event: "INSERT", // Escuta apenas quando uma LINHA NOVA for criada
               schema: "public",
               table: "notifications",
               filter: `user_id=eq.${userId}` // Escuta SÓ as notificações deste usuário!
            },
            (payload) => {
               // Quando chegar uma notificação nova, coloca ela no topo da lista e aumenta a bolinha vermelha
               const newNotif = payload.new as AppNotification;
               setNotifications((prev) => [newNotif, ...prev]);
               setUnreadCount((prev) => prev + 1);
            }
         )
         .subscribe();

      // Limpeza: quando o usuário sair do site ou deslogar, desliga a escuta
      return () => {
         supabase.removeChannel(subscription);
      };
   }, [userId, fetchNotifications]);

   return {
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
   };
}