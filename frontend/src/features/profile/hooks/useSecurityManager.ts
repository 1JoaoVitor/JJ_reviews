import { useState } from "react";
import toast from "react-hot-toast";
import type { Session } from "@supabase/supabase-js";
import { validatePasswordChange } from "../logic/profileInput";
import {
   deleteCurrentUserAccount,
   updateCurrentUserPassword,
   verifyCurrentPassword,
} from "../services/securityService";

export function useSecurityManager(session: Session | null, onLogoutSuccess: () => void) {
   const [currentPassword, setCurrentPassword] = useState("");
   const [newPassword, setNewPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [savingPassword, setSavingPassword] = useState(false);
   
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);

   const handleSavePassword = async (e: React.FormEvent, onSuccess: () => void) => {
      e.preventDefault();

      const passwordValidation = validatePasswordChange(currentPassword, newPassword, confirmPassword);
      if (!passwordValidation.valid) {
         return toast.error(passwordValidation.error || "Dados de senha inválidos.");
      }

      setSavingPassword(true);
      try {
         await verifyCurrentPassword(session?.user.email || "", currentPassword);
         await updateCurrentUserPassword(newPassword);
         
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
         await deleteCurrentUserAccount();
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