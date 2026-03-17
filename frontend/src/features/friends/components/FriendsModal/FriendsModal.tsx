import { useState, useEffect, useCallback } from "react";
import { Modal, Form, Spinner } from "react-bootstrap";
import { UserPlus, Clock, UserCheck, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import styles from "./FriendsModal.module.css";
import { useModalBack } from "@/hooks/useModalBack";

interface UserProfile {
   id: string;
   username: string;
   avatar_url: string | null;
}

interface FriendEntry extends UserProfile {
   status: string | undefined;
   isRequester: boolean;
}

interface FriendsModalProps {
   show: boolean;
   onHide: () => void;
   session: Session | null;
}

export function FriendsModal({ show, onHide, session }: FriendsModalProps) {
   useModalBack(show, onHide);
   const navigate = useNavigate();
   const [activeTab, setActiveTab] = useState<"friends" | "search">("friends");
   
   // Estados de Busca
   const [searchQuery, setSearchQuery] = useState("");
   const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
   const [isSearching, setIsSearching] = useState(false);

   // Estados da Lista de Amigos
   const [friendsList, setFriendsList] = useState<FriendEntry[]>([]);
   const [isLoadingFriends, setIsLoadingFriends] = useState(false);

   // Função para buscar os amigos e pedidos pendentes
   const fetchFriends = useCallback(async () => {
      if (!session?.user.id) return;
      setIsLoadingFriends(true);
      try {
         // Busca as conexões (amizades e pedidos)
         const { data: connections, error: connError } = await supabase
            .from("friendships")
            .select("*")
            .or(`requester_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`);
         
         if (connError) throw connError;
         if (!connections || connections.length === 0) {
            setFriendsList([]);
            return;
         }

         // Extrai os IDs das "outras pessoas"
         const otherUserIds = connections.map(conn => 
            conn.requester_id === session.user.id ? conn.receiver_id : conn.requester_id
         );

         // Busca os perfis dessas pessoas
         const { data: profiles, error: profError } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", otherUserIds);
            
         if (profError) throw profError;

         // Junta tudo para mostrar na tela
         const mergedList = profiles?.map(profile => {
            const connection = connections.find(c => c.requester_id === profile.id || c.receiver_id === profile.id);
            return {
               ...profile,
               status: connection?.status,
               isRequester: connection?.requester_id === session.user.id
            };
         });

         setFriendsList(mergedList || []);
      } catch (error) {
         console.error("Erro ao buscar amigos:", error);
      } finally {
         setIsLoadingFriends(false);
      }
   }, [session?.user.id]);

   // Carregar lista de amigos quando abrir a aba
   useEffect(() => {
      if (show && session?.user.id && activeTab === "friends") {
         fetchFriends();
      }
   }, [show, session, activeTab, fetchFriends]);

   // Função para procurar usuários novos
   const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim() || !session?.user.id) return;
      
      setIsSearching(true);
      try {
         const { data, error } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .ilike("username", `%${searchQuery}%`) // Procura nomes parecidos
            .neq("id", session.user.id) // Esconde o próprio usuários da busca
            .limit(10);

         if (error) throw error;
         setSearchResults(data || []);
      } catch (error) {
         console.error("Erro na busca:", error);
      } finally {
         setIsSearching(false);
      }
   };

   // Navegar para o perfil e fechar o modal
   const goToProfile = (username: string) => {
      onHide();
      navigate(`/perfil/${username}`);
   };

   return (
      <Modal show={show} onHide={onHide} centered contentClassName={styles.modalContent}>
         <Modal.Header closeButton className={styles.header} closeVariant="white">
            <Modal.Title className={styles.title}>Rede de Amigos</Modal.Title>
         </Modal.Header>
         
         <div className={styles.tabsWrapper}>
            <button 
               className={`${styles.tabBtn} ${activeTab === "friends" ? styles.activeTab : ""}`}
               onClick={() => setActiveTab("friends")}
            >
               Meus Amigos
            </button>
            <button 
               className={`${styles.tabBtn} ${activeTab === "search" ? styles.activeTab : ""}`}
               onClick={() => setActiveTab("search")}
            >
               Procurar
            </button>
         </div>

         <Modal.Body className={styles.body}>
            {activeTab === "search" && (
               <div className={styles.searchSection}>
                  <Form onSubmit={handleSearch} className={styles.searchForm}>
                     <div className={styles.searchBox}>
                        <Form.Control
                           type="text"
                           placeholder="Procurar por @username..."
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className={styles.searchInput}
                           autoFocus
                        />
                     </div>
                     <button type="submit" className={styles.searchBtn} disabled={isSearching || !searchQuery}>
                        {isSearching ? <Spinner size="sm" animation="border" /> : "Buscar"}
                     </button>
                  </Form>

                  <div className={styles.resultsList}>
                     {searchResults.length === 0 && !isSearching && searchQuery && (
                        <p className={styles.emptyText}>Nenhum usuário encontrado.</p>
                     )}
                     
                     {searchResults.map(user => (
                        <div key={user.id} className={styles.userCard} onClick={() => goToProfile(user.username)}>
                           {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.username} className={styles.avatar} />
                           ) : (
                              <div className={styles.avatarPlaceholder}>{user.username.charAt(0).toUpperCase()}</div>
                           )}
                           <span className={styles.username}>@{user.username}</span>
                           <ChevronRight size={18} className={styles.arrowIcon} />
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {activeTab === "friends" && (
               <div className={styles.friendsSection}>
                  {isLoadingFriends ? (
                     <div className="text-center py-4"><Spinner animation="border" variant="light" /></div>
                  ) : friendsList.length === 0 ? (
                     <div className={styles.emptyState}>
                        <UserPlus size={32} />
                        <p>Você ainda não adicionou ninguém.</p>
                        <button onClick={() => setActiveTab("search")} className={styles.findBtn}>
                           Procurar amigos
                        </button>
                     </div>
                  ) : (
                     <div className={styles.resultsList}>
                        {friendsList.map(friend => (
                           <div key={friend.id} className={styles.userCard} onClick={() => goToProfile(friend.username)}>
                              {friend.avatar_url ? (
                                 <img src={friend.avatar_url} alt={friend.username} className={styles.avatar} />
                              ) : (
                                 <div className={styles.avatarPlaceholder}>{friend.username.charAt(0).toUpperCase()}</div>
                              )}
                              
                              <div className={styles.friendInfo}>
                                 <span className={styles.username}>@{friend.username}</span>
                                 {friend.status === "accepted" && <span className={styles.badgeFriends}><UserCheck size={12}/> Amigos</span>}
                                 {friend.status === "pending" && friend.isRequester && <span className={styles.badgePending}><Clock size={12}/> Enviado</span>}
                                 {friend.status === "pending" && !friend.isRequester && <span className={styles.badgeAction}>Analisar Pedido</span>}
                              </div>
                              
                              <ChevronRight size={18} className={styles.arrowIcon} />
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            )}
         </Modal.Body>
      </Modal>
   );
}