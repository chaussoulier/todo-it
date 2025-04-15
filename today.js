import { renderTaskCard, calculateImportanceScore } from './render-utils.js';
import { tasks, tasksLoaded, setTasks } from './task-data.js';
import { initFirebase } from './firebase-service.js';
import { isToday } from './date-utils.js';
import { openTaskDetailModal } from './task-modal.js';

// Variable globale pour le mode de vue (true = vue détaillée par défaut)
let isDetailedView = false;

// Fonction pour basculer entre la vue détaillée et la vue simple
function toggleViewMode() {
  isDetailedView = !isDetailedView;
  
  // Mettre à jour l'état du checkbox
  const viewModeToggle = document.getElementById('view-mode-toggle');
  viewModeToggle.checked = isDetailedView;
  
  // Mettre à jour le texte du label
  const viewModeLabel = document.querySelector('label[for="view-mode-toggle"]');
  viewModeLabel.textContent = isDetailedView ? 'Vue détaillée' : 'Vue simple';
  
  // Mettre à jour l'affichage des cartes
  updateTaskDescriptionVisibility();
}

// Mettre à jour la visibilité des descriptions de tâches
function updateTaskDescriptionVisibility() {
  const taskDescriptions = document.querySelectorAll('.task-description-content');
  
  taskDescriptions.forEach(description => {
    if (isDetailedView) {
      description.style.display = 'block';
    } else {
      description.style.display = 'none';
    }
  });
}

// Fonction pour initialiser les tâches localement si aucune n'est chargée
function initLocalTasks() {
  console.log('💾 [today.js] Début initLocalTasks - tasks.length:', tasks.length);
  
  // Si tasks est vide, essayer de charger depuis localStorage
  if (tasks.length === 0) {
    const localTasks = JSON.parse(localStorage.getItem('tasks')) || [];
    console.log('💾 [today.js] Tâches trouvées dans localStorage:', localTasks.length);
    
    // Afficher les tâches terminées pour débogage
    const completedTasks = localTasks.filter(t => t.statut === 'Terminée');
    console.log('💾 [today.js] Tâches terminées dans localStorage:', completedTasks.length);
    if (completedTasks.length > 0) {
      console.log('💾 [today.js] Exemple de tâche terminée:', completedTasks[0].titre);
    }
    
    if (localTasks.length > 0) {
      // Mettre à jour le tableau global tasks
      tasks.splice(0, tasks.length, ...localTasks);
      // Assurer que la promesse tasksLoaded est résolue
      setTasks(localTasks);
      console.log('💾 [today.js] Tâches chargées depuis localStorage:', tasks.length);
    } else {
      // Créer une tâche de test pour aujourd'hui
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const testTask = {
        id: 'test-task-' + Date.now(),
        titre: 'Tâche de test pour aujourd\'hui',
        description: 'Cette tâche a été créée automatiquement pour tester l\'affichage',
        statut: 'À faire',
        deadline: todayStr,
        tag: 'test',
        importance: '!!',
        log: ['Créée le ' + new Date().toLocaleString('fr-FR')]
      };
      tasks.push(testTask);
      localStorage.setItem('tasks', JSON.stringify(tasks));
    }
  }
}

function renderTodayTasks() {
  console.log('📅 [today.js] Début de renderTodayTasks');
  
  // Initialiser Firebase (sans attendre)
  initFirebase();
  
  // Si aucune tâche n'est disponible, essayer de les charger depuis localStorage
  if (tasks.length === 0) {
    console.log('📅 [today.js] Aucune tâche disponible, appel de initLocalTasks');
    initLocalTasks();
  }
  
  console.log(`📅 [today.js] Nombre total de tâches disponibles: ${tasks.length}`);
  const completedTasks = tasks.filter(t => t.statut === 'Terminée').length;
  console.log(`📅 [today.js] Dont ${completedTasks} tâches terminées`);
  
  // Obtenir la date d'aujourd'hui
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayISO = `${year}-${month}-${day}`; // Format YYYY-MM-DD
  console.log(`📅 [today.js] Date d'aujourd'hui (ISO): ${todayISO}`);
  
  // Filtrer uniquement les tâches du jour
  console.log('📅 [today.js] Filtrage des tâches pour aujourd\'hui...');
  const todayTasks = tasks.filter(task => {
    // Ignorer les tâches terminées ou sans deadline
    if (!task.deadline) {
      console.log(`📅 [today.js] Tâche sans deadline ignorée: ${task.titre}`);
      return false;
    }
    
    if (task.statut === 'Terminée') {
      console.log(`📅 [today.js] Tâche terminée ignorée: ${task.titre}`);
      return false;
    }
    
    // Comparer directement les dates au format YYYY-MM-DD
    // Cela évite les problèmes de fuseaux horaires
    const taskDateStr = task.deadline.split('T')[0];
    const isForToday = taskDateStr === todayISO;
    
    if (isForToday) {
      console.log(`📅 [today.js] Tâche pour aujourd'hui trouvée: ${task.titre}`);
    }
    
    return isForToday;
  });
  
  // Trier les tâches par ordre d'importance (du plus important au moins important)
  todayTasks.sort((a, b) => {
    const scoreA = calculateImportanceScore(a);
    const scoreB = calculateImportanceScore(b);
    return scoreB - scoreA; // Ordre décroissant
  });
  
  const col1 = document.getElementById('today-col-1');
  const col2 = document.getElementById('today-col-2');
  const col3 = document.getElementById('today-col-3');

  if (!col1 || !col2 || !col3) {
    console.error('❌ Les colonnes today-col-1 à 3 sont manquantes dans le HTML');
    return;
  }

  // Vider les colonnes
  col1.innerHTML = '';
  col2.innerHTML = '';
  col3.innerHTML = '';

  if (todayTasks.length === 0) {
    col1.innerHTML = '<p class="text-muted">Aucune tâche pour aujourd\'hui</p>';
    return;
  }
  
  // Répartition dans les 3 colonnes
  todayTasks.forEach((task, index) => {
    const col = index % 3 === 0 ? col1 : index % 3 === 1 ? col2 : col3;
    renderTaskCard(task, index, col);
    
    // Ajouter l'écouteur d'événement pour ouvrir la modale de détail
    // Attendre un court instant pour que le DOM soit mis à jour
    setTimeout(() => {
      const taskCard = col.querySelector(`.task-card[data-task-index="${index}"]`);
      if (taskCard) {
        // Ajouter un écouteur d'événement sur le titre de la tâche
        const titleEl = taskCard.querySelector('.task-title');
        if (titleEl) {
          titleEl.style.cursor = 'pointer';
          titleEl.addEventListener('click', () => {
            if (task.id) {
              openTaskDetailModal(task.id);
            } else {
              console.error('❌ La tâche n\'a pas d\'ID:', task);
            }
          });
        }
      }
    }, 100);
  });
}

// Fonction pour marquer une tâche comme terminée
function markAsDone(index) {
  console.log('🔴 [today.js] markAsDone appelé avec index:', index);
  
  // Récupérer la tâche correspondant à l'index dans le DOM
  const taskCard = document.querySelector(`.task-card[data-task-index="${index}"]`);
  if (!taskCard) {
    console.error("Carte de tâche introuvable pour l'index:", index);
    return;
  }
  console.log('🔴 [today.js] Carte de tâche trouvée:', taskCard);
  
  // Trouver l'index réel dans le tableau global tasks
  const taskId = taskCard.dataset.taskId;
  console.log('🔴 [today.js] ID de la tâche:', taskId);
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  console.log('🔴 [today.js] Index trouvé dans le tableau tasks:', taskIndex);
  
  let taskToUpdate;
  let taskIndexToUpdate;
  
  if (taskIndex === -1) {
    // Si on ne trouve pas par ID, essayer de trouver par index direct
    // (pour la compatibilité avec les anciennes versions)
    index = parseInt(index, 10);
    if (isNaN(index) || index < 0 || index >= tasks.length) {
      console.error("Tâche introuvable:", index);
      return;
    }
    
    taskToUpdate = tasks[index];
    taskIndexToUpdate = index;
  } else {
    // Utiliser l'index réel
    taskToUpdate = tasks[taskIndex];
    taskIndexToUpdate = taskIndex;
  }
  
  // Mettre à jour la tâche
  taskToUpdate.statut = "Terminée";
  taskToUpdate.completedAt = new Date().toISOString();
  taskToUpdate.log = taskToUpdate.log || [];
  taskToUpdate.log.push(`Marquée comme terminée le ${new Date().toLocaleString('fr-FR')}`);
  console.log('🔴 [today.js] Tâche mise à jour:', taskToUpdate);
  
  // Vérifier l'état du tableau tasks avant sauvegarde
  const completedTasksBeforeSave = tasks.filter(t => t.statut === 'Terminée').length;
  console.log(`🔴 [today.js] Avant sauvegarde: ${completedTasksBeforeSave} tâches terminées sur ${tasks.length} tâches au total`);
  
  // S'assurer que la mise à jour est enregistrée dans Firebase si disponible
  if (window.firebaseService && typeof window.firebaseService.saveTasks === 'function') {
    console.log('🔴 [today.js] Sauvegarde avec window.firebaseService.saveTasks');
    window.firebaseService.saveTasks(tasks);
  } else if (typeof saveAndSync === 'function') {
    console.log('🔴 [today.js] Sauvegarde avec saveAndSync');
    saveAndSync(taskToUpdate);
  } else {
    console.log('🔴 [today.js] Aucune fonction de sauvegarde Firebase disponible');
  }
  
  // Forcer la synchronisation complète du tableau tasks dans localStorage
  console.log('🔴 [today.js] Sauvegarde dans localStorage');
  localStorage.setItem('tasks', JSON.stringify(tasks));
  
  // Vérifier que la sauvegarde a bien fonctionné
  const savedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
  const completedTasksAfterSave = savedTasks.filter(t => t.statut === 'Terminée').length;
  console.log(`🔴 [today.js] Après sauvegarde dans localStorage: ${completedTasksAfterSave} tâches terminées sur ${savedTasks.length} tâches au total`);
  
  // Rafraîchir l'affichage des tâches
  renderTodayTasks();
  
  // Indiquer à l'utilisateur que la tâche a été marquée comme terminée
  console.log(`Tâche "${taskToUpdate.titre}" marquée comme terminée`);
}

// Fonction pour sauvegarder les détails d'une tâche depuis la modale
function saveTaskDetails() {
  const index = parseInt(document.getElementById('modal-task-index').value, 10);
  if (isNaN(index) || index < 0 || index >= tasks.length) {
    console.error("Index de tâche invalide pour la sauvegarde:", index);
    return;
  }
  
  const oldStatut = tasks[index].statut;
  const newStatut = document.getElementById('modal-task-statut').value;
  
  // Mettre à jour les propriétés de la tâche
  tasks[index].titre = document.getElementById('modal-task-title').value;
  tasks[index].tag = document.getElementById('modal-task-tag').value;
  tasks[index].deadline = document.getElementById('modal-task-deadline').value;
  tasks[index].statut = newStatut;
  tasks[index].importance = document.getElementById('modal-task-importance').value;
  
  // Gérer la description (TinyMCE ou textarea standard)
  if (window.tinymce && tinymce.get('modal-task-description')) {
    tasks[index].description = tinymce.get('modal-task-description').getContent();
  } else {
    tasks[index].description = document.getElementById('modal-task-description').value;
  }
  
  // Ajouter une entrée au journal si le statut a changé
  if (oldStatut !== newStatut) {
    tasks[index].log = tasks[index].log || [];
    tasks[index].log.push(`Statut changé de "${oldStatut}" à "${newStatut}" le ${new Date().toLocaleString('fr-FR')}`);
    
    // Si la tâche est marquée comme terminée, enregistrer la date de complétion
    if (newStatut === "Terminée") {
      tasks[index].completedAt = new Date().toISOString();
    }
  }
  
  // Sauvegarder la tâche avec Firebase si disponible
  if (window.firebaseService && typeof window.firebaseService.saveTasks === 'function') {
    window.firebaseService.saveTasks(tasks);
  } else if (typeof saveAndSync === 'function') {
    saveAndSync(tasks[index]);
  }
  
  // Forcer la synchronisation complète du tableau tasks dans localStorage
  localStorage.setItem('tasks', JSON.stringify(tasks));
  
  // Fermer la modale
  const modal = bootstrap.Modal.getInstance(document.getElementById('taskDetailModal'));
  if (modal) {
    modal.hide();
  }
  
  // Rafraîchir l'affichage des tâches
  renderTodayTasks();
  
  // Indiquer à l'utilisateur que la tâche a été mise à jour
  console.log(`Tâche "${tasks[index].titre}" mise à jour`);
}

// S'assurer que le DOM est chargé avant d'appeler renderTodayTasks
document.addEventListener('DOMContentLoaded', () => {
  // Initialiser l'état du toggle de vue détaillée
  const viewModeToggle = document.getElementById('view-mode-toggle');
  if (viewModeToggle) {
    viewModeToggle.checked = isDetailedView;
    const viewModeLabel = document.querySelector('label[for="view-mode-toggle"]');
    if (viewModeLabel) {
      viewModeLabel.textContent = isDetailedView ? 'Vue détaillée' : 'Vue simple';
    }
    
    // Ajouter l'écouteur d'événement pour le toggle
    viewModeToggle.addEventListener('change', toggleViewMode);
  }
  
  // Ajouter l'écouteur d'événement pour le formulaire d'ajout de tâche
  const taskForm = document.getElementById('task-form');
  if (taskForm) {
    taskForm.addEventListener('submit', addTask);
  }
  
  // Ajouter l'écouteur d'événement pour le bouton 'Enregistrer' de la modale
  const saveTaskDetailsBtn = document.getElementById('save-task-details-btn');
  if (saveTaskDetailsBtn) {
    saveTaskDetailsBtn.addEventListener('click', saveTaskDetails);
  }
  
  // Ajouter des écouteurs d'événements pour les boutons 'Terminer' des tâches
  document.addEventListener('click', function(event) {
    if (event.target.classList.contains('done-btn')) {
      const index = event.target.dataset.index;
      if (index !== undefined) {
        markAsDone(index);
      }
    }
  });
  
  renderTodayTasks();
});

// Fonction pour ajouter une tâche (spécifique à today.html)
function addTask(event) {
  event.preventDefault();
  
  const titre = document.getElementById("task-title").value.trim();
  const tag = document.getElementById("task-tag").value.trim();
  const statut = document.getElementById("task-statut").value || "À faire";
  const importance = document.getElementById("task-importance").value || "!";
  
  if (!titre) {
    alert("Le titre est obligatoire");
    return;
  }
  
  // Utiliser la date d'aujourd'hui automatiquement
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayISO = `${year}-${month}-${day}`;
  
  const nouvelleTache = {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    titre,
    tag,
    deadline: todayISO, // Utiliser la date d'aujourd'hui
    statut,
    importance,
    description: "",
    etapes: [],
    createdAt: new Date().toISOString(),
    log: [`Créée le ${new Date().toLocaleString('fr-FR')}`]
  };
  
  tasks.push(nouvelleTache);
  
  // Sauvegarder la tâche (utiliser saveAndSync si disponible, sinon localStorage)
  if (typeof saveAndSync === 'function') {
    saveAndSync(nouvelleTache);
  } else {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }
  
  document.getElementById("task-form").reset();
  document.getElementById("task-statut").value = "À faire";
  
  // Rafraîchir l'affichage des tâches
  renderTodayTasks();
  
  // Mettre à jour les suggestions de tags si la fonction est disponible
  if (typeof updateTagSuggestions === 'function') {
    updateTagSuggestions();
  }
}

// Appeler également renderTodayTasks immédiatement au cas où le DOM est déjà chargé
renderTodayTasks();