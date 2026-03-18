export async function sendSupportEmail(
   accessKey: string,
   message: string,
   type: "bug" | "suggestion" | "other",
   userEmail?: string,
   userId?: string
): Promise<{ success: boolean; error: string | null }> {
   if (!message.trim()) {
      return { success: false, error: "A mensagem não pode estar vazia." };
   }

   try {
      const response = await fetch("https://api.web3forms.com/submit", {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
         },
         body: JSON.stringify({
            access_key: accessKey,
            subject: `[JJ Reviews] Novo Ticket: ${type.toUpperCase()}`,
            from_name: "JJ Reviews App",
            email: userEmail || "anonimo@jjreviews.com",
            message: `Tipo: ${type}\nUsuário ID: ${userId || 'Não logado'}\nEmail: ${userEmail || 'Não informado'}\n\nMensagem:\n${message}`,
         }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
         throw new Error(result.message || "Erro ao conectar com o serviço de email.");
      }

      return { success: true, error: null };
   } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      return { success: false, error: `Falha ao enviar email: ${errorMessage}` };
   }
}