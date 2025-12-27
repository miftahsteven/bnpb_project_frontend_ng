import { useEffect, useMemo, useRef, useState } from "react";
import api from '../api/axios';

/**
 * Hook untuk mengambil data provinsi untuk select box.
 * Cocok digunakan pada filter, form tambah, dan ubah rambu.
 *
 * Mengembalikan:
 * - provinces: array data mentah dari API
 * - options: array { value, label } untuk langsung dipakai di select
 * - loading: boolean indikator loading
 * - error: pesan error (string) jika gagal
 * - refresh: function untuk memuat ulang data
 */
export default function useProvinse() {
    const [provinces, setProvinces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const abortRef = useRef(null);

    const fetchProvinces = async () => {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setLoading(true);
        setError("");

        try {
            const res = await api.get('/locations/provinces', { signal: abortRef.current.signal });
            const data = res.data;

            // Normalisasi: pastikan array
            const list = Array.isArray(data) ? data : data?.data ?? [];
            setProvinces(list);
        } catch (err) {
            if (err.name !== "AbortError" && !axios.isCancel(err)) {
                setError(err.message || "Terjadi kesalahan saat memuat provinsi");
                setProvinces([]);
            }
        } finally {
            if (!abortRef.current?.signal.aborted) {
                 setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchProvinces();
        return () => {
            if (abortRef.current) abortRef.current.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const options = useMemo(() => {
        // Mencoba beberapa kemungkinan struktur field dari API
        return provinces.map((p) => {
            const id =
                p.id ??
                p.provinceId ??
                p.kode ??
                p.code ??
                p.value ??
                String(p?.name || p?.nama || p?.label || "");
            const name = p.name ?? p.nama ?? p.label ?? p.title ?? String(id);
            return { value: id, label: name };
        });
    }, [provinces]);

    return {
        provinces,
        options,
        loading,
        error,
        refresh: fetchProvinces,
    };
}