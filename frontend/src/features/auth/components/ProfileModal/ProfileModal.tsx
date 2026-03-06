import { useState, useEffect, useCallback } from "react";
import { Modal, Form, Spinner } from "react-bootstrap";
import toast from "react-hot-toast";
import { User, Link2, Shield, Lock, LogOut, AlertTriangle } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

import { supabase } from "@/lib/supabase";
import getCroppedImg from "@/utils/cropImage";
import type { Session } from "@supabase/supabase-js";
import styles from "./ProfileModal.module.css";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";

interface ProfileModalProps {
   show: boolean;
   onHide: () => void;
   session: Session | null;
   currentUsername: string;
   onUpdate: (newUsername: string) => void;
   onLogout: () => void;
   forceLogout: () => void;
}

type TabType = "profile" | "security";

export function ProfileModal({ show, onHide, session, currentUsername, onUpdate, onLogout, forceLogout}: ProfileModalProps) {
   // Navegação
   const [activeTab, setActiveTab] = useState<TabType>("profile");

   // Estados de Perfil
   const [username, setUsername] = useState(currentUsername);
   const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
   const [loading, setLoading] = useState(false);

   // Estados do Cropper (Avatar)
   const [imageSrc, setImageSrc] = useState<string | null>(null);
   const [crop, setCrop] = useState({ x: 0, y: 0 });
   const [zoom, setZoom] = useState(1);
   const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
   const [uploading, setUploading] = useState(false);

   // Estados de Segurança (Senha)
   const [currentPassword, setCurrentPassword] = useState("");
   const [newPassword, setNewPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [savingPassword, setSavingPassword] = useState(false);

   // ─── ESTADOS DE EXCLUSÃO ───
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);

   useEffect(() => {
      const fetchProfileData = async () => {
         try {
            const { data, error } = await supabase
               .from("profiles")
               .select("avatar_url, username")
               .eq("id", session!.user.id)
               .single();

            if (error) throw error;
            if (data) {
               setAvatarUrl(data.avatar_url);
               setUsername(data.username || currentUsername);
            }
         } catch (err) {
            console.error("Erro ao carregar perfil:", err);
         }
      };

      if (show && session?.user.id) {
         setUsername(currentUsername);
         fetchProfileData();
         setImageSrc(null);
         setActiveTab("profile"); // Reseta para a aba perfil ao abrir
         setCurrentPassword("");
         setNewPassword("");
         setConfirmPassword("");
      }
   }, [show, currentUsername, session]);

   // ─── FUNÇÕES DO AVATAR ───
   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
         const file = e.target.files[0];
         const imageUrl = URL.createObjectURL(file);
         setImageSrc(imageUrl);
      }
   };

   const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
   }, []);

   const handleUploadCroppedImage = async () => {
      if (!imageSrc || !croppedAreaPixels || !session?.user.id) return;

      try {
         setUploading(true);
         const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
         if (!croppedImageBlob) throw new Error("Erro ao processar imagem.");

         const fileName = `${session.user.id}-${Math.random()}.jpg`;

         const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(fileName, croppedImageBlob, { upsert: true, contentType: "image/jpeg" });

         if (uploadError) throw uploadError;

         const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);

         const { error: updateError } = await supabase
            .from("profiles")
            .update({ avatar_url: publicUrl })
            .eq("id", session.user.id);

         if (updateError) throw updateError;

         setAvatarUrl(publicUrl);
         setImageSrc(null);
         toast.success("Foto de perfil atualizada com sucesso!");
      } catch (err) {
         if (err instanceof Error) toast.error(err.message);
         else toast.error("Erro ao fazer upload da imagem.");
      } finally {
         setUploading(false);
      }
   };

   // ─── FUNÇÕES DO PERFIL ───
   const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const valorLimpo = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      setUsername(valorLimpo);
   };

   const handleSaveUsername = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!session?.user.id) return;
      if (username.length < 3) {
         toast.error("O nome de usuário deve ter pelo menos 3 caracteres.");
         return;
      }

      setLoading(true);
      try {
         const { error } = await supabase.from("profiles").update({ username }).eq("id", session.user.id);
         if (error) {
            if (error.code === "23505") throw new Error("Este nome de usuário já está em uso.");
            throw error;
         }
         toast.success("Perfil atualizado com sucesso!");
         onUpdate(username);
         setTimeout(() => {
            onHide();
         }, 1500);
      } catch (err) {
         if (err instanceof Error) toast.error(err.message);
         else toast.error("Erro ao salvar perfil.");
      } finally {
         setLoading(false);
      }
   };

   const handleShareProfile = () => {
      const profileUrl = `${window.location.origin}/perfil/${currentUsername}`;
      navigator.clipboard.writeText(profileUrl);
      toast.success("Link copiado, compartilhe com seus amigos!");
   };

   // ─── FUNÇÕES DE SEGURANÇA ───
   const handleSavePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentPassword) {
         toast.error("Digite a sua senha atual para continuar.");
         return;
      }
      if (newPassword !== confirmPassword) {
         toast.error("As novas senhas não coincidem!");
         return;
      }
      if (newPassword.length < 6) {
         toast.error("A nova senha deve ter pelo menos 6 caracteres.");
         return;
      }

      setSavingPassword(true);
      try {
         // 1. Verifica se a senha antiga está correta tentando fazer login "por baixo dos panos"
         const { error: verifyError } = await supabase.auth.signInWithPassword({
            email: session?.user.email || '',
            password: currentPassword
         });

         if (verifyError) {
            throw new Error("A senha atual está incorreta.");
         }

         // 2. Se a senha antiga estiver certa, atualizamos para a nova
         const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
         if (updateError) throw updateError;
         
         toast.success("Senha atualizada com sucesso!");
         setCurrentPassword("");
         setNewPassword("");
         setConfirmPassword("");
         setActiveTab("profile");
      } catch (err) {
         if(err instanceof Error){
            toast.error(err.message || "Erro ao atualizar a senha.");
         } else{
            toast.error("Erro desconhedido ao atualizar a senha.");
         }
      } finally {
         setSavingPassword(false);
      }
   };

   // ─── FUNÇÃO DE EXCLUIR CONTA ───
   const handleDeleteAccount = async () => {
      setIsDeleting(true);
      try {
         const { error } = await supabase.rpc('delete_user');
         if (error) throw error;
         toast.success("Conta excluída com sucesso.");
         setShowDeleteConfirm(false);
         onHide();
         forceLogout();
      } catch (err) {
         if(err instanceof Error){
            console.error(err);
            toast.error("Erro ao excluir conta. Contacte o suporte.");
         } else{
            toast.error("Erro desconhecido ao excluir conta. Contacte o suporte.");
         }
      } finally {
         setIsDeleting(false);
      }
   };

   return (
      <Modal show={show} onHide={() => { onHide(); setImageSrc(null); }} centered backdrop="static" contentClassName={styles.modalContent}>
         <Modal.Header closeButton closeVariant="white" className={styles.header}>
            <Modal.Title className={styles.title}>Configurações</Modal.Title>
            
            {/* Esconde as abas se o modo Crop (cortar foto) estiver ativo, para dar mais espaço */}
            {!imageSrc && (
               <div className={styles.tabs}>
                  <button 
                     className={`${styles.tabBtn} ${activeTab === "profile" ? styles.tabBtnActive : ""}`}
                     onClick={() => setActiveTab("profile")}
                  >
                     <User size={18} /> Perfil
                  </button>
                  <button 
                     className={`${styles.tabBtn} ${activeTab === "security" ? styles.tabBtnActive : ""}`}
                     onClick={() => setActiveTab("security")}
                  >
                     <Shield size={18} /> Segurança
                  </button>
               </div>
            )}
         </Modal.Header>
         
         <Modal.Body className={styles.body}>

            {imageSrc ? (
               /* ─── CROP MODE (AVATAR) ─── */
               <div className="d-flex flex-column align-items-center">
                  <div className={styles.cropperContainer}>
                     <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                     />
                  </div>
                  <div className="w-100 mt-4 px-2">
                     <Form.Label className={styles.zoomLabel}>Ajustar Zoom</Form.Label>
                     <Form.Range min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
                  </div>
                  <div className={styles.cropActions}>
                     <button className={styles.cancelBtn} onClick={() => setImageSrc(null)} disabled={uploading}>
                        Cancelar
                     </button>
                     <button className={styles.confirmBtn} onClick={handleUploadCroppedImage} disabled={uploading}>
                        {uploading ? <Spinner size="sm" animation="border" /> : "Salvar Foto"}
                     </button>
                  </div>
               </div>
            ) : (
               /* ─── NORMAL VIEW (ABAS) ─── */
               <>
                  {activeTab === "profile" && (
                     <>
                        <div className={styles.avatarWrapper}>
                           <div className={styles.avatarCircle}>
                              {avatarUrl ? (
                                 <img src={avatarUrl} alt="Avatar" className={styles.avatarImage} />
                              ) : (
                                 <User size={48} className={styles.avatarPlaceholder} />
                              )}
                           </div>
                           <div>
                              <input type="file" id="avatar-upload" accept="image/*" className="d-none" onChange={handleFileChange} />
                              <button
                                 className={styles.changePhotoBtn}
                                 onClick={() => document.getElementById("avatar-upload")?.click()}
                              >
                                 Trocar Foto
                              </button>
                           </div>
                        </div>

                        <hr className={styles.divider} />

                        <Form onSubmit={handleSaveUsername}>
                           <Form.Group className="mb-4 mt-3">
                              <Form.Label className={styles.label}>Nome de usuário</Form.Label>
                              <div className={styles.inputGroup}>
                                 <User className={styles.inputIcon} size={18} />
                                 <Form.Control
                                    type="text"
                                    value={username}
                                    onChange={handleUsernameChange}
                                    placeholder="seunome"
                                    required minLength={3} maxLength={20} 
                                    className={styles.input}
                                 />
                              </div>
                           </Form.Group>

                           <div className="d-flex flex-column gap-3 mt-4">
                              <button type="submit" className={styles.saveBtn} disabled={loading || username === currentUsername}>
                                 {loading ? <Spinner size="sm" animation="border" /> : "Salvar Nome"}
                              </button>
                              <button type="button" className={styles.shareLinkBtn} onClick={handleShareProfile}>
                                 <Link2 size={16} /> Copiar Link do Meu Perfil
                              </button>
                           </div>
                        </Form>
                     </>
                  )}

                  {activeTab === "security" && (
                     <>
                        <Form onSubmit={handleSavePassword}>
                           <Form.Group className="mb-4 mt-2">
                              <Form.Label className={styles.label}>Senha Atual</Form.Label>
                              <div className={styles.inputGroup}>
                                 <Lock className={styles.inputIcon} size={18} />
                                 <Form.Control type="password" placeholder="Digite a sua senha atual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={styles.input} required />
                              </div>
                           </Form.Group>

                           <hr className={styles.divider} />

                           <Form.Group className="mb-3 mt-4">
                              <Form.Label className={styles.label}>Nova Senha</Form.Label>
                              <div className={styles.inputGroup}>
                                 <Lock className={styles.inputIcon} size={18} />
                                 <Form.Control type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={styles.input} required />
                              </div>
                           </Form.Group>

                           <Form.Group className="mb-4">
                              <Form.Label className={styles.label}>Confirmar Nova Senha</Form.Label>
                              <div className={styles.inputGroup}>
                                 <Lock className={styles.inputIcon} size={18} />
                                 <Form.Control type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={styles.input} required />
                              </div>
                           </Form.Group>

                           <button type="submit" className={styles.saveBtn} disabled={savingPassword || !newPassword || !currentPassword}>
                              {savingPassword ? <Spinner size="sm" animation="border" /> : "Atualizar Senha"}
                           </button>
                        </Form>

                        {/* Botão de Excluir Conta fica na aba de Segurança */}
                        <button className={styles.deleteAccountBtn} onClick={() => setShowDeleteConfirm(true)} type="button">
                           <AlertTriangle size={18} /> Excluir Minha Conta
                        </button>
                     </>
                  )}

                  {/* O botão de Sair só aparece na aba Perfil para não sobrecarregar a tela */}
                  {activeTab === "profile" && (
                     <button className={styles.logoutBtn} onClick={onLogout} type="button">
                        <LogOut size={18} /> Sair da Conta
                     </button>
                  )}
               </>
            )}
         </Modal.Body>

         {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
         <ConfirmModal
            show={showDeleteConfirm}
            onHide={() => setShowDeleteConfirm(false)}
            onConfirm={handleDeleteAccount}
            title="Excluir Conta Definitivamente"
            message="Tem a certeza absoluta? Esta ação não pode ser desfeita. Todos os seus filmes, listas e avaliações serão apagados para sempre."
            confirmText="Sim, excluir"
            isProcessing={isDeleting}
         />
      </Modal>
   );
}