import { Github, Linkedin } from "lucide-react";
import styles from "./Footer.module.css";

export function Footer() {
   return (
      <footer className={styles.footer}>
         <div className={styles.credit}>
            Desenvolvido por <strong>João Vitor E. Souza</strong>
         </div>
         <div className={styles.links}>
            <a
               href="https://github.com/1JoaoVitor"
               target="_blank"
               rel="noopener noreferrer"
               className={styles.link}
            >
               <Github size={14} /> GitHub
            </a>
            <a
               href="https://www.linkedin.com/in/joão-vitor-evangelista-de-souza-a0954526b"
               target="_blank"
               rel="noopener noreferrer"
               className={styles.link}
            >
               <Linkedin size={14} /> LinkedIn
            </a>
         </div>
      </footer>
   );
}
