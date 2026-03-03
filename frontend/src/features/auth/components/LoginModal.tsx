import { useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { supabase } from "@/lib/supabase";

interface LoginModalProps {
   show: boolean;
   onHide: () => void;
}

export function LoginModal({ show, onHide }: LoginModalProps) {
   const [isLogin, setIsLogin] = useState(true);
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState("");

   const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");

      try {
         if (isLogin) {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            onHide();
         } else {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            onHide();
         }
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
            <Modal.Title>{isLogin ? "Login" : "Cadastro"}</Modal.Title>
         </Modal.Header>

         <Modal.Body className="p-4">
            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleLogin}>
               <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Email</Form.Label>
                  <Form.Control
                     type="email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     autoFocus
                  />
               </Form.Group>

               <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Senha</Form.Label>
                  <Form.Control
                     type="password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                  />
               </Form.Group>

               <Button
                  variant="dark"
                  type="submit"
                  className="w-100 mb-3 py-2 fw-bold"
                  disabled={loading}
               >
                  {loading ? "Aguarde..." : isLogin ? "Entrar" : "Cadastrar"}
               </Button>

               <div className="text-center border-top pt-3 mt-2">
                  <Button
                     variant="link"
                     onClick={() => {
                        setIsLogin(!isLogin);
                        setError("");
                     }}
                     className="text-muted text-decoration-none small"
                  >
                     {isLogin
                        ? "Não tem uma conta? Cadastre-se aqui"
                        : "Já tem uma conta? Faça login"}
                  </Button>
               </div>
            </Form>
         </Modal.Body>
      </Modal>
   );
}
