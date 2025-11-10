import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { FavoritesProvider } from "./contexts/FavoritesContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <FavoritesProvider>
      <App />
    </FavoritesProvider>
  </AuthProvider>
);
