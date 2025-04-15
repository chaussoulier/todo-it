import { renderTaskCard, renderCompletedTaskCard } from './render-utils.js';
import { isToday, isTomorrow, isFuture, isLate } from './date-utils.js';

export function renderAllTasks(tasks) {
  const todayContainer = document.getElementById('today-column');
  const tomorrowContainer = document.getElementById('tomorrow-column');
  const futureColumns = [
    document.getElementById('future-column-1'),
    document.getElementById('future-column-2'),
    document.getElementById('future-column-3')
  ];
  const lateColumns = [
    document.getElementById('late-column-1'),
    document.getElementById('late-column-2'),
    document.getElementById('late-column-3')
  ];
  const completedContainer = document.getElementById('completed-tasks');

  // Nettoyage
  todayContainer.innerHTML = '';
  tomorrowContainer.innerHTML = '';
  futureColumns.forEach(col => col.innerHTML = '');
  lateColumns.forEach(col => col.innerHTML = '');
  completedContainer.innerHTML = '';

  let futureIndex = 0;
  let lateIndex = 0;

  tasks.forEach((task, index) => {
    if (task.statut === "Terminée") {
      renderCompletedTaskCard(task, index, completedContainer);
    } else if (isToday(task.deadline)) {
      renderTaskCard(task, index, todayContainer);
    } else if (isTomorrow(task.deadline)) {
      renderTaskCard(task, index, tomorrowContainer);
    } else if (isFuture(task.deadline)) {
      renderTaskCard(task, index, futureColumns[futureIndex % 3]);
      futureIndex++;
    } else if (isLate(task.deadline)) {
      renderTaskCard(task, index, lateColumns[lateIndex % 3]);
      lateIndex++;
    }
  });
}