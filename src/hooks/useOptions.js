import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../lib/env';

// Util fetch dengan abort
async function fetchJSON(url, signal) {
    const res = await fetch(url, { signal, headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// Normalisasi opsi: { value, label }
function toOptions(list, idKeyCandidates = ['id', 'code', 'value'], labelKeyCandidates = ['name', 'nama', 'label']) {
    return (Array.isArray(list) ? list : []).map((item) => {
        const idKey = idKeyCandidates.find((k) => item?.[k] !== undefined);
        const labelKey = labelKeyCandidates.find((k) => item?.[k] !== undefined);
        const value = item?.[idKey] ?? String(item?.[labelKey] ?? '');
        const label = item?.[labelKey] ?? String(item?.[idKey] ?? value);
        return { value: Number(value) || String(value), label };
    });
}

function useRefOptions(endpoint) {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        const ac = new AbortController();
        setLoading(true);
        setError(null);
        (async () => {
            try {
                const data = await fetchJSON(apiUrl(endpoint), ac.signal);
                setOptions(toOptions(data));
            } catch (e) {
                if (ac.signal.aborted) return;
                setError(e.message || 'Gagal memuat data');
                setOptions([]);
            } finally {
                if (!ac.signal.aborted) setLoading(false);
            }
        })();
        return () => ac.abort();
    }, [endpoint]);
    return { options, loading, error };
}

export function useOptions({ provId, cityId, districtId }) {
    const [provOptions, setProvOptions] = useState([]);
    const [cityOptions, setCityOptions] = useState([]);
    const [districtOptions, setDistrictOptions] = useState([]);
    const [subdistrictOptions, setSubdistrictOptions] = useState([]);

    const [loading, setLoading] = useState({ prov: false, city: false, dist: false, subdist: false });
    const [error, setError] = useState({ prov: null, city: null, dist: null, subdist: null });

    const abortRef = useRef({ prov: null, city: null, dist: null, subdist: null });

    // Provinsi
    useEffect(() => {
        const ac = new AbortController();
        abortRef.current.prov?.abort();
        abortRef.current.prov = ac;
        setLoading((s) => ({ ...s, prov: true }));
        setError((s) => ({ ...s, prov: null }));
        (async () => {
            try {
                const data = await fetchJSON(apiUrl('locations/provinces'), ac.signal);
                setProvOptions(toOptions(data, ['id', 'provinceId', 'kode', 'code'], ['name', 'nama', 'label']));
            } catch (e) {
                if (ac.signal.aborted) return;
                setError((s) => ({ ...s, prov: e.message }));
                setProvOptions([]);
            } finally {
                if (!ac.signal.aborted) setLoading((s) => ({ ...s, prov: false }));
            }
        })();
        return () => ac.abort();
    }, []);

    // Kota
    useEffect(() => {
        setCityOptions([]);
        if (!provId) return;
        const ac = new AbortController();
        abortRef.current.city?.abort();
        abortRef.current.city = ac;
        setLoading((s) => ({ ...s, city: true }));
        setError((s) => ({ ...s, city: null }));
        (async () => {
            try {
                const data = await fetchJSON(apiUrl(`locations/cities?prov_id=${provId}`), ac.signal);
                setCityOptions(toOptions(data, ['id', 'cityId', 'code', 'kode'], ['name', 'nama', 'label']));
            } catch (e) {
                if (ac.signal.aborted) return;
                setError((s) => ({ ...s, city: e.message }));
                setCityOptions([]);
            } finally {
                if (!ac.signal.aborted) setLoading((s) => ({ ...s, city: false }));
            }
        })();
        return () => ac.abort();
    }, [provId]);

    // Kecamatan
    useEffect(() => {
        setDistrictOptions([]);
        if (!cityId) return;
        const ac = new AbortController();
        abortRef.current.dist?.abort();
        abortRef.current.dist = ac;
        setLoading((s) => ({ ...s, dist: true }));
        setError((s) => ({ ...s, dist: null }));
        (async () => {
            try {
                const data = await fetchJSON(apiUrl(`locations/districts?city_id=${cityId}`), ac.signal);
                setDistrictOptions(toOptions(data, ['id', 'districtId', 'code', 'kode'], ['name', 'nama', 'label']));
            } catch (e) {
                if (ac.signal.aborted) return;
                setError((s) => ({ ...s, dist: e.message }));
                setDistrictOptions([]);
            } finally {
                if (!ac.signal.aborted) setLoading((s) => ({ ...s, dist: false }));
            }
        })();
        return () => ac.abort();
    }, [cityId]);

    // Kelurahan
    useEffect(() => {
        setSubdistrictOptions([]);
        if (!districtId) return;
        const ac = new AbortController();
        abortRef.current.subdist?.abort();
        abortRef.current.subdist = ac;
        setLoading((s) => ({ ...s, subdist: true }));
        setError((s) => ({ ...s, subdist: null }));
        (async () => {
            try {
                const data = await fetchJSON(apiUrl(`locations/subdistricts?district_id=${districtId}`), ac.signal);
                setSubdistrictOptions(toOptions(data, ['id', 'subdistrictId', 'code', 'kode'], ['name', 'nama', 'label']));
            } catch (e) {
                if (ac.signal.aborted) return;
                setError((s) => ({ ...s, subdist: e.message }));
                setSubdistrictOptions([]);
            } finally {
                if (!ac.signal.aborted) setLoading((s) => ({ ...s, subdist: false }));
            }
        })();
        return () => ac.abort();
    }, [districtId]);

    return {
        provOptions,
        cityOptions,
        districtOptions,
        subdistrictOptions,
        loading,
        error,
    };
}

// Hooks kategori, model, costsource, disaster types, satuan kerja
export function useCategories() {
    return useRefOptions('ref/categories');
}
export function useDisasterTypes() {
    return useRefOptions('ref/disaster-types');
}
export function useModels() {
    return useRefOptions('ref/model');
}
export function useCostSources() {
    return useRefOptions('ref/costsource');
}
export function useSatuanKerja() {
    return useRefOptions('users/satuan-kerja');
}