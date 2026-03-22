import { useState } from "react";
import { Search, Gamepad2, LogOut, LogIn, User, Users, Filter, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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
   session: Session | null;
   onLogout: () => void;
   onLoginClick: () => void;
   username: string;
   avatarUrl?: string | null;
   showFilters?: boolean;
   showBattle?: boolean;
   onSocialClick?: () => void;
   onRecommendationsClick?: () => void;
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
   session,
   onLogout,
   onLoginClick,
   username,
   avatarUrl,
   showFilters = true,
   showBattle = true,
   onSocialClick,
   onRecommendationsClick,
}: AppNavbarProps) {

   const navigate = useNavigate();
   const [isFiltersOpen, setIsFiltersOpen] = useState(false); 
   const [isSearchOpen, setIsSearchOpen] = useState(false);

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
            
            {/* LOGO  */}
            <Link to="/" className={styles.brand}>
               <div className={styles.brandCircle}>JJ</div>
               <span className={`${styles.brandText} d-none d-sm-inline`}>Reviews</span>
            </Link>

            {session && (showFilters || !!onRecommendationsClick) && (
               <div className={styles.mobileHeaderActions}>
                  {showFilters && (
                     <div className={`${styles.searchInline} ${isSearchOpen ? styles.searchInlineOpen : ""}`}>
                        <button
                           type="button"
                           className={`${styles.iconBtn} ${isSearchOpen ? styles.iconBtnActive : ""}`}
                           onClick={() => setIsSearchOpen((prev) => !prev)}
                           title="Buscar"
                        >
                           <Search size={18} />
                        </button>

                        <div className={styles.searchInlineInputWrap}>
                           <Search size={14} className={styles.searchInlineIcon} />
                           <input
                              type="search"
                              placeholder="Buscar..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className={styles.searchInlineInput}
                              autoFocus={isSearchOpen}
                           />
                        </div>
                     </div>
                  )}

                  {showFilters && (
                     <button
                        type="button"
                        className={`${styles.iconBtn} ${isFiltersOpen ? styles.iconBtnActive : ""}`}
                        onClick={() => setIsFiltersOpen((prev) => !prev)}
                        title="Filtros"
                     >
                        <Filter size={18} />
                     </button>
                  )}

                  {onRecommendationsClick && (
                     <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={onRecommendationsClick}
                        title="Recomendar"
                     >
                        <Sparkles size={18} />
                     </button>
                  )}
               </div>
            )}

            {/*AÇÕES DO USUÁRIO */}
            <div className={styles.userActions}>
               {session ? (
                  <>
                     <NotificationBell userId={session.user.id} />

                     {/* ELEMENTOS EXCLUSIVOS DO DESKTOP */}
                     <div className="d-none d-md-flex align-items-center gap-2">
                        {showFilters && (
                           <div className={`${styles.searchInline} ${isSearchOpen ? styles.searchInlineOpen : ""}`}>
                              <button
                                 type="button"
                                 className={`${styles.iconBtn} ${isSearchOpen ? styles.iconBtnActive : ""}`}
                                 onClick={() => setIsSearchOpen((prev) => !prev)}
                                 title="Buscar"
                              >
                                 <Search size={18} />
                              </button>

                              <div className={styles.searchInlineInputWrap}>
                                 <Search size={14} className={styles.searchInlineIcon} />
                                 <input
                                    type="search"
                                    placeholder="Buscar filmes..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={styles.searchInlineInput}
                                    autoFocus={isSearchOpen}
                                 />
                              </div>
                           </div>
                        )}

                        {showFilters && (
                           <button
                              type="button"
                              className={`${styles.iconBtn} ${isFiltersOpen ? styles.iconBtnActive : ""}`}
                              onClick={() => setIsFiltersOpen((prev) => !prev)}
                              title="Filtros"
                           >
                              <Filter size={18} />
                           </button>
                        )}

                        {showBattle && (
                           <button
                              className={styles.iconBtn}
                              onClick={() => navigate("/jogos")}
                              title="Central de Jogos"
                           >
                              <Gamepad2 size={18} />
                           </button>
                        )}

                        {onSocialClick && (
                           <button onClick={onSocialClick} className={styles.friendsBtn} title="Social">
                              <Users size={20} />
                              Social
                           </button>
                        )}

                        {onRecommendationsClick && (
                           <button onClick={onRecommendationsClick} className={styles.friendsBtn} title="Recomendar">
                              <Sparkles size={20} />
                              Recomendar
                           </button>
                        )}

                        <button className={styles.avatarBtn} onClick={() => navigate("/perfil")}>
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