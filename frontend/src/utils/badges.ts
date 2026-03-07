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

// Transforma o texto num valor matemático
export function getBadgeValue(text: string): number {
   if (!text) return 0;
   const t = text.toLowerCase().trim();
   if (t.includes("assista com certeza")) return 2;
   if (t.includes("vale a pena")) return 1;
   if (t.includes("tem filmes melhores") || t.includes("legal")) return 0;
   if (t.includes("não tão bom")) return -1;
   if (t.includes("não perca seu tempo") || t.includes("nunca")) return -2;
   return 0; 
}

// Transforma o valor matemático de volta para texto
export function getBadgeTextFromValue(value: number): string {
   if (value >= 2) return "Assista com certeza";
   if (value === 1) return "Vale a pena assistir";
   if (value === 0) return "Tem filmes melhores, mas é legal";
   if (value === -1) return "Não tão bom";
   if (value <= -2) return "Não perca seu tempo";
   return "Vale a pena assistir"; 
}

// Calcula a média arredondada para baixo de um array de badges
export function calculateAverageBadge(badges: (string | undefined | null)[]): string | undefined {
   const validBadges = badges.filter(b => b && b.trim() !== "") as string[];
   if (validBadges.length === 0) return undefined;

   const totalValue = validBadges.reduce((acc, text) => acc + getBadgeValue(text), 0);
   const averageValue = Math.floor(totalValue / validBadges.length); // Arredonda para baixo 

   return getBadgeTextFromValue(averageValue);
}
