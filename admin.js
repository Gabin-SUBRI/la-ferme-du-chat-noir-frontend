// Configuration API Backend dynamique
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000" // En développement
    : "https://la-ferme-du-chat-noir.vercel.app"; // En production

// ========================================
// PROTECTION DE LA PAGE ADMIN
// ========================================

// Vérifier l'authentification au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
  const token = sessionStorage.getItem("admin_token");

  if (!token || !token.startsWith("admin_")) {
    // Rediriger vers la page d'accueil si pas authentifié
    alert("❌ Accès non autorisé. Veuillez vous connecter.");
    window.location.href = "index.html";
    return;
  }

  // Vérifier la validité du token auprès du serveur
  verifierTokenAupresServeur(token);

  // Si authentifié, continuer le chargement normal
  chargerStock();
  chargerCommandesPreparation();

  // Actualiser les commandes toutes les 30 secondes
  setInterval(chargerCommandesPreparation, 30000);

  // Message de bienvenue
  setTimeout(() => {
    afficherMessage(
      "🔧 Interface admin prête avec authentification sécurisée !",
      "success"
    );
  }, 500);

  // Ajouter un bouton de déconnexion
  ajouterBoutonDeconnexion();
});

// Vérifier la validité du token auprès du serveur
async function verifierTokenAupresServeur(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/verify`, {
      headers: {
        Authorization: token,
      },
    });

    if (!response.ok) {
      throw new Error("Token invalide");
    }
  } catch (error) {
    console.error("Token invalide:", error);
    alert("❌ Session expirée. Veuillez vous reconnecter.");
    sessionStorage.removeItem("admin_token");
    window.location.href = "index.html";
  }
}

// Fonction pour ajouter un bouton de déconnexion
function ajouterBoutonDeconnexion() {
  const header = document.querySelector("h1");
  if (header) {
    const boutonDeconnexion = document.createElement("button");
    boutonDeconnexion.innerHTML = "🚪 Déconnexion";
    boutonDeconnexion.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, var(--tomato-red), var(--carrot-orange));
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
      z-index: 1000;
    `;

    boutonDeconnexion.addEventListener("click", async () => {
      if (confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
        // Informer le serveur de la déconnexion
        const token = sessionStorage.getItem("admin_token");
        if (token) {
          try {
            await fetch(`${API_BASE_URL}/api/admin/logout`, {
              method: "POST",
              headers: {
                Authorization: token,
              },
            });
          } catch (error) {
            console.error("Erreur lors de la déconnexion côté serveur:", error);
          }
        }

        // Supprimer le token et rediriger
        sessionStorage.removeItem("admin_token");
        window.location.href = "index.html";
      }
    });

    boutonDeconnexion.addEventListener("mouseenter", () => {
      boutonDeconnexion.style.transform = "translateY(-2px)";
      boutonDeconnexion.style.boxShadow = "0 5px 15px rgba(244, 67, 54, 0.3)";
    });

    boutonDeconnexion.addEventListener("mouseleave", () => {
      boutonDeconnexion.style.transform = "translateY(0)";
      boutonDeconnexion.style.boxShadow = "none";
    });

    document.body.appendChild(boutonDeconnexion);
  }
}

// Fonction utilitaire pour obtenir les headers d'authentification
function obtenirHeadersAuth() {
  const token = sessionStorage.getItem("admin_token");
  return {
    "Content-Type": "application/json",
    Authorization: token,
  };
}
//oui
// Fonction utilitaire pour gérer les erreurs d'authentification
function gererErreurAuth(response) {
  if (response.status === 403 || response.status === 401) {
    alert("❌ Session expirée. Veuillez vous reconnecter.");
    sessionStorage.removeItem("admin_token");
    window.location.href = "index.html";
    return true;
  }
  return false;
}

// ========================================
// FONCTIONS API AVEC AUTHENTIFICATION
// ========================================

// Fonctions utilitaires pour l'API
async function lireStock() {
  try {
    // La lecture du stock est publique, pas besoin d'authentification
    const response = await fetch(`${API_BASE_URL}/stock`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur lecture stock:", error);
    return [];
  }
}

async function ajouterAuStock(nouvelItem) {
  try {
    const response = await fetch(`${API_BASE_URL}/stock`, {
      method: "POST",
      headers: obtenirHeadersAuth(),
      body: JSON.stringify(nouvelItem),
    });

    if (gererErreurAuth(response)) return false;

    return response.ok;
  } catch (error) {
    console.error("Erreur ajout stock:", error);
    return false;
  }
}

async function supprimerDuStock(index) {
  try {
    const response = await fetch(`${API_BASE_URL}/stock/${index}`, {
      method: "DELETE",
      headers: obtenirHeadersAuth(),
    });

    if (gererErreurAuth(response)) return false;

    return response.ok;
  } catch (error) {
    console.error("Erreur suppression stock:", error);
    return false;
  }
}

// Fonctions pour les commandes
async function lireCommandes() {
  try {
    const response = await fetch(`${API_BASE_URL}/commandes-a-preparer`, {
      headers: obtenirHeadersAuth(),
    });

    if (gererErreurAuth(response)) return [];

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur lecture commandes:", error);
    return [];
  }
}

async function marquerCommePrepareAPI(index) {
  try {
    const response = await fetch(`${API_BASE_URL}/commande/statut/${index}`, {
      method: "PUT",
      headers: obtenirHeadersAuth(),
    });

    if (gererErreurAuth(response)) return false;

    return response.ok;
  } catch (error) {
    console.error("Erreur sauvegarde commandes:", error);
    return false;
  }
}

// ========================================
// LOGIQUE MÉTIER INCHANGÉE
// ========================================

// Ajout au stock
document.getElementById("form-stock").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Afficher un loading
  const bouton = e.target.querySelector('button[type="submit"]');
  const texteOriginal = bouton.textContent;
  bouton.textContent = "Ajout en cours...";
  bouton.disabled = true;

  const nouvelItem = {
    nom: document.getElementById("nom").value.trim(),
    produit: document.getElementById("nom").value.trim(), // Pour compatibilité
    quantite: Number(document.getElementById("quantite").value),
    prix: Number(document.getElementById("prix").value),
    unite: document.getElementById("unite").value.trim(),
  };

  try {
    const succes = await ajouterAuStock(nouvelItem);

    if (succes) {
      chargerStock();
      e.target.reset();
      afficherMessage("✅ Légume ajouté avec succès !", "success");
    } else {
      afficherMessage("❌ Erreur lors de l'ajout", "error");
    }
  } catch (error) {
    console.error("Erreur:", error);
    afficherMessage("❌ Erreur de connexion", "error");
  } finally {
    // Restaurer le bouton
    bouton.textContent = texteOriginal;
    bouton.disabled = false;
  }
});

// Charger le stock
async function chargerStock() {
  try {
    const stock = await lireStock();
    const tbody = document.getElementById("table-stock");
    tbody.innerHTML = "";

    if (stock.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align: center; font-style: italic; color: #666;">Aucun légume en stock</td></tr>';
      return;
    }

    stock.forEach((item, index) => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${item.nom || item.produit}</td>
        <td>${item.quantite}</td>
        <td>${item.unite}</td>
        <td>${item.prix.toFixed(2)} €</td>
        <td>
          <button class="btn-supprimer" onclick="supprimerLegume(${index})">
            🗑️ Supprimer
          </button>
        </td>
      `;
    });
  } catch (error) {
    console.error("Erreur chargement stock:", error);
    afficherMessage("❌ Erreur lors du chargement du stock", "error");
  }
}

// Supprimer un légume
async function supprimerLegume(index) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer ce légume ?")) {
    return;
  }

  try {
    const succes = await supprimerDuStock(index);

    if (succes) {
      chargerStock();
      afficherMessage("✅ Légume supprimé", "success");
    } else {
      afficherMessage("❌ Erreur lors de la suppression", "error");
    }
  } catch (error) {
    console.error("Erreur suppression:", error);
    afficherMessage("❌ Erreur de connexion", "error");
  }
}

async function chargerCommandesPreparation() {
  try {
    const commandes = await lireCommandes();
    const tbody = document.querySelector("#table-preparation tbody");
    tbody.innerHTML = "";

    if (commandes.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center; font-style: italic; color: #666;">Aucune commande en préparation</td></tr>';
      return;
    }

    // Grouper les commandes par client
    const commandesGroupees = {};
    commandes.forEach((commande, index) => {
      const client = commande.client;
      if (!commandesGroupees[client]) {
        commandesGroupees[client] = [];
      }
      commandesGroupees[client].push({ ...commande, originalIndex: index });
    });

    // Afficher les commandes groupées
    Object.entries(commandesGroupees).forEach(([client, commandesClient]) => {
      commandesClient.forEach((commande, produitIndex) => {
        const row = tbody.insertRow();

        // Pour la première ligne du client, afficher les infos client
        if (produitIndex === 0) {
          const totalClient = commandesClient.reduce(
            (sum, cmd) => sum + cmd.quantite * cmd.prix,
            0
          );

          row.innerHTML = `
            <td rowspan="${
              commandesClient.length
            }" style="vertical-align: middle; background: ${
            commande.statut === "préparée" ? "#d4edda" : "#fff3cd"
          };">
              <strong>${client}</strong><br>
              <span style="color: #666;">Total: ${totalClient.toFixed(
                2
              )} €</span>
            </td>
            <td>${commande.produit}</td>
            <td>${commande.quantite}</td>
            <td>${commande.unite}</td>
            <td>
              <span style="color: ${
                commande.statut === "préparée"
                  ? "var(--primary-green)"
                  : "var(--corn-yellow)"
              }; font-weight: bold;">
                ${
                  commande.statut === "préparée"
                    ? "✅ Préparée"
                    : "⏳ À préparer"
                }
              </span>
            </td>
            <td rowspan="${
              commandesClient.length
            }" style="vertical-align: middle;">
              ${
                commande.statut === "préparée"
                  ? '<span style="color: var(--primary-green);">✅ Terminé</span>'
                  : `<button onclick="marquerCommePrepare(${commande.originalIndex})" class="btn-preparer">📦 Marquer comme préparée</button>`
              }
            </td>
          `;
        } else {
          // Pour les autres lignes, seulement les infos produit
          row.innerHTML = `
            <td>${commande.produit}</td>
            <td>${commande.quantite}</td>
            <td>${commande.unite}</td>
            <td>
              <span style="color: ${
                commande.statut === "préparée"
                  ? "var(--primary-green)"
                  : "var(--corn-yellow)"
              }; font-weight: bold;">
                ${
                  commande.statut === "préparée"
                    ? "✅ Préparée"
                    : "⏳ À préparer"
                }
              </span>
            </td>
          `;
        }
      });
    });
  } catch (err) {
    console.error("Erreur chargement commandes à préparer :", err);
    afficherMessage("❌ Erreur lors du chargement des commandes", "error");
  }
}

// Marquer une commande comme préparée
async function marquerCommePrepare(index) {
  if (!confirm("Marquer cette commande comme préparée ?")) {
    return;
  }

  try {
    const succes = await marquerCommePrepareAPI(index);

    if (succes) {
      chargerCommandesPreparation();
      afficherMessage("✅ Commande marquée comme préparée !", "success");
    } else {
      afficherMessage("❌ Erreur lors de la mise à jour", "error");
    }
  } catch (error) {
    console.error("Erreur:", error);
    afficherMessage("❌ Erreur de connexion", "error");
  }
}

// Fonction pour afficher les messages
function afficherMessage(message, type) {
  // Créer une zone de message temporaire si elle n'existe pas
  let messageZone = document.getElementById("admin-message");
  if (!messageZone) {
    messageZone = document.createElement("div");
    messageZone.id = "admin-message";
    messageZone.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 1000;
      max-width: 400px;
      opacity: 0;
      transition: all 0.3s ease;
    `;
    document.body.appendChild(messageZone);
  }

  messageZone.textContent = message;

  if (type === "success") {
    messageZone.style.background = "linear-gradient(135deg, #d4edda, #c3e6cb)";
    messageZone.style.color = "#155724";
    messageZone.style.border = "1px solid #c3e6cb";
  } else {
    messageZone.style.background = "linear-gradient(135deg, #f8d7da, #f5c6cb)";
    messageZone.style.color = "#721c24";
    messageZone.style.border = "1px solid #f5c6cb";
  }

  // Afficher le message
  messageZone.style.opacity = "1";

  // Masquer après 4 secondes
  setTimeout(() => {
    messageZone.style.opacity = "0";
  }, 4000);
}

// Fonction de debug
window.debugStock = async () => {
  const stock = await lireStock();
  console.log("Stock actuel:", stock);
};

// Fonction de debug pour les tokens
window.debugAuth = () => {
  console.log("Token admin:", sessionStorage.getItem("admin_token"));
  console.log("Headers auth:", obtenirHeadersAuth());
};
