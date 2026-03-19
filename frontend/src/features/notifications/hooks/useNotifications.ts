import { useState, useEffect, useCallback } from "react";
import type { AppNotification } from "@/types";
import { formatNotifications, countUnread, type RawNotification } from "../logic/notificationOperations";
import {
   fetchRecentNotifications,
   markAllUserNotificationsAsRead,
   markNotificationAsRead,
   subscribeNotifications,
} from "../services/notificationsService";

export function useNotifications(userId?: string) {
   const [notifications, setNotifications] = useState<AppNotification[]>([]);
   const [unreadCount, setUnreadCount] = useState(0);
   const [loading, setLoading] = useState(false);

   const fetchNotifications = useCallback(async () => {
      if (!userId) return;
      setLoading(true);
      
      try {
         const data = await fetchRecentNotifications(userId);

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
         await markNotificationAsRead(notificationId);

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
         await markAllUserNotificationsAsRead(userId);

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

      return subscribeNotifications(userId, fetchNotifications);
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