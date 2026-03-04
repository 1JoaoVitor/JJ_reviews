import { Search, Swords, LogOut, LogIn, User } from "lucide-react";
import { Dropdown } from "react-bootstrap";
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

   const sortOptions: Record<string, string> = {
      default: "Recentes",
      rating: "Melhores Notas",
      date: "Lançamento",
      alpha: "Ordem A-Z",
   };


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
                        className={`${styles.btnGhost} ${styles.btnDanger}`}
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
                  className={`${styles.chip} ${onlyNational ? styles.chipNationalActive : ""}`}
                  onClick={() => setOnlyNational(!onlyNational)}
               >
                  Nacionais
               </button>
               <button
                  className={`${styles.chip} ${onlyOscar ? styles.chipOscarActive : ""}`}
                  onClick={() => setOnlyOscar(!onlyOscar)}
               >
                  Oscar
               </button>

               <div className={styles.divider} />

               {/* Dropdown de Gênero */}
               <Dropdown>
                  <Dropdown.Toggle variant="custom" className={styles.customDropdownToggle}>
                     {selectedGenre || "Gênero"}
                  </Dropdown.Toggle>

                  <Dropdown.Menu className={styles.dropdownMenu}>
                     <Dropdown.Item 
                        className={`${styles.dropdownItem} ${!selectedGenre ? styles.dropdownItemActive : ""}`} 
                        onClick={() => setSelectedGenre("")}
                     >
                        Todos os Gêneros
                     </Dropdown.Item>
                     {availableGenres.map((genre) => (
                        <Dropdown.Item 
                           key={genre} 
                           className={`${styles.dropdownItem} ${selectedGenre === genre ? styles.dropdownItemActive : ""}`}
                           onClick={() => setSelectedGenre(genre)}
                        >
                           {genre}
                        </Dropdown.Item>
                     ))}
                  </Dropdown.Menu>
               </Dropdown>

               {/* Dropdown de Ordenação */}
               <Dropdown>
                  <Dropdown.Toggle variant="custom" className={styles.customDropdownToggle}>
                     {sortOptions[sortOrder]}
                  </Dropdown.Toggle>

                  <Dropdown.Menu className={styles.dropdownMenu}>
                     <Dropdown.Item 
                        className={`${styles.dropdownItem} ${sortOrder === "default" ? styles.dropdownItemActive : ""}`} 
                        onClick={() => setSortOrder("default")}
                     >
                        Recentes
                     </Dropdown.Item>
                     <Dropdown.Item 
                        className={`${styles.dropdownItem} ${sortOrder === "rating" ? styles.dropdownItemActive : ""}`} 
                        onClick={() => setSortOrder("rating")}
                     >
                        Melhores Notas
                     </Dropdown.Item>
                     <Dropdown.Item 
                        className={`${styles.dropdownItem} ${sortOrder === "date" ? styles.dropdownItemActive : ""}`} 
                        onClick={() => setSortOrder("date")}
                     >
                        Lançamento
                     </Dropdown.Item>
                     <Dropdown.Item 
                        className={`${styles.dropdownItem} ${sortOrder === "alpha" ? styles.dropdownItemActive : ""}`} 
                        onClick={() => setSortOrder("alpha")}
                     >
                        Ordem A-Z
                     </Dropdown.Item>
                  </Dropdown.Menu>
               </Dropdown>
            </div>
         )}
      </nav>
   );
}
