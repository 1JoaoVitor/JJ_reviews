export interface RawAuthProfile {
   username?: string | null;
   avatar_url?: string | null;
}

export interface AuthProfile {
   username: string;
   avatarUrl: string | null;
}

export function toAuthProfile(raw: RawAuthProfile | null | undefined): AuthProfile {
   return {
      username: raw?.username ?? "",
      avatarUrl: raw?.avatar_url ?? null,
   };
}

export function shouldRefreshProfileOnPath(pathname: string): boolean {
   return pathname === "/" || pathname === "/batalha";
}
