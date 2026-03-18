import type { CustomList } from "@/types";

export interface RawSupabaseList extends Omit<CustomList, "movie_count"> {
   list_movies?: { count?: number }[] | null | unknown;
   [key: string]: unknown;
}

export function mergeLists(
   myLists: RawSupabaseList[] | null | undefined,
   sharedLists: RawSupabaseList[] | null | undefined
): RawSupabaseList[] {
   return [...(myLists || []), ...(sharedLists || [])];
}


export function deduplicateLists(lists: RawSupabaseList[]): RawSupabaseList[] {
   const uniqueMap = new Map<string, RawSupabaseList>();
   for (const list of lists) {
      if (list && list.id && !uniqueMap.has(list.id)) {
         uniqueMap.set(list.id, list);
      }
   }
   return Array.from(uniqueMap.values());
}

export function mapListCounts(lists: RawSupabaseList[]): CustomList[] {
   return lists.map((list) => {
      let count = 0;
      if (Array.isArray(list.list_movies) && list.list_movies.length > 0) {
         const firstItem = list.list_movies[0];
         if (firstItem && typeof firstItem === "object" && "count" in firstItem) {
            count = Number(firstItem.count) || 0;
         }
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { list_movies, ...cleanList } = list;
      return { ...cleanList, movie_count: count } as CustomList;
   });
}

export function sortListsByDate(lists: CustomList[]): CustomList[] {
   return [...lists].sort((a, b) => {
      let timeA = new Date(a.created_at || 0).getTime();
      let timeB = new Date(b.created_at || 0).getTime();
 
      if (isNaN(timeA)) timeA = 0;
      if (isNaN(timeB)) timeB = 0;

      return timeB - timeA;
   });
}