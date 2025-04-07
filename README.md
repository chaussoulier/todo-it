# todo-it

# 🗂️ Todo It - L'application de gestion de tâches simple et efficace

v.1.0.2

Todo It est une petite application web développée en HTML, CSS et JavaScript vanilla. Elle a pour but de t'aider à organiser tes tâches du quotidien avec une interface claire, des statuts personnalisables, des deadlines visuelles et même un système de sous-tâches 💪

---

## 🛣️ Roadmap du projet

### 1. Analyse initiale (Terminé)
- ✅ Examen de l'architecture et du contenu du projet
- ✅ Identification des composants existants (HTML/CSS/JS vanilla)
- ✅ Établissement d'une liste de fonctionnalités à développer

### 2. Itération 1: Améliorations de l'interface utilisateur (En cours)
- ⏳ Ajouter un footer avec la version actuelle
- ⏳ Revoir l'alignement des boutons import/export pour qu'il soit côte à côte en haut à droite.
- ⏳ Rendre la description longue des tâches plus discrète
- ⏳ Améliorer la navigation entre les différentes vues (aujourd'hui, demain, etc.)

### 3. Itération 2: Fonctionnalités de gestion des tâches
- 🔲 Ajouter la possibilité de marquer une tâche comme "tâche de fond" (non réalisable en une journée)
- 🔲 Implémenter la gestion du degré d'importance des tâches
- 🔲 Enregistrer la date de traitement pour les tâches terminées
- 🔲 Empêcher qu'une tâche terminée soit considérée en retard

### 4. Itération 3: Fonctionnalités avancées
- 🔲 Créer des tâches récurrentes
- 🔲 Permettre la définition d'une date de début et de fin pour les tâches
- 🔲 Mettre en place un système de journalisation des actions utilisateur
- 🔲 Améliorer le système de sauvegarde locale dans le navigateur

### 5. Itération 4: Optimisation et finalisation
- 🔲 Optimiser les performances de l'application
- 🔲 Effectuer des tests utilisateurs et corriger les bugs identifiés
- 🔲 Préparer la documentation finale
- 🔲 Déployer la version stable

---

## ✨ Fonctionnalités principales

- Ajout, édition et suppression de tâches
- Statuts personnalisables (À faire, En cours, Terminé, etc.)
- Affichage intelligent des dates (Aujourd’hui, Demain, etc.)
- Tri par date de création ou par deadline
- Icônes visuelles selon l’urgence 🔥 ⏰ ✅
- Système de sous-tâches (version simple)
- Design responsive et agréable

---

## 🔧 Stack technique

- HTML5 / CSS3
- JavaScript vanilla

---

## 📦 À venir

- Sauvegarde locale dans le navigateur
- Vue "Projet" avec tri par catégories
- Ajout d'une API ou d'un backend (si besoin un jour)
- Dire qu'une carte est une tâche de fond (non gérable en juste une journée)
- Possibilité de créer une tâche récurrente
- Gérer le degré d'importance d'une tâche
- Une tâche terminée ne peut pas être en retard il faut enregistré la date de traitement
- Possibilité de créer une tâche avec une date de début et une date de fin
- Loguer les actions de l'utilisateur sur une tâché, création, modification, action définitive etc.
- La description longue de la tâche est plus discrète si on a pas encore cliqué sur le champ pour ajouter du texte
- Revoir l'alignement du bouton import/export
- Afficher la version en cours en petit dans un footer en bas à gauche.

---

## 🔒 Sécurité

### Gestion des clés API

Si vous ajoutez des fonctionnalités nécessitant des clés API ou des informations sensibles :

1. **Ne jamais** stocker de clés API directement dans le code source
2. Utiliser un fichier `.env` séparé (qui est ignoré par Git grâce au `.gitignore`)
3. Pour le développement front-end, considérer l'utilisation d'un proxy serveur pour les appels API sensibles

Exemple de structure recommandée :
```
// config.example.js - À inclure dans le dépôt (sans clés réelles)
const config = {
  apiKey: "VOTRE_CLE_API_ICI",
  apiEndpoint: "https://api.example.com"
};

// config.js - À créer localement (ignoré par Git)
const config = {
  apiKey: "ma_vraie_cle_api_123",
  apiEndpoint: "https://api.example.com"
};
```

---

## 🙋‍♂️ À propos

Développé par [Clément](https://github.com/chaussoulier) dans le cadre d’un side project pour apprendre, tester, et organiser la vie débordée d’entrepreneur 👨‍💻

---

## 📜 Licence

Projet open source sous licence MIT.