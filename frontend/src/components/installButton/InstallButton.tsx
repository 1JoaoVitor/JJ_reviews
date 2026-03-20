import { Capacitor } from '@capacitor/core'; 
import { Download } from "lucide-react"; 
import styles from "./InstallButton.module.css";

export function InstallButton() {
   const isNativeApp = Capacitor.isNativePlatform();

   if (isNativeApp) return null;

   const handleDownload = () => {
      // Abrir página de download intermediária
      // Isso fornece melhor controle sobre os headers e o download
      window.location.href = '/download.html';
   };

   return (
      <div className={styles.installWrapper}>
         <button 
            onClick={handleDownload}
            className={styles.installBtn}
            title="Baixar aplicativo Android"
         >
            <Download size={18} />
            Baixe o app
         </button>
      </div>
   );
}