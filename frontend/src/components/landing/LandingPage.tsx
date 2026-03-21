import styles from "./LandingPage.module.css";
import { Star, Bookmark, Users, Share2, Gamepad2 } from "lucide-react";

interface LandingPageProps {
   onLoginClick: () => void;
}

export function LandingPage({ onLoginClick }: LandingPageProps) {
   return (
      <div className={styles.landingContainer}>
         <div className={styles.heroSection}>
            <h1 className={styles.heroTitle}>Sua jornada cinematográfica<br />começa aqui.</h1>
            <p className={styles.heroSubtitle}>
               O JJ Reviews é a sua plataforma pessoal para avaliar filmes, montar sua Watchlist, criar listas com amigos e compartilhar suas opiniões com o mundo!
            </p>
            <button className={styles.heroBtn} onClick={onLoginClick}>
               Criar minha conta grátis
            </button>
         </div>

         <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Star size={28} /></div>
               <h3>Avalie e Critique</h3>
               <p>Dê suas notas e escreva o seu veredito. Construa uma biblioteca visual com tudo o que você já assistiu.</p>
            </div>
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Bookmark size={28} /></div>
               <h3>Sua Watchlist</h3>
               <p>Salve filmes para ver depois e use a Roleta quando não souber qual escolher para a noite.</p>
            </div>
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Users size={28} /></div>
               <h3>Listas Compartilhadas</h3>
               <p>Convide os seus amigos para listas colaborativas. Avaliem filmes em grupo e descubram a nota média da galera.</p>
            </div>
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Share2 size={28} /></div>
               <h3>Compartilhe Opiniões</h3>
               <p>Gere cards das suas avaliações para compartilhar facilmente nas suas redes sociais.</p>
            </div>
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Gamepad2 size={28} /></div>
               <h3>Modo Batalha</h3>
               <p>Coloque seus filmes frente a frente num torneio mata-mata para definir o seu favorito de verdade.</p>
            </div>
         </div>
      </div>
   );
}