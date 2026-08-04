import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { AuthProvider } from "../context/AuthContext";
import { installCsrfInterceptor } from "./lib/csrf";

// Must run before any component mounts and starts fetching.
installCsrfInterceptor();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
