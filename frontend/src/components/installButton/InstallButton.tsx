import { Capacitor } from '@capacitor/core'; 
import { Download } from "lucide-react"; 
import styles from "./InstallButton.module.css";

export function InstallButton() {
   const isNativeApp = Capacitor.isNativePlatform();

   if (isNativeApp) return null;

   const handleDownload = () => {
      const link = document.createElement('a');
      link.href = '/jj-reviews.apk';
      link.download = 'jj-reviews.apk';
      link.setAttribute('type', 'application/vnd.android.package-archive');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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