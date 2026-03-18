import type { Friendship } from "@/types";

export type DerivedFriendshipStatus = 
   | "self"             // É o próprio perfil
   | "none"             // Não são amigos
   | "friends"          // Já são amigos
   | "request_sent"     // Eu enviei o convite e aguardo
   | "request_received"; // Recebi o convite e preciso aceitar/recusar

/**
 * Avalia o estado exato da relação entre dois usuários baseado no registro de amizade do banco.
 */
export function mapFriendshipStatus(
   currentUserId: string | undefined,
   profileId: string | undefined,
   friendship: Friendship | null
): DerivedFriendshipStatus {
   
   if (!currentUserId || !profileId) return "none";

   if (currentUserId === profileId) return "self";

   if (!friendship || friendship.status === "declined") return "none";

   if (friendship.status === "accepted") return "friends";

   if (friendship.status === "pending") {
      if (friendship.requester_id === currentUserId) {
         return "request_sent";
      }
      if (friendship.receiver_id === currentUserId) {
         return "request_received";
      }
   }

   return "none";
}