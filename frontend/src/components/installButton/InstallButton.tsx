import { Capacitor } from '@capacitor/core'; 
import { Download } from "lucide-react"; 
import styles from "./InstallButton.module.css";

export function InstallButton() {
   const isNativeApp = Capacitor.isNativePlatform();

   if (isNativeApp) return null;

   const handleDownload = async () => {
      try {
         // Fazer fetch do arquivo como blob para melhor compatibilidade mobile
         const response = await fetch('/jj-reviews.apk');
         
         if (!response.ok) {
            throw new Error('Falha ao baixar arquivo');
         }
         
         const blob = await response.blob();
         
         // Criar URL do blob e simular download
         const url = window.URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = 'jj-reviews.apk';
         
         // Adicionar ao DOM, clicar e remover
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         
         // Limpar URL do blob
         window.URL.revokeObjectURL(url);
      } catch (error) {
         console.error('Erro ao baixar APK:', error);
         // Fallback: tentar download direto via location
         window.location.href = '/jj-reviews.apk';
      }
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