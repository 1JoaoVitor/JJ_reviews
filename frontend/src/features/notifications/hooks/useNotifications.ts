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
         const { data, error } = await supabase
            .from("notifications")
            .select(`
               *,
               sender:profiles!sender_id(username, avatar_url)
            `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(50);

         if (error) {
            console.error("Erro do Supabase ao buscar notificações:", error.message);
            throw error;
         }

        if (data) {
            // Cria um tipo temporário para o dado "bruto" que vem do banco
            type RawNotification = Omit<AppNotification, "sender"> & {
            sender?: { username: string; avatar_url: string } | { username: string; avatar_url: string }[];
            };

            const rawData = data as RawNotification[];

            // O map e o filter sabem exatamente quem é o "notif" e o "n"
            const formattedData = rawData.map((notif) => ({
            ...notif,
            sender: Array.isArray(notif.sender) ? notif.sender[0] : notif.sender
            }));
            
            setNotifications(formattedData as AppNotification[]);
            setUnreadCount(formattedData.filter((n) => !n.is_read).length);
         }
      } catch (error) {
         console.error("Erro ao processar notificações:", error);
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
               event: "INSERT",
               schema: "public",
               table: "notifications",
               filter: `user_id=eq.${userId}`
            },
            () => {
               fetchNotifications();
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