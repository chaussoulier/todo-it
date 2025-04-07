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
let isDetailedView = true; // Par défaut, on est en vue détaillée
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
  
  // Afficher les sous-tâches
  renderSubtasks(task.etapes || []);
  
  updateModalTagSuggestions();
  
  // Ajouter les écouteurs d'événements pour les boutons de date rapide
  document.getElementById('btn-tomorrow').onclick = () => setQuickDeadline(1);
  document.getElementById('btn-day-after').onclick = () => setQuickDeadline(2);
  document.getElementById('btn-next-week').onclick = () => setQuickDeadlineNextWeek();
  
  // Afficher le modal
  const modal = new bootstrap.Modal(document.getElementById('taskDetailModal'));
  modal.show();
}

function saveTaskDetails() {
  const index = parseInt(document.getElementById('modal-task-index').value);
  const task = tasks[index];
  
  task.titre = document.getElementById('modal-task-title').value.trim();
  
  // Récupérer le contenu de la description
  const descriptionField = document.getElementById('modal-task-description');
  
  if (tinyMCEInitialized && tinymce.get('modal-task-description')) {
    // Si TinyMCE est initialisé, récupérer son contenu
    task.description = tinymce.get('modal-task-description').getContent();
  } else if (descriptionField.value !== tinyMCEPlaceholder) {
    // Sinon, récupérer la valeur du textarea si ce n'est pas le placeholder
    task.description = descriptionField.value.trim();
  } else {
    // Si c'est le placeholder, mettre une chaîne vide
    task.description = '';
  }
  
  task.tag = document.getElementById('modal-task-tag').value.trim();
  task.deadline = document.getElementById('modal-task-deadline').value;
  task.statut = document.getElementById('modal-task-statut').value;
  task.importance = document.getElementById('modal-task-importance').value || '!';
  
  // Récupérer les sous-tâches
  task.etapes = collectSubtasks();
  
  saveTasks();
  renderTasksFiltered();
  
  const modal = bootstrap.Modal.getInstance(document.getElementById('taskDetailModal'));
  modal.hide();
}

// Initialisation
// Ne pas initialiser TinyMCE au démarrage, mais seulement au clic
// initTinyMCE();
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

// Variables pour TinyMCE
let tinyMCEInitialized = false;
let tinyMCEPlaceholder = 'Cliquez ici pour ajouter une description détaillée...';
