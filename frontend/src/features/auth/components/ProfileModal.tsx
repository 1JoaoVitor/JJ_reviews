import { useState, useEffect } from "react";
import { Modal, Button, Form, Alert, Spinner } from "react-bootstrap";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

interface ProfileModalProps {
   show: boolean;
   onHide: () => void;
   session: Session | null;
   currentUsername: string;
   onUpdate: (newUsername: string) => void;
}

export function ProfileModal({
   show,
   onHide,
   session,
   currentUsername,
   onUpdate,
}: ProfileModalProps) {
   const [username, setUsername] = useState(currentUsername);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState("");
   const [success, setSuccess] = useState("");

   useEffect(() => {
      setUsername(currentUsername);
   }, [currentUsername]);

   const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!session?.user.id) return;

      setError("");
      setSuccess("");
      setLoading(true);

      try {
         const { error } = await supabase
            .from("profiles")
            .update({ username })
            .eq("id", session.user.id);

         if (error) {
            if (error.code === "23505")
               throw new Error("Este nome de usuário já está em uso.");
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
            setError("Erro ao salvar perfil: " + err.message);
         } else {
            setError("Ocorreu um erro desconhecido.");
         }
      } finally {
         setLoading(false);
      }
   };

   return (
      <Modal show={show} onHide={onHide} centered>
         <Modal.Header closeButton>
            <Modal.Title className="fw-bold">Meu Perfil</Modal.Title>
         </Modal.Header>

         <Modal.Body className="p-4">
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Form onSubmit={handleSave}>
               <Form.Group className="mb-4">
                  <Form.Label className="fw-bold text-muted small text-uppercase">
                     Nome de Usuário
                  </Form.Label>
                  <Form.Control
                     type="text"
                     value={username}
                     onChange={(e) =>
                        setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))
                     }
                     placeholder="seunome"
                     required
                     minLength={3}
                     maxLength={20}
                  />
                  <Form.Text className="text-muted small">
                     Como seus amigos vão te ver. Sem espaços, letras minúsculas.
                  </Form.Text>
               </Form.Group>

               <Button
                  variant="primary"
                  type="submit"
                  className="w-100 fw-bold py-2"
                  disabled={loading || username === currentUsername}
               >
                  {loading ? <Spinner size="sm" animation="border" /> : "Salvar Alterações"}
               </Button>
            </Form>
         </Modal.Body>
      </Modal>
   );
}
