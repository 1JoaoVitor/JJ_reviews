/**
 * Retorna as cores do badge baseado no texto de recomendação do filme.
 * Usado pelos componentes MovieCard, MovieModal e ShareCard.
 */
export type BadgeTone = "great" | "good" | "ok" | "bad" | "terrible" | "default";

export function getBadgeTone(text: string): BadgeTone {
   if (!text) return "default";

   const t = text.toLowerCase().trim();

   if (t.includes("assista com certeza")) return "great";
   if (t.includes("vale a pena")) return "good";
   if (t.includes("tem filmes melhores") || t.includes("legal")) return "ok";
   if (t.includes("não tão bom")) return "bad";
   if (t.includes("não perca seu tempo") || t.includes("nunca")) return "terrible";

   return "default";
}

export function getBadgeStyle(text: string): { bg: string; color: string } {
   const tone = getBadgeTone(text);

   if (tone === "great") return { bg: "var(--badge-great)", color: "#0D0D0D" };
   if (tone === "good") return { bg: "var(--badge-good)", color: "#0D0D0D" };
   if (tone === "ok") return { bg: "var(--badge-ok)", color: "#0D0D0D" };
   if (tone === "bad") return { bg: "var(--badge-bad)", color: "#0D0D0D" };
   if (tone === "terrible") return { bg: "var(--badge-terrible)", color: "#F5F5F5" };

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

/**
 * Converte uma nota numérica (0-10) em texto de badge
 * Intervalos definidos para importação Letterboxd:
 * 10-9: "Assista com certeza"
 * 8.5-7.5: "Vale a pena assistir"
 * 7-6: "Tem filmes melhores, mas é legal"
 * 5.5-4.5: "Não tão bom"
 * <= 4: "Não perca seu tempo"
 */
export function getRatingBadge(rating: number | undefined | null): string | undefined {
   if (rating === undefined || rating === null) {
      return undefined;
   }

   if (rating >= 9) return "Assista com certeza";
   if (rating >= 7.5) return "Vale a pena assistir";
   if (rating >= 6) return "Tem filmes melhores, mas é legal";
   if (rating >= 4.5) return "Não tão bom";
   return "Não perca seu tempo";
}
