import { Search, Swords, LogOut, LogIn, User } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import styles from "./AppNavbar.module.css";

interface AppNavbarProps {
   onlyNational: boolean;
   setOnlyNational: (val: boolean) => void;
   onlyOscar: boolean;
   setOnlyOscar: (val: boolean) => void;
   sortOrder: string;
   setSortOrder: (val: string) => void;
   searchTerm: string;
   setSearchTerm: (val: string) => void;
   availableGenres: string[];
   selectedGenre: string;
   setSelectedGenre: (val: string) => void;
   onStartBattle: () => void;
   session: Session | null;
   onLogout: () => void;
   onLoginClick: () => void;
   username: string;
   avatarUrl?: string | null;
   onProfileClick: () => void;
   showFilters?: boolean;
}

export function AppNavbar({
   onlyNational,
   setOnlyNational,
   onlyOscar,
   setOnlyOscar,
   sortOrder,
   setSortOrder,
   searchTerm,
   setSearchTerm,
   availableGenres,
   selectedGenre,
   setSelectedGenre,
   onStartBattle,
   session,
   onLogout,
   onLoginClick,
   username,
   avatarUrl,
   onProfileClick,
   showFilters = true,
}: AppNavbarProps) {
   return (
      <nav className={styles.navbar}>
         {/* ─── Row 1: Brand + Search + User ─── */}
         <div className={styles.topRow}>
            <a href="#" className={styles.brand}>
               <div className={styles.brandCircle}>JJ</div>
               <span className={styles.brandText}>Reviews</span>
            </a>

            {/* Search */}
            <div className={styles.searchWrapper}>
               <div style={{ position: "relative" }}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                     type="search"
                     placeholder="Buscar filmes..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className={styles.searchInput}
                  />
               </div>
            </div>

            {/* User actions */}
            <div className={styles.userActions}>
               {/* Battle button */}
               <button
                  className={styles.iconBtn}
                  onClick={onStartBattle}
                  title="Modo Batalha"
               >
                  <Swords size={18} />
               </button>

               {session ? (
                  <>
                     <button className={styles.avatarBtn} onClick={onProfileClick}>
                        {avatarUrl ? (
                           <img src={avatarUrl} alt="Avatar" className={styles.avatarImg} />
                        ) : (
                           <span className={styles.avatarPlaceholder}>
                              <User size={16} />
                           </span>
                        )}
                        <span className={styles.desktopOnly}>{username || "Perfil"}</span>
                     </button>
                     <button
                        className={styles.btnDanger}
                        onClick={onLogout}
                        title="Sair"
                     >
                        <LogOut size={16} />
                        <span className={styles.desktopOnly}>Sair</span>
                     </button>
                  </>
               ) : (
                  <button className={styles.btnPrimary} onClick={onLoginClick}>
                     <LogIn size={16} />
                     Entrar
                  </button>
               )}
            </div>
         </div>

         {/* ─── Row 2: Filters ─── */}
         {showFilters && (
            <div className={styles.filtersRow}>
               {/* Filter chips */}
               <button
                  className={`${styles.chip} ${!onlyNational && !onlyOscar ? styles.chipActive : ""}`}
                  onClick={() => { setOnlyNational(false); setOnlyOscar(false); }}
               >
                  Todos
               </button>
               <button
                  className={`${styles.chipNational} ${onlyNational ? styles.chipNationalActive : ""}`}
                  onClick={() => setOnlyNational(!onlyNational)}
               >
                  Nacionais
               </button>
               <button
                  className={`${styles.chipOscar} ${onlyOscar ? styles.chipOscarActive : ""}`}
                  onClick={() => setOnlyOscar(!onlyOscar)}
               >
                  Oscar
               </button>

               <div className={styles.divider} />

               {/* Genre select */}
               <select
                  className={styles.filterSelect}
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
               >
                  <option value="">Gênero</option>
                  {availableGenres.map((genre) => (
                     <option key={genre} value={genre}>{genre}</option>
                  ))}
               </select>

               {/* Sort select */}
               <select
                  className={styles.filterSelect}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  aria-label="Ordenar por"
               >
                  <option value="default">Recentes</option>
                  <option value="rating">Melhores Notas</option>
                  <option value="date">Lançamento</option>
                  <option value="alpha">Ordem A-Z</option>
               </select>
            </div>
         )}
      </nav>
   );
}
