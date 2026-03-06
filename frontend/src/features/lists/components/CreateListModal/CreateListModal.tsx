import { useState } from "react";
import { Modal, Form, Spinner } from "react-bootstrap";
import styles from "./CreateListModal.module.css";
import type { CustomList } from "@/types";

interface CreateListModalProps {
   show: boolean;
   onHide: () => void;
   onCreate: (name: string, description: string) => Promise<CustomList | null>;
}

export function CreateListModal({ show, onHide, onCreate }: CreateListModalProps) {
   const [name, setName] = useState("");
   const [description, setDescription] = useState("");
   const [isSubmitting, setIsSubmitting] = useState(false);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;

      setIsSubmitting(true);
      const success = await onCreate(name, description);
      setIsSubmitting(false);

      if (success) {
         setName("");
         setDescription("");
         onHide();
      }
   };

   return (
      <Modal show={show} onHide={onHide} centered contentClassName={styles.modalContent}>
         <Modal.Header closeButton closeVariant="white" className={styles.header}>
            <Modal.Title className={styles.title}>Criar Nova Lista</Modal.Title>
         </Modal.Header>
         <Modal.Body className={styles.body}>
            <Form onSubmit={handleSubmit}>
               <Form.Group className="mb-3">
                  <Form.Label className={styles.label}>Nome da Lista *</Form.Label>
                  <Form.Control
                     type="text"
                     placeholder="Ex: Filmes para chorar, filmes com plot twist"
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     className={styles.input}
                     required
                     autoFocus
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
                     {isSubmitting ? <Spinner size="sm" animation="border" /> : "Criar Lista"}
                  </button>
               </div>
            </Form>
         </Modal.Body>
      </Modal>
   );
}