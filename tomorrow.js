const form = document.getElementById('task-form');
const tomorrowColumn = document.getElementById('tomorrow-column');
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

// Afficher uniquement les tâches de demain
function renderTomorrowTasks() {
  // Vider la colonne
  tomorrowColumn.innerHTML = "";
  
  // Obtenir la date d'aujourd'hui et de demain
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Filtrer pour n'obtenir que les tâches de demain qui ne sont pas terminées
  const tomorrowTasks = [];
  
  tasks.forEach((task, index) => {
    if (task.statut === "Terminée") {
      return;
    }
    
    const taskDate = task.deadline ? new Date(task.deadline) : null;
    if (taskDate) {
      taskDate.setHours(0, 0, 0, 0);
      
      if (taskDate.getTime() === tomorrow.getTime()) {
        tomorrowTasks.push({task, index});
      }
    }
  });
  
  // Vérifier s'il y a des tâches pour demain
  if (tomorrowTasks.length === 0) {
    // Aucune tâche pour demain, afficher le message
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-tasks-message';
    emptyMessage.innerHTML = '<div class="text-center p-5">Prenons un café ☕️</div>';
    tomorrowColumn.appendChild(emptyMessage);
    return;
  }
  
  // Rendre les tâches dans la colonne
  tomorrowTasks.forEach(({task, index}) => {
    renderTaskCard(task, index, tomorrowColumn);
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
  
  if (isNaN(index) || index < 0 || index >= tasks.length) {
    console.error("Index de tâche invalide:", index);
    return;
  }
  
  tasks[index].statut = "Terminée";
  saveTasks();
  renderTomorrowTasks();
}

// Éditer le titre d'une tâche
function editTitle(element, index) {
  // S'assurer que l'index est un nombre
  index = parseInt(index, 10);
  
  if (isNaN(index) || index < 0 || index >= tasks.length) {
    console.error("Index de tâche invalide:", index);
    return;
  }
  
  const currentTitle = tasks[index].titre;
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentTitle;
  input.className = "edit-input";
  
  // Vider l'élément et ajouter l'input
  element.textContent = "";
  element.appendChild(input);
  input.focus();
  
  input.addEventListener("blur", () => {
    const newTitle = input.value.trim();
    if (newTitle !== "" && newTitle !== currentTitle) {
      tasks[index].titre = newTitle;
      saveTasks();
    }
    renderTomorrowTasks();
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
  
  if (isNaN(index) || index < 0 || index >= tasks.length) {
    console.error("Index de tâche invalide:", index);
    return;
  }
  
  const currentTag = tasks[index].tag || "";
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentTag;
  input.className = "edit-input";
  input.setAttribute("list", "tag-suggestions");
  
  // Vider l'élément et ajouter l'input
  element.textContent = "";
  element.appendChild(input);
  input.focus();
  
  // Mettre à jour les suggestions de tags
  const datalist = document.getElementById("tag-suggestions");
  datalist.innerHTML = "";
  
  // Collecter tous les tags uniques
  const uniqueTags = [...new Set(tasks.map(task => task.tag).filter(Boolean))];
  
  // Ajouter chaque tag comme option
  uniqueTags.forEach(tag => {
    const option = document.createElement("option");
    option.value = tag;
    datalist.appendChild(option);
  });
  
  input.addEventListener("blur", () => {
    const newTag = input.value.trim();
    if (newTag !== currentTag) {
      tasks[index].tag = newTag === "" ? null : newTag;
      saveTasks();
    }
    renderTomorrowTasks();
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
  
  if (isNaN(index) || index < 0 || index >= tasks.length) {
    console.error("Index de tâche invalide:", index);
    return;
  }
  
  const currentDeadline = tasks[index].deadline || "";
  const input = document.createElement("input");
  input.type = "date";
  input.value = currentDeadline;
  input.className = "edit-input";
  
  // Vider l'élément et ajouter l'input
  element.textContent = "";
  element.appendChild(input);
  input.focus();
  
  input.addEventListener("blur", () => {
    const newDeadline = input.value;
    if (newDeadline !== currentDeadline) {
      tasks[index].deadline = newDeadline;
      saveTasks();
    }
    renderTomorrowTasks();
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
  renderTomorrowTasks();
  
  // Fermer la modale
  const modal = bootstrap.Modal.getInstance(document.getElementById('taskDetailModal'));
  modal.hide();
}

// Mettre à jour les suggestions de tags pour la modale
function updateModalTagSuggestions() {
  const datalist = document.getElementById("tag-suggestions-modal");
  datalist.innerHTML = "";
  
  // Collecter tous les tags uniques
  const uniqueTags = [...new Set(tasks.map(task => task.tag).filter(Boolean))];
  
  // Ajouter chaque tag comme option
  uniqueTags.forEach(tag => {
    const option = document.createElement("option");
    option.value = tag;
    datalist.appendChild(option);
  });
}

// Mettre à jour la visibilité des descriptions de tâches
function updateTaskDescriptionVisibility() {
  const descriptions = document.querySelectorAll('.task-description-content');
  
  descriptions.forEach(desc => {
    if (isDetailedView) {
      desc.style.display = 'block';
    } else {
      desc.style.display = 'none';
    }
  });
}

// Fonction pour basculer entre la vue détaillée et la vue simple
function toggleViewMode() {
  isDetailedView = !isDetailedView;
  
  // Mettre à jour le texte du label
  const label = document.querySelector('label[for="view-mode-toggle"]');
  if (label) {
    label.textContent = isDetailedView ? "Vue détaillée" : "Vue simple";
  }
  
  // Mettre à jour la visibilité des descriptions
  updateTaskDescriptionVisibility();
  
  // Sauvegarder la préférence de l'utilisateur
  localStorage.setItem('isDetailedView', isDetailedView);
}

// Définition de la fonction addTask
function addTask(event) {
  event.preventDefault();
  
  const title = document.getElementById('task-title').value.trim();
  const tag = document.getElementById('task-tag').value.trim();
  const statut = document.getElementById('task-statut').value;
  const deadline = document.getElementById('task-deadline').value;
  
  if (title === "") {
    alert("Veuillez saisir un titre pour la tâche.");
    return;
  }
  
  const newTask = {
    titre: title,
    tag: tag === "" ? null : tag,
    statut: statut,
    deadline: deadline,
    description: ""
  };
  
  tasks.push(newTask);
  saveTasks();
  
  // Réinitialiser le formulaire
  document.getElementById('task-title').value = "";
  document.getElementById('task-tag').value = "";
  
  // Mettre à jour l'affichage
  renderTomorrowTasks();
}

// Initialisation de TinyMCE
function initTinyMCE() {
  tinymce.init({
    selector: '#modal-task-description',
    height: 300,
    menubar: false,
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'help', 'wordcount'
    ],
    toolbar: 'undo redo | formatselect | ' +
    'bold italic backcolor | alignleft aligncenter ' +
    'alignright alignjustify | bullist numlist outdent indent | ' +
    'removeformat | help',
    content_style: 'body { font-family:Inter,Arial,sans-serif; font-size:14px }'
  });
}

// Initialisation
function init() {
  tasks = loadTasks();
  
  // Charger la préférence de vue détaillée/simple
  const savedViewMode = localStorage.getItem('isDetailedView');
  if (savedViewMode !== null) {
    isDetailedView = savedViewMode === 'true';
    document.getElementById('view-mode-toggle').checked = isDetailedView;
  }
  
  renderTomorrowTasks();
  
  // Ajouter les écouteurs d'événements
  form.addEventListener('submit', addTask);
  document.getElementById('view-mode-toggle').addEventListener('change', toggleViewMode);
  document.getElementById('save-task-details-btn').addEventListener('click', saveTaskDetails);
}

// Lancer l'initialisation quand le DOM est chargé
document.addEventListener('DOMContentLoaded', init);