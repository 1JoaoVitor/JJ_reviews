import { useState, useEffect, useCallback } from "react";
import { Modal, Button, Form, Alert, Spinner, Image } from "react-bootstrap";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop"
import { supabase } from "@/lib/supabase";
import getCroppedImg from "@/utils/cropImage";
import type { Session } from "@supabase/supabase-js";

interface ProfileModalProps {
   show: boolean;
   onHide: () => void;
   session: Session | null;
   currentUsername: string;
   onUpdate: (newUsername: string) => void;
}

export function ProfileModal({ show, onHide, session, currentUsername, onUpdate }: ProfileModalProps) {
   // Estados do Perfil
   const [username, setUsername] = useState(currentUsername);
   const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState("");
   const [success, setSuccess] = useState("");

   // Estados do Recorte de Imagem
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
         setImageSrc(null); // Reseta o cropper ao abrir
      }
   }, [show, currentUsername, session]);


   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
         const file = e.target.files[0];
         const imageUrl = URL.createObjectURL(file);
         setImageSrc(imageUrl); // Entra no modo de edição de foto
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
         setUploading(false);
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

            {/* --- MODO EDIÇÃO DE FOTO  --- */}
            {imageSrc ? (
               <div className="d-flex flex-column align-items-center">
                  <div className="w-100 position-relative bg-dark rounded overflow-hidden shadow-sm" style={{ height: "300px" }}>
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
                     <Form.Label className="small text-muted fw-bold text-uppercase mb-0">Ajustar Zoom</Form.Label>
                     <Form.Range min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
                  </div>

                  <div className="d-flex gap-2 w-100 mt-4">
                     <Button variant="outline-secondary" className="w-50 fw-bold" onClick={() => setImageSrc(null)} disabled={uploading}>
                        Cancelar
                     </Button>
                     <Button variant="success" className="w-50 fw-bold" onClick={handleUploadCroppedImage} disabled={uploading}>
                        {uploading ? <Spinner size="sm" animation="border" /> : "Salvar Foto"}
                     </Button>
                  </div>
               </div>
            ) : (
               /* --- MODO VISUALIZAÇÃO NORMAL --- */
               <>
                  <div className="d-flex flex-column align-items-center mb-4">
                     <div 
                        className="rounded-circle bg-secondary mb-3 d-flex align-items-center justify-content-center overflow-hidden border border-3 border-light shadow-sm"
                        style={{ width: "120px", height: "120px" }}
                     >
                        {avatarUrl ? (
                           <Image src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                           <span className="display-4 text-white">👤</span>
                        )}
                     </div>
                     <div>
                        <input type="file" id="avatar-upload" accept="image/*" className="d-none" onChange={handleFileChange} />
                        <Button 
                           variant="outline-primary" 
                           size="sm" 
                           className="rounded-pill px-4 fw-bold"
                           onClick={() => document.getElementById("avatar-upload")?.click()}
                        >
                           Trocar Foto
                        </Button>
                     </div>
                  </div>

                  <hr className="text-muted opacity-25" />

                  <Form onSubmit={handleSaveUsername}>
                     <Form.Group className="mb-4 mt-3">
                        <Form.Label className="fw-bold text-muted small text-uppercase">Nome de Usuário</Form.Label>
                        <Form.Control
                           type="text"
                           value={username}
                           onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                           placeholder="seunome"
                           required minLength={3} maxLength={20} className="py-2"
                        />
                     </Form.Group>

                     <div className="d-flex flex-column gap-3 mt-4">
                        <Button variant="primary" type="submit" className="fw-bold py-2 shadow-sm" disabled={loading || username === currentUsername}>
                           {loading ? <Spinner size="sm" animation="border" /> : "Salvar Nome"}
                        </Button>
                        <Button variant="outline-dark" type="button" className="fw-bold py-2" onClick={handleShareProfile}>
                           🔗 Copiar Link do Meu Perfil
                        </Button>
                     </div>
                  </Form>
               </>
            )}
         </Modal.Body>
      </Modal>
   );
}