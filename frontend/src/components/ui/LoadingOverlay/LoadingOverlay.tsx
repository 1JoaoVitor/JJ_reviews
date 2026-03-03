import { Spinner } from "react-bootstrap";
import styles from "./LoadingOverlay.module.css";

interface LoadingOverlayProps {
   message?: string;
}

export function LoadingOverlay({ message = "Carregando..." }: LoadingOverlayProps) {
   return (
      <div className={styles.overlay}>
         <div className="text-white text-center">
            <Spinner animation="border" className="mb-3" />
            <h3>{message}</h3>
         </div>
      </div>
   );
}
