const form = document.getElementById('task-form');
const todayColumn = document.getElementById('today-column');
let tasks = [];
let isDetailedView = false;

// Charger les tâches depuis le localStorage
function loadTasks() {
  const savedTasks = localStorage.getItem('tasks');
  return savedTasks ? JSON.parse(savedTasks) : [];
}

// Sauvegarder les tâches dans le localStorage
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Formater l'affichage de la date limite
function formatDeadline(dateStr) {
  if (!dateStr) return "";
  
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const options = { day: 'numeric', month: 'short' };
  
  if (date.getTime() === today.getTime()) {
    return "Aujourd'hui";
  } else if (date.getTime() === tomorrow.getTime()) {
    return "Demain";
  } else {
    return date.toLocaleDateString('fr-FR', options);
  }
}

// Obtenir la classe CSS en fonction du tag
function getTagClass(tag) {
  if (!tag) return "";
  
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
  
  const tagLower = tag.toLowerCase();
  
  for (const [key, value] of Object.entries(tagClasses)) {
    if (tagLower.includes(key)) {
      return `tag-${value}`;
    }
  }
  
  return "";
}

// Afficher uniquement les tâches d'aujourd'hui
function renderTodayTasks() {
  // Vider la colonne
  todayColumn.innerHTML = "";
  
  // Obtenir la date d'aujourd'hui
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Filtrer pour n'obtenir que les tâches d'aujourd'hui qui ne sont pas terminées
  const todayTasks = [];
  
  tasks.forEach((task, index) => {
    if (task.statut === "Terminée") {
      return;
    }
    
    const taskDate = task.deadline ? new Date(task.deadline) : null;
    if (taskDate) {
      taskDate.setHours(0, 0, 0, 0);
      
      if (taskDate.getTime() === today.getTime()) {
        todayTasks.push({task, index});
      }
    }
  });
  
  // Vérifier s'il y a des tâches aujourd'hui
  if (todayTasks.length === 0) {
    // Aucune tâche pour aujourd'hui, afficher le message
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-tasks-message';
    emptyMessage.innerHTML = '<div class="text-center p-5">Prenons un café ☕</div>';
    todayColumn.appendChild(emptyMessage);
    return;
  }
  
  // Rendre les tâches dans la colonne
  todayTasks.forEach(({task, index}) => {
    renderTaskCard(task, index, todayColumn);
  });
  
  // Mettre à jour la visibilité des descriptions en fonction du mode de vue
  updateTaskDescriptionVisibility();
}

// Créer une carte de tâche
function renderTaskCard(task, index, container) {
  const card = document.createElement('div');
  const classStatut = task.statut.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, "");
  card.className = `task-card ${classStatut}`;
  card.dataset.index = index;
  card.dataset.taskIndex = index; // Ajout pour compatibilité avec script.js
  
  // Déterminer le degré d'importance
  let importance = "";
  if (task.statut === "à faire") {
    importance = "!!!";
  } else if (task.statut === "à lire") {
    importance = "!";
  } else if (task.statut === "à challenger") {
    importance = "!!";
  }
  
  const tagClass = task.tag ? getTagClass(task.tag) : '';
  
  card.innerHTML = `
    <h5 class="task-title" data-index="${index}">${task.titre}</h5>
    <div class="d-flex justify-content-between align-items-start">
      <div>
        ${task.tag ? `<span class="tag ${tagClass}" data-index="${index}">${task.tag}</span>` : ''}
        <span class="statut statut-${classStatut}">${task.statut}</span>
        ${importance ? `<span class="importance">${importance}</span>` : ''}
      </div>
      <div class="deadline-date" data-index="${index}">
        ${formatDeadline(task.deadline)}
      </div>
    </div>
    ${task.description ? `<div class="task-description-content">${task.description}</div>` : ''}
    <div class="task-card-footer d-flex justify-content-between align-items-center">
      <div>
        <button class="btn btn-success btn-sm done-btn" data-index="${index}">Terminer</button>
      </div>
      <div>
        <button class="btn-task-detail btn btn-outline-secondary btn-sm" data-index="${index}" title="Voir détails">
          <i class="bi bi-three-dots"></i> Détails
        </button>
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
  
  // Bouton pour marquer comme terminé
  const doneButton = card.querySelector('.done-btn');
  doneButton.addEventListener('click', function(e) {
    e.stopPropagation();
    const taskIndex = parseInt(this.dataset.index);
    markAsDone(taskIndex);
  });
  
  // Bouton pour voir les détails
  const detailButton = card.querySelector('.btn-task-detail');
  detailButton.addEventListener('click', function(e) {
    e.stopPropagation();
    const taskIndex = parseInt(this.dataset.index);
    openTaskDetailModal(taskIndex);
  });
  
  // Ajouter un écouteur d'événement pour ouvrir la modale au clic sur la carte
  card.addEventListener('click', function(event) {
    // Ne pas ouvrir la modale si on clique sur un élément interactif
    if (event.target.tagName === 'SELECT' || 
        event.target.tagName === 'BUTTON' || 
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'I') {
      return;
    }
    const taskIndex = parseInt(this.dataset.index);
    openTaskDetailModal(taskIndex);
  });
}

// Marquer une tâche comme terminée
function markAsDone(index) {
  // S'assurer que l'index est un nombre
  index = parseInt(index, 10);
  
  // Vérifier que l'index est valide
  if (isNaN(index) || index < 0 || index >= tasks.length) {
    console.error("Index de tâche invalide:", index);
    return;
  }
  
  tasks[index].statut = "Terminée";
  saveTasks();
  renderTodayTasks();
}

// Éditer le titre d'une tâche
function editTitle(element, index) {
  // S'assurer que l'index est un nombre
  index = parseInt(index, 10);
  
  // Vérifier que l'index est valide
  if (isNaN(index) || index < 0 || index >= tasks.length) {
    console.error("Index de tâche invalide:", index);
    return;
  }
  
  const currentTitle = tasks[index].titre;
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentTitle;
  input.className = "edit-input";
  element.innerHTML = "";
  element.appendChild(input);
  input.focus();
  
  input.addEventListener("blur", () => {
    const newTitle = input.value.trim();
    if (newTitle && newTitle !== currentTitle) {
      tasks[index].titre = newTitle;
      saveTasks();
    }
    renderTodayTasks();
  });
  
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      input.blur();
    }
  });
}

// Éditer le tag d'une tâche
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
  input.value = currentTag;
  input.className = "edit-input";
  element.innerHTML = "";
  element.appendChild(input);
  input.focus();
  
  // Créer une datalist pour les suggestions de tags
  const datalistId = `tag-suggestions-${index}`;
  const datalist = document.createElement("datalist");
  datalist.id = datalistId;
  input.setAttribute("list", datalistId);
  element.appendChild(datalist);
  
  // Ajouter les suggestions de tags
  const uniqueTags = [...new Set(tasks.map(task => task.tag).filter(tag => tag))];
  uniqueTags.forEach(tag => {
    const option = document.createElement("option");
    option.value = tag;
    datalist.appendChild(option);
  });
  
  input.addEventListener("blur", () => {
    const newTag = input.value.trim();
    if (newTag !== currentTag) {
      tasks[index].tag = newTag;
      saveTasks();
    }
    renderTodayTasks();
  });
  
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      input.blur();
    }
  });
}

// Éditer la date limite d'une tâche
function editDeadline(element, index) {
  // S'assurer que l'index est un nombre
  index = parseInt(index, 10);
  
  // Vérifier que l'index est valide
  if (isNaN(index) || index < 0 || index >= tasks.length) {
    console.error("Index de tâche invalide:", index);
    return;
  }
  
  const currentDeadline = tasks[index].deadline || "";
  const input = document.createElement("input");
  input.type = "date";
  input.value = currentDeadline;
  input.className = "edit-input";
  element.innerHTML = "";
  element.appendChild(input);
  input.focus();
  
  input.addEventListener("blur", () => {
    const newDeadline = input.value;
    if (newDeadline !== currentDeadline) {
      tasks[index].deadline = newDeadline;
      saveTasks();
    }
    renderTodayTasks();
  });
  
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      input.blur();
    }
  });
}

// Ouvrir la modale de détails de tâche
function openTaskDetailModal(index) {
  // S'assurer que l'index est un nombre
  index = parseInt(index, 10);
  
  // Vérifier que l'index est valide
  if (isNaN(index) || index < 0 || index >= tasks.length) {
    console.error("Index de tâche invalide:", index);
    return;
  }
  
  const task = tasks[index];
  document.getElementById('modal-task-index').value = index;
  document.getElementById('modal-task-title').value = task.titre;
  
  // Réinitialiser TinyMCE avant de définir le contenu
  if (tinymce.get('modal-task-description')) {
    tinymce.get('modal-task-description').setContent(task.description || '');
  } else {
    document.getElementById('modal-task-description').value = task.description || '';
    // Réinitialiser TinyMCE si l'éditeur n'existe pas encore
    initTinyMCE();
  }
  
  document.getElementById('modal-task-tag').value = task.tag || '';
  document.getElementById('modal-task-deadline').value = task.deadline || '';
  document.getElementById('modal-task-statut').value = task.statut;
  
  updateModalTagSuggestions();
  
  // Ajouter les écouteurs d'événements pour les boutons de date rapide
  document.getElementById('btn-tomorrow').onclick = () => setQuickDeadline(1);
  document.getElementById('btn-day-after').onclick = () => setQuickDeadline(2);
  document.getElementById('btn-next-week').onclick = () => setQuickDeadlineNextWeek();
  
  const modal = new bootstrap.Modal(document.getElementById('taskDetailModal'));
  modal.show();
}

// Fonction pour définir rapidement une date limite à X jours dans le futur
function setQuickDeadline(daysToAdd) {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysToAdd);
  
  // Formater la date au format YYYY-MM-DD pour l'input date
  const formattedDate = targetDate.toISOString().split('T')[0];
  document.getElementById('modal-task-deadline').value = formattedDate;
}

// Fonction pour définir la date limite au lundi de la semaine prochaine
function setQuickDeadlineNextWeek() {
  const today = new Date();
  const targetDate = new Date(today);
  
  // Calculer le nombre de jours jusqu'au prochain lundi
  // Si on est lundi (1), on ajoute 7 jours
  // Si on est mardi (2), on ajoute 6 jours, etc.
  const currentDay = today.getDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
  const daysUntilNextMonday = currentDay === 0 ? 1 : (8 - currentDay);
  
  targetDate.setDate(today.getDate() + daysUntilNextMonday);
  
  // Formater la date au format YYYY-MM-DD pour l'input date
  const formattedDate = targetDate.toISOString().split('T')[0];
  document.getElementById('modal-task-deadline').value = formattedDate;
}

// Sauvegarder les détails d'une tâche depuis la modale
function saveTaskDetails() {
  const index = parseInt(document.getElementById('modal-task-index').value);
  const task = tasks[index];
  
  task.titre = document.getElementById('modal-task-title').value;
  task.tag = document.getElementById('modal-task-tag').value;
  task.deadline = document.getElementById('modal-task-deadline').value;
  task.statut = document.getElementById('modal-task-statut').value;
  
  // Récupérer le contenu de TinyMCE
  if (tinymce.get('modal-task-description')) {
    task.description = tinymce.get('modal-task-description').getContent();
  } else {
    task.description = document.getElementById('modal-task-description').value;
  }
  
  saveTasks();
  renderTodayTasks();
  
  // Fermer la modale
  const modalElement = document.getElementById('taskDetailModal');
  const modal = bootstrap.Modal.getInstance(modalElement);
  modal.hide();
}

// Mettre à jour les suggestions de tags pour la modale
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

// Définition de la fonction addTask
function addTask(event) {
  event.preventDefault();
  
  const titre = document.getElementById("task-title").value.trim();
  const tag = document.getElementById("task-tag").value.trim();
  const deadline = document.getElementById("task-deadline").value || new Date().toISOString().split('T')[0]; // Par défaut aujourd'hui
  const statut = document.getElementById("task-statut").value || "à faire";
  
  if (!titre) {
    alert("Le titre est obligatoire");
    return;
  }
  
  const nouvelleTache = {
    titre,
    tag,
    deadline,
    statut,
    description: "", // Ajout du champ description
    createdAt: new Date().toISOString()
  };
  
  tasks.push(nouvelleTache);
  saveTasks();
  document.getElementById("task-form").reset();
  // Réinitialiser le statut à "à faire"
  document.getElementById("task-statut").value = "à faire";
  renderTodayTasks();
}

// Initialisation de TinyMCE
function initTinyMCE() {
  tinymce.init({
    selector: '#modal-task-description',
    plugins: 'anchor autolink charmap codesample emoticons image link lists media searchreplace table visualblocks wordcount checklist mediaembed casechange export formatpainter pageembed linkchecker permanentpen powerpaste advtable advcode editimage advtemplate mentions tableofcontents footnotes mergetags autocorrect typography inlinecss',
    toolbar: 'undo redo | blocks | bold italic underline strikethrough | link image checklist numlist bullist | addcomment showcomments | align | indent outdent | emoticons charmap | removeformat',
    tinycomments_mode: 'embedded',
    tinycomments_author: 'Utilisateur',
    mergetags_list: [
      { value: 'First.Name', title: 'First Name' },
      { value: 'Email', title: 'Email' },
    ],
    height: 300,
    menubar: false
  });
}

// Initialisation
function init() {
  tasks = loadTasks();
  initTinyMCE();
  renderTodayTasks();
  
  // Ajouter les écouteurs d'événements
  form.addEventListener('submit', addTask);
  document.getElementById('view-mode-toggle').addEventListener('change', toggleViewMode);
  document.getElementById('save-task-details-btn').addEventListener('click', saveTaskDetails);
}

// Lancer l'initialisation quand le DOM est chargé
document.addEventListener('DOMContentLoaded', init);
