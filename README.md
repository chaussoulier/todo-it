# todo-it

# 🗂️ ToDoIt – L'application de gestion de tâches simple et efficace

v.1.0.1

ToDoIt est une petite application web développée en HTML, CSS et JavaScript vanilla. Elle a pour but de t'aider à organiser tes tâches du quotidien avec une interface claire, des statuts personnalisables, des deadlines visuelles et même un système de sous-tâches 💪

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
- Hébergement via GitHub Pages *(à venir)*

---

## 🚀 Mise en ligne

Une version publique sera bientôt disponible via GitHub Pages pour tester l'app en un clic.

---

## 📦 À venir

- Sauvegarde locale dans le navigateur
- Vue "Projet" avec tri par catégories
- Ajout d'une API ou d'un backend (si besoin un jour)

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

Développé par [Clément](https://github.com/chaussoulier) dans le cadre d’un side project pour apprendre, tester, et organiser sa vie débordée d’entrepreneur 👨‍💻

---

## 📜 Licence

Projet open source sous licence MIT.