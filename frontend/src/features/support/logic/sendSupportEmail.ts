export type SupportTicketType = "bug" | "suggestion" | "other";

export interface SupportEmailPayload {
   access_key: string;
   subject: string;
   from_name: string;
   email: string;
   message: string;
}

export interface SupportEmailApiResult {
   success?: boolean;
   message?: string;
}

export interface SupportResult {
   success: boolean;
   error: string | null;
}

export function validateSupportMessage(message: string): SupportResult {
   if (!message.trim()) {
      return { success: false, error: "A mensagem não pode estar vazia." };
   }
   return { success: true, error: null };
}

export function buildSupportEmailPayload(
   accessKey: string,
   message: string,
   type: SupportTicketType,
   userEmail?: string,
   userId?: string
): SupportEmailPayload {
   return {
      access_key: accessKey,
      subject: `[JJ Reviews] Novo Ticket: ${type.toUpperCase()}`,
      from_name: "JJ Reviews App",
      email: userEmail || "anonimo@jjreviews.com",
      message: `Tipo: ${type}\nUsuário ID: ${userId || "Não logado"}\nEmail: ${userEmail || "Não informado"}\n\nMensagem:\n${message}`,
   };
}

export function mapSupportEmailApiResult(responseOk: boolean, result: SupportEmailApiResult): SupportResult {
   if (responseOk && result.success) {
      return { success: true, error: null };
   }

   return {
      success: false,
      error: `Falha ao enviar email: ${result.message || "Erro ao conectar com o serviço de email."}`,
   };
}

export function mapSupportEmailUnknownError(err: unknown): SupportResult {
   const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
   return { success: false, error: `Falha ao enviar email: ${errorMessage}` };
}