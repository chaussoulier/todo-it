// task-data.js
export let tasks = [];

let resolveTasksLoaded;
export const tasksLoaded = new Promise((resolve) => {
  resolveTasksLoaded = resolve;
});

export function setTasks(newTasks) {
  tasks.splice(0, tasks.length, ...newTasks);
  resolveTasksLoaded();
}