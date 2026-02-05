export const getBadgeStyle = (text: string) => {
   if (!text) return { bg: "#6c757d", color: "white" };
   const t = text.toLowerCase().trim();
   if (t.includes("assista com certeza"))
      return { bg: "#198754", color: "white" };
   if (t.includes("vale a pena")) return { bg: "#20c997", color: "black" };
   if (t.includes("tem filmes melhores") || t.includes("legal"))
      return { bg: "#ffc107", color: "black" };
   if (t.includes("não tão bom")) return { bg: "#fd7e14", color: "white" };
   if (t.includes("não perca seu tempo") || t.includes("nunca"))
      return { bg: "#dc3545", color: "white" };
   return { bg: "#6c757d", color: "white" };
};
