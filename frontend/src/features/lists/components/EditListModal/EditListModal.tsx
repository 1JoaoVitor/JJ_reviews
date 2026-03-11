import { useState } from "react";
import { Modal, Form, Spinner } from "react-bootstrap";
import type { CustomList } from "@/types";
import styles from "../CreateListModal/CreateListModal.module.css"; 
import { StarRating } from "@/components/ui/StarRating/StarRating";
import { useModalBack } from "@/hooks/useModalBack";

interface EditListModalProps {
   show: boolean;
   onHide: () => void;
   onUpdate: (
      id: string, 
      name: string, 
      description: string, 
      has_rating: boolean, 
      rating_type: "manual" | "average" | null, 
      manual_rating: number | null,
      auto_sync: boolean,
   ) => Promise<boolean>;
   list: CustomList;
}

export function EditListModal({ show, onHide, onUpdate, list }: EditListModalProps) {

   useModalBack(show, onHide);

   const [name, setName] = useState(list.name);
   const [description, setDescription] = useState(list.description || "");
   
   const [hasRating, setHasRating] = useState(list.has_rating || false);
   const [ratingType, setRatingType] = useState<"manual" | "average">(list.rating_type || "average");
   const [manualRating, setManualRating] = useState<number>(list.manual_rating || 5);
   const [autoSync, setAutoSync] = useState(false);
   
   const [isSubmitting, setIsSubmitting] = useState(false);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;

      setIsSubmitting(true);
      const success = await onUpdate(
         list.id, 
         name, 
         description,
         hasRating,
         hasRating ? ratingType : null,
         hasRating && ratingType === "manual" ? manualRating : null,
         autoSync,
      );
      setIsSubmitting(false);

      if (success) {
         onHide();
      }
   };

   return (
      <Modal 
        show={show}
        onShow={() => {
            setName(list.name);
            setDescription(list.description || "");
            setHasRating(list.has_rating || false);
            setRatingType(list.rating_type || "average");
            setManualRating(list.manual_rating || 5);
            setAutoSync(list.auto_sync || false);
         }} 
        onHide={onHide} 
        centered 
        contentClassName={styles.modalContent}>
         <Modal.Header closeButton closeVariant="white" className={styles.header}>
            <Modal.Title className={styles.title}>Editar Lista</Modal.Title>
         </Modal.Header>
         <Modal.Body className={styles.body}>
            <Form onSubmit={handleSubmit}>
               <Form.Group className="mb-3">
                  <Form.Label className={styles.label}>Nome da Lista *</Form.Label>
                  <Form.Control
                     type="text"
                     placeholder="Ex: Filmes para chorar"
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     className={styles.input}
                     required
                     maxLength={50}
                  />
                  <Form.Text className="text-muted">{name.length}/50</Form.Text>
               </Form.Group>
               <Form.Group className="mb-4">
                  <Form.Label className={styles.label}>Descrição (Opcional)</Form.Label>
                  <Form.Control
                     as="textarea"
                     rows={3}
                     placeholder="Sobre o que é essa lista?"
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                     className={styles.input}
                     maxLength={200}
                  />
                  <Form.Text className="text-muted">{description.length}/200</Form.Text>
               </Form.Group>

               {/* ─── OPÇÕES DE NOTA DA LISTA ─── */}
               <div className="mb-4 p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <Form.Check 
                     type="switch"
                     id="edit-has-rating-switch"
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

               {/* ─── AUTO-SINCRONIZAÇÃO ─── */}
               {list.type === "full_shared" && (
                  <div className="mb-4 p-3" style={{ background: 'rgba(255, 193, 7, 0.05)', border: '1px solid var(--gold)', borderRadius: 'var(--radius-md)' }}>
                     <Form.Check 
                        type="switch"
                        id="edit-auto-sync-switch"
                        label={
                           <div>
                              <span style={{ fontWeight: 600, color: 'var(--gold)' }}>Auto-Sincronização</span>
                              <p className="text-muted small mb-0" style={{ fontSize: '0.8rem' }}>
                                 Avaliações feitas nesta lista serão copiadas automaticamente para o perfil de todos os membros.
                              </p>
                           </div>
                        }
                        checked={autoSync}
                        onChange={(e) => setAutoSync(e.target.checked)}
                     />
                  </div>
               )}

               <div className="d-flex justify-content-end gap-2">
                  <button type="button" onClick={onHide} className={styles.cancelBtn} disabled={isSubmitting}>
                     Cancelar
                  </button>
                  <button type="submit" className={styles.submitBtn} disabled={!name.trim() || isSubmitting}>
                     {isSubmitting ? <Spinner size="sm" animation="border" /> : "Salvar Alterações"}
                  </button>
               </div>
            </Form>
         </Modal.Body>
      </Modal>
   );
}