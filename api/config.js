// Configuration temporaire simple
window.CONFIG = {
  API_BASE_URL:
    window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://la-ferme-du-chat-noir.vercel.app",

  // Pour l'instant, on met le mot de passe ici (à changer plus tard)
  ADMIN_PASSWORD: "ferme2025",
};
