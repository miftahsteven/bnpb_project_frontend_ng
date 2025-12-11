export function logout() {
    localStorage.removeItem('auth');
    window.location.href = '/login';
}