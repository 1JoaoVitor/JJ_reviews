import { useState } from "react";
import { Modal, Form, Alert } from "react-bootstrap";
import { supabase } from "@/lib/supabase";
import styles from "./LoginModal.module.css";

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
         <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold">{isLogin ? "Login" : "Cadastro"}</Modal.Title>
         </Modal.Header>

         <Modal.Body className="p-4 pt-2">
            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleLogin}>
               <Form.Group className="mb-3">
                  <Form.Label className={styles.formLabel}>Email</Form.Label>
                  <Form.Control
                     type="email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     autoFocus
                  />
               </Form.Group>

               <Form.Group className="mb-4">
                  <Form.Label className={styles.formLabel}>Senha</Form.Label>
                  <Form.Control
                     type="password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                  />
               </Form.Group>

               <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={loading}
               >
                  {loading ? "Aguarde..." : isLogin ? "Entrar" : "Cadastrar"}
               </button>

               <div className={styles.toggleArea}>
                  <button
                     type="button"
                     className={styles.toggleBtn}
                     onClick={() => {
                        setIsLogin(!isLogin);
                        setError("");
                     }}
                  >
                     {isLogin
                        ? "Não tem uma conta? Cadastre-se aqui"
                        : "Já tem uma conta? Faça login"}
                  </button>
               </div>
            </Form>
         </Modal.Body>
      </Modal>
   );
}
