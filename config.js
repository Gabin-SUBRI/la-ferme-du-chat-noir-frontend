// Configuration de l'application
window.CONFIG = {
  // API Backend
  API_BASE_URL:
    window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://la-ferme-du-chat-noir.vercel.app",

  // Admin (à définir via variable d'environnement Vercel)
  ADMIN_PASSWORD: "admin", // Sera remplacé par Vercel
};
