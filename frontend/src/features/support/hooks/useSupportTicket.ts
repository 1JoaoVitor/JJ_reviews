import { useState } from "react";
import { sendSupportEmail } from "../logic/sendSupportEmail";
import { useAuth } from "@/features/auth"; 

export function useSupportTicket() {
   const { session } = useAuth();
   const [isSubmitting, setIsSubmitting] = useState(false);

   const sendTicket = async (message: string, type: "bug" | "suggestion" | "other", manualEmail?: string) => {
      setIsSubmitting(true);

      const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
      if (!accessKey) {
         setIsSubmitting(false);
         return { success: false, error: "Chave do Web3Forms não configurada." };
      }

      const userEmail = manualEmail || session?.user?.email;
      const userId = session?.user?.id;

      const result = await sendSupportEmail(accessKey, message, type, userEmail, userId);

      setIsSubmitting(false);
      return result;
   };

   return { sendTicket, isSubmitting };
}