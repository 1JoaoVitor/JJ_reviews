import { useState} from "react";
import { Modal, Form, Spinner } from "react-bootstrap";
import type { CustomList } from "@/types";
import styles from "../CreateListModal/CreateListModal.module.css"; 

interface EditListModalProps {
   show: boolean;
   onHide: () => void;
   onUpdate: (id: string, name: string, description: string) => Promise<boolean>;
   list: CustomList;
}

export function EditListModal({ show, onHide, onUpdate, list }: EditListModalProps) {
   const [name, setName] = useState(list.name);
   const [description, setDescription] = useState(list.description || "");
   const [isSubmitting, setIsSubmitting] = useState(false);


   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;

      setIsSubmitting(true);
      const success = await onUpdate(list.id, name, description);
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