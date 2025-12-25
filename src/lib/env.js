export const API_BASE = (import.meta.env && import.meta.env.VITE_APP_DATABASEURL) || 'http://localhost:8044/api';

export function apiUrl(path) {
    const base = API_BASE.replace(/\/+$/g, '');
    const p = String(path).replace(/^\/+/g, '');
    return `${base}/${p}`;
}