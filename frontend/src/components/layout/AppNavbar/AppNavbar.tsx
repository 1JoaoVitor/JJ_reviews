import { useState } from "react";
import { Search, Swords, LogOut, LogIn, User, Users, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { Dropdown } from "react-bootstrap";
import type { Session } from "@supabase/supabase-js";
import styles from "./AppNavbar.module.css";
import { NotificationBell } from "@/features/notifications";
import type { SortOrder } from "@/features/movies";

interface AppNavbarProps {
   onlyNational: boolean;
   setOnlyNational: (val: boolean) => void;
   onlyOscar: boolean;
   setOnlyOscar: (val: boolean) => void;
   sortOrder: SortOrder;
   setSortOrder: (val: SortOrder) => void;
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
   showBattle?: boolean;
   onFriendsClick?: () => void;
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
   showBattle = true,
   onFriendsClick,
}: AppNavbarProps) {

   const [isFiltersOpen, setIsFiltersOpen] = useState(false); 

   const sortOptions: Record<string, string> = {
      default: "Recentes",
      rating: "Melhores Notas",
      date: "Lançamento",
      alpha: "Ordem A-Z",
   };

   return (
      <nav className={styles.navbar}>
         {/* ─── Row 1: Brand + Search + User ─── */}
         <div className={styles.topRow} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.75rem' }}>
            
            {/* LOGO  */}
            <Link to="/" className={styles.brand} style={{ flexShrink: 0 }}>
               <div className={styles.brandCircle}>JJ</div>
               <span className={`${styles.brandText} d-none d-sm-inline`}>Reviews</span>
            </Link>

            {/* BUSCA + FILTRO */}
            <div className={styles.searchWrapper} style={{ flex: 1, minWidth: 0 }}>
               <div style={{ position: "relative", display: "flex", gap: "0.5rem", width: "100%" }}>
                  <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                     <Search size={16} className={styles.searchIcon} />
                     <input
                        type="search"
                        placeholder="Buscar filmes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                        style={{ width: '100%', textOverflow: 'ellipsis' }}
                     />
                  </div>
                  
                  {showFilters && (
                     <button
                        type="button"
                        onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                        style={{
                           display: 'flex', alignItems: 'center', gap: '0.4rem',
                           padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-md)',
                           border: `1px solid ${isFiltersOpen ? 'var(--gold)' : 'var(--border-subtle)'}`,
                           background: isFiltersOpen ? 'rgba(232, 177, 0, 0.1)' : 'transparent',
                           color: isFiltersOpen ? 'var(--gold)' : 'var(--text-secondary)',
                           cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0
                        }}
                     >
                        <Filter size={16} />
                        <span className="d-none d-lg-inline" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                           Filtros
                        </span>
                     </button>
                  )}
               </div>
            </div>

            {/*AÇÕES DO USUÁRIO */}
            <div className={styles.userActions} style={{ display: 'flex', alignItems: 'center', flexShrink: 0, gap: '0.5rem' }}>
               {session ? (
                  <>
                     <NotificationBell userId={session.user.id} />

                     {/* ELEMENTOS EXCLUSIVOS DO DESKTOP */}
                     <div className="d-none d-md-flex align-items-center gap-2">
                        {showBattle && (
                           <button
                              className={styles.iconBtn}
                              onClick={onStartBattle}
                              title="Modo Batalha"
                           >
                              <Swords size={18} />
                           </button>
                        )}

                        {onFriendsClick && (
                           <button onClick={onFriendsClick} className={styles.friendsBtn} title="Central de Amigos">
                              <Users size={20} />
                              Amigos
                           </button>
                        )}

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
                     </div>
                  </>
               ) : (
                  <button className={styles.btnPrimary} onClick={onLoginClick}>
                     <LogIn size={16} />
                     <span className="d-none d-sm-inline ms-1">Entrar</span>
                  </button>
               )}
            </div>
         </div>

         {/* ─── Row 2: Filters ─── */}
         {showFilters && isFiltersOpen && (
            <div className={styles.filtersRow} style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
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

               <div className={styles.dropdownGroup}>
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
            </div>
         )}
      </nav>
   );
}