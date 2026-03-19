import { useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export function useSecurityManager(session: Session | null, onLogoutSuccess: () => void) {
   const [currentPassword, setCurrentPassword] = useState("");
   const [newPassword, setNewPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [savingPassword, setSavingPassword] = useState(false);
   
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);

   const handleSavePassword = async (e: React.FormEvent, onSuccess: () => void) => {
      e.preventDefault();
      if (!currentPassword) return toast.error("Digite a sua senha atual para continuar.");
      if (newPassword !== confirmPassword) return toast.error("As novas senhas não coincidem!");
      if (newPassword.length < 6) return toast.error("A nova senha deve ter pelo menos 6 caracteres.");

      setSavingPassword(true);
      try {
         const { error: verifyError } = await supabase.auth.signInWithPassword({
            email: session?.user.email || '',
            password: currentPassword
         });

         if (verifyError) throw new Error("A senha atual está incorreta.");

         const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
         if (updateError) throw updateError;
         
         toast.success("Senha atualizada com sucesso!");
         setCurrentPassword("");
         setNewPassword("");
         setConfirmPassword("");
         onSuccess(); // Retorna para a aba de perfil
      } catch (err) {
         toast.error(err instanceof Error ? err.message : "Erro ao atualizar a senha.");
      } finally {
         setSavingPassword(false);
      }
   };

   const handleDeleteAccount = async () => {
      setIsDeleting(true);
      try {
         const { error } = await supabase.rpc('delete_user');
         if (error) throw error;
         toast.success("Conta excluída com sucesso.");
         setShowDeleteConfirm(false);
         onLogoutSuccess(); // Desloga e redireciona
      } catch (err) {
         toast.error("Erro ao excluir conta. Contacte o suporte." + err);
      } finally {
         setIsDeleting(false);
      }
   };

   return {
      currentPassword, newPassword, confirmPassword, savingPassword,
      showDeleteConfirm, isDeleting,
      setCurrentPassword, setNewPassword, setConfirmPassword, setShowDeleteConfirm,
      handleSavePassword, handleDeleteAccount
   };
}