export interface ValidationResult {
   valid: boolean;
   error: string | null;
}

export function sanitizeUsername(input: string): string {
   return input.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function validateUsername(username: string): ValidationResult {
   if (username.length < 3) {
      return { valid: false, error: "O nome de usuário deve ter pelo menos 3 caracteres." };
   }

   return { valid: true, error: null };
}

export function validatePasswordChange(
   currentPassword: string,
   newPassword: string,
   confirmPassword: string
): ValidationResult {
   if (!currentPassword) {
      return { valid: false, error: "Digite a sua senha atual para continuar." };
   }

   if (newPassword !== confirmPassword) {
      return { valid: false, error: "As novas senhas não coincidem!" };
   }

   if (newPassword.length < 6) {
      return { valid: false, error: "A nova senha deve ter pelo menos 6 caracteres." };
   }

   return { valid: true, error: null };
}
