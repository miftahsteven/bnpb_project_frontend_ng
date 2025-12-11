import api from './axios';

export type LoginPayload = { username: string; password: string };
export type LoginResponse = {
    token: string;
    user: { id: number; username: string; role?: number; satker_id?: number };
};

export async function login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/users/login', payload);
    return data;
}

export async function logout() {
    const { data } = await api.post('/users/logout');
    return data;
}

export async function me() {
    const { data } = await api.get('/users/me');
    return data;
}