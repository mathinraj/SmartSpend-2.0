export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function getAccountIcon(type) {
  const icons = {
    bank: '🏦',
    card: '💳',
    cash: '💵',
    wallet: '👛',
  };
  return icons[type] || '💰';
}

export function getAccountColor(type) {
  const colors = {
    bank: '#0984E3',
    card: '#6C5CE7',
    cash: '#00B894',
    wallet: '#E17055',
  };
  return colors[type] || '#636E72';
}

export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateShort(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function toDateInputValue(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
