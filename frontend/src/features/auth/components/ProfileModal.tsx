import { useState, useEffect } from "react";
import { Modal, Button, Form, Alert, Spinner, Image } from "react-bootstrap";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

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
   const [uploading, setUploading] = useState(false);
   const [error, setError] = useState("");
   const [success, setSuccess] = useState("");

   // Sempre que abrir o modal, busca a foto atual e confirma o nome
   useEffect(() => {
      // Busca os dados diretamente da tabela profiles
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
      }
   }, [show, currentUsername, session,]);



   // Lógica de Upload de Imagem
   const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      try {
         setUploading(true);
         setError("");
         setSuccess("");

         if (!event.target.files || event.target.files.length === 0) {
            throw new Error("Você precisa selecionar uma imagem.");
         }

         const file = event.target.files[0];
         const fileExt = file.name.split('.').pop();
         
         // Cria um nome único para o ficheiro para evitar substituições indesejadas
         const fileName = `${session?.user.id}-${Math.random()}.${fileExt}`;
         const filePath = `${fileName}`; // Será salvo na raiz do bucket 'avatars'

         // 1. Faz o upload para o Supabase Storage
         const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true });

         if (uploadError) throw uploadError;

         // 2. Resgata a URL Pública da imagem que acabamos de subir
         const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

         // 3. Salva essa URL no perfil do usuário
         const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', session?.user.id);

         if (updateError) throw updateError;

         setAvatarUrl(publicUrl);
         setSuccess("Foto de perfil atualizada com sucesso!");
         setTimeout(() => setSuccess(""), 10000);

      } catch (err) {
         if(err instanceof Error) {
            setError(err.message || "Erro ao fazer upload da imagem.");
         } else {
            setError("Ocorreu um erro desconhecido ao fazer upload da imagem.");
         }
      } finally {
         setUploading(false);
      }
   };

   // Salva o Nome de Usuário
   const handleSaveUsername = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!session?.user.id) return;

      setError("");
      setSuccess("");
      setLoading(true);

      try {
         const { error } = await supabase
            .from("profiles")
            .update({ username: username })
            .eq("id", session.user.id);

         if (error) {
            if (error.code === '23505') throw new Error("Este nome de usuário já está em uso.");
            throw error;
         }

         setSuccess("Nome atualizado com sucesso!");
         onUpdate(username); 
         setTimeout(() => {
            onHide();
            setSuccess("");
         }, 1500);

      } catch (err) {
         if (err instanceof Error) {
            setError(err.message || "Erro ao salvar perfil.");
         } else {
            setError("Ocorreu um erro desconhecido ao salvar perfil.");
         }
      } finally {
         setLoading(false);
      }
   };

   const handleShareProfile = () => {
      const profileUrl = `${window.location.origin}/perfil/${currentUsername}`;
      navigator.clipboard.writeText(profileUrl);
      setSuccess("Link copiado. Compartilhe com seus amigos onde desejar!");
      setTimeout(() => setSuccess(""), 10000);
   };

   return (
      <Modal show={show} onHide={onHide} centered>
         <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold">Meu Perfil</Modal.Title>
         </Modal.Header>
         <Modal.Body className="p-4 pt-2">
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            {/* --- 1. FOTO DE PERFIL --- */}
            <div className="d-flex flex-column align-items-center mb-4">
               <div 
                  className="rounded-circle bg-secondary mb-3 d-flex align-items-center justify-content-center overflow-hidden border border-3 border-light shadow-sm"
                  style={{ width: "120px", height: "120px" }}
               >
                  {avatarUrl ? (
                     <Image 
                        src={avatarUrl} 
                        alt="Avatar" 
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                     />
                  ) : (
                     <span className="display-4 text-white">👤</span>
                  )}
               </div>
               
               <div>
                  <input 
                     type="file" 
                     id="avatar-upload" 
                     accept="image/*" 
                     className="d-none" 
                     onChange={handleAvatarUpload}
                     disabled={uploading}
                  />
                  <Button 
                     variant="outline-primary" 
                     size="sm" 
                     className="rounded-pill px-4 fw-bold"
                     onClick={() => document.getElementById("avatar-upload")?.click()}
                     disabled={uploading}
                  >
                     {uploading ? <Spinner size="sm" animation="border" /> : "Trocar Foto"}
                  </Button>
               </div>
            </div>

            <hr className="text-muted opacity-25" />

            {/* --- 2. NOME DE USUÁRIO E BOTÕES DE AÇÃO --- */}
            <Form onSubmit={handleSaveUsername}>
               <Form.Group className="mb-4 mt-3">
                  <Form.Label className="fw-bold text-muted small text-uppercase">Nome de Usuário</Form.Label>
                  <Form.Control
                     type="text"
                     value={username}
                     onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                     placeholder="seunome"
                     required
                     minLength={3}
                     maxLength={20}
                     className="py-2"
                  />
                  <Form.Text className="text-muted small">
                     Seus amigos encontrarão a sua lista em /perfil/<strong>{username || "nome"}</strong>
                  </Form.Text>
               </Form.Group>

               {/* Container dos botões com classe gap-3 para manter distância limpa */}
               <div className="d-flex flex-column gap-3 mt-4">
                  <Button 
                     variant="primary" 
                     type="submit" 
                     className="fw-bold py-2 shadow-sm" 
                     disabled={loading || username === currentUsername}
                  >
                     {loading ? <Spinner size="sm" animation="border" /> : "Salvar Nome"}
                  </Button>
                  
                  <Button 
                     variant="outline-dark" 
                     type="button" 
                     className="fw-bold py-2" 
                     onClick={handleShareProfile}
                  >
                     🔗 Copiar Link do Meu Perfil
                  </Button>
               </div>
            </Form>
         </Modal.Body>
      </Modal>
   );
}