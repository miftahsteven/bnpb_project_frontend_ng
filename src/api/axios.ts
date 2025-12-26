import axios, { AxiosHeaders } from 'axios';

//buatkan API BASE ke VITE_APP_DATABASEURL di .env
const baseURL = import.meta.env.VITE_APP_DATABASEURL || 'http://localhost:8044/api';

const api = axios.create({
    baseURL,
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