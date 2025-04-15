// Service Firebase pour Todo It
import firebaseConfig from './firebase-config.js';

let app, auth, db, analytics;
let currentUser = null;
let isInitialized = false;

// Référence aux tâches globales
let localTasks = [];

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
    if (typeof renderTasksFiltered === 'function') {
      renderTasksFiltered();
    }
  } catch (error) {
    console.error('❌ Erreur déconnexion :', error);
    throw error;
  }
}

// Nettoyage complet de la session (UI + localStorage)
function clearSessionTasks() {
  window.tasks = [];
  localStorage.removeItem('tasks');
}

// Sauvegarde des tâches dans Firestore
async function saveTasks(taskList = tasks) {
  console.log('🔥 [firebase-service.js] Début saveTasks avec', taskList.length, 'tâches');
  
  // Vérifier les tâches terminées
  const completedTasks = taskList.filter(t => t.statut === 'Terminée');
  console.log(`🔥 [firebase-service.js] Dont ${completedTasks.length} tâches terminées`);
  if (completedTasks.length > 0) {
    console.log('🔥 [firebase-service.js] Exemple de tâche terminée:', completedTasks[0]);
  }
  
  const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');

  console.log('🔥 [firebase-service.js] Sauvegarde dans localStorage');
  localStorage.setItem('tasks', JSON.stringify(taskList));
  
  // Vérifier que la sauvegarde a bien fonctionné
  const savedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
  const savedCompletedTasks = savedTasks.filter(t => t.statut === 'Terminée');
  console.log(`🔥 [firebase-service.js] Après sauvegarde localStorage: ${savedCompletedTasks.length} tâches terminées sur ${savedTasks.length} tâches au total`);

  if (!window.firebaseService?.currentUser) {
    console.log('🔥 [firebase-service.js] Pas d\'utilisateur connecté, sauvegarde Firebase ignorée');
    return;
  }

  const uid = window.firebaseService.currentUser.uid;
  console.log('🔥 [firebase-service.js] Utilisateur connecté:', uid);

  const writePromises = taskList.map(async (task) => {
    if (!task.id) {
      task.id = Date.now().toString() + Math.random().toString(36).substring(2);
      console.log('🔥 [firebase-service.js] Nouvelle tâche sans ID, ID généré:', task.id);
    }

    const taskRef = doc(db, 'tasks', task.id);
    console.log(`🔥 [firebase-service.js] Sauvegarde de la tâche ${task.titre} (${task.id}) avec statut ${task.statut}`);

    await setDoc(taskRef, {
      ...task,
      userId: uid
    });
  });

  try {
    await Promise.all(writePromises);
    console.log(`✅ ${taskList.length} tâche(s) sauvegardée(s) dans Firestore`);
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
      window.tasks = loadedTasks;
      localStorage.setItem('tasks', JSON.stringify(window.tasks));
      if (typeof renderTasksFiltered === 'function') renderTasksFiltered();
    } else {
      console.log('ℹ️ Aucune tâche trouvée pour cet utilisateur');
      window.tasks = [];
      localStorage.removeItem('tasks');
      if (typeof renderTasksFiltered === 'function') renderTasksFiltered();
    }

  } catch (error) {
    console.error('❌ Erreur chargement tâches Firestore :', error);
    window.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    if (typeof renderTasksFiltered === 'function') renderTasksFiltered();
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

document.addEventListener('DOMContentLoaded', () => {
  const manualSaveBtn = document.getElementById('manual-save-btn');
  const saveStatus = document.getElementById('manual-save-status');

  if (manualSaveBtn) {
    manualSaveBtn.addEventListener('click', () => {
      if (!currentUser || !tasks || tasks.length === 0) {
        alert("Aucune tâche à sauvegarder ou utilisateur non connecté.");
        return;
      }

      manualSaveBtn.disabled = true;
      manualSaveBtn.innerText = "💾 Sauvegarde en cours...";
      console.log('💾 Sauvegarde manuelle vers Firestore...');

      saveTasks(tasks).then(() => {
        const now = new Date();
        localStorage.setItem('lastFirebaseSave', now.getTime().toString());
        saveStatus.textContent = `✅ Sauvegardé à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
        saveStatus.style.display = 'inline';
        manualSaveBtn.innerText = "💾 Sauvegarder manuellement";
        manualSaveBtn.disabled = false;

        // Masquer après 5 secondes
        setTimeout(() => saveStatus.style.display = 'none', 5000);
      }).catch((error) => {
        console.error('❌ Erreur lors de la sauvegarde manuelle :', error);
        alert('Erreur lors de la sauvegarde.');
        manualSaveBtn.innerText = "💾 Sauvegarder manuellement";
        manualSaveBtn.disabled = false;
      });
    });
  }
});

const taskSaveQueue = {};
const debounceTimers = {};

async function saveTask(task) {
  const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');

  if (!task || !task.id || !window.firebaseService?.currentUser) return;

  const uid = window.firebaseService.currentUser.uid;
  const taskRef = doc(db, 'tasks', task.id);

  try {
    await setDoc(taskRef, {
      ...task,
      userId: uid
    });
    console.log(`✅ Tâche "${task.titre}" sauvegardée dans Firestore`);
  } catch (error) {
    console.error(`❌ Erreur en sauvegardant la tâche "${task.titre}" :`, error);
  }
}

// Debounce simple pour éviter les appels multiples rapprochés
export function debouncedSaveTask(task, delay = 1000) {
  if (!task || !task.id) return;

  // Stocker la dernière version dans la file
  taskSaveQueue[task.id] = task;

  // S’il y a déjà un timer, on le réinitialise
  clearTimeout(debounceTimers[task.id]);

  debounceTimers[task.id] = setTimeout(() => {
    const latestTask = taskSaveQueue[task.id];
    if (latestTask) {
      saveTask(latestTask);
      delete taskSaveQueue[task.id];
      delete debounceTimers[task.id];
    }
  }, delay);
}

async function getUserTasks() {
  if (!auth || !db || !currentUser) {
    throw new Error("Firebase non initialisé ou utilisateur non connecté");
  }

  const { collection, getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');

  const q = query(collection(db, 'tasks'), where('userId', '==', currentUser.uid));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

function waitForUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = firebase.auth().onAuthStateChanged(user => {
      unsubscribe(); // arrêter l'écoute
      if (user) resolve(user);
      else reject(new Error("Utilisateur non connecté"));
    });
  });
}

function onUserAuthStateChanged(callback) {
  firebase.auth().onAuthStateChanged(callback);
}

export {
  initFirebase,
  signInWithGoogle,
  signOutUser,
  saveTasks,
  loadUserTasks,
  getUserTasks,
  waitForUser,
  onUserAuthStateChanged
};