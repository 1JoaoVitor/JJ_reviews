import { useState } from "react";
import { Modal, Form, Spinner } from "react-bootstrap";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import styles from "./LoginModal.module.css";

interface LoginModalProps {
   show: boolean;
   onHide: () => void;
}

type AuthMode = "login" | "register" | "forgot";

export function LoginModal({ show, onHide }: LoginModalProps) {
   const [mode, setMode] = useState<AuthMode>("login");
   
   // Separamos o campo de login dos campos de registo para ficar mais organizado
   const [loginId, setLoginId] = useState(""); 
   const [email, setEmail] = useState("");
   const [username, setUsername] = useState("");
   const [password, setPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   
   const [showPassword, setShowPassword] = useState(false);
   const [loading, setLoading] = useState(false);

   const resetForm = () => {
      setLoginId("");
      setEmail("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setMode("login");
   };

   const handleHide = () => {
      resetForm();
      onHide();
   };

   const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const valorLimpo = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      setUsername(valorLimpo);
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      // REGEX DE VALIDAÇÃO DE EMAIL (Garante que tem @ e um ponto com domínio)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      try {
         if (mode === "register") {
            if (!emailRegex.test(email)) {
               toast.error("Por favor, introduza um email válido (ex: seu@email.com).");
               setLoading(false);
               return;
            }
            if (password !== confirmPassword) {
               toast.error("As senhas não coincidem!");
               setLoading(false);
               return;
            }
            if (password.length < 6) {
               toast.error("A senha deve ter pelo menos 6 caracteres.");
               setLoading(false);
               return;
            }
            if (username.length < 3) {
               toast.error("O nome de usuário deve ter pelo menos 3 caracteres.");
               setLoading(false);
               return;
            }

            const { data: existingUser } = await supabase
               .from("profiles")
               .select("username")
               .ilike("username", username)
               .maybeSingle();

            if (existingUser) {
               toast.error("Este nome de usuário já está em uso.");
               setLoading(false);
               return;
            }

            const { error } = await supabase.auth.signUp({
               email,
               password,
               options: { data: { username } }
            });

            if (error) throw error;
            toast.success("Conta criada com sucesso! Bem-vindo ao JJ Reviews!");
            handleHide();

         } else if (mode === "login") {
            let finalEmail = loginId.trim();

            if (!finalEmail.includes("@")) {
               const { data: emailData, error: rpcError } = await supabase.rpc('get_email_by_username', { 
                  p_username: finalEmail.toLowerCase() 
               });

               if (rpcError || !emailData) {
                  toast.error("Usuário não encontrado. Verifique o nome ou use o seu email.");
                  setLoading(false);
                  return;
               }
               finalEmail = emailData; // Substitui o username pelo email verdadeiro para fazer login
            }

            const { error } = await supabase.auth.signInWithPassword({ email: finalEmail, password });
            if (error) throw error;
            toast.success("Login efetuado com sucesso!");
            handleHide();

         } else if (mode === "forgot") {
            if (!emailRegex.test(email)) {
               toast.error("Por favor, introduza um email válido.");
               setLoading(false);
               return;
            }
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
               redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            toast.success("Enviámos um link de recuperação para o seu email!");
            setMode("login");
         }
      } catch (err) {
         if (err instanceof Error) {
            console.error(err);
            toast.error(err.message || "Ocorreu um erro inesperado. Verifique os seus dados.");
         } else {
            console.error(err);
            toast.error("Ocorreu um erro inesperado. Verifique os seus dados.");
         }
      } finally {
         setLoading(false);
      }
   };

   return (
      <Modal show={show} onHide={handleHide} centered contentClassName={styles.modalContent}>
         <Modal.Header closeButton closeVariant="white" className={styles.header}>
            <Modal.Title className={styles.title}>
               {mode === "login" && "Bem-vindo de volta"}
               {mode === "register" && "Criar nova conta"}
               {mode === "forgot" && "Recuperar Senha"}
            </Modal.Title>
         </Modal.Header>
         <Modal.Body className={styles.body}>
            
            <Form onSubmit={handleSubmit}>
               {/* APENAS PARA REGISTRO */}
               {mode === "register" && (
                  <>
                     <Form.Group className="mb-3">
                        <Form.Label className={styles.label}>Nome de Usuário</Form.Label>
                        <div className={styles.inputGroup}>
                           <User className={styles.inputIcon} size={18} />
                           <Form.Control
                              type="text"
                              placeholder="Ex: joao_reviews99"
                              value={username}
                              onChange={handleUsernameChange}
                              className={styles.input}
                              required
                           />
                        </div>
                     </Form.Group>
                     <Form.Group className="mb-3">
                        <Form.Label className={styles.label}>Email</Form.Label>
                        <div className={styles.inputGroup}>
                           <Mail className={styles.inputIcon} size={18} />
                           <Form.Control
                              type="email"
                              placeholder="seu@email.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value.trim())}
                              className={styles.input}
                              required
                           />
                        </div>
                     </Form.Group>
                  </>
               )}

               {/* APENAS PARA RECUPERAR SENHA */}
               {mode === "forgot" && (
                  <Form.Group className="mb-3">
                     <Form.Label className={styles.label}>Email da sua conta</Form.Label>
                     <div className={styles.inputGroup}>
                        <Mail className={styles.inputIcon} size={18} />
                        <Form.Control
                           type="email"
                           placeholder="seu@email.com"
                           value={email}
                           onChange={(e) => setEmail(e.target.value.trim())}
                           className={styles.input}
                           required
                        />
                     </div>
                  </Form.Group>
               )}

               {/* APENAS PARA LOGIN */}
               {mode === "login" && (
                  <Form.Group className="mb-3">
                     <Form.Label className={styles.label}>Email ou Nome de Usuário</Form.Label>
                     <div className={styles.inputGroup}>
                        <User className={styles.inputIcon} size={18} />
                        <Form.Control
                           type="text"
                           placeholder="Ex: joao_reviews99 ou email@exemplo.com"
                           value={loginId}
                           onChange={(e) => setLoginId(e.target.value.trim())}
                           className={styles.input}
                           required
                        />
                     </div>
                  </Form.Group>
               )}

               {/* SENHAS (LOGIN E REGISTRO) */}
               {mode !== "forgot" && (
                  <>
                     <Form.Group className="mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                           <Form.Label className={styles.label}>Senha</Form.Label>
                           {mode === "login" && (
                              <button type="button" className={styles.forgotLink} onClick={() => setMode("forgot")}>
                                 Esqueceu a senha?
                              </button>
                           )}
                        </div>
                        <div className={styles.inputGroup}>
                           <Lock className={styles.inputIcon} size={18} />
                           <Form.Control
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className={styles.input}
                              required
                           />
                           <button 
                              type="button" 
                              className={styles.eyeBtn} 
                              onClick={() => setShowPassword(!showPassword)}
                              tabIndex={-1}
                           >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                           </button>
                        </div>
                     </Form.Group>

                     {mode === "register" && (
                        <Form.Group className="mb-4">
                           <Form.Label className={styles.label}>Confirmar Senha</Form.Label>
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
                     )}
                  </>
               )}

               <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? <Spinner size="sm" animation="border" /> : (
                     mode === "login" ? "Entrar" :
                     mode === "register" ? "Criar Conta" : "Enviar Link de Recuperação"
                  )}
               </button>

               <div className={styles.footerText}>
                  {mode === "login" ? (
                     <>Não tem uma conta? <button type="button" onClick={() => setMode("register")}>Registe-se</button></>
                  ) : (
                     <>
                        {mode === "forgot" ? "Lembrou da senha?" : "Já tem uma conta?"}{" "}
                        <button type="button" onClick={() => setMode("login")}>Faça login</button>
                     </>
                  )}
               </div>
            </Form>
         </Modal.Body>
      </Modal>
   );
}