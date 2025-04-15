import { tasks } from './task-data.js';
import { initTinyMCE } from './editor-utils.js';
import { renderTaskLog, renderSubtasks } from './render-utils.js';
import { updateModalTagSuggestions, setQuickDeadline, setQuickDeadlineNextWeek } from './form-utils.js';
import { loadRecurrenceSettings, initRecurrenceOptions } from './recurrence-utils.js';

let currentEditingTaskIndex = null;

export function openTaskDetailModal(taskId) {
  const index = tasks.findIndex(t => t.id === taskId);
  if (index === -1) {
    console.error("❌ Tâche introuvable avec l'ID :", taskId);
    return;
  }

  currentEditingTaskIndex = index;
  const task = tasks[index];

  document.getElementById('modal-task-index').value = index;
  document.getElementById('modal-task-title').value = task.titre;
  document.getElementById('modal-task-tag').value = task.tag || '';
  document.getElementById('modal-task-deadline').value = task.deadline || '';
  document.getElementById('modal-task-statut').value = task.statut;
  document.getElementById('modal-task-importance').value = task.importance || '!';

  const descriptionField = document.getElementById('modal-task-description');

if (window.tinymce) {
  // Supprimer l'ancien éditeur s’il existe
  if (tinymce.get('modal-task-description')) {
    tinymce.get('modal-task-description').remove();
  }

  // Réinitialiser manuellement le champ (au cas où init échoue)
  descriptionField.value = '';
  descriptionField.classList.remove('description-placeholder');

  // Initialiser TinyMCE avec le contenu à jour
  initTinyMCE(task);
} else {
  // Fallback si TinyMCE n’est pas chargé
  descriptionField.value = task.description || '';
  descriptionField.classList.toggle('description-placeholder', !task.description);
}

  // Log + sous-tâches + récurrence
  renderTaskLog(task);
  renderSubtasks(task, document.getElementById('subtasks-container'), index);
  loadRecurrenceSettings(task.recurrence);
  updateModalTagSuggestions();
  initRecurrenceOptions();

  // Boutons de date rapide
  document.getElementById('btn-tomorrow').onclick = () => setQuickDeadline(1);
  document.getElementById('btn-day-after').onclick = () => setQuickDeadline(2);
  document.getElementById('btn-next-week').onclick = () => setQuickDeadlineNextWeek();

  // Afficher la modale
const modalEl = document.getElementById('taskDetailModal');
const modal = new bootstrap.Modal(modalEl);
modal.show();

// Corriger aria-hidden bloquant le focus
modalEl.setAttribute('aria-hidden', 'false');

}