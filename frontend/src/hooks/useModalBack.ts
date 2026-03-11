import { useEffect } from "react";

let openModalsCount = 0;

export function useModalBack(isOpen: boolean, closeFunction: () => void) {
   useEffect(() => {
      if (!isOpen) return;

      openModalsCount++;

      if (openModalsCount === 1 && !window.history.state?.isModal) {
         window.history.pushState({ isModal: true }, "");
      }

      const handleBackButton = () => {
         closeFunction();
      };

      window.addEventListener("popstate", handleBackButton);

      return () => {
         window.removeEventListener("popstate", handleBackButton);
         openModalsCount--;

         setTimeout(() => {
            if (openModalsCount === 0 && window.history.state?.isModal) {
               window.history.back();
            }
         }, 50);
      };
   }, [isOpen, closeFunction]);
}