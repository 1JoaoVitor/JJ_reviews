import styles from "./LandingPage.module.css";
import { Star, Bookmark, Users, Share2, Gamepad2, Dices, Upload, CalendarDays, Sparkles } from "lucide-react";

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
               <p>Dê suas notas pessoais e escreva suas avaliações completas. Construa sua biblioteca visual com tudo o que você já assistiu de forma personalizada.</p>
            </div>
            
            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><CalendarDays size={28} /></div>
               <h3>Seu Diário</h3>
               <p>Registre sua vida cinematográfica. Acompanhe exatamente quando você e seus amigos assistiram a cada filme.</p>
            </div>

            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Bookmark size={28} /></div>
               <h3>Sua Watchlist</h3>
               <p>Salve filmes para ver depois e use a Roleta para sortear uma opção quando você não souber qual filme escolher para a noite.</p>
            </div>

            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Users size={28} /></div>
               <h3>Listas com Amigos</h3>
               <p>Crie listas colaborativas e convide amigos. Avaliem filmes em grupo, veja as notas médias e monte rankings imbatíveis.</p>
            </div>

            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Sparkles size={28} /></div>
               <h3>Recomendações</h3>
               <p>Não sabe o que assistir? Receba sugestões alinhadas com o seu perfil e o seu gosto pessoal.</p>
            </div>

            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Share2 size={28} /></div>
               <h3>Compartilhe Opiniões</h3>
               <p>Gere cards visuais das suas avaliações e compartilhe nas redes sociais. Mostre para seus amigos o seu novo filme favorito.</p>
            </div>

            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Dices size={28} /></div>
               <h3>Filme do Dia</h3>
               <p>Tente descobrir o filme por meio de dicas ou pela capa. Jogue a partir de filmes diários, seus assistidos ou de listas específicas.</p>
            </div>

            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Gamepad2 size={28} /></div>
               <h3>Modo Batalha</h3>
               <p>Crie torneios mata-mata com seus filmes. Coloque-os frente a frente para definir seu verdadeiro favorito através de duelos diretos.</p>
            </div>

            <div className={styles.featureCard}>
               <div className={styles.featureIcon}><Upload size={28} /></div>
               <h3>Importe seus Dados</h3>
               <p>Traga suas listas de favoritos de outras plataformas. Importar sua conta, avaliações e watchlist é um processo rápido e seguro.</p>
            </div>
         </div>
      </div>
   );
}