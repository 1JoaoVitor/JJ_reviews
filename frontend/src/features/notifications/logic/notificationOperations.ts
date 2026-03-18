import type { AppNotification } from "@/types";

export type RawNotification = Omit<AppNotification, "sender"> & {
   // O Supabase pode devolver objeto, array ou null dependendo do relacionamento
   sender?: { username: string; avatar_url: string } | { username: string; avatar_url: string }[] | null;
};

/**
 * Transforma a resposta crua do Supabase no formato estrito do Front-end.
 */
export function formatNotifications(rawData: RawNotification[] | null | undefined): AppNotification[] {
   if (!rawData || !Array.isArray(rawData)) return [];

   return rawData.map((notif) => {
      const senderData = Array.isArray(notif.sender) ? notif.sender[0] : notif.sender;
      
      return {
         ...notif,
         sender: senderData || undefined,
      } as AppNotification;
   });
}

/**
 * Conta quantas notificações ainda não foram lidas.
 */
export function countUnread(notifications: AppNotification[] | null | undefined): number {
   if (!notifications || !Array.isArray(notifications)) return 0;
   return notifications.filter((n) => !n.is_read).length;
}