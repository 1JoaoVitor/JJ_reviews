import { useState, useEffect } from "react";
import { Container, Form, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./ResetPassword.module.css";
import { getCurrentSession, updateCurrentUserPassword } from "../../services/authService";

export function ResetPassword() {
   const [newPassword, setNewPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [showPassword, setShowPassword] = useState(false);
   const [loading, setLoading] = useState(false);
   const navigate = useNavigate();

   // Verifica se o utilizador chegou aqui através de um link válido
   useEffect(() => {
      getCurrentSession().then((session) => {
         if (!session) {
            toast.error("Link de recuperação inválido ou expirado.");
            navigate("/"); // Expulsa para a página inicial se não tiver o token
         }
      });
   }, [navigate]);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
         toast.error("As senhas não coincidem!");
         return;
      }
      if (newPassword.length < 6) {
         toast.error("A senha deve ter pelo menos 6 caracteres.");
         return;
      }

      setLoading(true);
      try {
         // O Supabase já logou o utilizador com o clique no email, basta atualizar a senha
         await updateCurrentUserPassword(newPassword);

         toast.success("Senha alterada com sucesso! Bem-vindo de volta.");
         navigate("/"); // Manda o utilizador de volta para a página inicial
      } catch (err) {
        if (err instanceof Error) {
            toast.error(err.message || "Erro ao alterar a senha.")
        } else{
            toast.error("Erro desconhedio ao alterar a senha.")
        }
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className={styles.pageBackground}>
         <Container className="d-flex justify-content-center align-items-center min-vh-100">
            <div className={styles.card}>
               <h2 className={styles.title}>Redefinir Senha</h2>
               <p className={styles.subtitle}>Digite a sua nova senha abaixo para recuperar o acesso à sua conta.</p>

               <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                     <Form.Label className={styles.label}>Nova Senha</Form.Label>
                     <div className={styles.inputGroup}>
                        <Lock className={styles.inputIcon} size={18} />
                        <Form.Control
                           type={showPassword ? "text" : "password"}
                           placeholder="••••••••"
                           value={newPassword}
                           onChange={(e) => setNewPassword(e.target.value)}
                           className={styles.input}
                           required
                        />
                        <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
                           {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                     </div>
                  </Form.Group>

                  <Form.Group className="mb-4">
                     <Form.Label className={styles.label}>Confirmar Nova Senha</Form.Label>
                     <div className={styles.inputGroup}>
                        <Lock className={styles.inputIcon} size={18} />
                        <Form.Control
                           type={showPassword ? "text" : "password"}
                           placeholder="••••••••"
                           value={confirmPassword}
                           onChange={(e) => setConfirmPassword(e.target.value)}
                           className={styles.input}
                           required
                        />
                     </div>
                  </Form.Group>

                  <button type="submit" className={styles.submitBtn} disabled={loading || !newPassword}>
                     {loading ? <Spinner size="sm" animation="border" /> : "Salvar Nova Senha"}
                  </button>
               </Form>
            </div>
         </Container>
      </div>
   );
}