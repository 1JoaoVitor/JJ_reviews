import { supabase } from "@/lib/supabase";
import type { RawNotification } from "../logic/notificationOperations";

export async function fetchRecentNotifications(userId: string): Promise<RawNotification[]> {
   const { data, error } = await supabase
      .from("notifications")
      .select(
         `
               *,
               sender:profiles!sender_id(username, avatar_url)
            `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

   if (error) throw error;
   return (data || []) as RawNotification[];
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
   const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

   if (error) throw error;
}

export async function markAllUserNotificationsAsRead(userId: string): Promise<void> {
   const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

   if (error) throw error;
}

export function subscribeNotifications(userId: string, onInsert: () => void): () => void {
   const subscription = supabase
      .channel("realtime:notifications")
      .on(
         "postgres_changes",
         {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
         },
         onInsert
      )
      .subscribe();

   return () => {
      supabase.removeChannel(subscription);
   };
}
