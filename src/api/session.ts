import store from '../store';
import { resetLayout } from '../store/layout/actions';

export function logout() {
    localStorage.removeItem('auth');
    store.dispatch(resetLayout());
    window.location.href = '/login';
}