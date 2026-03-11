import { useEffect } from "react";

let openModalsCount = 0;

export function useModalBack(isOpen: boolean, closeFunction: () => void) {
   useEffect(() => {
      if (!isOpen) return;

      openModalsCount++;

      // Adicionar "#modal" na URL. O Android obrigatoriamente
      // reconhece isso como uma nova página no histórico e destrava o botão voltar
      if (openModalsCount === 1 && !window.location.hash.includes("modal")) {
         window.history.pushState({ isModal: true }, "", window.location.pathname + window.location.search + "#modal");
      }

      const handleBackButton = () => {
         closeFunction();
      };

      // O popstate é acionado quando a URL muda (ex: quando o botão voltar remove o #modal)
      window.addEventListener("popstate", handleBackButton);

      return () => {
         window.removeEventListener("popstate", handleBackButton);
         openModalsCount--;

         setTimeout(() => {
            // Se fecharmos no "X" da tela, nós limpamos a hash da URL manualmente
            if (openModalsCount === 0 && window.location.hash.includes("modal")) {
               window.history.back();
            }
         }, 50);
      };
   }, [isOpen, closeFunction]);
}