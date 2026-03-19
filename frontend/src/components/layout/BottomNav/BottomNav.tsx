   import { Home, Plus, User, LogIn, Users, Swords } from "lucide-react";
   import { useNavigate } from "react-router-dom";
   import type { Session } from "@supabase/supabase-js";
   import styles from "./BottomNav.module.css";

   interface BottomNavProps {
      session: Session | null;
      avatarUrl?: string | null;
      onAddClick: () => void;
      onLoginClick: () => void;
      onFriendsClick: () => void;
   }

   export function BottomNav({
      session,
      avatarUrl,
      onAddClick,
      onLoginClick,
      onFriendsClick,
   }: BottomNavProps) {

      const navigate = useNavigate();

      return (
         <nav className={styles.bottomNav}>
            <button className={styles.navItem} onClick={() => { navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
               <Home size={22} />
               <span>Início</span>
            </button>

            <button className={styles.navItem} onClick={() => navigate("/batalha")}>
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
                  <button className={styles.navItem} onClick={onFriendsClick}>
                     <Users size={22} />
                     <span>Amigos</span>
                  </button>

                  <button className={styles.navItem} onClick={() => navigate("/perfil")}>
                     {avatarUrl ? (
                        <img src={avatarUrl} alt="Perfil" className={styles.avatarImg} />
                     ) : (
                        <User size={22} />
                     )}
                     <span>Perfil</span>
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