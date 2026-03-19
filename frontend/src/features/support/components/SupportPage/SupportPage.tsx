import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner, Dropdown } from "react-bootstrap";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSupportTicket } from "../../hooks/useSupportTicket";
import { useAuth } from "@/features/auth"; 
import styles from "./SupportPage.module.css";

export function SupportPage() {
   const navigate = useNavigate();
   const { session } = useAuth();
   const { sendTicket, isSubmitting } = useSupportTicket();
   
   const [message, setMessage] = useState("");
   const [type, setType] = useState<"bug" | "suggestion" | "other">("bug");
   const [email, setEmail] = useState("");

   const isLoggedOut = !session; 

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (isLoggedOut && !email.trim()) {
         toast.error("Por favor, informe o seu e-mail para podermos responder.");
         return;
      }
      
      const { success, error } = await sendTicket(message, type, email);
      
      if (success) {
         toast.success("Mensagem enviada com sucesso! Obrigado pelo feedback.");
         setMessage("");
         if (isLoggedOut) setEmail(""); 
      } else {
         toast.error(error || "Erro ao enviar mensagem.");
      }
   };

   const getTypeText = () => {
      if (type === "bug") return "Reportar um Erro (Bug)";
      if (type === "suggestion") return "Sugestão de Melhoria";
      return "Outro Assunto";
   };

   return (
      <div className={styles.pageContainer}>
         <header className={styles.header}>
            <button onClick={() => navigate(-1)} className={styles.backBtn} aria-label="Voltar">
               <ArrowLeft size={24} />
            </button>
            <h1 className={styles.title}>Suporte e Feedback</h1>
         </header>

         <main className={styles.content}>
            <p className={styles.description}>
               Encontrou algum problema ou tem uma ideia para melhorar o JJ Reviews?
               <br/>
               <br/>
               Envie-nos uma mensagem diretamente para te ajudarmos!
            </p>

            <form onSubmit={handleSubmit} className={styles.formContainer}>
               
               {/* CAMPO DE EMAIL CONDICIONAL (PARA QUEM NÃO TEM CONTA LOGADA) */}
               {isLoggedOut && (
                  <div>
                     <label className={styles.label}>Seu E-mail (para contato)</label>
                     <input
                        type="email"
                        className={styles.selectInput} 
                        placeholder="exemplo@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                     />
                  </div>
               )}

               <div>
                  <label className={styles.label}>Sobre o que quer falar?</label>
                  <Dropdown>
                     <Dropdown.Toggle 
                        className={styles.customDropdownToggle} 
                        style={{ width: '100%', justifyContent: 'space-between' }}
                     >
                        {getTypeText()}
                     </Dropdown.Toggle>

                     <Dropdown.Menu className={styles.dropdownMenu} style={{ width: '100%' }}>
                        <Dropdown.Item 
                           className={`${styles.dropdownItem} ${type === "bug" ? styles.dropdownItemActive : ""}`} 
                           onClick={() => setType("bug")}
                        >
                           Reportar um Erro (Bug)
                        </Dropdown.Item>
                        <Dropdown.Item 
                           className={`${styles.dropdownItem} ${type === "suggestion" ? styles.dropdownItemActive : ""}`} 
                           onClick={() => setType("suggestion")}
                        >
                           Sugestão de Melhoria
                        </Dropdown.Item>
                        <Dropdown.Item 
                           className={`${styles.dropdownItem} ${type === "other" ? styles.dropdownItemActive : ""}`} 
                           onClick={() => setType("other")}
                        >
                           Outro Assunto
                        </Dropdown.Item>
                     </Dropdown.Menu>
                  </Dropdown>
               </div>

               <div>
                  <label className={styles.label}>Sua Mensagem</label>
                  <textarea
                     className={styles.textArea}
                     rows={6}
                     placeholder="Descreva o problema ou a sua ideia com detalhes..."
                     value={message}
                     onChange={(e) => setMessage(e.target.value)}
                     required
                  />
               </div>

               <button type="submit" disabled={isSubmitting || !message.trim()} className={styles.submitBtn}>
                  {isSubmitting ? <Spinner size="sm" animation="border" /> : "Enviar Mensagem"}
               </button>
            </form>
         </main>
      </div>
   );
}