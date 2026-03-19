import { Capacitor } from '@capacitor/core'; 
import { Download } from "lucide-react"; 
import styles from "./InstallButton.module.css";

export function InstallButton() {
   const isNativeApp = Capacitor.isNativePlatform();

   if (isNativeApp) return null;

   return (
      <div className={styles.installWrapper}>
         <a 
            href="/jj-reviews.apk"
            download="jj-reviews.apk"
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.installBtn}
         >
            <Download size={18} />
            Baixe o app
         </a>
      </div>
   );
}