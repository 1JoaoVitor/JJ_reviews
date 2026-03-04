/**
 * Retorna as cores do badge baseado no texto de recomendação do filme.
 * Usado pelos componentes MovieCard, MovieModal e ShareCard.
 */
export function getBadgeStyle(text: string): { bg: string; color: string } {
   if (!text) return { bg: "var(--badge-default)", color: "#F5F5F5" };

   const t = text.toLowerCase().trim();

   if (t.includes("assista com certeza"))
      return { bg: "var(--badge-great)", color: "#0D0D0D" };
   if (t.includes("vale a pena"))
      return { bg: "var(--badge-good)", color: "#0D0D0D" };
   if (t.includes("tem filmes melhores") || t.includes("legal"))
      return { bg: "var(--badge-ok)", color: "#0D0D0D" };
   if (t.includes("não tão bom"))
      return { bg: "var(--badge-bad)", color: "#0D0D0D" };
   if (t.includes("não perca seu tempo") || t.includes("nunca"))
      return { bg: "var(--badge-terrible)", color: "#F5F5F5" };

   return { bg: "var(--badge-default)", color: "#F5F5F5" };
}
