// form-utils.js

import { tasks } from './task-data.js';

export function setQuickDeadline(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const formatted = date.toISOString().split('T')[0];
    document.getElementById('modal-task-deadline').value = formatted;
  }
  
  export function setQuickDeadlineNextWeek() {
    setQuickDeadline(7);
  }

  export function updateModalTagSuggestions() {
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