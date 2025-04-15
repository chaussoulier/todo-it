import { debouncedSaveTask } from './firebase-service.js';
import { renderTaskCard, renderCompletedTaskCard, renderSubtasks, getTagClass, calculateImportanceScore, formatDeadline, stripHtmlKeepLineBreaks } from './render-utils.js';
import { renderAllTasks } from './task-renderer.js';
import { openTaskDetailModal } from './task-modal.js';
import { tasks, setTasks, tasksLoaded } from './task-data.js';
import { updateModalTagSuggestions } from './form-utils.js';

const form = document.getElementById('task-form');

const todayColumn = document.getElementById('today-column');
const tomorrowColumn = document.getElementById('tomorrow-column');
const futureColumn1 = document.getElementById('future-column-1');
const futureColumn2 = document.getElementById('future-column-2');
const futureColumn3 = document.getElementById('future-column-3');
const lateColumn1 = document.getElementById('late-column-1');
const lateColumn2 = document.getElementById('late-column-2');
const lateColumn3 = document.getElementById('late-column-3');
const completedTasks = document.getElementById('completed-tasks');

const localTasks = JSON.parse(localStorage.getItem('tasks')) || [];
setTasks(localTasks);
let isDetailedView = false; // Toogle par défaut de vue détaillée
let currentEditingTaskIndex = null; // Index de la tâche en cours d'édition

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}
function saveAndSync(task) {
  if (!task || !task.id) return;
  localStorage.setItem('tasks', JSON.stringify(tasks));
  debouncedSaveTask(task);
}

// Fonction pour échapper les caractères HTML et empêcher l'interprétation des balises
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderTasksFiltered() {
  const filterTag = document.getElementById('filter-tag').value;
  const sortBy = document.getElementById('sort-by').value;

  // Vider toutes les colonnes
  todayColumn.innerHTML = "";
  tomorrowColumn.innerHTML = "";
  futureColumn1.innerHTML = "";
  futureColumn2.innerHTML = "";
  futureColumn3.innerHTML = "";
  lateColumn1.innerHTML = "";
  lateColumn2.innerHTML = "";
  lateColumn3.innerHTML = "";
  completedTasks.innerHTML = "";

  let filtered = tasks.filter(task => {
    const matchTag = filterTag === "" || task.tag === filterTag;
    return matchTag;
  });

  filtered.sort((a, b) => {
    if (sortBy === "deadline") {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    } else if (sortBy === "titre") {
      return a.titre.localeCompare(b.titre);
    } else if (sortBy === "tag") {
      if (!a.tag) return 1;
      if (!b.tag) return -1;
      return a.tag.localeCompare(b.tag);
    } else {
      // Tri par importance par du00e9faut (du plus important au moins important)
      const scoreA = calculateImportanceScore(a);
      const scoreB = calculateImportanceScore(b);
      return scoreB - scoreA; // Ordre du00e9croissant
    }
  });

  // Séparer les tâches par date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const todayTasks = [];
  const tomorrowTasks = [];
  const futureTasks = [];
  const lateTasks = [];
  const completedTasksList = [];

  filtered.forEach((task, filteredIndex) => {
    const originalIndex = tasks.findIndex(t => 
      t.id === task.id && 
      t.titre === task.titre && 
      t.tag === task.tag
    );
  
    if (task.statut === "Terminée") {
      completedTasksList.push({task, index: originalIndex});
      return;
    }
  
    const taskDate = task.deadline ? new Date(task.deadline) : null;
    if (taskDate) {
      taskDate.setHours(0, 0, 0, 0);
  
      if (taskDate < today) {
        lateTasks.push({task, index: originalIndex});
      } else if (taskDate.getTime() === today.getTime()) {
        todayTasks.push({task, index: originalIndex});
      } else if (taskDate.getTime() === tomorrow.getTime()) {
        tomorrowTasks.push({task, index: originalIndex});
      } else {
        futureTasks.push({task, index: originalIndex});
      }
    } else {
      futureTasks.push({task, index: originalIndex});
    }
  });
  
  // ✅ Rendu global (et unique) des tâches
  renderAllTasks(filtered); // 👈 à faire !

  updateRetardButtonState();
  
  // Mettre à jour la visibilité des descriptions en fonction du mode de vue
  updateTaskDescriptionVisibility();
}

function markAsDone(index) {
  // Récupérer la tâche correspondant à l'index dans le DOM
  const taskCard = document.querySelector(`.task-card[data-task-index="${index}"]`);
  if (!taskCard) {
    console.error("Carte de tâche introuvable pour l'index:", index);
    return;
  }
  
  // Trouver l'index réel dans le tableau global tasks
  const taskId = taskCard.dataset.taskId;
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  
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
  
  // S'assurer que la mise à jour est enregistrée dans Firebase si disponible
  if (window.firebaseService && typeof window.firebaseService.saveTasks === 'function') {
    window.firebaseService.saveTasks(tasks);
  } else {
    saveAndSync(taskToUpdate);
  }
  
  // Forcer la synchronisation complète du tableau tasks dans localStorage
  localStorage.setItem('tasks', JSON.stringify(tasks));
  
  // Rafraîchir l'affichage des tâches
  renderTasksFiltered();
  
  // Indiquer à l'utilisateur que la tâche a été marquée comme terminée
  console.log(`Tâche "${taskToUpdate.titre}" marquée comme terminée`);
}

function editTitle(element, index) {
  // S'assurer que l'index est un nombre
  index = parseInt(index, 10);
  
  // Vérifier que l'index est valide
  if (isNaN(index) || index < 0 || index >= tasks.length) {
    console.error("Index de tâche invalide:", index);
    return;
  }
  
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-control form-control-sm';
  input.value = element.textContent;
  element.textContent = '';
  element.appendChild(input);
  input.focus();

  input.addEventListener('blur', () => {
    const newValue = input.value.trim();
    if (newValue) {
      tasks[index].titre = newValue;
      tasks[index].log.push(`Titre modifié en "${newValue}" le ${new Date().toLocaleString('fr-FR')}`);
      saveAndSync(tasks[index]);
      renderTasksFiltered();
    } else {
      element.textContent = tasks[index].titre;
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      input.blur();
    }
  });
}

function editTag(element, index) {
  // S'assurer que l'index est un nombre
  index = parseInt(index, 10);
  
  // Vérifier que l'index est valide
  if (isNaN(index) || index < 0 || index >= tasks.length) {
    console.error("Index de tâche invalide:", index);
    return;
  }
  
  const currentTag = tasks[index].tag || "";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "form-control form-control-sm";
  input.value = currentTag;
  element.innerHTML = "";
  element.appendChild(input);
  input.focus();

  input.addEventListener("blur", () => {
    tasks[index].tag = input.value.trim();
    tasks[index].log.push(`Tag modifié en "${input.value.trim()}" le ${new Date().toLocaleString('fr-FR')}`);
    saveAndSync(tasks[index]); renderTasksFiltered();
    updateTagSuggestions();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      input.blur();
    }
  });
}

function editDeadline(element, index) {
  // S'assurer que l'index est un nombre
  index = parseInt(index, 10);
  
  // Vérifier que l'index est valide
  if (isNaN(index) || index < 0 || index >= tasks.length) {
    console.error("Index de tâche invalide:", index);
    return;
  }
  
  const currentDate = tasks[index].deadline || "";
  const input = document.createElement("input");
  input.type = "date";
  input.className = "form-control form-control-sm";
  input.value = currentDate;
  element.innerHTML = "";
  element.appendChild(input);
  input.focus();

  input.addEventListener("blur", () => {
    tasks[index].deadline = input.value;
    tasks[index].log.push(`Date limite modifiée en "${input.value}" le ${new Date().toLocaleString('fr-FR')}`);
    saveAndSync(tasks[index]);
    renderTasksFiltered();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      input.blur();
    }
  });
}

function viderTerminees() {
  const confirmation = confirm(" Archiver toutes les tâches terminées ?");
  if (!confirmation) return;

  // Au lieu de réassigner tasks, on vide le tableau et on le remplit avec les tâches non terminées
  const nonCompletedTasks = tasks.filter(task => task.statut !== "Terminée");
  tasks.splice(0, tasks.length, ...nonCompletedTasks);

  // Sauvegarder avec Firebase si disponible
  if (window.firebaseService && typeof window.firebaseService.saveTasks === 'function') {
    window.firebaseService.saveTasks(tasks);
  } else {
    saveTasks(); // ✅ on appelle juste saveTasks()
  }
  
  renderTasksFiltered();
}

function gererTachesEnRetard() {
  const todayStr = new Date().toISOString().split("T")[0];

  let modification = false;

  tasks.forEach(task => {
    if (task.statut !== "Terminée" && task.deadline && new Date(task.deadline).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)) {
      task.deadline = todayStr;
      task.log.push(`Date limite déplacée à aujourd'hui (${todayStr}) le ${new Date().toLocaleString('fr-FR')}`);
      saveAndSync(task);
      modification = true;
    }
  });

  if (modification) {
    renderTasksFiltered();
    updateRetardButtonState();
  }
}

function updateRetardButtonState() {
  const btn = document.getElementById('btn-gerer-retard');
  if (!btn) return;

  const now = new Date().setHours(0, 0, 0, 0);
  const enRetard = tasks.some(task =>
    task.statut !== "Terminée" && task.deadline && new Date(task.deadline).setHours(0, 0, 0, 0) < now
  );

  btn.disabled = !enRetard;
}

function updateTagSuggestions() {
  // Mise à jour des suggestions de tags pour le formulaire principal
  const tagsList = document.getElementById('tag-suggestions');
  const filterTag = document.getElementById('filter-tag');
  
  if (tagsList) {
    tagsList.innerHTML = "";
  }
  
  if (filterTag) {
    filterTag.innerHTML = `<option value="">Tous les tags</option>`;
  }

  const tags = [...new Set(tasks.map(t => t.tag).filter(Boolean))];
  
  tags.forEach(tag => {
    // Ajout au datalist du formulaire principal
    if (tagsList) {
      const option = document.createElement('option');
      option.value = tag;
      tagsList.appendChild(option);
    }

    // Ajout au select de filtre
    if (filterTag) {
      const opt = document.createElement('option');
      opt.value = tag;
      opt.textContent = tag;
      filterTag.appendChild(opt);
    }
  });
  
  // Mise à jour des suggestions pour la modale
  updateModalTagSuggestions();
}

// Réinitialiser les filtres
function resetFilters() {
  document.getElementById('filter-tag').value = '';
  document.getElementById('sort-by').value = 'deadline';
  renderTasksFiltered();
}

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

// Définition de la fonction addTask
function addTask(event) {
  event.preventDefault();
  
  const titre = document.getElementById("task-title").value.trim();
  const tag = document.getElementById("task-tag").value.trim();
  const deadline = document.getElementById("task-deadline").value;
  const statut = document.getElementById("task-statut").value || "À faire";
  const importance = document.getElementById("task-importance").value || "!";

  if (!titre) {
    alert("Le titre est obligatoire");
    return;
  }

  const nouvelleTache = {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    titre,
    tag,
    deadline,
    statut,
    importance,
    description: "",
    etapes: [],
    createdAt: new Date().toISOString(),
    log: [`Créée le ${new Date().toLocaleString('fr-FR')}`]
  };

  tasks.push(nouvelleTache);
  saveAndSync(nouvelleTache); // ✅ on sauvegarde la tâche, pas une index fantôme

  document.getElementById("task-form").reset();
  document.getElementById("task-statut").value = "À faire";
  renderTasksFiltered();
  updateTagSuggestions();
}

// Définition de la fonction updateTaskStatut
function updateTaskStatut(index, newStatut) {
  // S'assurer que l'index est un nombre
  index = parseInt(index, 10);
  
  // Vérifier que l'index est valide
  if (isNaN(index) || index < 0 || index >= tasks.length) {
    console.error("Index de tâche invalide:", index);
    return;
  }
  
  tasks[index].statut = newStatut;
  tasks[index].log.push(`Statut changé en ${newStatut} le ${new Date().toLocaleString('fr-FR')}`);
  saveAndSync(tasks[index]); // <=== ajout ici
  renderTasksFiltered();
}

function renderTaskLog(task) {
  const logContainer = document.getElementById('task-log-container');
  if (!logContainer) return;
  
  // Vider le contenu précédent
  logContainer.innerHTML = '';
  
  // Vérifier si un journal existe
  if (!task.log || task.log.length === 0) {
    logContainer.innerHTML = '<div class="text-muted small">Aucune action enregistrée</div>';
    return;
  }
  
  // Afficher les entrées du journal (du plus récent au plus ancien)
  task.log.slice().reverse().forEach(entry => {
    const logEntry = document.createElement('div');
    logEntry.className = 'task-log-entry';
    logEntry.textContent = entry;
    logContainer.appendChild(logEntry);
  });
}

function saveTaskDetails() {
  const taskIndexField = document.getElementById('modal-task-index');
  const taskIndex = parseInt(taskIndexField.value);
  
  if (isNaN(taskIndex) || taskIndex < 0 || taskIndex >= tasks.length) {
    console.error("Index de tâche invalide:", taskIndex);
    return;
  }
  
  const task = tasks[taskIndex];
  const oldTitle = task.titre;
  const oldStatut = task.statut;
  const oldDeadline = task.deadline || '';
  const oldTag = task.tag || '';
  const oldDescription = task.description || '';
  const oldImportance = task.importance || '!';
  const oldRecurrence = task.recurrence || { enabled: false };
  
  // S'assurer que la tâche a un journal
  if (!task.log) {
    task.log = [`Journal créé le ${new Date().toLocaleString('fr-FR')}`];
  }
  
  // Récupérer les nouvelles valeurs
  const newTitle = document.getElementById('modal-task-title').value.trim();
  const newTag = document.getElementById('modal-task-tag').value.trim();
  const newDeadline = document.getElementById('modal-task-deadline').value;
  const newStatut = document.getElementById('modal-task-statut').value;
  const newImportance = document.getElementById('modal-task-importance').value;
  
  // Récupérer les paramètres de récurrence
  const newRecurrence = collectRecurrenceSettings();
  
  // Récupérer la description depuis TinyMCE si disponible
  let newDescription = '';
  if (typeof tinymce !== 'undefined' && tinymce.get('modal-task-description')) {
    newDescription = tinymce.get('modal-task-description').getContent();
  } else {
    const descriptionField = document.getElementById('modal-task-description');
    // Ne pas sauvegarder le placeholder comme description
    newDescription = descriptionField.value === tinyMCEPlaceholder ? '' : descriptionField.value;
  }
  
  // Journaliser les modifications
  const currentDate = new Date().toLocaleString('fr-FR');
  
  if (oldTitle !== newTitle) {
    task.log.push(`Titre modifié de "${oldTitle}" à "${newTitle}" le ${currentDate}`);
  }
  
  if (oldStatut !== newStatut) {
    task.log.push(`Statut modifié de "${oldStatut}" à "${newStatut}" le ${currentDate}`);
  }
  
  if (oldDeadline !== newDeadline) {
    task.log.push(`Date limite modifiée de "${oldDeadline}" à "${newDeadline}" le ${currentDate}`);
  }
  
  if (oldTag !== newTag) {
    task.log.push(`Tag modifié de "${oldTag}" à "${newTag}" le ${currentDate}`);
  }
  
  if (oldImportance !== newImportance) {
    task.log.push(`Importance modifiée de "${oldImportance}" à "${newImportance}" le ${currentDate}`);
  }
  
  if (oldDescription !== newDescription && (oldDescription || newDescription)) {
    task.log.push(`Description modifiée le ${currentDate}`);
  }
  
  // Journaliser les modifications de récurrence
  if (oldRecurrence.enabled !== newRecurrence.enabled) {
    if (newRecurrence.enabled) {
      task.log.push(`Récurrence activée le ${currentDate}`);
    } else {
      task.log.push(`Récurrence désactivée le ${currentDate}`);
    }
  } else if (newRecurrence.enabled && JSON.stringify(oldRecurrence) !== JSON.stringify(newRecurrence)) {
    task.log.push(`Paramètres de récurrence modifiés le ${currentDate}`);
  }
  
  // Mettre à jour les valeurs de la tâche
  task.titre = newTitle;
  task.tag = newTag;
  task.deadline = newDeadline;
  task.statut = newStatut;
  task.description = newDescription;
  task.importance = newImportance;
  task.recurrence = newRecurrence;
  
  // Mettre à jour les sous-tâches
  const newEtapes = collectSubtasks();
  if (JSON.stringify(task.etapes || []) !== JSON.stringify(newEtapes)) {
    task.log.push(`Sous-tâches modifiées le ${currentDate}`);
    task.etapes = newEtapes;
  }
  
  saveAndSync(tasks[taskIndex]); // ✅ OK
  renderTasksFiltered();
  
  // Fermer la modale
  const modal = bootstrap.Modal.getInstance(document.getElementById('taskDetailModal'));
  modal.hide();
}

// Initialisation
// Ne pas initialiser TinyMCE au démarrage, mais seulement au clic
// initTinyMCE();

// Initialiser les journaux manquants pour les tâches existantes
initMissingLogs();

// Vérifier et créer les tâches récurrentes
processRecurringTasks();

renderTasksFiltered();
updateTagSuggestions();

// Attendre que le DOM soit chargé avant d'ajouter les écouteurs d'événements
document.addEventListener('DOMContentLoaded', function() {
  // Ajouter un écouteur d'événement pour le formulaire
  const taskForm = document.getElementById('task-form');
  if (taskForm) {
    taskForm.addEventListener('submit', addTask);
  }
  
  // Ajouter un écouteur d'événement pour le toggle de la vue
  const viewModeToggle = document.getElementById('view-mode-toggle');
  if (viewModeToggle) {
    viewModeToggle.addEventListener('change', toggleViewMode);
    // Déclencher l'événement une fois pour initialiser l'affichage
    toggleViewMode();
  }
  
  // Ajouter des écouteurs pour les filtres
  const filterTag = document.getElementById('filter-tag');
  const sortBy = document.getElementById('sort-by');
  
  if (filterTag) {
    filterTag.addEventListener('change', renderTasksFiltered);
  }
  
  if (sortBy) {
    sortBy.addEventListener('change', renderTasksFiltered);
  }
  
  // Ajouter des écouteurs pour les boutons
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', resetFilters);
  }
  
  const viderTermineesBtn = document.getElementById('vider-terminees-btn');
  if (viderTermineesBtn) {
    viderTermineesBtn.addEventListener('click', viderTerminees);
  }
  
  const saveTaskDetailsBtn = document.getElementById('save-task-details-btn');
  if (saveTaskDetailsBtn) {
    saveTaskDetailsBtn.addEventListener('click', saveTaskDetails);
  }
  
  const exportJsonBtn = document.getElementById('export-json-btn');
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', exportTasksToJson);
  }
  
  // Initialisation du bouton d'import JSON
  const importJsonBtn = document.getElementById('import-json-btn');
  const importJsonInput = document.getElementById('import-json-input');
  if (importJsonBtn && importJsonInput) {
    importJsonBtn.addEventListener('click', function() {
      importJsonInput.click(); // Déclencher le sélecteur de fichier
    });
    importJsonInput.addEventListener('change', importTasksFromJson);
  }
  
  // Initialiser la date par défaut
  const taskDeadline = document.getElementById('task-deadline');
  if (taskDeadline) {
    taskDeadline.value = new Date().toISOString().split("T")[0];
  }
  
  // Écouteur pour le bouton de gestion des tâches en retard
  const btnGererRetard = document.getElementById('btn-gerer-retard');
  if (btnGererRetard) {
    btnGererRetard.addEventListener('click', function() {
      console.log("Bouton 'Passer à aujourd'hui' cliqué");
      deplacerRetardVersAujourdhui();
    });
  }
  
  // Écouteur pour le bouton "Ajouter une étape"
  const addSubtaskBtn = document.getElementById('add-subtask-btn');
  if (addSubtaskBtn) {
    addSubtaskBtn.addEventListener('click', addSubtask);
  }
});

// Fonction pour initialiser les journaux manquants dans les tâches existantes
function initMissingLogs() {
  console.log('Initialisation des journaux manquants...');
  const currentDate = new Date().toLocaleString('fr-FR');
  let compteur = 0;

  tasks.forEach(task => {
    if (!task.log) {
      task.log = [];
      compteur++;
      if (task.createdAt) {
        const creationDate = new Date(task.createdAt).toLocaleString('fr-FR');
        task.log.push(`Créée le ${creationDate}`);
      } else {
        task.log.push(`Journal initialisé le ${currentDate}`);
      }
      if (task.statut === 'Terminée' && task.completedAt) {
        const completionDate = new Date(task.completedAt).toLocaleString('fr-FR');
        task.log.push(`Marquée comme terminée le ${completionDate}`);
      }
      saveAndSync(task); // ✅ on sauvegarde chaque tâche corrigée
    }
  });

  console.log(`${compteur} tâche(s) mise(s) à jour avec un journal`);
}

function setQuickDeadline(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const formattedDate = date.toISOString().split('T')[0];
  document.getElementById('modal-task-deadline').value = formattedDate;
}

function setQuickDeadlineNextWeek() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  const formattedDate = date.toISOString().split('T')[0];
  document.getElementById('modal-task-deadline').value = formattedDate;
}

function deplacerRetardVersAujourdhui() {
  console.log("Fonction deplacerRetardVersAujourdhui exécutée");
  
  // Définir la date d'aujourd'hui
  // Utiliser directement les valeurs de l'objet Date pour éviter les problèmes de fuseau horaire
  const maintenant = new Date();
  console.log("Date brute:", maintenant);
  
  // Formater la date au format YYYY-MM-DD
  const jour = String(maintenant.getDate()).padStart(2, '0');
  const mois = String(maintenant.getMonth() + 1).padStart(2, '0'); // Les mois commencent à 0
  const annee = maintenant.getFullYear();
  
  const aujourdhuiStr = `${annee}-${mois}-${jour}`;
  console.log("Date d'aujourd'hui formatée manuellement:", aujourdhuiStr);
  
  // Récupérer les tâches depuis le localStorage
  const tasksFromStorage = JSON.parse(localStorage.getItem('tasks')) || [];
  console.log("Tâches récupérées du localStorage:", tasksFromStorage.length);
  
  // Mettre à jour la variable globale tasks
  let tasks = tasksFromStorage;
  
  let modificationEffectuee = false;
  let compteur = 0;
  
  // Identifier et déplacer les tâches en retard
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    
    if (task.deadline && task.statut !== "Terminée" && !task.completed) {
      // Comparer les dates sous forme de chaînes (YYYY-MM-DD)
      console.log(`Tâche ${i+1}/${tasks.length}: "${task.titre}", deadline: ${task.deadline}, statut: ${task.statut}`);
      
      // Comparer les dates directement comme des chaînes
      if (task.deadline < aujourdhuiStr) {
        console.log(`  - Tâche en retard détectée, modification de la date de ${task.deadline} à ${aujourdhuiStr}`);
        task.deadline = aujourdhuiStr;
        task.log.push(`Date limite déplacée à aujourd'hui (${aujourdhuiStr}) le ${new Date().toLocaleString('fr-FR')}`);
        modificationEffectuee = true;
        saveAndSync(task); // ✅ Sauvegarder la tâche modifiée
        compteur++;
      } else {
        console.log(`  - Tâche non en retard: ${task.deadline} >= ${aujourdhuiStr}`);
      }
    }
  }
  
  console.log(`Modifications effectuées: ${modificationEffectuee}, Nombre: ${compteur}`);
  
  // Sauvegarder les modifications et rafraîchir l'affichage
  if (modificationEffectuee) {
    console.log("Sauvegarde des modifications dans localStorage");
    localStorage.setItem('tasks', JSON.stringify(tasks));
    console.log("Rafraîchissement de l'affichage");
    renderTasksFiltered();
    alert(`${compteur} tâche(s) en retard ont été déplacée(s) à aujourd'hui`);
  } else {
    alert('Aucune tâche en retard à déplacer');
  }
  
  console.log("Fin de la fonction deplacerRetardVersAujourdhui");
}

function updateSubtaskProgress(task, index) {
  const cards = document.querySelectorAll('.task-card');
  const card = cards[index];
  if (!card || !task.etapes) return;

  const completed = task.etapes.filter(st => st.faite).length;
  const total = task.etapes.length;

  // Met à jour le texte
  const summary = card.querySelector('.subtask-summary');
  if (summary) {
    summary.textContent = `${completed} / ${total} sous-tâche${total > 1 ? 's' : ''} complétée${completed > 1 ? 's' : ''}`;
  }

  // Met à jour la barre
  const progress = card.querySelector('.progress-bar');
  if (progress) {
    const pourcentage = total > 0 ? Math.floor((completed / total) * 100) : 0;
    progress.style.width = `${pourcentage}%`;
  }
}

// Fonction pour ajouter une nouvelle sous-tâche
function addSubtask() {
  const container = document.getElementById('subtasks-container');
  
  // Si c'est la première sous-tâche, vider le message "Aucune étape"
  if (container.querySelector('.text-muted')) {
    container.innerHTML = '';
  }
  
  const index = container.children.length;
  
  const subtaskItem = document.createElement('div');
  subtaskItem.className = 'subtask-item';
  subtaskItem.dataset.index = index;
  
  subtaskItem.innerHTML = `
    <div class="form-check">
      <input class="form-check-input subtask-checkbox" type="checkbox" id="subtask-${index}">
    </div>
    <div class="subtask-text" contenteditable="true">Nouvelle étape</div>
    <div class="subtask-actions">
      <button class="btn btn-sm btn-outline-danger delete-subtask-btn">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;
  
  container.appendChild(subtaskItem);
  
  // Ajouter les écouteurs d'événements
  const checkbox = subtaskItem.querySelector('.subtask-checkbox');
  checkbox.addEventListener('change', function() {
    // Pas besoin de mettre à jour un objet ici, cela sera fait lors de la sauvegarde
  });
  
  const textElement = subtaskItem.querySelector('.subtask-text');
  textElement.classList.add('editing');
  textElement.focus();
  
  textElement.addEventListener('focus', function() {
    this.classList.add('editing');
  });
  
  textElement.addEventListener('blur', function() {
    this.classList.remove('editing');
  });
  
  const deleteBtn = subtaskItem.querySelector('.delete-subtask-btn');
  deleteBtn.addEventListener('click', function() {
    container.removeChild(subtaskItem);
  });
}

// Fonction pour collecter toutes les sous-tâches de la modale
function collectSubtasks() {
  const container = document.getElementById('subtasks-container');
  const subtaskItems = container.querySelectorAll('.subtask-item');
  const subtasks = [];
  
  subtaskItems.forEach(item => {
    const checkbox = item.querySelector('.subtask-checkbox');
    const text = item.querySelector('.subtask-text');
    
    subtasks.push({
      titre: text.textContent.trim(),
      faite: checkbox.checked
    });
  });
  
  return subtasks;
}

// Initialisation
// Ne pas initialiser TinyMCE au démarrage, mais seulement au clic
// initTinyMCE();

// Initialiser les journaux manquants pour les tâches existantes
initMissingLogs();

// Vérifier et créer les tâches récurrentes
processRecurringTasks();

renderTasksFiltered();
updateTagSuggestions();

// Attendre que le DOM soit chargé avant d'ajouter les écouteurs d'événements
document.addEventListener('DOMContentLoaded', function() {
  // Ajouter un écouteur d'événement pour le formulaire
  const taskForm = document.getElementById('task-form');
  if (taskForm) {
    taskForm.addEventListener('submit', addTask);
  }
  
  // Ajouter un écouteur d'événement pour le toggle de la vue
  const viewModeToggle = document.getElementById('view-mode-toggle');
  if (viewModeToggle) {
    viewModeToggle.addEventListener('change', toggleViewMode);
    // Déclencher l'événement une fois pour initialiser l'affichage
    toggleViewMode();
  }
  
  // Ajouter des écouteurs pour les filtres
  const filterTag = document.getElementById('filter-tag');
  const sortBy = document.getElementById('sort-by');
  
  if (filterTag) {
    filterTag.addEventListener('change', renderTasksFiltered);
  }
  
  if (sortBy) {
    sortBy.addEventListener('change', renderTasksFiltered);
  }
  
  // Ajouter des écouteurs pour les boutons
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', resetFilters);
  }
  
  const viderTermineesBtn = document.getElementById('vider-terminees-btn');
  if (viderTermineesBtn) {
    viderTermineesBtn.addEventListener('click', viderTerminees);
  }
  
  const saveTaskDetailsBtn = document.getElementById('save-task-details-btn');
  if (saveTaskDetailsBtn) {
    saveTaskDetailsBtn.addEventListener('click', saveTaskDetails);
  }
  
  const exportJsonBtn = document.getElementById('export-json-btn');
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', exportTasksToJson);
  }
  
  // Initialisation du bouton d'import JSON
  const importJsonBtn = document.getElementById('import-json-btn');
  const importJsonInput = document.getElementById('import-json-input');
  if (importJsonBtn && importJsonInput) {
    importJsonBtn.addEventListener('click', function() {
      importJsonInput.click(); // Déclencher le sélecteur de fichier
    });
    importJsonInput.addEventListener('change', importTasksFromJson);
  }
  
  // Initialiser la date par défaut
  const taskDeadline = document.getElementById('task-deadline');
  if (taskDeadline) {
    taskDeadline.value = new Date().toISOString().split("T")[0];
  }
  
  // Écouteur pour le bouton de gestion des tâches en retard
  const btnGererRetard = document.getElementById('btn-gerer-retard');
  if (btnGererRetard) {
    btnGererRetard.addEventListener('click', function() {
      console.log("Bouton 'Passer à aujourd'hui' cliqué");
      deplacerRetardVersAujourdhui();
    });
  }
  
  // Écouteur pour le bouton "Ajouter une étape"
  const addSubtaskBtn = document.getElementById('add-subtask-btn');
  if (addSubtaskBtn) {
    addSubtaskBtn.addEventListener('click', addSubtask);
  }
});

function initTinyMCE() {
  // Vérifier si TinyMCE est disponible
  if (typeof tinymce === 'undefined') {
    console.error('TinyMCE is not loaded. Cannot initialize editor.');
    return;
  }
  
  // Si TinyMCE est déjà initialisé, ne rien faire
  if (tinyMCEInitialized) {
    console.log('TinyMCE already initialized');
    return;
  }
  
  console.log('Initializing TinyMCE...');
  
  // Initialiser TinyMCE avec une configuration simplifiée pour éviter les erreurs
  tinymce.init({
    selector: '#modal-task-description',
    height: 300,
    menubar: false,
    plugins: 'lists link',  // Plugins simplifiés
    toolbar: 'undo redo | bold italic | bullist numlist | link',
    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
    setup: function(editor) {
      editor.on('init', function() {
        console.log('TinyMCE editor initialized successfully');
        tinyMCEInitialized = true;
        
        // Récupérer l'index de la tâche depuis le champ caché
        const taskIndexField = document.getElementById('modal-task-index');
        if (taskIndexField && taskIndexField.value) {
          const taskIndex = parseInt(taskIndexField.value);
          if (!isNaN(taskIndex) && taskIndex >= 0 && taskIndex < tasks.length) {
            const task = tasks[taskIndex];
            if (task && task.description) {
              editor.setContent(task.description); // TinyMCE gère l'échappement
            }
          }
        }
      });
    }
  });
}

function exportTasksToJson() {
  // Créer un objet Blob avec le contenu JSON
  const tasksJson = JSON.stringify(tasks, null, 2);
  const blob = new Blob([tasksJson], { type: 'application/json' });
  
  console.log(tasks[0]);

  // Créer une URL pour le Blob
  const url = URL.createObjectURL(blob);
  
  // Créer un élément <a> pour déclencher le téléchargement
  const a = document.createElement('a');
  a.href = url;
  a.download = `tasks_export_${new Date().toISOString().split('T')[0]}.json`;
  
  // Ajouter l'élément au document, cliquer dessus, puis le supprimer
  document.body.appendChild(a);
  a.click();
  
  // Nettoyer
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function importTasksFromJson(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const importedTasks = JSON.parse(e.target.result);

      if (!Array.isArray(importedTasks)) {
        alert('Format de fichier invalide. Le fichier doit contenir un tableau de tâches.');
        return;
      }

      // Récupération du userId si connecté
      const uid = window.firebaseService?.currentUser?.uid;

      if (!uid) {
        alert('Vous devez être connecté pour importer des tâches.');
        return;
      }

      // Ajout automatique du userId s'il est absent
      importedTasks.forEach(task => {
        if (!task.userId) task.userId = uid;
      });

      if (confirm(`Voulez-vous importer ${importedTasks.length} tâches ? Cela remplacera toutes les tâches existantes.`)) {
        tasks = importedTasks;

        // Sauvegarde dans Firestore + localStorage
        saveTasks(tasks);

        // Rafraîchissement visuel
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
  event.target.value = ''; // reset input
}

// Structure de données pour la récurrence
/*
recurrence: {
  enabled: true/false,
  type: 'daily'/'weekly'/'monthly'/'yearly',
  interval: 1, // Nombre de jours/semaines/mois/années entre chaque occurrence
  weekdays: [0, 1, 2, 3, 4, 5, 6], // Jours de la semaine (0 = dimanche, 1 = lundi, etc.) - uniquement pour le type 'weekly'
  endType: 'never'/'after'/'on-date',
  endValue: 10 // Nombre d'occurrences ou date de fin (format ISO)
  lastProcessed: '2023-04-07' // Date de dernière génération (format ISO)
}
*/

// Fonction pour initialiser les options de récurrence dans la modale
function initRecurrenceOptions() {
  const enableRecurrenceCheckbox = document.getElementById('enable-recurrence');
  const recurrenceOptions = document.getElementById('recurrence-options');
  const recurrenceTypeSelect = document.getElementById('recurrence-type');
  const weeklyOptions = document.getElementById('weekly-options');
  const intervalUnit = document.getElementById('interval-unit');
  const recurrenceEndTypeSelect = document.getElementById('recurrence-end-type');
  const recurrenceEndValueContainer = document.getElementById('recurrence-end-value-container');
  
  // Écouteur pour activer/désactiver les options de récurrence
  enableRecurrenceCheckbox.addEventListener('change', function() {
    recurrenceOptions.style.display = this.checked ? 'block' : 'none';
  });
  
  // Écouteur pour le type de récurrence
  recurrenceTypeSelect.addEventListener('change', function() {
    // Mettre à jour l'unité d'intervalle
    updateIntervalUnit(this.value);
    
    // Afficher/masquer les options hebdomadaires
    weeklyOptions.style.display = this.value === 'weekly' ? 'flex' : 'none';
  });
  
  // Écouteur pour le type de fin de récurrence
  recurrenceEndTypeSelect.addEventListener('change', function() {
    updateEndValueContainer(this.value);
  });
  
  // Initialiser l'unité d'intervalle
  updateIntervalUnit(recurrenceTypeSelect.value);
  
  // Initialiser le conteneur de valeur de fin
  updateEndValueContainer(recurrenceEndTypeSelect.value);
}

// Fonction pour mettre à jour l'unité d'intervalle en fonction du type de récurrence
function updateIntervalUnit(recurrenceType) {
  const intervalUnit = document.getElementById('interval-unit');
  
  switch(recurrenceType) {
    case 'daily':
      intervalUnit.textContent = 'jour(s)';
      break;
    case 'weekly':
      intervalUnit.textContent = 'semaine(s)';
      break;
    case 'monthly':
      intervalUnit.textContent = 'mois';
      break;
    case 'yearly':
      intervalUnit.textContent = 'année(s)';
      break;
  }
}

// Fonction pour mettre à jour le conteneur de valeur de fin en fonction du type de fin
function updateEndValueContainer(endType) {
  const container = document.getElementById('recurrence-end-value-container');
  container.innerHTML = '';
  
  switch(endType) {
    case 'never':
      // Pas besoin d'ajouter de champ supplémentaire
      break;
    case 'after':
      // Ajouter un champ pour le nombre d'occurrences
      const occurrencesLabel = document.createElement('label');
      occurrencesLabel.className = 'form-label small';
      occurrencesLabel.setAttribute('for', 'recurrence-end-occurrences');
      occurrencesLabel.textContent = 'Nombre d\'occurrences';
      
      const occurrencesInput = document.createElement('input');
      occurrencesInput.type = 'number';
      occurrencesInput.className = 'form-control form-control-sm';
      occurrencesInput.id = 'recurrence-end-occurrences';
      occurrencesInput.min = '1';
      occurrencesInput.value = '10';
      
      container.appendChild(occurrencesLabel);
      container.appendChild(occurrencesInput);
      break;
    case 'on-date':
      // Ajouter un champ pour la date de fin
      const dateLabel = document.createElement('label');
      dateLabel.className = 'form-label small';
      dateLabel.setAttribute('for', 'recurrence-end-date');
      dateLabel.textContent = 'Date de fin';
      
      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.className = 'form-control form-control-sm';
      dateInput.id = 'recurrence-end-date';
      
      // Définir la date par défaut à 3 mois dans le futur
      const defaultEndDate = new Date();
      defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);
      dateInput.value = defaultEndDate.toISOString().split('T')[0];
      
      container.appendChild(dateLabel);
      container.appendChild(dateInput);
      break;
  }
}

// Fonction pour collecter les paramètres de récurrence depuis le formulaire
function collectRecurrenceSettings() {
  const enableRecurrence = document.getElementById('enable-recurrence').checked;
  
  if (!enableRecurrence) {
    return { enabled: false };
  }
  
  const recurrenceType = document.getElementById('recurrence-type').value;
  const interval = parseInt(document.getElementById('recurrence-interval').value, 10) || 1;
  const endType = document.getElementById('recurrence-end-type').value;
  
  let weekdays = [];
  if (recurrenceType === 'weekly') {
    // Collecter les jours de la semaine sélectionnés
    const weekdayCheckboxes = document.querySelectorAll('.weekday-checkbox:checked');
    weekdays = Array.from(weekdayCheckboxes).map(checkbox => parseInt(checkbox.value, 10));
    
    // Si aucun jour n'est sélectionné, utiliser le jour actuel
    if (weekdays.length === 0) {
      const today = new Date().getDay(); // 0 = dimanche, 1 = lundi, etc.
      weekdays = [today];
      document.getElementById(`weekday-${today}`).checked = true;
    }
  }
  
  let endValue;
  switch(endType) {
    case 'never':
      endValue = null;
      break;
    case 'after':
      endValue = parseInt(document.getElementById('recurrence-end-occurrences').value, 10) || 10;
      break;
    case 'on-date':
      endValue = document.getElementById('recurrence-end-date').value;
      break;
  }
  
  return {
    enabled: true,
    type: recurrenceType,
    interval: interval,
    weekdays: weekdays,
    endType: endType,
    endValue: endValue,
    lastProcessed: new Date().toISOString().split('T')[0] // Date actuelle
  };
}

// Fonction pour charger les paramètres de récurrence dans le formulaire
function loadRecurrenceSettings(recurrence) {
  if (!recurrence || !recurrence.enabled) {
    document.getElementById('enable-recurrence').checked = false;
    document.getElementById('recurrence-options').style.display = 'none';
    return;
  }
  
  // Activer la récurrence
  document.getElementById('enable-recurrence').checked = true;
  document.getElementById('recurrence-options').style.display = 'block';
  
  // Définir le type de récurrence
  const recurrenceTypeSelect = document.getElementById('recurrence-type');
  recurrenceTypeSelect.value = recurrence.type || 'daily';
  updateIntervalUnit(recurrenceTypeSelect.value);
  
  // Définir l'intervalle
  document.getElementById('recurrence-interval').value = recurrence.interval || 1;
  
  // Définir les jours de la semaine pour la récurrence hebdomadaire
  if (recurrence.type === 'weekly') {
    document.getElementById('weekly-options').style.display = 'flex';
    
    // Décocher toutes les cases
    document.querySelectorAll('.weekday-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
    
    // Cocher les jours sélectionnés
    if (recurrence.weekdays && recurrence.weekdays.length > 0) {
      recurrence.weekdays.forEach(day => {
        const checkbox = document.getElementById(`weekday-${day}`);
        if (checkbox) {
          checkbox.checked = true;
        }
      });
    }
  } else {
    document.getElementById('weekly-options').style.display = 'none';
  }
  
  // Définir le type de fin
  const endTypeSelect = document.getElementById('recurrence-end-type');
  endTypeSelect.value = recurrence.endType || 'never';
  updateEndValueContainer(endTypeSelect.value);
  
  // Définir la valeur de fin
  if (recurrence.endType === 'after' && recurrence.endValue) {
    setTimeout(() => {
      const occurrencesInput = document.getElementById('recurrence-end-occurrences');
      if (occurrencesInput) {
        occurrencesInput.value = recurrence.endValue;
      }
    }, 0);
  } else if (recurrence.endType === 'on-date' && recurrence.endValue) {
    setTimeout(() => {
      const dateInput = document.getElementById('recurrence-end-date');
      if (dateInput) {
        dateInput.value = recurrence.endValue;
      }
    }, 0);
  }
}

// Variables pour TinyMCE
let tinyMCEInitialized = false;
let tinyMCEPlaceholder = 'Cliquez ici pour ajouter une description détaillée...';

// Fonction pour vérifier les tâches importantes et envoyer des notifications
async function checkTasksForNotifications() {
  // Vérifier si les notifications sont disponibles et si le service est importé
  if (!('Notification' in window) || !('sendNotification' in window)) {
    console.log('Les notifications ne sont pas disponibles');
    return;
  }

  // Importer dynamiquement le service de notifications si nécessaire
  let sendNotification;
  try {
    const module = await import('./push-service.js');
    sendNotification = module.sendNotification;
  } catch (error) {
    console.error('Erreur lors de l\'importation du service de notifications:', error);
    return;
  }

  // Vérifier si l'utilisateur a autorisé les notifications
  if (Notification.permission !== 'granted') {
    console.log('Permission de notification non accordée');
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Tâches importantes à faire aujourd'hui
  const importantTodayTasks = tasks.filter(task => {
    if (task.completed) return false;
    
    const deadlineDate = task.deadline ? new Date(task.deadline) : null;
    if (!deadlineDate) return false;
    
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate.getTime() === today.getTime() && (task.importance === '!!' || task.importance === '!!!');
  });

  // Tâches en retard
  const lateTasks = tasks.filter(task => {
    if (task.completed) return false;
    
    const deadlineDate = task.deadline ? new Date(task.deadline) : null;
    if (!deadlineDate) return false;
    
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  });

  // Tâches importantes à faire demain
  const importantTomorrowTasks = tasks.filter(task => {
    if (task.completed) return false;
    
    const deadlineDate = task.deadline ? new Date(task.deadline) : null;
    if (!deadlineDate) return false;
    
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate.getTime() === tomorrow.getTime() && (task.importance === '!!' || task.importance === '!!!');
  });

  // Envoyer des notifications pour les tâches importantes d'aujourd'hui
  if (importantTodayTasks.length > 0) {
    sendNotification('Tâches importantes aujourd\'hui', {
      body: `Vous avez ${importantTodayTasks.length} tâche(s) importante(s) à accomplir aujourd'hui.`,
      data: { type: 'today', url: '/today.html' }
    });
  }

  // Envoyer des notifications pour les tâches en retard
  if (lateTasks.length > 0) {
    sendNotification('Tâches en retard', {
      body: `Vous avez ${lateTasks.length} tâche(s) en retard.`,
      data: { type: 'late', url: '/late.html' }
    });
  }

  // Envoyer des notifications pour les tâches importantes de demain
  if (importantTomorrowTasks.length > 0) {
    sendNotification('Tâches importantes demain', {
      body: `Vous avez ${importantTomorrowTasks.length} tâche(s) importante(s) prévue(s) pour demain.`,
      data: { type: 'tomorrow', url: '/tomorrow.html' }
    });
  }
}

function initDragAndDrop() {
  const columns = ['today-column', 'tomorrow-column', 'future-column'];

  columns.forEach(columnId => {
    const el = document.getElementById(columnId);
    if (!el) return;

    Sortable.create(el, {
      group: 'tasks',
      animation: 150,
      onEnd: function (evt) {
        const item = evt.item;
        const newParentId = evt.to.id;

        const taskIndex = item.getAttribute('data-index');
        if (!taskIndex || !tasks[taskIndex]) return;

        // Mise à jour du champ deadline selon la colonne
        const today = new Date();
        let newDate = null;

        if (newParentId === 'today-column') {
          newDate = today.toISOString().split('T')[0];
        } else if (newParentId === 'tomorrow-column') {
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          newDate = tomorrow.toISOString().split('T')[0];
        } else if (newParentId === 'future-column') {
          const future = new Date(today);
          future.setDate(today.getDate() + 3);
          newDate = future.toISOString().split('T')[0];
        }

        tasks[taskIndex].deadline = newDate;

        saveTasks(tasks);
        renderTasksFiltered(); // remet à jour les colonnes
        initDragAndDrop();     // rebind les events
      }
    });
  });
}

// Fonction pour gérer la création automatique des tâches récurrentes
function processRecurringTasks() {
  console.log('Vérification des tâches récurrentes...');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  let newTasksCreated = 0;

  tasks.forEach(task => {
    if (task.recurrence && task.recurrence.enabled && task.statut !== 'Terminée') {
      if (task.recurrence.endType === 'on-date' && task.recurrence.endValue && task.recurrence.endValue < todayStr) {
        return;
      }

      if (task.recurrence.endType === 'after' && task.recurrence.endValue) {
        const occurrenceCount = 1 + (task.generatedOccurrences || 0);
        if (occurrenceCount >= task.recurrence.endValue) {
          return;
        }
      }

      const lastProcessed = task.recurrence.lastProcessed || task.createdAt?.split('T')[0] || todayStr;

      let shouldCreateNewOccurrence = false;
      let nextDate = null;

      switch (task.recurrence.type) {
        case 'daily': {
          const lastProcessedDate = new Date(lastProcessed);
          const daysSinceLast = Math.floor((today - lastProcessedDate) / (1000 * 60 * 60 * 24));
          if (daysSinceLast >= task.recurrence.interval) {
            shouldCreateNewOccurrence = true;
            nextDate = new Date(lastProcessed);
            nextDate.setDate(nextDate.getDate() + task.recurrence.interval);
          }
          break;
        }
        case 'weekly': {
          const lastProcessedWeek = new Date(lastProcessed);
          const weeksSinceLast = Math.floor((today - lastProcessedWeek) / (1000 * 60 * 60 * 24 * 7));
          const currentDay = today.getDay();
          if (weeksSinceLast >= task.recurrence.interval &&
              task.recurrence.weekdays?.includes(currentDay)) {
            shouldCreateNewOccurrence = true;
            nextDate = new Date(todayStr);
          }
          break;
        }
        case 'monthly': {
          const lastProcessedMonth = new Date(lastProcessed);
          const monthsSinceLast = (today.getFullYear() - lastProcessedMonth.getFullYear()) * 12 +
                                   (today.getMonth() - lastProcessedMonth.getMonth());
          if (monthsSinceLast >= task.recurrence.interval &&
              today.getDate() === lastProcessedMonth.getDate()) {
            shouldCreateNewOccurrence = true;
            nextDate = new Date(todayStr);
          }
          break;
        }
        case 'yearly': {
          const lastProcessedYear = new Date(lastProcessed);
          const yearsSinceLast = today.getFullYear() - lastProcessedYear.getFullYear();
          if (yearsSinceLast >= task.recurrence.interval &&
              today.getDate() === lastProcessedYear.getDate() &&
              today.getMonth() === lastProcessedYear.getMonth()) {
            shouldCreateNewOccurrence = true;
            nextDate = new Date(todayStr);
          }
          break;
        }
      }

      if (shouldCreateNewOccurrence && nextDate) {
        const newTask = JSON.parse(JSON.stringify(task));
        newTask.id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        newTask.createdAt = new Date().toISOString();
        newTask.log = [`Créée automatiquement le ${new Date().toLocaleString('fr-FR')} (récurrence)`];
        newTask.statut = 'À faire';
        newTask.completedAt = null;

        if (newTask.deadline) {
          const originalCreatedAt = new Date(task.createdAt);
          const originalDeadline = new Date(task.deadline);
          const daysDiff = Math.floor((originalDeadline - originalCreatedAt) / (1000 * 60 * 60 * 24));
          const newDeadline = new Date(nextDate);
          newDeadline.setDate(newDeadline.getDate() + daysDiff);
          newTask.deadline = newDeadline.toISOString().split('T')[0];
        }

        newTask.isGeneratedOccurrence = true;
        newTask.recurrence = { enabled: false };

        tasks.push(newTask);
        saveAndSync(newTask); // ✅ Sauvegarder la nouvelle tâche

        task.recurrence.lastProcessed = todayStr;
        task.generatedOccurrences = (task.generatedOccurrences || 0) + 1;
        saveAndSync(task); // ✅ Mettre à jour la tâche originale

        newTasksCreated++;
      }
    }
  });

  window.markAsDone = markAsDone;

  console.log(`${newTasksCreated} nouvelle(s) tâche(s) récurrente(s) générée(s)`);
}
