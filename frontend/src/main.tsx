import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/features/auth";
import "./styles/variables.css";
import "./styles/global.css";
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://f6d31cb9913cd5a719b4d698826b34c8@o4511090247335936.ingest.de.sentry.io/4511090325520464", 
  
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],

  tracesSampleRate: 0.1, 

  replaysSessionSampleRate: 0.1, 
  replaysOnErrorSampleRate: 1.0, 
});

ReactDOM.createRoot(document.getElementById("root")!).render(
   <React.StrictMode>
      <AuthProvider>
         <BrowserRouter>
            <App />
         </BrowserRouter>
      </AuthProvider>
   </React.StrictMode>,
);
