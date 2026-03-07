import { useState, useEffect } from "react";
import { Modal, Form, Spinner } from "react-bootstrap";
import { Lock, Users, Share2, Check } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth";
import { StarRating } from "@/components/ui/StarRating/StarRating";
import type { CustomList } from "@/types";
import styles from "./CreateListModal.module.css";

interface CreateListModalProps {
   show: boolean;
   onHide: () => void;
   onCreate: (
      name: string, 
      description: string, 
      type: "private" | "partial_shared" | "full_shared", 
      collaboratorIds: string[],
      has_rating: boolean,
      rating_type: "manual" | "average" | null,
      manual_rating: number | null,
   ) => Promise<CustomList | null>;
}

type ListType = "private" | "partial_shared" | "full_shared";

export function CreateListModal({ show, onHide, onCreate }: CreateListModalProps) {
   const { session } = useAuth();
   const [name, setName] = useState("");
   const [description, setDescription] = useState("");
   const [type, setType] = useState<ListType>("private");
   
   // Amigos
   const [friends, setFriends] = useState<{ id: string; username: string; avatar_url: string }[]>([]);
   const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
   const [loadingFriends, setLoadingFriends] = useState(false);
   
   const [loading, setLoading] = useState(false);

   const [hasRating, setHasRating] = useState(false);
   const [ratingType, setRatingType] = useState<"manual" | "average">("average");
   const [manualRating, setManualRating] = useState<number>(5);

   // Traz a lista de amigos REAIS do usuário logado usando a abordagem de duas etapas
   useEffect(() => {
      const fetchFriends = async () => {
         if (!session?.user.id) return;
         setLoadingFriends(true);
         
         try {
            // Busca as conexões (Apenas amizades aceitas)
            const { data: connections, error: connError } = await supabase
               .from("friendships")
               .select("requester_id, receiver_id")
               .eq("status", "accepted")
               .or(`requester_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`);
            
            if (connError) throw connError;
            
            if (!connections || connections.length === 0) {
               setFriends([]);
               return;
            }

            // Extrai os IDs das "outras pessoas"
            const otherUserIds = connections.map(conn => 
               conn.requester_id === session.user.id ? conn.receiver_id : conn.requester_id
            );

            // Busca os perfis detalhados dessas pessoas
            const { data: profiles, error: profError } = await supabase
               .from("profiles")
               .select("id, username, avatar_url")
               .in("id", otherUserIds);
               
            if (profError) throw profError;

            // Atualiza o estado com a lista limpa de amigos
            if (profiles) {
               setFriends(profiles);
            }

         } catch (error) {
            console.error("Erro ao buscar amigos:", error);
         } finally {
            setLoadingFriends(false);
         }
      };

      if (show && type !== "private") {
         fetchFriends();
      }
   }, [show, type, session?.user.id]);

   // Limpa o formulário ao fechar o modal
   useEffect(() => {
      if (!show) {
         setName("");
         setDescription("");
         setType("private");
         setSelectedFriends([]);
      }
   }, [show]);

   // Adiciona ou remove um amigo da lista de convidados
   const toggleFriend = (friendId: string) => {
      setSelectedFriends(prev => 
         prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
      );
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;

      if (type !== "private" && selectedFriends.length === 0) {
         toast.error("Selecione pelo menos um amigo para convidar!");
         return;
      }

      setLoading(true);
      const success = await onCreate(
         name.trim(), description.trim(), type, selectedFriends, 
         hasRating, hasRating ? ratingType : null, hasRating && ratingType === "manual" ? manualRating : null
      );
      setLoading(false);

      if (success) {
         toast.success("Lista criada com sucesso!");
         onHide();
      }
   };

   return (
      <Modal show={show} onHide={onHide} centered contentClassName={styles.modalContent}>
         <Modal.Header closeButton closeVariant="white" className={styles.header}>
            <Modal.Title className={styles.title}>Nova Lista</Modal.Title>
         </Modal.Header>
         
         <Modal.Body className={styles.body}>
            <Form onSubmit={handleSubmit}>
               <Form.Group className="mb-3">
                  <Form.Label className={styles.label}>Nome da Lista *</Form.Label>
                  <Form.Control
                     type="text"
                     placeholder="Ex: Filmes de Terror Anos 80"
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     className={styles.input}
                     required
                     maxLength={50}
                  />
               </Form.Group>

               <Form.Group className="mb-4">
                  <Form.Label className={styles.label}>Descrição (Opcional)</Form.Label>
                  <Form.Control
                     as="textarea"
                     rows={2}
                     placeholder="Sobre o que é esta lista?"
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                     className={styles.input}
                     maxLength={200}
                  />
               </Form.Group>

               {/* ─── OPÇÕES DE NOTA DA LISTA ─── */}
               <div className="mb-4 p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <Form.Check 
                     type="switch"
                     id="has-rating-switch"
                     label={<span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dar uma nota a esta lista?</span>}
                     checked={hasRating}
                     onChange={(e) => setHasRating(e.target.checked)}
                  />
                  
                  {hasRating && (
                     <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <Form.Label className={styles.label}>Como a nota será calculada?</Form.Label>
                        <Form.Select 
                           value={ratingType} 
                           onChange={(e) => setRatingType(e.target.value as "manual" | "average")}
                           className={`${styles.input} mb-3`}
                        >
                           <option value="average">Média Automática dos Filmes</option>
                           <option value="manual">Nota Manual (Ex: Trilogias)</option>
                        </Form.Select>

                        {ratingType === "manual" && (
                           <div>
                              <Form.Label className={styles.label}>Sua nota para o conjunto:</Form.Label>
                              <StarRating value={manualRating} onChange={setManualRating} max={10} />
                           </div>
                        )}
                     </div>
                  )}
               </div>

               <Form.Label className={styles.label}>Tipo de Lista</Form.Label>
               <div className={styles.typeGrid}>
                  {/* Opção 1: Particular */}
                  <div 
                     className={`${styles.typeCard} ${type === "private" ? styles.typeCardActive : ""}`}
                     onClick={() => { setType("private"); setSelectedFriends([]); }}
                  >
                     <Lock size={20} className={styles.typeIcon} />
                     <span className={styles.typeTitle}>Particular</span>
                     <span className={styles.typeDesc}>Apenas você. Funciona como uma pasta para organizar os seus filmes.</span>
                  </div>

                  {/* Opção 2: Colaborativa*/}
                  <div 
                     className={`${styles.typeCard} ${type === "partial_shared" ? styles.typeCardActive : ""}`}
                     onClick={() => setType("partial_shared")}
                  >
                     <Users size={20} className={styles.typeIcon} />
                     <span className={styles.typeTitle}>Colaborativa</span>
                     <span className={styles.typeDesc}>Ideal para grupos. Todos dão notas separadas e o sistema faz a média.</span>
                  </div>

                  {/* Opção 3: Unificada*/}
                  <div 
                     className={`${styles.typeCard} ${type === "full_shared" ? styles.typeCardActive : ""}`}
                     onClick={() => setType("full_shared")}
                  >
                     <Share2 size={20} className={styles.typeIcon} />
                     <span className={styles.typeTitle}>Unificada</span>
                     <span className={styles.typeDesc}>Uma única nota e avaliação colaborativa gerenciada por todos os membros.</span>
                  </div>
               </div>

               {/* ─── SEÇÃO DE CONVIDAR AMIGOS ─── */}
               {type !== "private" && (
                  <div className={styles.friendsSection}>
                     <Form.Label className={styles.label}>Convide seus amigos:</Form.Label>
                     
                     {loadingFriends ? (
                        <div className="text-center py-3"><Spinner size="sm" animation="border" variant="light" /></div>
                     ) : friends.length === 0 ? (
                        <p className={styles.noFriends}>Você ainda não adicionou amigos no seu perfil.</p>
                     ) : (
                        <div className={styles.friendsList}>
                           {friends.map(friend => {
                              const isSelected = selectedFriends.includes(friend.id);
                              return (
                                 <div 
                                    key={friend.id} 
                                    className={`${styles.friendCard} ${isSelected ? styles.friendCardActive : ""}`}
                                    onClick={() => toggleFriend(friend.id)}
                                 >
                                    <div className="d-flex align-items-center gap-2">
                                       {friend.avatar_url ? (
                                          <img src={friend.avatar_url} alt={friend.username} className={styles.friendAvatar} />
                                       ) : (
                                          <div className={styles.friendAvatarPlaceholder}>
                                             {friend.username.charAt(0).toUpperCase()}
                                          </div>
                                       )}
                                       <span className={styles.friendName}>@{friend.username}</span>
                                    </div>
                                    {isSelected && <Check size={18} className={styles.checkIcon} />}
                                 </div>
                              )
                           })}
                        </div>
                     )}
                  </div>
               )}

               <button type="submit" className={styles.submitBtn} disabled={loading || !name.trim()}>
                  {loading ? <Spinner size="sm" animation="border" /> : "Criar Lista"}
               </button>
            </Form>
         </Modal.Body>
      </Modal>
   );
}