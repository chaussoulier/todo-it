// Service Firebase pour Todo It
import firebaseConfig from './firebase-config.js';

// Initialisation de Firebase
let app, auth, db, analytics;
let currentUser = null;
let isInitialized = false;

// Fonction d'initialisation de Firebase
async function initFirebase() {
  if (isInitialized) return;
  
  try {
    // Import dynamique des modules Firebase
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
    const { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } = 
      await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
    const { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } = 
      await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
    const { getAnalytics } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js');
    
    // Initialisation des services Firebase
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    analytics = getAnalytics(app);
    
    // Observer les changements d'état d'authentification
    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      if (user) {
        console.log('Utilisateur connecté:', user.displayName);
        // Mettre à jour l'interface utilisateur
        updateUIForLoggedInUser(user);
        // Charger les tâches de l'utilisateur
        loadUserTasks();
      } else {
        console.log('Utilisateur déconnecté');
        // Mettre à jour l'interface utilisateur
        updateUIForLoggedOutUser();
      }
    });
    
    isInitialized = true;
    console.log('Firebase initialisé avec succès');
    
    // Exposer les fonctions Firebase
    window.firebaseService = {
      signInWithGoogle,
      signOutUser,
      saveTasks,
      loadUserTasks
    };
    
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de Firebase:', error);
  }
}

// Connexion avec Google
async function signInWithGoogle() {
  try {
    const { GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Erreur de connexion avec Google:', error);
    throw error;
  }
}

// Déconnexion
async function signOutUser() {
  try {
    const { signOut } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
    await signOut(auth);
    // Revenir aux tâches locales
    tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    renderTasksFiltered();
  } catch (error) {
    console.error('Erreur de déconnexion:', error);
    throw error;
  }
}

// Sauvegarder les tâches dans Firestore
async function saveTasks(tasks) {
  if (!currentUser) {
    console.log('Aucun utilisateur connecté, sauvegarde locale uniquement');
    localStorage.setItem('tasks', JSON.stringify(tasks));
    return;
  }
  
  try {
    const { collection, addDoc, getDocs, query, where, deleteDoc } = 
      await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
    
    // Supprimer les anciennes tâches
    const q = query(collection(db, 'tasks'), where('userId', '==', currentUser.uid));
    const querySnapshot = await getDocs(q);
    const deletePromises = [];
    
    querySnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    
    // Ajouter les nouvelles tâches
    const addPromises = tasks.map(task => {
      return addDoc(collection(db, 'tasks'), {
        ...task,
        userId: currentUser.uid
      });
    });
    
    await Promise.all(addPromises);
    console.log(`${tasks.length} tâches sauvegardées dans Firestore`);
    
    // Sauvegarder aussi localement
    localStorage.setItem('tasks', JSON.stringify(tasks));
    
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des tâches:', error);
    // Fallback à la sauvegarde locale
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }
}

// Charger les tâches depuis Firestore
async function loadUserTasks() {
  if (!currentUser) {
    console.log('Aucun utilisateur connecté, chargement local uniquement');
    return;
  }
  
  try {
    const { collection, getDocs, query, where } = 
      await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
    
    // Vérifier que db est initialisé
    if (!db) {
      console.log('Firestore n\'est pas initialisé, utilisation des données locales');
      return;
    }
    
    try {
      const q = query(collection(db, 'tasks'), where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const loadedTasks = [];
      querySnapshot.forEach((doc) => {
        const taskData = doc.data();
        delete taskData.userId; // Supprimer l'ID utilisateur avant d'ajouter à la liste
        loadedTasks.push(taskData);
      });
      
      if (loadedTasks.length > 0) {
        console.log(`${loadedTasks.length} tâches chargées depuis Firestore`);
        tasks = loadedTasks;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderTasksFiltered();
      } else {
        console.log('Aucune tâche trouvée dans Firestore, utilisation des données locales');
      }
    } catch (firestoreError) {
      console.error('Erreur d\'accès à Firestore, utilisation des données locales:', firestoreError);
      // Utiliser les tâches locales en cas d'erreur de permissions
      tasks = JSON.parse(localStorage.getItem('tasks')) || [];
      renderTasksFiltered();
    }
    
  } catch (error) {
    console.error('Erreur lors du chargement des tâches:', error);
    // Utiliser les tâches locales en cas d'erreur
    tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    renderTasksFiltered();
  }
}

// Mettre à jour l'interface pour un utilisateur connecté
function updateUIForLoggedInUser(user) {
  // Créer ou mettre à jour les éléments d'interface utilisateur
  const userInfoContainer = document.getElementById('user-info') || createUserInfoContainer();
  
  // Afficher les informations de l'utilisateur
  userInfoContainer.innerHTML = `
    <div class="user-profile">
      <img src="${user.photoURL || 'https://via.placeholder.com/30'}" alt="${user.displayName}" class="user-avatar">
      <span class="user-name">${user.displayName}</span>
      <button id="logout-button" class="btn btn-sm btn-outline-secondary">Déconnexion</button>
    </div>
  `;
  
  // Ajouter l'écouteur d'événement pour la déconnexion
  document.getElementById('logout-button').addEventListener('click', signOutUser);
}

// Mettre à jour l'interface pour un utilisateur déconnecté
function updateUIForLoggedOutUser() {
  const userInfoContainer = document.getElementById('user-info') || createUserInfoContainer();
  
  userInfoContainer.innerHTML = `
    <button id="login-button" class="btn btn-primary">Se connecter avec Google</button>
  `;
  
  // Ajouter l'écouteur d'événement pour la connexion
  document.getElementById('login-button').addEventListener('click', signInWithGoogle);
}

// Créer le conteneur d'informations utilisateur s'il n'existe pas
function createUserInfoContainer() {
  const container = document.createElement('div');
  container.id = 'user-info';
  container.className = 'user-info-container';
  
  // Insérer avant les boutons d'import/export
  const importExportContainer = document.querySelector('.import-export-container');
  if (importExportContainer) {
    importExportContainer.parentNode.insertBefore(container, importExportContainer);
  } else {
    // Fallback: ajouter au début de la page
    const mainContainer = document.querySelector('.container');
    if (mainContainer) {
      mainContainer.insertBefore(container, mainContainer.firstChild);
    }
  }
  
  return container;
}

// Initialiser Firebase au chargement de la page
document.addEventListener('DOMContentLoaded', initFirebase);

// Remplacer la fonction saveTasks existante
const originalSaveTasks = window.saveTasks;
window.saveTasks = function() {
  // Appeler la fonction originale pour maintenir la compatibilité
  if (originalSaveTasks) originalSaveTasks();
  
  // Sauvegarder dans Firebase si initialisé
  if (isInitialized && window.firebaseService) {
    window.firebaseService.saveTasks(tasks);
  }
};

// Exporter les fonctions pour l'utilisation dans d'autres modules
export { 
  initFirebase,
  signInWithGoogle,
  signOutUser,
  saveTasks,
  loadUserTasks
};
