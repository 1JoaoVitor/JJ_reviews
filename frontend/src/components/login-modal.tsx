import { useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { supabase } from "../supabaseClient";

interface LoginModalProps {
   show: boolean;
   onHide: () => void;
}

export function LoginModal({ show, onHide }: LoginModalProps) {
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState("");

   const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");

      try {
         const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
         });

         if (error) throw error;
         onHide(); // Fecha o modal ao logar
      } catch (err) {
         if (err instanceof Error) {
            setError("Erro ao logar: " + err.message);
         } else {
            setError("Ocorreu um erro desconhecido.");
         }
      } finally {
         setLoading(false);
      }
   };

   return (
      <Modal show={show} onHide={onHide} centered size="sm">
         <Modal.Header closeButton>
            <Modal.Title>Acesso Admin</Modal.Title>
         </Modal.Header>
         <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleLogin}>
               <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                     type="email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     autoFocus
                  />
               </Form.Group>
               <Form.Group className="mb-3">
                  <Form.Label>Senha</Form.Label>
                  <Form.Control
                     type="password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                  />
               </Form.Group>
               <Button
                  variant="dark"
                  type="submit"
                  className="w-100"
                  disabled={loading}
               >
                  {loading ? "Entrando..." : "Entrar"}
               </Button>
            </Form>
         </Modal.Body>
      </Modal>
   );
}
