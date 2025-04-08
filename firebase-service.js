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
      if (user) {
        console.log('✅ Utilisateur connecté:', user.displayName);
        updateUIForLoggedInUser(user);
        loadUserTasks();
        startAutoSave(); // ✅ démarrer la sauvegarde auto
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
      loadUserTasks
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
async function saveTasks(tasks) {
  if (!currentUser) {
    console.log('💾 Sauvegarde locale uniquement');
    localStorage.setItem('tasks', JSON.stringify(tasks));
    return;
  }

  if (!tasks || tasks.length === 0) {
    console.log('⚠️ Tâches vides – aucune sauvegarde Firebase pour éviter suppression accidentelle');
    return;
  }

  try {
    const { collection, addDoc, getDocs, query, where, deleteDoc } =
      await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');

    const q = query(collection(db, 'tasks'), where('userId', '==', currentUser.uid));
    const querySnapshot = await getDocs(q);

    const deletePromises = [];
    querySnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });

    await Promise.all(deletePromises);

    const addPromises = tasks.map(task => {
      return addDoc(collection(db, 'tasks'), {
        ...task,
        userId: currentUser.uid
      });
    });

    await Promise.all(addPromises);
    console.log(`✅ ${tasks.length} tâches sauvegardées dans Firestore`);
    
    localStorage.setItem('tasks', JSON.stringify(tasks));
    updateAutosaveStatus(); // ✅ affiche le message de confirmation

  } catch (error) {
    console.error('❌ Erreur sauvegarde Firestore :', error);
    localStorage.setItem('tasks', JSON.stringify(tasks)); // fallback local
  }
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