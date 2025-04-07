// Service de notifications Web Push pour Todo It
import webPushConfig from './push-config.js';

// Variables pour stocker l'abonnement et l'u00e9tat d'initialisation
let pushSubscription = null;
let isPushInitialized = false;

// Fonction d'initialisation du service de notifications
async function initPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Les notifications push ne sont pas supportu00e9es par ce navigateur');
    return false;
  }
  
  if (isPushInitialized) return true;
  
  try {
    // Enregistrer le service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    console.log('Service Worker enregistru00e9:', registration);
    
    // Vu00e9rifier si un abonnement existe du00e9ju00e0
    pushSubscription = await registration.pushManager.getSubscription();
    
    if (!pushSubscription) {
      // Cru00e9er un nouvel abonnement
      pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(webPushConfig.publicKey)
      });
      
      console.log('Nouvel abonnement cru00e9u00e9:', pushSubscription);
      
      // Ici, vous devriez envoyer l'abonnement u00e0 votre serveur
      // saveSubscriptionToServer(pushSubscription);
    } else {
      console.log('Abonnement existant:', pushSubscription);
    }
    
    isPushInitialized = true;
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des notifications push:', error);
    return false;
  }
}

// Fonction pour convertir la clu00e9 publique en format acceptu00e9 par l'API Push
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Fonction pour envoyer une notification
async function sendNotification(title, options = {}) {
  if (!isPushInitialized) {
    const initialized = await initPushNotifications();
    if (!initialized) return false;
  }
  
  if (Notification.permission !== 'granted') {
    console.log('Permission de notification non accordu00e9e');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body: options.body || '',
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/favicon.ico',
      data: options.data || {},
      actions: options.actions || [],
      ...options
    });
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
    return false;
  }
}

// Fonction pour demander la permission d'envoyer des notifications
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Ce navigateur ne supporte pas les notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission === 'denied') {
    console.log('Permission de notification refusu00e9e');
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Erreur lors de la demande de permission:', error);
    return false;
  }
}

// Fonction pour du00e9sactiver les notifications
async function unsubscribeFromPushNotifications() {
  if (!pushSubscription) return true;
  
  try {
    const success = await pushSubscription.unsubscribe();
    if (success) {
      pushSubscription = null;
      isPushInitialized = false;
      console.log('Du00e9sabonnement ru00e9ussi');
      // Ici, vous devriez informer votre serveur de la du00e9sinscription
      // deleteSubscriptionFromServer(pushSubscription);
    }
    return success;
  } catch (error) {
    console.error('Erreur lors du du00e9sabonnement:', error);
    return false;
  }
}

// Exporter les fonctions
export {
  initPushNotifications,
  sendNotification,
  requestNotificationPermission,
  unsubscribeFromPushNotifications
};
