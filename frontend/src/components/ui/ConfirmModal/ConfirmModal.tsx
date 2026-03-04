import { Modal, Spinner } from "react-bootstrap";
import { AlertTriangle } from "lucide-react";
import styles from "./ConfirmModal.module.css";

interface ConfirmModalProps {
   show: boolean;
   onHide: () => void;
   onConfirm: () => void;
   title?: string;
   message: string;
   confirmText?: string;
   isProcessing?: boolean;
}

export function ConfirmModal({ 
   show, onHide, onConfirm, title = "Atenção", 
   message, confirmText = "Sim, excluir", isProcessing = false 
}: ConfirmModalProps) {
   return (
      <Modal show={show} onHide={onHide} centered backdrop="static" contentClassName={styles.modalContent}>
         <Modal.Body className={styles.body}>
            <div className={styles.iconContainer}>
               <div className={styles.iconBackground}>
                  <AlertTriangle size={32} strokeWidth={2.5} className={styles.warningIcon} />
               </div>
            </div>
            <h4 className={styles.title}>{title}</h4>
            <p className={styles.message}>{message}</p>
            
            <div className={styles.actions}>
               <button className={styles.cancelBtn} onClick={onHide} disabled={isProcessing}>
                  Cancelar
               </button>
               <button className={styles.confirmBtn} onClick={onConfirm} disabled={isProcessing}>
                  {isProcessing ? <Spinner size="sm" animation="border" /> : confirmText}
               </button>
            </div>
         </Modal.Body>
      </Modal>
   );
}