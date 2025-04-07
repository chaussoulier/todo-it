const form = document.getElementById('task-form');
const todayColumn = document.getElementById('today-column');
const tomorrowColumn = document.getElementById('tomorrow-column');
const futureColumn = document.getElementById('future-column');
const lateColumn1 = document.getElementById('late-column-1');
const lateColumn2 = document.getElementById('late-column-2');
const lateColumn3 = document.getElementById('late-column-3');
const lateColumn4 = document.getElementById('late-column-4');
const completedTasks = document.getElementById('completed-tasks');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let isDetailedView = false; // Par défaut, on est en vue détaillée
let currentEditingTaskIndex = null; // Index de la tâche en cours d'édition

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Fonction pour u00e9chapper les caractères HTML et empêcher l'interprétation des balises
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Fonction pour nettoyer le HTML en ne conservant que les sauts de ligne
function stripHtmlKeepLineBreaks(html) {
  if (!html) return '';
  // Remplacer les balises de saut de ligne par des sauts de ligne réels
  let text = html.replace(/<br\s*\/?>/gi, '\n');
  // Remplacer les balises de paragraphe par des sauts de ligne doubles
  text = text.replace(/<\/p><p>/gi, '\n\n');
  text = text.replace(/<p>/gi, '');
  text = text.replace(/<\/p>/gi, '\n\n');
  // Supprimer toutes les autres balises HTML
  text = text.replace(/<[^>]*>/g, '');
  // Décoder les entités HTML
  text = text.replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&amp;/g, '&')
             .replace(/&quot;/g, '"')
             .replace(/&#039;/g, '\'');
  // Éviter les sauts de ligne multiples consécutifs
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function formatDeadline(dateStr) {
  if (!dateStr) return "";

  const deadline = new Date(dateStr);
  deadline.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = deadline - today;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "🕰️ En retard";
  if (diffDays === 0) return "📅 Aujourd'hui";
  if (diffDays === 1) return "⏰ Demain";
  if (diffDays >= 2 && diffDays <= 5) {
    return `📅 ${deadline.toLocaleDateString('fr-FR', { weekday: 'long' })}`;
  }

  return `✅ ${deadline.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

function getTagClass(tag) {
  // Normaliser le tag pour le comparer
  const normalizedTag = tag.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, "-");
  
  // Définir des classes spécifiques pour certains tags
  const tagClasses = {
    'test': 'illustration',
    'ems': 'design',
    'testa': 'ui-design',
    'all': 'ui-design',
    'ui': 'ui-design',
    'copywriting': 'copywriting',
    'lcf': 'copywriting',
    'perso': 'perso',
    'personnel': 'perso',
    'cocolor': 'travail',
    'pro': 'travail',
    'professionnel': 'travail'
  };
  
  return tagClasses[normalizedTag] || '';
}

// Fonction pour calculer le score d'importance total d'une tâche
function calculateImportanceScore(task) {
  // Score basé sur le statut (1 à 3)
  let statutScore = 1;
  if (task.statut === "À faire") {
    statutScore = 3;
  } else if (task.statut === "À challenger") {
    statutScore = 2;
  } else if (task.statut === "À lire") {
    statutScore = 1;
  }
  
  // Score basé sur l'importance personnalisée (1 à 3)
  let importanceScore = 1;
  if (task.importance === "!!!") {
    importanceScore = 3;
  } else if (task.importance === "!!") {
    importanceScore = 2;
  } else if (task.importance === "!") {
    importanceScore = 1;
  }
  
  // Score total (2 à 6)
  return statutScore + importanceScore;
}

function renderTasksFiltered() {
  const filterTag = document.getElementById('filter-tag').value;
  const sortBy = document.getElementById('sort-by').value;

  // Vider toutes les colonnes
  todayColumn.innerHTML = "";
  tomorrowColumn.innerHTML = "";
  futureColumn.innerHTML = "";
  lateColumn1.innerHTML = "";
  lateColumn2.innerHTML = "";
  lateColumn3.innerHTML = "";
  lateColumn4.innerHTML = "";
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
    // Trouver l'index réel dans le tableau original des tâches
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
      
      // Vérifier si la tâche est en retard
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
      // Si pas de date, on met dans les tâches futures
      futureTasks.push({task, index: originalIndex});
    }
  });

  // Rendre les tâches dans chaque colonne
  todayTasks.forEach(({task, index}) => {
    renderTaskCard(task, index, todayColumn);
  });

  tomorrowTasks.forEach(({task, index}) => {
    renderTaskCard(task, index, tomorrowColumn);
  });

  futureTasks.forEach(({task, index}) => {
    renderTaskCard(task, index, futureColumn);
  });

  // Afficher les tâches en retard
if (lateTasks.length > 0) {
  // Répartir les tâches en retard sur les 4 colonnes
  lateTasks.forEach(({task, index}, i) => {
    // Déterminer dans quelle colonne placer la tâche (0, 1, 2 ou 3)
    const columnIndex = i % 4;
    
    // Sélectionner la colonne appropriée
    let targetColumn;
    switch (columnIndex) {
      case 0:
        targetColumn = lateColumn1;
        break;
      case 1:
        targetColumn = lateColumn2;
        break;
      case 2:
        targetColumn = lateColumn3;
        break;
      case 3:
        targetColumn = lateColumn4;
        break;
    }
    
    // Rendre la carte dans la colonne sélectionnée
    renderTaskCard(task, index, targetColumn);
  });
}

  // Afficher les tâches terminées
  completedTasksList.forEach(({task, index}) => {
    renderCompletedTaskCard(task, index);
  });

  updateRetardButtonState();
  
  // Mettre à jour la visibilité des descriptions en fonction du mode de vue
  updateTaskDescriptionVisibility();
}

function renderTaskCard(task, index, container) {
  const card = document.createElement('div');
  const classStatut = task.statut.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, "");
  card.className = `task-card ${classStatut}`;
  card.dataset.taskIndex = index; // Ajouter l'index comme attribut de données
  
  // Calculer le score d'importance total
  const importanceScore = calculateImportanceScore(task);
  // Ajouter l'attribut data-importance pour le style CSS
  card.dataset.importance = importanceScore;
  
  // Déterminer le degré d'importance
  // Utiliser l'importance personnalisée si disponible, sinon utiliser celle basée sur le statut
  let importanceStatut = "";
  if (task.statut === "À faire") {
    importanceStatut = "!!!";
  } else if (task.statut === "À lire") {
    importanceStatut = "!";
  } else if (task.statut === "À challenger") {
    importanceStatut = "!!";
  }
  
  // Utiliser l'importance personnalisée si disponible
  const importance = task.importance || importanceStatut;
  
  const tagClass = task.tag ? getTagClass(task.tag) : '';
  
  // Calculer la progression des sous-tâches
  let subtasksHtml = '';
  let progressPercent = 0;
  let subtaskSummary = '';
  
  if (task.etapes && task.etapes.length > 0) {
    const totalSubtasks = task.etapes.length;
    const completedSubtasks = task.etapes.filter(etape => etape.faite).length;
    progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
    
    subtaskSummary = `<div class="subtask-summary">${completedSubtasks}/${totalSubtasks} étapes terminées</div>`;
    
    subtasksHtml = `
      <div class="subtask-progress">
        <div class="progress-bar" role="progressbar" style="width: ${progressPercent}%" 
             aria-valuenow="${progressPercent}" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    `;
  }
  
  card.innerHTML = `
    <h5 class="task-title" data-index="${index}">${task.titre}</h5>
    <div class="d-flex justify-content-between align-items-start">
      <div>
        ${task.tag ? `<span class="tag ${tagClass}" data-index="${index}">${task.tag}</span>` : ''}
        <span class="statut statut-${classStatut}">${task.statut}</span>
        <span class="importance" title="Score d'importance: ${importanceScore}/6">${importanceScore}</span>
      </div>
      <div class="deadline-date" data-index="${index}">
        ${formatDeadline(task.deadline)}
      </div>
    </div>
    ${task.description ? `<div class="task-description-content"><pre class="task-description-pre">${stripHtmlKeepLineBreaks(task.description)}</pre></div>` : ''}
    
    <!-- Affichage des sous-tâches -->
    ${subtaskSummary}
    ${subtasksHtml}
    
    <div class="task-card-footer d-flex justify-content-between align-items-center">
      <div class="card-actions">
        <select class="form-select form-select-sm statut-select" data-index="${index}">
          <option value="À faire" ${task.statut === "À faire" ? "selected" : ""}>À faire</option>
          <option value="À lire" ${task.statut === "À lire" ? "selected" : ""}>À lire</option>
          <option value="À challenger" ${task.statut === "À challenger" ? "selected" : ""}>À challenger</option>
          <option value="En cours" ${task.statut === "En cours" ? "selected" : ""}>En cours</option>
          <option value="Terminée" ${task.statut === "Terminée" ? "selected" : ""}>Terminée</option>
        </select>
      </div>
      <div>
        <button class="btn btn-success btn-sm done-btn" data-index="${index}">Terminer</button>
      </div>
    </div>
  `;

  container.appendChild(card);
  
  // Ajouter les écouteurs d'événements pour l'édition
  const titleElement = card.querySelector('.task-title');
  titleElement.addEventListener('dblclick', function(e) {
    e.stopPropagation();
    const taskIndex = parseInt(this.dataset.index);
    editTitle(this, taskIndex);
  });
  
  // Ajouter l'écouteur d'événements pour développer/réduire la description
  const descriptionElement = card.querySelector('.task-description-content');
  if (descriptionElement) {
    descriptionElement.addEventListener('click', function(e) {
      this.classList.toggle('expanded');
    });
  }
  
  const tagElement = card.querySelector('.tag');
  if (tagElement) {
    tagElement.addEventListener('dblclick', function(e) {
      e.stopPropagation();
      const taskIndex = parseInt(this.dataset.index);
      editTag(this, taskIndex);
    });
  }
  
  const deadlineElement = card.querySelector('.deadline-date');
  deadlineElement.addEventListener('dblclick', function(e) {
    e.stopPropagation();
    const taskIndex = parseInt(this.dataset.index);
    editDeadline(this, taskIndex);
  });
  
  // Ajouter les écouteurs pour les boutons et sélecteurs
  const statutSelect = card.querySelector('.statut-select');
  statutSelect.addEventListener('change', function() {
    const taskIndex = parseInt(this.dataset.index);
    updateTaskStatut(taskIndex, this.value);
  });
  
  const doneButton = card.querySelector('.done-btn');
  doneButton.addEventListener('click', function(e) {
    e.stopPropagation();
    const taskIndex = parseInt(this.dataset.index);
    markAsDone(taskIndex);
  });
  
  // Ajouter un écouteur d'événement pour ouvrir la modale au clic sur la carte
  card.addEventListener('click', function(event) {
    // Ne pas ouvrir la modale si on clique sur un élément interactif
    if (event.target.tagName === 'SELECT' || 
        event.target.tagName === 'BUTTON' || 
        event.target.tagName === 'INPUT') {
      return;
    }
    const taskIndex = parseInt(this.dataset.taskIndex);
    openTaskDetailModal(taskIndex);
  });
}

function renderCompletedTaskCard(task, index) {
  const col = document.createElement('div');
  col.className = 'col-md-3 mb-3';
  
  const card = document.createElement('div');
  card.className = 'task-card terminée';
  card.dataset.taskIndex = index; // Ajouter l'index comme attribut de données
  
  const tagClass = task.tag ? getTagClass(task.tag) : '';
  
  // Formater la date de traitement si elle existe
  let completedDateStr = '';
  if (task.completedAt) {
    const completedDate = new Date(task.completedAt);
    completedDateStr = `<div class="completed-date">✅ Terminée le ${completedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${completedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>`;
  }

  card.innerHTML = `
    <h5 class="task-title" data-index="${index}">${task.titre}</h5>
    <div class="d-flex justify-content-between align-items-start">
      <div>
        ${task.tag ? `<span class="tag ${tagClass}" data-index="${index}">${task.tag}</span>` : ''}
        <span class="statut statut-terminée">Terminée</span>
      </div>
      <div class="deadline-date" data-index="${index}">
        ${formatDeadline(task.deadline)}
      </div>
    </div>
    ${completedDateStr}
    ${task.description ? `<div class="task-description-content"><pre class="task-description-pre">${stripHtmlKeepLineBreaks(task.description)}</pre></div>` : ''}
  `;
  
  col.appendChild(card);
  completedTasks.appendChild(col);
  
  // Ajouter un écouteur d'événement pour ouvrir la modale au clic sur la carte
  card.addEventListener('click', function(event) {
    const taskIndex = parseInt(this.dataset.taskIndex);
    openTaskDetailModal(taskIndex);
  });
}

function markAsDone(index) {
  // S'assurer que l'index est un nombre
  index = parseInt(index, 10);
  
  // Vérifier que l'index est valide
  if (isNaN(index) || index < 0 || index >= tasks.length) {
    console.error("Index de tâche invalide:", index);
    return;
  }
  
  tasks[index].statut = "Terminée";
  
  // Ajouter la date de traitement (date à laquelle la tâche a été marquée comme terminée)
  tasks[index].completedAt = new Date().toISOString();
  tasks[index].log.push(`Marquée comme terminée le ${new Date().toLocaleString('fr-FR')}`);
  
  saveTasks();
  renderTasksFiltered();
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
      saveTasks();
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
    saveTasks();
    renderTasksFiltered();
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
    saveTasks();
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

  tasks = tasks.filter(task => task.statut !== "Terminée");
  checkTasksForNotifications();
  saveTasks();
  renderTasksFiltered();
}

function gererTachesEnRetard() {
  const todayStr = new Date().toISOString().split("T")[0];

  tasks.forEach(task => {
    // Ne pas modifier les tâches terminées
    if (task.statut !== "Terminée" && task.deadline && new Date(task.deadline).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)) {
      task.deadline = todayStr;
      task.log.push(`Date limite déplacée à aujourd'hui (${todayStr}) le ${new Date().toLocaleString('fr-FR')}`);
    }
  });

  saveTasks();
  renderTasksFiltered();
  updateRetardButtonState();
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

function updateModalTagSuggestions() {
  const datalist = document.getElementById('tag-suggestions-modal');
  if (!datalist) return;
  
  datalist.innerHTML = '';
  
  const uniqueTags = [...new Set(tasks.map(task => task.tag).filter(tag => tag))];
  
  uniqueTags.forEach(tag => {
    const option = document.createElement('option');
    option.value = tag;
    datalist.appendChild(option);
  });
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
  const importance = document.getElementById("task-importance").value || "!";  // Ajout du degré d'importance
  
  if (!titre) {
    alert("Le titre est obligatoire");
    return;
  }
  
  const nouvelleTache = {
    titre,
    tag,
    deadline,
    statut,
    importance, // Ajout du degré d'importance
    description: "", // Ajout du champ description
    etapes: [], // Ajout du tableau pour les sous-tâches
    createdAt: new Date().toISOString(),
    log: [`Créée le ${new Date().toLocaleString('fr-FR')}`]
  };
  
  tasks.push(nouvelleTache);
  saveTasks();
  document.getElementById("task-form").reset();
  // Réinitialiser le statut à "À faire"
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
  saveTasks();
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

function openTaskDetailModal(index) {
  // S'assurer que l'index est un nombre
  index = parseInt(index, 10);
  
  // Vérifier que l'index est valide
  if (isNaN(index) || index < 0 || index >= tasks.length) {
    console.error("Index de tâche invalide:", index);
    return;
  }
  
  // Mettre à jour l'index de la tâche en cours d'édition
  currentEditingTaskIndex = index;
  
  const task = tasks[index];
  document.getElementById('modal-task-index').value = index;
  document.getElementById('modal-task-title').value = task.titre;
  
  // Gérer le champ de description
  const descriptionField = document.getElementById('modal-task-description');
  
  // Vérifier si TinyMCE est disponible dans le scope global
  if (typeof tinymce !== 'undefined') {
    // Si TinyMCE n'est pas encore initialisé, l'initialiser maintenant
    if (!tinyMCEInitialized) {
      initTinyMCE();
    }
    
    // Attendre un court instant pour s'assurer que TinyMCE est prêt
    setTimeout(function() {
      if (tinymce.get('modal-task-description')) {
        // Mettre à jour le contenu de TinyMCE
        tinymce.get('modal-task-description').setContent(task.description || '');
      } else {
        console.warn('TinyMCE editor not found for modal-task-description');
        // Fallback au textarea standard
        if (task.description && task.description.trim() !== '') {
          descriptionField.value = task.description; // Pas besoin d'échapper ici car c'est un champ de formulaire
          descriptionField.classList.remove('description-placeholder');
        } else {
          descriptionField.value = tinyMCEPlaceholder;
          descriptionField.classList.add('description-placeholder');
        }
      }
    }, 100);
  } else {
    console.warn('TinyMCE not available');
    // Fallback au textarea standard
    if (task.description && task.description.trim() !== '') {
      descriptionField.value = task.description;
      descriptionField.classList.remove('description-placeholder');
    } else {
      descriptionField.value = tinyMCEPlaceholder;
      descriptionField.classList.add('description-placeholder');
    }
  }
  
  document.getElementById('modal-task-tag').value = task.tag || '';
  document.getElementById('modal-task-deadline').value = task.deadline || '';
  document.getElementById('modal-task-statut').value = task.statut;
  document.getElementById('modal-task-importance').value = task.importance || '!';
  
  // Afficher le journal des actions
  renderTaskLog(task);
  
  // Afficher les sous-tâches
  renderSubtasks(task.etapes || []);
  
  // Charger les paramètres de récurrence
  loadRecurrenceSettings(task.recurrence);
  
  updateModalTagSuggestions();
  
  // Ajouter les écouteurs d'événements pour les boutons de date rapide
  document.getElementById('btn-tomorrow').onclick = () => setQuickDeadline(1);
  document.getElementById('btn-day-after').onclick = () => setQuickDeadline(2);
  document.getElementById('btn-next-week').onclick = () => setQuickDeadlineNextWeek();
  
  // Initialiser les options de récurrence
  initRecurrenceOptions();
  
  // Afficher le modal
  const modal = new bootstrap.Modal(document.getElementById('taskDetailModal'));
  modal.show();
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
  
  saveTasks();
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
      
      // Ajouter une entrée initiale basée sur la date de création si disponible
      if (task.createdAt) {
        const creationDate = new Date(task.createdAt).toLocaleString('fr-FR');
        task.log.push(`Créée le ${creationDate}`);
      } else {
        task.log.push(`Journal initialisé le ${currentDate}`);
      }
      
      // Si la tâche est terminée et qu'on a une date de complétion, l'ajouter aussi
      if (task.statut === 'Terminée' && task.completedAt) {
        const completionDate = new Date(task.completedAt).toLocaleString('fr-FR');
        task.log.push(`Marquée comme terminée le ${completionDate}`);
      }
    }
  });
  
  if (compteur > 0) {
    console.log(`${compteur} tâches ont été mises à jour avec un journal`);
    saveTasks();
  } else {
    console.log('Toutes les tâches ont déjà un journal');
  }
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
  tasks = tasksFromStorage;
  
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

// Fonctions pour la gestion des sous-tâches
function renderSubtasks(subtasks = []) {
  const container = document.getElementById('subtasks-container');
  container.innerHTML = '';
  
  if (subtasks.length === 0) {
    container.innerHTML = '<div class="text-muted fst-italic">Aucune étape pour cette tâche. Cliquez sur "Ajouter une étape" pour commencer.</div>';
    return;
  }
  
  // Créer les éléments pour chaque sous-tâche
  subtasks.forEach((subtask, index) => {
    const subtaskItem = document.createElement('div');
    subtaskItem.className = 'subtask-item';
    subtaskItem.dataset.index = index;
    
    subtaskItem.innerHTML = `
      <div class="form-check">
        <input class="form-check-input subtask-checkbox" type="checkbox" id="subtask-${index}" ${subtask.faite ? 'checked' : ''}>
      </div>
      <div class="subtask-text" contenteditable="true">${subtask.titre}</div>
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
      subtask.faite = this.checked;
    });
    
    const textElement = subtaskItem.querySelector('.subtask-text');
    textElement.addEventListener('focus', function() {
      this.classList.add('editing');
    });
    
    textElement.addEventListener('blur', function() {
      this.classList.remove('editing');
      subtask.titre = this.textContent.trim();
    });
    
    const deleteBtn = subtaskItem.querySelector('.delete-subtask-btn');
    deleteBtn.addEventListener('click', function() {
      container.removeChild(subtaskItem);
    });
  });
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
  
  reader.onload = function(e) {
    try {
      // Analyser le contenu JSON
      const importedTasks = JSON.parse(e.target.result);
      
      // Vérifier que le contenu est un tableau
      if (!Array.isArray(importedTasks)) {
        alert('Format de fichier invalide. Le fichier doit contenir un tableau de tâches.');
        return;
      }
      
      // Demander confirmation avant de remplacer les tâches existantes
      if (confirm(`Voulez-vous importer ${importedTasks.length} tâches ? Cela remplacera toutes les tâches existantes.`)) {
        // Remplacer les tâches existantes par les tâches importées
        tasks = importedTasks;
        
        // Sauvegarder les tâches dans le localStorage
        saveTasks();
        
        // Rafraîchir l'affichage
        renderTasksFiltered();
        
        alert('Import réussi !');
      }
    } catch (error) {
      alert(`Erreur lors de l'analyse du fichier JSON : ${error.message}`);
    }
  };
  
  reader.onerror = function() {
    alert('Erreur lors de la lecture du fichier.');
  };
  
  // Lire le fichier comme texte
  reader.readAsText(file);
  
  // Réinitialiser l'input file pour permettre de sélectionner le même fichier à nouveau si nécessaire
  event.target.value = '';
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

// Fonction pour gérer la création automatique des tâches récurrentes
function processRecurringTasks() {
  console.log('Vérification des tâches récurrentes...');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // Format YYYY-MM-DD
  let newTasksCreated = 0;
  
  tasks.forEach(task => {
    // Vérifier si la tâche a une récurrence active
    if (task.recurrence && task.recurrence.enabled) {
      // Vérifier si la tâche est terminée (on ne génère pas de nouvelles occurrences pour les tâches terminées)
      if (task.statut === 'Terminée') {
        return;
      }
      
      // Vérifier si la récurrence a une date de fin et si cette date est passée
      if (task.recurrence.endType === 'on-date' && task.recurrence.endValue && task.recurrence.endValue < todayStr) {
        return;
      }
      
      // Vérifier si la récurrence a un nombre d'occurrences et si ce nombre est atteint
      if (task.recurrence.endType === 'after' && task.recurrence.endValue) {
        // Compter le nombre d'occurrences déjà générées (la tâche originale + les tâches générées)
        const occurrenceCount = 1 + (task.generatedOccurrences || 0);
        if (occurrenceCount >= task.recurrence.endValue) {
          return;
        }
      }
      
      // Vérifier si la dernière date de traitement est définie
      const lastProcessed = task.recurrence.lastProcessed || task.createdAt?.split('T')[0] || todayStr;
      
      // Déterminer si une nouvelle occurrence doit être créée
      let shouldCreateNewOccurrence = false;
      let nextDate = null;
      
      // Calculer la prochaine date en fonction du type de récurrence
      switch(task.recurrence.type) {
        case 'daily':
          // Calculer le nombre de jours depuis la dernière génération
          const lastProcessedDate = new Date(lastProcessed);
          const daysSinceLastProcessed = Math.floor((today - lastProcessedDate) / (1000 * 60 * 60 * 24));
          
          // Vérifier si l'intervalle est écoulé
          if (daysSinceLastProcessed >= task.recurrence.interval) {
            shouldCreateNewOccurrence = true;
            
            // Calculer la prochaine date
            nextDate = new Date(lastProcessed);
            nextDate.setDate(nextDate.getDate() + task.recurrence.interval);
          }
          break;
          
        case 'weekly':
          // Calculer le nombre de semaines depuis la dernière génération
          const lastProcessedWeek = new Date(lastProcessed);
          const weeksSinceLastProcessed = Math.floor((today - lastProcessedWeek) / (1000 * 60 * 60 * 24 * 7));
          
          // Vérifier si l'intervalle est écoulé
          if (weeksSinceLastProcessed >= task.recurrence.interval) {
            // Vérifier si le jour de la semaine actuel est dans la liste des jours sélectionnés
            const currentDayOfWeek = today.getDay(); // 0 = dimanche, 1 = lundi, etc.
            if (task.recurrence.weekdays && task.recurrence.weekdays.includes(currentDayOfWeek)) {
              shouldCreateNewOccurrence = true;
              
              // Calculer la prochaine date (aujourd'hui)
              nextDate = new Date(todayStr);
            }
          }
          break;
          
        case 'monthly':
          // Calculer le nombre de mois depuis la dernière génération
          const lastProcessedMonth = new Date(lastProcessed);
          const monthsSinceLastProcessed = (today.getFullYear() - lastProcessedMonth.getFullYear()) * 12 + (today.getMonth() - lastProcessedMonth.getMonth());
          
          // Vérifier si l'intervalle est écoulé
          if (monthsSinceLastProcessed >= task.recurrence.interval) {
            // Vérifier si le jour du mois correspond
            if (today.getDate() === lastProcessedMonth.getDate()) {
              shouldCreateNewOccurrence = true;
              
              // Calculer la prochaine date (aujourd'hui)
              nextDate = new Date(todayStr);
            }
          }
          break;
          
        case 'yearly':
          // Calculer le nombre d'années depuis la dernière génération
          const lastProcessedYear = new Date(lastProcessed);
          const yearsSinceLastProcessed = today.getFullYear() - lastProcessedYear.getFullYear();
          
          // Vérifier si l'intervalle est écoulé
          if (yearsSinceLastProcessed >= task.recurrence.interval) {
            // Vérifier si le jour et le mois correspondent
            if (today.getDate() === lastProcessedYear.getDate() && today.getMonth() === lastProcessedYear.getMonth()) {
              shouldCreateNewOccurrence = true;
              
              // Calculer la prochaine date (aujourd'hui)
              nextDate = new Date(todayStr);
            }
          }
          break;
      }
      
      // Créer une nouvelle occurrence si nécessaire
      if (shouldCreateNewOccurrence && nextDate) {
        // Créer une copie de la tâche
        const newTask = JSON.parse(JSON.stringify(task));
        
        // Mettre à jour les propriétés de la nouvelle tâche
        newTask.createdAt = new Date().toISOString();
        newTask.log = [`Créée automatiquement le ${new Date().toLocaleString('fr-FR')} (récurrence)`];
        newTask.statut = 'À faire'; // Réinitialiser le statut
        newTask.completedAt = null; // Réinitialiser la date de complétion
        
        // Mettre à jour la date limite si elle existe
        if (newTask.deadline) {
          // Calculer la différence entre la date limite et la date de création de la tâche originale
          const originalCreatedAt = new Date(task.createdAt);
          const originalDeadline = new Date(task.deadline);
          const daysDifference = Math.floor((originalDeadline - originalCreatedAt) / (1000 * 60 * 60 * 24));
          
          // Appliquer la même différence à la nouvelle tâche
          const newDeadline = new Date(nextDate);
          newDeadline.setDate(newDeadline.getDate() + daysDifference);
          newTask.deadline = newDeadline.toISOString().split('T')[0];
        }
        
        // Ajouter un marqueur indiquant que cette tâche est une occurrence générée
        newTask.isGeneratedOccurrence = true;
        
        // Supprimer la récurrence pour éviter de générer des occurrences en cascade
        newTask.recurrence = { enabled: false };
        
        // Ajouter la nouvelle tâche
        tasks.push(newTask);
        newTasksCreated++;
        
        // Mettre à jour la date de dernière génération de la tâche originale
        task.recurrence.lastProcessed = todayStr;
        
        // Incrémenter le compteur d'occurrences générées
        task.generatedOccurrences = (task.generatedOccurrences || 0) + 1;
      }
    }
  });
  
  if (newTasksCreated > 0) {
    console.log(`${newTasksCreated} nouvelles tâches récurrentes créées`);
    saveTasks();
  } else {
    console.log('Aucune nouvelle tâche récurrente à créer aujourd\'hui');
  }
  
  // Vérifier les tâches importantes pour les notifications
  checkTasksForNotifications();
}
