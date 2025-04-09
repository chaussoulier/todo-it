// Service Firebase pour Todo It
import firebaseConfig from './firebase-config.js';

let app, auth, db, analytics;
let currentUser = null;
let isInitialized = false;

// Fonction d'initialisation de Firebase
async function initFirebase() {
  if (isInitialized) return;

  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
    const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
    const { getAnalytics } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js');

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    analytics = getAnalytics(app);

    onAuthStateChanged(auth, (user) => {
      currentUser = user;
    
      // 🧩 expose l'utilisateur globalement
      window.firebaseService.currentUser = user;
    
      if (user) {
        console.log('✅ Utilisateur connecté:', user.displayName);
        updateUIForLoggedInUser(user);
        loadUserTasks();
        startAutoSave();
      } else {
        console.log('👋 Utilisateur déconnecté');
        clearSessionTasks();
        updateUIForLoggedOutUser();
      }
    });

    isInitialized = true;
    console.log('✅ Firebase initialisé avec succès');

    window.firebaseService = {
      signInWithGoogle,
      signOutUser,
      saveTasks,
      loadUserTasks,
      currentUser
    };

  } catch (error) {
    console.error('❌ Erreur Firebase init :', error);
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
    console.error('❌ Erreur connexion Google :', error);
    throw error;
  }
}

// Déconnexion
async function signOutUser() {
  try {
    const { signOut } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
    await signOut(auth);
    clearSessionTasks();
    renderTasksFiltered();
  } catch (error) {
    console.error('❌ Erreur déconnexion :', error);
    throw error;
  }
}

// Nettoyage complet de la session (UI + localStorage)
function clearSessionTasks() {
  tasks = [];
  localStorage.removeItem('tasks');
}

// Sauvegarde des tâches dans Firestore
async function saveTasks(taskList = tasks) {
  const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');

  localStorage.setItem('tasks', JSON.stringify(taskList));

  if (!window.firebaseService?.currentUser) return;

  const uid = window.firebaseService.currentUser.uid;

  const writePromises = taskList.map(async (task) => {
    if (!task.id) {
      task.id = Date.now().toString() + Math.random().toString(36).substring(2);
    }

    const taskRef = doc(db, 'tasks', task.id);

    await setDoc(taskRef, {
      ...task,
      userId: uid
    });
  });

  try {
    await Promise.all(writePromises);
    console.log(`✅ ${tasks.length} tâche(s) sauvegardée(s) dans Firestore`);
  } catch (error) {
    console.error('❌ Erreur sauvegarde Firestore :', error);
  }
}

// ✅ Mise à jour de importTasksFromJson pour éviter les doublons
function importTasksFromJson(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      let importedTasks = JSON.parse(e.target.result);

      if (!Array.isArray(importedTasks)) {
        alert('Format de fichier invalide. Le fichier doit contenir un tableau de tâches.');
        return;
      }

      const uid = window.firebaseService?.currentUser?.uid;

      if (!uid) {
        alert('Vous devez être connecté pour importer des tâches.');
        return;
      }

      importedTasks = importedTasks.map(task => {
        return {
          ...task,
          userId: task.userId || uid,
          id: task.id || Date.now().toString() + Math.random().toString(36).substring(2)
        };
      });

      if (confirm(`Voulez-vous importer ${importedTasks.length} tâches ? Cela remplacera toutes les tâches existantes.`)) {
        tasks = importedTasks;
        saveTasks(importedTasks);
        renderTasksFiltered();
        alert('✅ Import réussi et synchronisé avec Firebase');
      }
    } catch (error) {
      alert(`❌ Erreur lors de l'analyse du fichier JSON : ${error.message}`);
    }
  };

  reader.onerror = function () {
    alert('❌ Erreur lors de la lecture du fichier.');
  };

  reader.readAsText(file);
  event.target.value = '';
}


// Notification de sauvegarde automatique 
function updateAutosaveStatus() {
  const statusEl = document.getElementById('autosave-status');
  if (!statusEl) return;

  const now = new Date();
  const options = {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false
  };
  const formatted = now.toLocaleDateString('fr-FR', options).replace(',', ' à').replace(':', 'h');
  statusEl.textContent = `Sauvegardé le ${formatted}`;
  statusEl.style.display = 'block';

  // Disparaît après 5 secondes
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 5000);
}

// Chargement des tâches depuis Firestore
async function loadUserTasks() {
  if (!currentUser) {
    console.log('⚠️ Pas connecté – chargement local uniquement');
    return;
  }

  try {
    const { collection, getDocs, query, where } =
      await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');

    if (!db) {
      console.log('⚠️ Firestore non initialisé');
      return;
    }

    const q = query(collection(db, 'tasks'), where('userId', '==', currentUser.uid));
    const querySnapshot = await getDocs(q);

    const loadedTasks = [];
    querySnapshot.forEach((doc) => {
      const taskData = doc.data();
      delete taskData.userId;
      loadedTasks.push(taskData);
    });

    if (loadedTasks.length > 0) {
      console.log(`✅ ${loadedTasks.length} tâches chargées depuis Firestore`);
      tasks = loadedTasks;
      localStorage.setItem('tasks', JSON.stringify(tasks));
      renderTasksFiltered();
    } else {
      console.log('ℹ️ Aucune tâche trouvée pour cet utilisateur');
      tasks = [];
      localStorage.removeItem('tasks');
      renderTasksFiltered();
    }

  } catch (error) {
    console.error('❌ Erreur chargement tâches Firestore :', error);
    tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    renderTasksFiltered();
  }
}

// UI utilisateur connecté
function updateUIForLoggedInUser(user) {
  const userInfoContainer = document.getElementById('user-info') || createUserInfoContainer();
  userInfoContainer.innerHTML = `
    <div class="user-profile">
      <img src="${user.photoURL || 'https://via.placeholder.com/30'}" alt="${user.displayName}" class="user-avatar">
      <span class="user-name">${user.displayName}</span>
      <button id="logout-button" class="btn btn-sm btn-outline-secondary">Déconnexion</button>
    </div>
  `;
  document.getElementById('logout-button').addEventListener('click', signOutUser);
}

// UI utilisateur déconnecté
function updateUIForLoggedOutUser() {
  const userInfoContainer = document.getElementById('user-info') || createUserInfoContainer();
  userInfoContainer.innerHTML = `
    <button id="login-button" class="btn btn-primary">Se connecter avec Google</button>
  `;
  document.getElementById('login-button').addEventListener('click', signInWithGoogle);
}

// Création du bloc UI utilisateur s'il manque
function createUserInfoContainer() {
  const container = document.createElement('div');
  container.id = 'user-info';
  container.className = 'user-info-container';

  const importExportContainer = document.querySelector('.import-export-container');
  if (importExportContainer) {
    importExportContainer.parentNode.insertBefore(container, importExportContainer);
  } else {
    const mainContainer = document.querySelector('.container');
    if (mainContainer) {
      mainContainer.insertBefore(container, mainContainer.firstChild);
    }
  }

  return container;
}

// Initialiser Firebase dès le DOM prêt
document.addEventListener('DOMContentLoaded', initFirebase);

// Surcharge de la fonction globale saveTasks
const originalSaveTasks = window.saveTasks;
window.saveTasks = function () {
  if (originalSaveTasks) originalSaveTasks();

  if (isInitialized && window.firebaseService) {
    if (tasks && tasks.length > 0) {
      window.firebaseService.saveTasks(tasks);
    } else {
      console.log('⚠️ Aucune tâche – Firestore non mis à jour');
    }
  }
};

// Sauvegarde auto toutes les 60 secondes
function startAutoSave() {
  setInterval(() => {
    if (!currentUser || !tasks || tasks.length === 0) return;

    console.log('⏳ Sauvegarde automatique déclenchée...');
    saveTasks(tasks);
  }, 60000); // toutes les 60 secondes
}

export {
  initFirebase,
  signInWithGoogle,
  signOutUser,
  saveTasks,
  loadUserTasks
};