import { Link } from "react-router-dom";
import { Github, Linkedin, MessageSquare } from "lucide-react"; // Importamos o ícone de suporte
import styles from "./Footer.module.css";

export function Footer() {
   return (
      <footer className={styles.footer}>
         <div className={styles.container}>
            
            <div className={styles.topRow}>
               
               <div className={styles.appCol}>
                  <h3 className={styles.appName}>JJ Reviews</h3>
                  <Link to="/support" className={styles.supportLink}>
                     <MessageSquare size={16} /> Fale com o Suporte
                  </Link>
               </div>

               <div className={styles.devCol}>
                  <p className={styles.devTitle}>Desenvolvido por</p>
                  <p className={styles.devName}>
                     <strong>João Vitor E. Souza</strong>
                  </p>
               </div>

               <div className={styles.socialCol}>
                  <p className={styles.socialTitle}>Redes Sociais</p>
                  <div className={styles.linksGroup}>
                     <a
                        href="https://github.com/1JoaoVitor"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                        aria-label="GitHub"
                     >
                        <Github size={20} />
                     </a>
                     <a
                        href="https://www.linkedin.com/in/joão-vitor-evangelista-de-souza-a0954526b"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                        aria-label="LinkedIn"
                     >
                        <Linkedin size={20} />
                     </a>
                  </div>
               </div>
            </div>

            {/* <hr className={styles.divider} />

            <div className={styles.bottomRow}>
               <p>&copy; {new Date().getFullYear()} JJ Reviews. Todos os direitos reservados.</p>
            </div> */}
         </div>
      </footer>
   );
}