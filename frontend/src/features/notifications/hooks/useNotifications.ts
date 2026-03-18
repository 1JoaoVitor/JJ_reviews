import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { AppNotification } from "@/types";
import { formatNotifications, countUnread, type RawNotification } from "../logic/notificationOperations";

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

         const formattedData = formatNotifications(data as RawNotification[]);
         setNotifications(formattedData);
         setUnreadCount(countUnread(formattedData));

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

         setNotifications((prev) => {
            const updated = prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n));
            setUnreadCount(countUnread(updated)); 
            return updated;
         });

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

         setNotifications((prev) => {
            const updated = prev.map((n) => ({ ...n, is_read: true }));
            setUnreadCount(countUnread(updated)); 
            return updated;
         });
      } catch (error) {
         console.error("Erro ao marcar todas como lidas:", error);
      }
   };

   useEffect(() => {
      fetchNotifications();

      if (!userId) return;

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