import { useState, useEffect, useCallback } from "react";
import { Modal, Form, Alert, Spinner } from "react-bootstrap";
import { User, Link2 } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { supabase } from "@/lib/supabase";
import getCroppedImg from "@/utils/cropImage";
import type { Session } from "@supabase/supabase-js";
import styles from "./ProfileModal.module.css";

interface ProfileModalProps {
   show: boolean;
   onHide: () => void;
   session: Session | null;
   currentUsername: string;
   onUpdate: (newUsername: string) => void;
}

export function ProfileModal({ show, onHide, session, currentUsername, onUpdate }: ProfileModalProps) {
   const [username, setUsername] = useState(currentUsername);
   const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState("");
   const [success, setSuccess] = useState("");

   const [imageSrc, setImageSrc] = useState<string | null>(null);
   const [crop, setCrop] = useState({ x: 0, y: 0 });
   const [zoom, setZoom] = useState(1);
   const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
   const [uploading, setUploading] = useState(false);

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
         setError("");
         setSuccess("");
         setImageSrc(null);
      }
   }, [show, currentUsername, session]);

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
         setError("");

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
         setSuccess("Foto de perfil atualizada com sucesso!");
         setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
         if (err instanceof Error) {
            setError(err.message);
         } else {
            setError("Erro ao fazer upload da imagem.");
         }
      } finally {
         setUploading(false);
      }
   };

   const handleSaveUsername = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!session?.user.id) return;
      setError("");
      setSuccess("");
      setLoading(true);

      try {
         const { error } = await supabase.from("profiles").update({ username }).eq("id", session.user.id);
         if (error) {
            if (error.code === "23505") throw new Error("Este nome de usuário já está em uso.");
            throw error;
         }
         setSuccess("Perfil atualizado com sucesso!");
         onUpdate(username);
         setTimeout(() => {
            onHide();
            setSuccess("");
         }, 1500);
      } catch (err) {
         if (err instanceof Error) {
            setError(err.message);
         } else {
            setError("Erro ao salvar perfil.");
         }
      } finally {
         setLoading(false);
      }
   };

   const handleShareProfile = () => {
      const profileUrl = `${window.location.origin}/perfil/${currentUsername}`;
      navigator.clipboard.writeText(profileUrl);
      setSuccess("Link copiado! Cole no WhatsApp ou onde desejar.");
      setTimeout(() => setSuccess(""), 3000);
   };

   return (
      <Modal show={show} onHide={() => { onHide(); setImageSrc(null); }} centered backdrop="static">
         <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold">Meu Perfil</Modal.Title>
         </Modal.Header>
         <Modal.Body className="p-4 pt-2">
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            {/* Crop mode */}
            {imageSrc ? (
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
               /* Normal view */
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
                        <Form.Label className={styles.formLabel}>Nome de Usuário</Form.Label>
                        <Form.Control
                           type="text"
                           value={username}
                           onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                           placeholder="seunome"
                           required minLength={3} maxLength={20} className="py-2"
                        />
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
         </Modal.Body>
      </Modal>
   );
}