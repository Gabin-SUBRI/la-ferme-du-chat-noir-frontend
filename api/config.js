// Configuration de l'application (chargée depuis l'API)
window.CONFIG = {
  // Valeurs par défaut pour le développement local
  API_BASE_URL:
    window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://la-ferme-du-chat-noir.vercel.app",

  // Le mot de passe sera chargé depuis l'API
  ADMIN_PASSWORD: null,
};

// Charger la configuration depuis l'API Vercel
if (window.location.hostname !== "localhost") {
  fetch("/api/config")
    .then((response) => response.text())
    .then((script) => {
      // Exécuter le script qui définit window.CONFIG
      eval(script);
    })
    .catch((error) => {
      console.warn("Impossible de charger la configuration:", error);
    });
}
