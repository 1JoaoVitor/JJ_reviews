import { useState } from "react";
import { Form, Spinner } from "react-bootstrap";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { User, Link2, Shield, Lock, LogOut, AlertTriangle, MessageSquare, ArrowLeft } from "lucide-react";
import Cropper from "react-easy-crop";

import { useAuth } from "@/features/auth";
import { useProfileManager } from "../../hooks/useProfileManager";
import { useSecurityManager } from "../../hooks/useSecurityManager";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";
import styles from "./ProfilePage.module.css";

type TabType = "profile" | "security";

export function ProfilePage() {
   const navigate = useNavigate();
   const { session, logout, updateUsername, fetchProfile } = useAuth(); 
   const [activeTab, setActiveTab] = useState<TabType>("profile");

   const handleLogoutAction = async () => {
      await logout();
      navigate("/");
   };

   // Consumindo os nossos hooks limpos
   const profile = useProfileManager(session, async (newUsername) => {
      updateUsername(newUsername);
      if (session?.user.id) {
         await fetchProfile(session.user.id);
      }
   });
   const security = useSecurityManager(session, handleLogoutAction);

   const handleShareProfile = () => {
      const profileUrl = `${window.location.origin}/perfil/${profile.currentUsernameState}`;
      navigator.clipboard.writeText(profileUrl);
      toast.success("Link copiado, compartilhe com seus amigos!");
   };

   return (
      <div className={styles.pageContainer}>
         <header className={styles.header}>
            <div className={styles.headerTop}>
               <button onClick={() => navigate(-1)} className={styles.backBtn} aria-label="Voltar">
                  <ArrowLeft size={24} />
               </button>
               <h1 className={styles.title}>Configurações</h1>
            </div>
            
            {!profile.imageSrc && (
               <div className={styles.tabs}>
                  <button className={`${styles.tabBtn} ${activeTab === "profile" ? styles.tabBtnActive : ""}`} onClick={() => setActiveTab("profile")}>
                     <User size={18} /> Perfil
                  </button>
                  <button className={`${styles.tabBtn} ${activeTab === "security" ? styles.tabBtnActive : ""}`} onClick={() => setActiveTab("security")}>
                     <Shield size={18} /> Segurança
                  </button>
               </div>
            )}
         </header>
         
         <main className={styles.body}>
            {profile.imageSrc ? (
               /* ─── CROP MODE (AVATAR) ─── */
               <div className="d-flex flex-column align-items-center">
                  <div className={styles.cropperContainer}>
                     <Cropper image={profile.imageSrc} crop={profile.crop} zoom={profile.zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={profile.setCrop} onCropComplete={profile.onCropComplete} onZoomChange={profile.setZoom} />
                  </div>
                  <div className="w-100 mt-4 px-2">
                     <Form.Label className={styles.zoomLabel}>Ajustar Zoom</Form.Label>
                     <Form.Range min={1} max={3} step={0.1} value={profile.zoom} onChange={(e) => profile.setZoom(Number(e.target.value))} />
                  </div>
                  <div className={styles.cropActions}>
                     <button className={styles.cancelBtn} onClick={() => profile.setImageSrc(null)} disabled={profile.uploading}>Cancelar</button>
                     <button className={styles.confirmBtn} onClick={profile.handleUploadCroppedImage} disabled={profile.uploading}>
                        {profile.uploading ? <Spinner size="sm" animation="border" /> : "Salvar Foto"}
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
                              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Avatar" className={styles.avatarImage} /> : <User size={48} className={styles.avatarPlaceholder} />}
                           </div>
                           <div>
                              <input type="file" id="avatar-upload" accept="image/*" className="d-none" onChange={profile.handleFileChange} />
                              <button className={styles.changePhotoBtn} onClick={() => document.getElementById("avatar-upload")?.click()}>Trocar Foto</button>
                           </div>
                        </div>

                        <hr className={styles.divider} />

                        <Form onSubmit={profile.handleSaveUsername}>
                           <Form.Group className="mb-4 mt-3">
                              <label className={styles.label}>Nome de usuário</label>
                              <div className={styles.inputGroup}>
                                 <User className={styles.inputIcon} size={18} />
                                 <input type="text" value={profile.username} onChange={profile.handleUsernameChange} placeholder="seunome" required minLength={3} maxLength={20} className={styles.input} />
                              </div>
                           </Form.Group>

                           <div className="d-flex flex-column gap-3 mt-4">
                              <button type="submit" className={styles.saveBtn} disabled={profile.loading || profile.username === profile.currentUsernameState}>
                                 {profile.loading ? <Spinner size="sm" animation="border" /> : "Salvar Nome"}
                              </button>
                              <button type="button" className={styles.shareLinkBtn} onClick={handleShareProfile}>
                                 <Link2 size={16} /> Copiar Link do Meu Perfil
                              </button>
                           </div>

                           <div className="mt-3">
                              <button type="button" className={styles.supportBtn} onClick={() => navigate("/support")}>
                                 <MessageSquare size={18} /> Suporte e Feedback
                              </button>
                           </div>
                        </Form>
                     </>
                  )}

                  {activeTab === "security" && (
                     <>
                        <Form onSubmit={(e) => security.handleSavePassword(e, () => setActiveTab("profile"))}>
                           <Form.Group className="mb-4 mt-2">
                              <label className={styles.label}>Senha Atual</label>
                              <div className={styles.inputGroup}>
                                 <Lock className={styles.inputIcon} size={18} />
                                 <input type="password" placeholder="Digite a sua senha atual" value={security.currentPassword} onChange={(e) => security.setCurrentPassword(e.target.value)} className={styles.input} required />
                              </div>
                           </Form.Group>

                           <hr className={styles.divider} />

                           <Form.Group className="mb-3 mt-4">
                              <label className={styles.label}>Nova Senha</label>
                              <div className={styles.inputGroup}>
                                 <Lock className={styles.inputIcon} size={18} />
                                 <input type="password" placeholder="••••••••" value={security.newPassword} onChange={(e) => security.setNewPassword(e.target.value)} className={styles.input} required />
                              </div>
                           </Form.Group>

                           <Form.Group className="mb-4">
                              <label className={styles.label}>Confirmar Nova Senha</label>
                              <div className={styles.inputGroup}>
                                 <Lock className={styles.inputIcon} size={18} />
                                 <input type="password" placeholder="••••••••" value={security.confirmPassword} onChange={(e) => security.setConfirmPassword(e.target.value)} className={styles.input} required />
                              </div>
                           </Form.Group>

                           <button type="submit" className={styles.saveBtn} disabled={security.savingPassword || !security.newPassword || !security.currentPassword}>
                              {security.savingPassword ? <Spinner size="sm" animation="border" /> : "Atualizar Senha"}
                           </button>
                        </Form>

                        <button className={styles.deleteAccountBtn} onClick={() => security.setShowDeleteConfirm(true)} type="button">
                           <AlertTriangle size={18} /> Excluir Minha Conta
                        </button>
                     </>
                  )}

                  {activeTab === "profile" && (
                     <button className={styles.logoutBtn} onClick={handleLogoutAction} type="button">
                        <LogOut size={18} /> Sair da Conta
                     </button>
                  )}
               </>
            )}
         </main>

         <ConfirmModal
            show={security.showDeleteConfirm}
            onHide={() => security.setShowDeleteConfirm(false)}
            onConfirm={security.handleDeleteAccount}
            title="Excluir Conta Definitivamente"
            message="Tem a certeza absoluta? Esta ação não pode ser desfeita. Todos os seus filmes, listas e avaliações serão apagados para sempre."
            confirmText="Sim, excluir"
            isProcessing={security.isDeleting}
         />
      </div>
   );
}