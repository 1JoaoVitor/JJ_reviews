import { supabase } from "@/lib/supabase";

export interface RawFriendship {
   requester_id: string;
   receiver_id: string;
   status: "pending" | "accepted" | string;
}

export async function fetchFriendshipBetween(
   loggedUserId: string,
   profileUserId: string
): Promise<RawFriendship | null> {
   const { data, error } = await supabase
      .from("friendships")
      .select("*")
      .or(
         `and(requester_id.eq.${loggedUserId},receiver_id.eq.${profileUserId}),and(requester_id.eq.${profileUserId},receiver_id.eq.${loggedUserId})`
      )
      .maybeSingle();

   if (error) throw error;
   return (data as RawFriendship | null) || null;
}

export async function fetchFriendshipsForTargets(
   loggedUserId: string,
   targetUserIds: string[]
): Promise<RawFriendship[]> {
   if (targetUserIds.length === 0) return [];

   const sanitizedIds = targetUserIds
      .map((id) => id.trim())
      .filter(Boolean)
      .join(",");

   if (!sanitizedIds) return [];

   const { data, error } = await supabase
      .from("friendships")
      .select("requester_id, receiver_id, status")
      .or(
         `and(requester_id.eq.${loggedUserId},receiver_id.in.(${sanitizedIds})),and(receiver_id.eq.${loggedUserId},requester_id.in.(${sanitizedIds}))`
      );

   if (error) throw error;
   return (data as RawFriendship[]) || [];
}

export async function createFriendRequest(requesterId: string, receiverId: string): Promise<void> {
   const { error } = await supabase.from("friendships").insert({
      requester_id: requesterId,
      receiver_id: receiverId,
   });

   if (error) throw error;
}

export async function notifyFriendRequest(receiverId: string, senderId: string): Promise<void> {
   await supabase.from("notifications").insert({
      user_id: receiverId,
      sender_id: senderId,
      type: "friend_request",
      message: "enviou-te um pedido de amizade!",
   });
}

export async function acceptFriendRequest(requesterId: string, receiverId: string): Promise<void> {
   const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .match({ requester_id: requesterId, receiver_id: receiverId });

   if (error) throw error;
}

export async function notifyFriendAccepted(requesterId: string, senderId: string): Promise<void> {
   await supabase.from("notifications").insert({
      user_id: requesterId,
      sender_id: senderId,
      type: "friend_request",
      message: "aceitou o teu pedido de amizade!",
   });
}

export async function deleteIncomingFriendRequest(requesterId: string, receiverId: string): Promise<void> {
   const { error } = await supabase
      .from("friendships")
      .delete()
      .match({ requester_id: requesterId, receiver_id: receiverId });

   if (error) throw error;
}

export async function deleteFriendshipBetween(userA: string, userB: string): Promise<void> {
   const { error } = await supabase
      .from("friendships")
      .delete()
      .or(`and(requester_id.eq.${userA},receiver_id.eq.${userB}),and(requester_id.eq.${userB},receiver_id.eq.${userA})`);

   if (error) throw error;
}
