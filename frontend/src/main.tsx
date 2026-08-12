import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { AuthProvider } from "@/context/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import BackendStartupGate from "@/components/BackendStartupGate";

// Outermost, so a render error anywhere below shows a recoverable screen
// instead of unmounting the app and leaving a blank page.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <BackendStartupGate>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </BackendStartupGate>
  </ErrorBoundary>
);
