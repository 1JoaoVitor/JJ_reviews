/**
 * Retorna as cores do badge baseado no texto de recomendação do filme.
 * Usado pelos componentes MovieCard, MovieModal e ShareCard.
 */
export function getBadgeStyle(text: string): { bg: string; color: string } {
   if (!text) return { bg: "var(--color-badge-default)", color: "white" };

   const t = text.toLowerCase().trim();

   if (t.includes("assista com certeza"))
      return { bg: "var(--color-badge-great)", color: "white" };
   if (t.includes("vale a pena"))
      return { bg: "var(--color-badge-good)", color: "black" };
   if (t.includes("tem filmes melhores") || t.includes("legal"))
      return { bg: "var(--color-badge-ok)", color: "black" };
   if (t.includes("não tão bom"))
      return { bg: "var(--color-badge-bad)", color: "white" };
   if (t.includes("não perca seu tempo") || t.includes("nunca"))
      return { bg: "var(--color-badge-terrible)", color: "white" };

   return { bg: "var(--color-badge-default)", color: "white" };
}
