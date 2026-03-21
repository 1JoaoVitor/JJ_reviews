import styles from "./LandingPage.module.css";
import { Star, Bookmark, Users, Share2, Gamepad2, Dices, Upload } from "lucide-react";

interface LandingPageProps {
   onLoginClick: () => void;
}

export function LandingPage({ onLoginClick }: LandingPageProps) {
   return (
      <div className={styles.landingContainer}>
         <div className={styles.heroSection}>
            <h1 className={styles.heroTitle}>Sua jornada cinematográfica<br />começa aqui.</h1>
            <p className={styles.heroSubtitle}>
               O JJ Reviews é a sua plataforma pessoal para avaliar filmes, montar sua Watchlist, criar listas com amigos, compartilhar suas opiniões com o mundo e muito mais!
            </p>
            <button className={styles.heroBtn} onClick={onLoginClick}>
               Criar minha conta grátis
            </button>
         </div>

         <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Star size={28} /></div>
               <h3>Avalie e Critique</h3>
               <p>Dê suas notas pessoais e escreva resenhas completas. Construa sua biblioteca visual com tudo o que você já assistiu de forma personalizada.</p>
            </div>
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Bookmark size={28} /></div>
               <h3>Sua Watchlist</h3>
               <p>Salve filmes para ver depois e use a Roleta para quando você não souber qual filme escolher.</p>
            </div>
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Dices size={28} /></div>
               <h3>Filme do Dia</h3>
               <p>Desafie-se no Enigma ou descubra a capa do dia. Jogue com filmes diários, seus assistidos ou de listas específicas. Um novo filme todo dia!</p>
            </div>
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Gamepad2 size={28} /></div>
               <h3>Modo Batalha</h3>
               <p>Crie torneios mata-mata com seus filmes. Coloque-os frente a frente para definir seu verdadeiro favorito através de derrota por derrota.</p>
            </div>
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Users size={28} /></div>
               <h3>Listas com Amigos</h3>
               <p>Crie listas colaborativas e convide amigos. Avaliem filmes em grupo, veja as notas médias e compartilhe com quem quem quiser.</p>
            </div>
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Upload size={28} /></div>
               <h3>Importe seus Dados</h3>
               <p>Traga suas listas de favoritos de outras plataformas. Importar sua conta, ratings e watchlist é rápido e seguro.</p>
            </div>
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Share2 size={28} /></div>
               <h3>Compartilhe Opiniões</h3>
               <p>Gere cards visuais das suas avaliações e compartilhe nas redes sociais. Mostre para seus amigos o seu novo filme favorito ou aquele que eles jamais devem assistir.</p>
            </div>
         </div>
      </div>
   );
}