import { Capacitor } from '@capacitor/core'; 
import { Download } from "lucide-react"; 
import toast from "react-hot-toast";
import styles from "./InstallButton.module.css";

export function InstallButton() {
   const isNativeApp = Capacitor.isNativePlatform();
   const apkUrl = import.meta.env.VITE_ANDROID_APK_URL as string | undefined;

   if (isNativeApp) return null;

   const handleDownload = () => {
      if (!apkUrl) {
         alert("Link do APK não configurado.");
         return;
      }

      window.open(apkUrl, "_blank", "noopener,noreferrer");
      toast("Depois de instalar a atualização, feche e reabra o app para aplicar as mudanças.", {
         duration: 5000,
      });
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