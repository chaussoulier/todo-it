// Variables globales
let tasks = [];
let isDetailedView = false;
const form = document.getElementById('task-form');
const lateColumn = document.getElementById('late-column');
const modal = new bootstrap.Modal(document.getElementById('taskDetailModal'));

// Charger les tâches depuis le localStorage
function loadTasks() {
  const savedTasks = localStorage.getItem('tasks');
  return savedTasks ? JSON.parse(savedTasks) : [];
}

// Sauvegarder les tâches dans le localStorage
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Formater une date au format DD/MM/YYYY
function formatDate(dateString) {
  if (!dateString) return "Sans date";
  
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Obtenir la classe CSS pour un tag spécifique
function getTagClass(tag) {
  if (!tag) return "";
  
  // Définir des classes spécifiques pour certains tags
  const tagClasses = {
    'test': 'illustration',
    'ems': 'design',
    'perso': 'code',
    'travail': 'marketing',
    'urgent': 'data',
    'idée': 'product',
    'lecture': 'content'
  };
  
  // Normaliser le tag (minuscules, sans accents)
  const normalizedTag = tag.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Retourner la classe correspondante ou une classe par défaut
  return tagClasses[normalizedTag] || "default-tag";
}

// Vérifier si une date est dépassée
function isDatePassed(dateString) {
  if (!dateString) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const taskDate = new Date(dateString);
  taskDate.setHours(0, 0, 0, 0);
  
  return taskDate < today;
}

// Afficher uniquement les tâches en retard
function renderLateTasks() {
  // Vider la colonne
  lateColumn.innerHTML = "";
  
  // Obtenir la date d'aujourd'hui
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Filtrer pour n'obtenir que les tâches en retard qui ne sont pas terminées
  const lateTasks = [];
  
  tasks.forEach((task, index) => {
    if (task.statut === "Terminée") {
      return;
    }
    
    if (!task.deadline) {
      return;
    }
    
    const taskDate = new Date(task.deadline);
    taskDate.setHours(0, 0, 0, 0);
    
    // Inclure seulement les tâches qui sont en retard
    if (taskDate < today) {
      lateTasks.push({task, index});
    }
  });
  
  // Vérifier s'il y a des tâches en retard
  if (lateTasks.length === 0) {
    // Aucune tâche en retard, afficher le message
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-tasks-message';
    emptyMessage.innerHTML = '<div class="text-center p-5">Prenons un café ☕</div>';
    lateColumn.appendChild(emptyMessage);
    return;
  }
  
  // Trier les tâches par date (les plus anciennes d'abord)
  lateTasks.sort((a, b) => {
    const dateA = new Date(a.task.deadline);
    const dateB = new Date(b.task.deadline);
    return dateA - dateB;
  });
  
  // Rendre les tâches dans la colonne
  lateTasks.forEach(({task, index}) => {
    renderTaskCard(task, index, lateColumn);
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
  
  const tagClass = getTagClass(task.tag);
  
  card.innerHTML = `
    <div class="task-header">
      <div class="task-tag ${tagClass}">${task.tag || 'Sans tag'}</div>
      <div class="task-statut">${task.statut} ${importance}</div>
    </div>
    <div class="task-title">${task.titre}</div>
    <div class="task-description ${isDetailedView ? '' : 'hidden'}">
      <div class="task-description-content">${task.description || ''}</div>
    </div>
    <div class="task-footer">
      <div class="task-deadline ${isDatePassed(task.deadline) ? 'text-danger' : ''}">
        ${formatDate(task.deadline)}
      </div>
      <div class="task-actions d-flex">
      <div>
        <button class="btn btn-success btn-sm done-btn" data-index="${index}">Terminer</button>
      </div>
      <div>
        <button class="btn-task-detail btn btn-outline-secondary btn-sm" data-index="${index}" title="Voir détails">
          <i class="bi bi-three-dots"></i> Détails
        </button>
      </div>
    </div>
    </div>
  `;
  
  container.appendChild(card);
  
  // Ajouter les écouteurs d'événements pour l'édition
  const titleElement = card.querySelector('.task-title');
  titleElement.addEventListener('dblclick', function(e) {
    e.stopPropagation();
    const taskIndex = this.closest('.task-card').dataset.index;
    editTitle(this, taskIndex);
  });
  
  const tagElement = card.querySelector('.task-tag');
  tagElement.addEventListener('dblclick', function(e) {
    e.stopPropagation();
    const taskIndex = this.closest('.task-card').dataset.index;
    editTag(this, taskIndex);
  });
  
  const deadlineElement = card.querySelector('.task-deadline');
  deadlineElement.addEventListener('dblclick', function(e) {
    e.stopPropagation();
    const taskIndex = this.closest('.task-card').dataset.index;
    editDeadline(this, taskIndex);
  });
  
  // Bouton pour marquer comme terminé
  const doneButton = card.querySelector('.done-btn');
  doneButton.addEventListener('click', function(e) {
    e.stopPropagation();
    const taskIndex = this.dataset.index;
    markAsDone(taskIndex);
  });
  
  // Bouton pour voir les détails
  const detailButton = card.querySelector('.btn-task-detail');
  detailButton.addEventListener('click', function(e) {
    e.stopPropagation();
    const taskIndex = this.dataset.index;
    openTaskDetailModal(taskIndex);
  });
  
  // Ajouter un écouteur d'événement pour ouvrir la modale au clic sur la carte
  card.addEventListener('click', function(event) {
    // Ne pas ouvrir la modale si on clique sur un élément interactif
    if (event.target.tagName === 'SELECT' || 
        event.target.tagName === 'BUTTON' || 
        event.target.tagName === 'INPUT' ||
        event.target.closest('button')) {
      return;
    }
    openTaskDetailModal(this.dataset.index);
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
  renderLateTasks();
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
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentTitle;
  input.className = "edit-input";
  
  // Vider l'élément et ajouter l'input
  element.textContent = "";
  element.appendChild(input);
  input.focus();
  input.select();
  
  input.addEventListener('blur', function() {
    const newTitle = this.value.trim();
    if (newTitle !== "") {
      tasks[index].titre = newTitle;
      saveTasks();
    }
    renderLateTasks();
  });
  
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      this.blur();
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
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentTag;
  input.className = "edit-input";
  input.setAttribute("list", "tag-suggestions");
  
  // Vider l'élément et ajouter l'input
  element.textContent = "";
  element.appendChild(input);
  input.focus();
  input.select();
  
  // Mettre à jour les suggestions de tags
  const datalist = document.getElementById("tag-suggestions");
  datalist.innerHTML = "";
  
  // Collecter tous les tags uniques
  const uniqueTags = new Set();
  tasks.forEach(task => {
    if (task.tag) uniqueTags.add(task.tag);
  });
  
  // Ajouter les options de tag
  uniqueTags.forEach(tag => {
    const option = document.createElement('option');
    option.value = tag;
    datalist.appendChild(option);
  });
  
  input.addEventListener('blur', function() {
    const newTag = this.value.trim();
    tasks[index].tag = newTag === "" ? null : newTag;
    saveTasks();
    renderLateTasks();
  });
  
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      this.blur();
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
  const input = document.createElement('input');
  input.type = 'date';
  input.value = currentDeadline;
  input.className = "edit-input";
  
  // Vider l'élément et ajouter l'input
  element.textContent = "";
  element.appendChild(input);
  input.focus();
  
  input.addEventListener('blur', function() {
    const newDeadline = this.value;
    tasks[index].deadline = newDeadline;
    saveTasks();
    renderLateTasks();
  });
  
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      this.blur();
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
    // Réinitialiser TinyMCE si l'éditeur n'existe pas encore
    initTinyMCE();
  }
  
  document.getElementById('modal-task-tag').value = task.tag || '';
  document.getElementById('modal-task-statut').value = task.statut;
  document.getElementById('modal-task-deadline').value = task.deadline || '';
  
  updateModalTagSuggestions();
  
  // Ajouter les écouteurs d'événements pour les boutons de date rapide
  document.getElementById('btn-tomorrow').onclick = () => setQuickDeadline(1);
  document.getElementById('btn-day-after').onclick = () => setQuickDeadline(2);
  document.getElementById('btn-next-week').onclick = () => setQuickDeadlineNextWeek();
  
  modal.show();
}

// Fonction pour définir rapidement une date limite à X jours dans le futur
function setQuickDeadline(daysToAdd) {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysToAdd);
  
  const formattedDate = targetDate.toISOString().split('T')[0];
  document.getElementById('modal-task-deadline').value = formattedDate;
}

// Fonction pour définir la date limite au lundi de la semaine prochaine
function setQuickDeadlineNextWeek() {
  const today = new Date();
  const targetDate = new Date(today);
  
  // Calculer le nombre de jours jusqu'au prochain lundi
  const dayOfWeek = today.getDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
  let daysUntilMonday = 1 - dayOfWeek; // Si aujourd'hui est lundi (1), on ajoute 7 jours
  
  if (daysUntilMonday <= 0) {
    daysUntilMonday += 7; // Ajouter une semaine si on est déjà lundi ou après
  }
  
  targetDate.setDate(today.getDate() + daysUntilMonday);
  
  const formattedDate = targetDate.toISOString().split('T')[0];
  document.getElementById('modal-task-deadline').value = formattedDate;
}

// Sauvegarder les détails d'une tâche depuis la modale
function saveTaskDetails() {
  const index = parseInt(document.getElementById('modal-task-index').value);
  const task = tasks[index];
  
  task.titre = document.getElementById('modal-task-title').value;
  task.tag = document.getElementById('modal-task-tag').value || null;
  task.deadline = document.getElementById('modal-task-deadline').value;
  task.statut = document.getElementById('modal-task-statut').value;
  
  // Récupérer le contenu de TinyMCE
  if (tinymce.get('modal-task-description')) {
    task.description = tinymce.get('modal-task-description').getContent();
  } else {
    task.description = document.getElementById('modal-task-description').value;
  }
  
  saveTasks();
  renderLateTasks();
  
  modal.hide();
}

// Mettre à jour les suggestions de tags pour la modale
function updateModalTagSuggestions() {
  const datalist = document.getElementById("tag-suggestions-modal");
  datalist.innerHTML = "";
  
  // Collecter tous les tags uniques
  const uniqueTags = new Set();
  tasks.forEach(task => {
    if (task.tag) uniqueTags.add(task.tag);
  });
  
  // Ajouter les options de tag
  uniqueTags.forEach(tag => {
    const option = document.createElement('option');
    option.value = tag;
    datalist.appendChild(option);
  });
}

// Mettre à jour la visibilité des descriptions de tâches
function updateTaskDescriptionVisibility() {
  const descriptions = document.querySelectorAll('.task-description-content');
  
  descriptions.forEach(desc => {
    const descContainer = desc.closest('.task-description');
    descContainer.classList.toggle('hidden', !isDetailedView);
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
  
  const title = document.getElementById('task-title').value;
  const tag = document.getElementById('task-tag').value;
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
  renderLateTasks();
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
  
  renderLateTasks();
  
  // Ajouter les écouteurs d'événements
  form.addEventListener('submit', addTask);
  document.getElementById('view-mode-toggle').addEventListener('change', toggleViewMode);
  document.getElementById('save-task-details-btn').addEventListener('click', saveTaskDetails);
}

// Lancer l'initialisation quand le DOM est chargé
document.addEventListener('DOMContentLoaded', init);
