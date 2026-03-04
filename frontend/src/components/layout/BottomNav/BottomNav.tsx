import { Home, Plus, User, LogIn, LogOut, Swords } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import styles from "./BottomNav.module.css";

interface BottomNavProps {
   session: Session | null;
   avatarUrl?: string | null;
   onHomeClick: () => void;
   onGamesClick: () => void;
   onAddClick: () => void;
   onProfileClick: () => void;
   onLoginClick: () => void;
   onLogout: () => void;
}

export function BottomNav({
   session,
   avatarUrl,
   onHomeClick,
   onGamesClick,
   onAddClick,
   onProfileClick,
   onLoginClick,
   onLogout,
}: BottomNavProps) {
   return (
      <nav className={styles.bottomNav}>
         <button className={styles.navItem} onClick={onHomeClick}>
            <Home size={22} />
            <span>Início</span>
         </button>

         <button className={styles.navItem} onClick={onGamesClick}>
            <Swords size={22} />
            <span>Batalha</span>
         </button>

         {/* Botão Adicionar Filme */}
         <button className={styles.navItem} onClick={session ? onAddClick : onLoginClick}>
            <Plus size={22} />
            <span>Adicionar</span>
         </button>

         {session ? (
            <>
               <button className={styles.navItem} onClick={onProfileClick}>
                  {avatarUrl ? (
                     <img src={avatarUrl} alt="Perfil" className={styles.avatarImg} />
                  ) : (
                     <User size={22} />
                  )}
                  <span>Perfil</span>
               </button>
               <button className={`${styles.navItem} ${styles.navItemDanger}`} onClick={onLogout}>
                  <LogOut size={22} />
                  <span>Sair</span>
               </button>
            </>
         ) : (
            <button className={styles.navItem} onClick={onLoginClick}>
               <LogIn size={22} />
               <span>Entrar</span>
            </button>
         )}
      </nav>
   );
}