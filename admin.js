// Configuration API Backend dynamique
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000" // En développement
    : "https://la-ferme-du-chat-noir.vercel.app"; // En production

// Fonctions utilitaires pour l'API
async function lireStock() {
  try {
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nouvelItem),
    });
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
    });
    return response.ok;
  } catch (error) {
    console.error("Erreur suppression stock:", error);
    return false;
  }
}

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

// Fonctions pour les commandes
async function lireCommandes() {
  try {
    const response = await fetch(`${API_BASE_URL}/commandes-a-preparer`);
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
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.ok;
  } catch (error) {
    console.error("Erreur sauvegarde commandes:", error);
    return false;
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

// Initialisation au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
  chargerStock();
  chargerCommandesPreparation();

  // Actualiser les commandes toutes les 30 secondes
  setInterval(chargerCommandesPreparation, 30000);

  // Message de bienvenue
  setTimeout(() => {
    afficherMessage("🔧 Interface admin prête avec API backend !", "success");
  }, 500);
});

// Fonction de debug
window.debugStock = async () => {
  const stock = await lireStock();
  console.log("Stock actuel:", stock);
};
