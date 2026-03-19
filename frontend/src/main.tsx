import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/features/auth";
import "./styles/variables.css";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
   <React.StrictMode>
      <AuthProvider>
         <BrowserRouter>
            <App />
         </BrowserRouter>
      </AuthProvider>
   </React.StrictMode>,
);
