export type ListType = "private" | "partial_shared" | "full_shared";

export function generateDuplicateTitle(originalTitle: string): string {
  return `${originalTitle} (Cópia)`;
}

export function buildListShareUrl(listId: string, ownerUsername: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://jj-reviews.vercel.app";
  const path = ownerUsername ? `/perfil/${ownerUsername}` : "/";
  return `${origin}${path}?aba=lists&listId=${listId}`;
}

export function requiresImmediateCollaborators(type: ListType): boolean {
  return type !== "private";
}