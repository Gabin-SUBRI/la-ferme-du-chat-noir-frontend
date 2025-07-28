// Configuration API Backend dynamique
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000" // En développement
    : "https://la-ferme-du-chat-noir.vercel.app"; // En production

let commandesClient = [];

// ========================================
// GESTION SÉCURISÉE DE L'AUTHENTIFICATION ADMIN
// ========================================

// Fonction pour vérifier le mot de passe via l'API backend
async function verifierMotDePasseSecurise(motDePasse) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: motDePasse }),
    });

    const data = await response.json();

    if (data.success) {
      // Stocker le token en session (plus sécurisé que localStorage)
      sessionStorage.setItem("admin_token", data.token);
      return true;
    } else {
      console.log("Authentification échouée:", data.message);
      return false;
    }
  } catch (error) {
    console.error("Erreur lors de l'authentification:", error);
    return false;
  }
}

// Fonction pour vérifier si l'utilisateur est déjà connecté
function estAdminConnecte() {
  const token = sessionStorage.getItem("admin_token");
  return token && token.startsWith("admin_");
}

// Fonction pour obtenir le token admin
function obtenirTokenAdmin() {
  return sessionStorage.getItem("admin_token");
}

// Fonction d'initialisation du modal admin (version sécurisée)
function initModalAdminSecurise() {
  const adminLink = document.getElementById("admin-link");
  const adminModal = document.getElementById("admin-modal");
  const adminPasswordInput = document.getElementById("admin-password");
  const adminLoginBtn = document.getElementById("admin-login");
  const adminCancelBtn = document.getElementById("admin-cancel");
  const adminError = document.getElementById("admin-error");

  if (
    !adminLink ||
    !adminModal ||
    !adminPasswordInput ||
    !adminLoginBtn ||
    !adminCancelBtn ||
    !adminError
  ) {
    console.warn("Éléments du modal admin non trouvés");
    return;
  }

  // Ouvrir le modal
  adminLink.addEventListener("click", (e) => {
    e.preventDefault();

    // Si déjà connecté, aller directement à la page admin
    if (estAdminConnecte()) {
      window.location.href = "admin.html";
      return;
    }

    adminModal.style.display = "block";
    adminPasswordInput.focus();
    adminError.style.display = "none";
    adminPasswordInput.value = "";
  });

  // Fermer le modal
  adminCancelBtn.addEventListener("click", () => {
    adminModal.style.display = "none";
  });

  // Fermer en cliquant à l'extérieur
  adminModal.addEventListener("click", (e) => {
    if (e.target === adminModal) {
      adminModal.style.display = "none";
    }
  });

  // Connexion sécurisée
  adminLoginBtn.addEventListener("click", async () => {
    const password = adminPasswordInput.value.trim();

    if (!password) {
      afficherErreurAuth("Veuillez saisir un mot de passe");
      return;
    }

    // Afficher un loading
    const texteOriginal = adminLoginBtn.textContent;
    adminLoginBtn.textContent = "🔄 Connexion...";
    adminLoginBtn.disabled = true;
    adminError.style.display = "none";

    try {
      const authentificationReussie = await verifierMotDePasseSecurise(
        password
      );

      if (authentificationReussie) {
        adminModal.style.display = "none";
        afficherMessageClient(
          "✅ Connexion réussie ! Redirection...",
          "success"
        );

        // Redirection après un court délai
        setTimeout(() => {
          window.location.href = "admin.html";
        }, 1000);
      } else {
        afficherErreurAuth("Mot de passe incorrect");
      }
    } catch (error) {
      console.error("Erreur de connexion:", error);
      afficherErreurAuth("Erreur de connexion au serveur");
    } finally {
      // Restaurer le bouton
      adminLoginBtn.textContent = texteOriginal;
      adminLoginBtn.disabled = false;
    }
  });

  // Connexion avec Enter
  adminPasswordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      adminLoginBtn.click();
    }
  });

  // Fermer avec Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && adminModal.style.display === "block") {
      adminModal.style.display = "none";
    }
  });
}

// Fonction pour afficher les erreurs d'authentification
function afficherErreurAuth(message) {
  const adminError = document.getElementById("admin-error");
  const adminPasswordInput = document.getElementById("admin-password");

  if (adminError) {
    adminError.textContent = `❌ ${message}`;
    adminError.style.display = "block";
  }

  if (adminPasswordInput) {
    adminPasswordInput.value = "";
    adminPasswordInput.focus();
    adminPasswordInput.style.borderColor = "var(--tomato-red)";
    adminPasswordInput.style.animation = "shake 0.5s ease-in-out";

    setTimeout(() => {
      adminPasswordInput.style.borderColor = "var(--gray-medium)";
      adminPasswordInput.style.animation = "";
    }, 500);
  }
}

// Fonction pour déconnecter l'admin
function deconnecterAdmin() {
  sessionStorage.removeItem("admin_token");
  window.location.href = "index.html";
}

// ========================================
// FONCTIONS API (publiques pour le client)
// ========================================

// Fonction pour lire le stock depuis le backend
async function lireStock() {
  try {
    const response = await fetch(`${API_BASE_URL}/stock`);
    const stock = await response.json();
    return stock;
  } catch (error) {
    console.error("Erreur lecture stock:", error);
    return [];
  }
}

// Fonction pour valider une commande
async function validerCommande(commandesValidees, nomClient) {
  try {
    // Formatter les commandes pour correspondre au format attendu par le backend
    const commandesFormatees = commandesValidees.map((cmd) => ({
      produit: cmd.produit,
      quantite: cmd.quantite,
      prix: cmd.prix,
      unite: cmd.unite,
      client: nomClient,
      statut: "à préparer",
    }));

    const response = await fetch(`${API_BASE_URL}/valider-commande`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commandesFormatees),
    });

    return response.ok;
  } catch (error) {
    console.error("Erreur validation commande:", error);
    return false;
  }
}

// ========================================
// LOGIQUE MÉTIER CLIENT
// ========================================

// Charger le stock pour l'affichage client
async function chargerStock() {
  try {
    const stock = await lireStock();

    // Mettre à jour la liste des légumes disponibles
    const listeStock = document.getElementById("liste-stock");
    const select = document.getElementById("produit");

    listeStock.innerHTML = "";
    select.innerHTML = '<option value="">-- Choisissez un légume --</option>';

    if (stock.length === 0) {
      listeStock.innerHTML =
        '<li style="text-align: center; color: #666; font-style: italic;">Aucun légume disponible pour le moment</li>';
      return;
    }

    stock.forEach((item) => {
      // Affichage dans la liste des légumes disponibles
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${item.nom || item.produit}</strong><br>
        <span style="color: #666;">Prix: ${item.prix.toFixed(2)} €/${
        item.unite
      }</span><br>
        <span style="color: ${
          item.quantite > 5
            ? "var(--primary-green)"
            : item.quantite > 0
            ? "var(--corn-yellow)"
            : "var(--tomato-red)"
        };">
          Stock: ${item.quantite} ${item.unite} ${
        item.quantite === 0
          ? "(Épuisé)"
          : item.quantite <= 5
          ? "(Stock limité)"
          : ""
      }
        </span>
      `;
      listeStock.appendChild(li);

      // Ajouter au select seulement si en stock
      if (item.quantite > 0) {
        const option = document.createElement("option");
        option.value = item.nom || item.produit;
        option.textContent = `${item.nom || item.produit} – ${item.prix.toFixed(
          2
        )} €/${item.unite} (Stock: ${item.quantite})`;
        option.dataset.prix = item.prix;
        option.dataset.unite = item.unite;
        option.dataset.stockDisponible = item.quantite;
        select.appendChild(option);
      }
    });
  } catch (err) {
    console.error("Erreur de chargement du stock :", err);
    afficherMessageClient("❌ Impossible de charger les produits", "error");
  }
}

// Charger le stock au démarrage
document.addEventListener("DOMContentLoaded", () => {
  chargerStock();

  // Recharger le stock toutes les 30 secondes pour avoir les dernières données
  setInterval(chargerStock, 30000);

  // Initialiser le modal admin
  setTimeout(initModalAdminSecurise, 100);
});

// Gérer l'ajout d'articles au panier
document.getElementById("form-commande").addEventListener("submit", (e) => {
  e.preventDefault();

  const select = document.getElementById("produit");
  const quantiteInput = document.getElementById("quantite");
  const quantiteDemandee = Number(quantiteInput.value);
  const stockDisponible = Number(
    select.selectedOptions[0]?.dataset.stockDisponible || 0
  );

  // Vérifications
  if (!select.value) {
    afficherMessageClient("⚠️ Veuillez sélectionner un légume", "error");
    return;
  }

  if (quantiteDemandee <= 0) {
    afficherMessageClient("⚠️ La quantité doit être supérieure à 0", "error");
    return;
  }

  if (quantiteDemandee > stockDisponible) {
    afficherMessageClient(
      `⚠️ Stock insuffisant ! Il ne reste que ${stockDisponible} ${select.selectedOptions[0].dataset.unite}`,
      "error"
    );
    return;
  }

  // Vérifier si le produit est déjà dans le panier
  const produitExistant = commandesClient.find(
    (cmd) => cmd.produit === select.value
  );

  if (produitExistant) {
    const totalQuantite = produitExistant.quantite + quantiteDemandee;
    if (totalQuantite > stockDisponible) {
      afficherMessageClient(
        `⚠️ Vous avez déjà ${produitExistant.quantite} ${produitExistant.unite} de ${produitExistant.produit} dans votre panier. Stock total insuffisant !`,
        "error"
      );
      return;
    }
    produitExistant.quantite = totalQuantite;
  } else {
    const commande = {
      produit: select.value,
      quantite: quantiteDemandee,
      prix: Number(select.selectedOptions[0].dataset.prix),
      unite: select.selectedOptions[0].dataset.unite,
    };
    commandesClient.push(commande);
  }

  afficherCommandesClient();
  afficherMessageClient(
    `✅ ${quantiteDemandee} ${select.selectedOptions[0].dataset.unite} de ${select.value} ajouté(s) au panier`,
    "success"
  );
  e.target.reset();
});

// Afficher les commandes dans le tableau
function afficherCommandesClient() {
  const tbody = document.getElementById("table-commandes");
  tbody.innerHTML = "";

  let totalGeneral = 0;

  commandesClient.forEach((cmd, index) => {
    const total = cmd.quantite * cmd.prix;
    totalGeneral += total;

    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${cmd.produit}</td>
      <td>${cmd.quantite}</td>
      <td>${cmd.unite}</td>
      <td>${cmd.prix.toFixed(2)} €</td>
      <td>${total.toFixed(2)} €</td>
      <td>
        <button onclick="retirerDuPanier(${index})" style="
          background: var(--tomato-red); color: white; border: none; padding: 5px 10px; 
          border-radius: 4px; cursor: pointer; font-size: 0.8rem;
        ">
          🗑️ Retirer
        </button>
      </td>
    `;
  });

  // Ajouter une ligne de total
  if (commandesClient.length > 0) {
    const rowTotal = tbody.insertRow();
    rowTotal.innerHTML = `
      <td colspan="4" style="text-align: right; font-weight: bold;">TOTAL :</td>
      <td style="font-weight: bold; color: var(--primary-green);">${totalGeneral.toFixed(
        2
      )} €</td>
      <td></td>
    `;
    rowTotal.style.backgroundColor = "var(--background)";
  }
}

// Retirer un article du panier
function retirerDuPanier(index) {
  const produitRetiré = commandesClient[index];
  commandesClient.splice(index, 1);
  afficherCommandesClient();
  afficherMessageClient(
    `🗑️ ${produitRetiré.produit} retiré du panier`,
    "success"
  );
}

// Valider la commande
document
  .getElementById("valider-commande")
  .addEventListener("click", async () => {
    if (commandesClient.length === 0) {
      afficherMessageClient("⚠️ Aucune commande à valider !", "error");
      return;
    }

    const nomClient = document.getElementById("nom-client").value.trim();
    if (!nomClient) {
      afficherMessageClient("⚠️ Veuillez renseigner votre nom !", "error");
      document.getElementById("nom-client").focus();
      return;
    }

    // Afficher un loading
    const bouton = document.getElementById("valider-commande");
    const texteOriginal = bouton.textContent;
    bouton.textContent = "⏳ Validation en cours...";
    bouton.disabled = true;

    try {
      const succes = await validerCommande(commandesClient, nomClient);

      if (succes) {
        // Calculer le total
        let total = 0;
        const lignes = commandesClient.map((cmd) => {
          const sousTotal = cmd.quantite * cmd.prix;
          total += sousTotal;
          return `${cmd.quantite} ${cmd.unite} de ${
            cmd.produit
          } à ${cmd.prix.toFixed(2)} €/${cmd.unite} → ${sousTotal.toFixed(
            2
          )} €`;
        });

        afficherMessageClient(
          `✅ Commande validée pour ${nomClient}\n${lignes.join(
            "\n"
          )}\nTotal : ${total.toFixed(2)} €\n\nMerci pour votre commande ! 🌱`,
          "success"
        );

        // Réinitialiser
        commandesClient = [];
        afficherCommandesClient();
        document.getElementById("nom-client").value = "";

        // Recharger le stock mis à jour
        setTimeout(chargerStock, 1000);
      } else {
        afficherMessageClient(
          "❌ Erreur lors de la validation de la commande",
          "error"
        );
        // Recharger le stock au cas où il aurait été modifié partiellement
        chargerStock();
      }
    } catch (err) {
      console.error("Erreur lors de la validation :", err);
      afficherMessageClient(
        "❌ Erreur de connexion lors de la validation",
        "error"
      );
    } finally {
      // Restaurer le bouton
      bouton.textContent = texteOriginal;
      bouton.disabled = false;
    }
  });

// Vider le panier
document.getElementById("vider-panier").addEventListener("click", () => {
  if (commandesClient.length === 0) {
    afficherMessageClient("⚠️ Le panier est déjà vide", "error");
    return;
  }

  if (confirm("Êtes-vous sûr de vouloir vider votre panier ?")) {
    commandesClient = [];
    afficherCommandesClient();
    afficherMessageClient("🧹 Panier vidé avec succès", "success");
  }
});

// Fonction pour afficher les messages
function afficherMessageClient(message, type) {
  const zone = document.getElementById("message");
  if (!zone) return;

  zone.textContent = message;
  zone.className = type === "error" ? "error" : "success";

  // Auto-masquage après 5 secondes pour les messages de succès
  if (type === "success") {
    setTimeout(() => {
      zone.textContent = "";
      zone.className = "";
    }, 5000);
  }
}

// Export des fonctions utilitaires pour la page admin
window.adminAuth = {
  estConnecte: estAdminConnecte,
  deconnecter: deconnecterAdmin,
  obtenirToken: obtenirTokenAdmin,
};
