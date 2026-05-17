// toast.js — lightweight toast notification system

function createToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.2s ease forwards';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

export const toast = {
  success: (msg) => createToast(msg, 'success'),
  error:   (msg) => createToast(msg, 'error'),
  info:    (msg) => createToast(msg, 'info'),
};
