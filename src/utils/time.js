function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return null;
}

export function timeAgo(value) {
  const date = parseDate(value);
  if (!date) return '';
  const diff = Date.now() - date.getTime();
  if (diff < 0) return 'just now';
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function fullTimestamp(value) {
  const date = parseDate(value);
  if (!date) return '';
  return date.toLocaleString();
}
