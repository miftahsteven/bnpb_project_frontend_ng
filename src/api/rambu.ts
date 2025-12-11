import api from './axios';

export async function listRambu(params: Record<string, any> = {}) {
    const { data } = await api.get('/rambu-crud', { params });
    return data; // { total, data: [], ... }
}

export async function detailRambu(id: number | string) {
    const { data } = await api.get(`/rambu/${id}`);
    return data;
}