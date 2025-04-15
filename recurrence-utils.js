// recurrence-utils.js

export function loadRecurrenceSettings(recurrence) {
    const checkbox = document.getElementById('enable-recurrence');
    const typeSelect = document.getElementById('recurrence-type');
    const interval = document.getElementById('recurrence-interval');
    const endType = document.getElementById('recurrence-end-type');
  
    if (!recurrence || !recurrence.enabled) {
      checkbox.checked = false;
      document.getElementById('recurrence-options').style.display = 'none';
      return;
    }
  
    checkbox.checked = true;
    document.getElementById('recurrence-options').style.display = 'block';
  
    typeSelect.value = recurrence.type || 'daily';
    interval.value = recurrence.interval || 1;
    endType.value = recurrence.endType || 'never';
  
    // Tu peux ajouter ici d’autres champs selon ta logique
  }
  
  export function initRecurrenceOptions() {
    const checkbox = document.getElementById('enable-recurrence');
    const options = document.getElementById('recurrence-options');
  
    checkbox.addEventListener('change', () => {
      options.style.display = checkbox.checked ? 'block' : 'none';
    });
  }