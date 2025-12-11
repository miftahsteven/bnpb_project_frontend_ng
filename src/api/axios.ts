import axios, { AxiosHeaders } from 'axios';

const API_BASE = 'http://localhost:8044';

const api = axios.create({
    baseURL: `${API_BASE}/api`,
    headers: { 'Content-Type': 'application/json' },
});

// sisipkan Authorization dari localStorage
api.interceptors.request.use((config) => {
    const raw = localStorage.getItem('auth');
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            const token = parsed?.token;
            if (token) {
                // Ensure headers is an AxiosHeaders instance and set Authorization
                config.headers = config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers);
                config.headers.set('Authorization', `Bearer ${token}`);
            }
        } catch { }
    }
    return config;
});

// tangani 401
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err?.response?.status === 401) {
            localStorage.removeItem('auth');
            // optional: redirect ke login
            // window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export default api;