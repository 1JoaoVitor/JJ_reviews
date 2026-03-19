import {
   buildSupportEmailPayload,
   mapSupportEmailApiResult,
   mapSupportEmailUnknownError,
   validateSupportMessage,
   type SupportResult,
   type SupportTicketType,
} from "../logic/sendSupportEmail";

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

export async function sendSupportEmail(
   accessKey: string,
   message: string,
   type: SupportTicketType,
   userEmail?: string,
   userId?: string
): Promise<SupportResult> {
   const validation = validateSupportMessage(message);
   if (!validation.success) return validation;

   const payload = buildSupportEmailPayload(accessKey, message, type, userEmail, userId);

   try {
      const response = await fetch(WEB3FORMS_ENDPOINT, {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
         },
         body: JSON.stringify(payload),
      });

      const result = await response.json();
      return mapSupportEmailApiResult(response.ok, result);
   } catch (err) {
      return mapSupportEmailUnknownError(err);
   }
}
