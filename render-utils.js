// render-utils.js

import { openTaskDetailModal } from './task-modal.js';

export function calculateImportanceScore(task) {
  let score = 0;
  if (task.importance === "!") score += 1;
  else if (task.importance === "!!") score += 2;
  else if (task.importance === "!!!") score += 3;

  if (task.statut === "À faire") score += 3;
  else if (task.statut === "À challenger") score += 2;
  else if (task.statut === "À lire") score += 1;
  return score;
}

export function formatDeadline(dateStr) {
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

export function stripHtmlKeepLineBreaks(html) {
  if (!html) return '';
  let text = html.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p><p>/gi, '\n\n');
  text = text.replace(/<p>/gi, '');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&amp;/g, '&')
             .replace(/&quot;/g, '"')
             .replace(/&#039;/g, '\'');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export function getTagClass(tag) {
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

export function renderTaskCard(task, index, container) {
  const card = document.createElement('div');
  const classStatut = task.statut.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, "");
  card.className = `task-card ${classStatut}`;
  card.dataset.taskIndex = index;
  // Ajouter l'ID de la tâche pour pouvoir la retrouver facilement
  card.dataset.taskId = task.id || `task_${index}`;

  if (!container) {
    console.warn('❌ Container manquant pour', task.titre);
    return;
  }

  const importanceScore = calculateImportanceScore(task);
  card.dataset.importance = importanceScore;

  let importanceStatut = "";
  if (task.statut === "À faire") importanceStatut = "!!!";
  else if (task.statut === "À lire") importanceStatut = "!";
  else if (task.statut === "À challenger") importanceStatut = "!!";

  const importance = task.importance || importanceStatut;
  const tagClass = task.tag ? getTagClass(task.tag) : '';

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

  // 🧠 Corrigé : rechercher l'index réel de la tâche dans le tableau global
  const titleEl = card.querySelector('.task-title');
  if (titleEl) {
    titleEl.addEventListener('click', () => {
      openTaskDetailModal(task.id);
    });
}

const doneBtn = card.querySelector('.done-btn');
if (doneBtn && typeof window.markAsDone === 'function') {
  doneBtn.addEventListener('click', () => {
    window.markAsDone(index);
  });
}

  container.appendChild(card);
}
export function addTaskToColumn(task, index, container, filterFn = () => true) {
  if (!task || !container || typeof filterFn !== 'function') return;

  if (filterFn(task)) {
    renderTaskCard(task, index, container);
  }
}

export function renderTaskLog(task) {
  const logContainer = document.getElementById('task-log-container');
  if (!logContainer) return;

  logContainer.innerHTML = '';

  if (!task.log || task.log.length === 0) {
    logContainer.innerHTML = '<div class="text-muted small">Aucune action enregistrée</div>';
    return;
  }

  task.log.slice().reverse().forEach(entry => {
    const logEntry = document.createElement('div');
    logEntry.className = 'task-log-entry';
    logEntry.textContent = entry;
    logContainer.appendChild(logEntry);
  });
}

export function renderCompletedTaskCard(task, index, completedTasks) {
  const col = document.createElement('div');
  col.className = 'col-md-3 mb-3';
  
  const card = document.createElement('div');
  card.className = 'task-card terminée';
  card.dataset.taskIndex = index;

  const tagClass = task.tag ? getTagClass(task.tag) : '';
  
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
  
  card.addEventListener('click', function () {
    openTaskDetailModal(index);
  });
}

export function renderSubtasks(task, container, index) {
  if (!container) {
    console.warn(`⚠️ Container manquant pour les sous-tâches de "${task.titre}"`);
    return;
  }

  container.innerHTML = '';

  if (!task.etapes || task.etapes.length === 0) return;

  task.etapes.forEach((etape, subIndex) => {
    const subtaskDiv = document.createElement('div');
    subtaskDiv.className = 'input-group mb-2';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'form-check-input me-2';
    checkbox.checked = etape.faite;
    checkbox.dataset.taskIndex = index;
    checkbox.dataset.subtaskIndex = subIndex;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control';
    input.value = etape.texte || '';
    input.placeholder = 'Étape...';
    input.dataset.taskIndex = index;
    input.dataset.subtaskIndex = subIndex;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-outline-danger';
    removeBtn.innerHTML = '<i class="bi bi-trash"></i>';
    removeBtn.type = 'button';
    removeBtn.dataset.taskIndex = index;
    removeBtn.dataset.subtaskIndex = subIndex;

    subtaskDiv.appendChild(checkbox);
    subtaskDiv.appendChild(input);
    subtaskDiv.appendChild(removeBtn);

    container.appendChild(subtaskDiv);
  });
}