import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../lib/env';

export function useProvinceGeom(provId, dep) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const abortRef = useRef(null);

    useEffect(() => {
        setData(null);
        setError(null);

        if (!provId) return;

        const ac = new AbortController();
        abortRef.current?.abort();
        abortRef.current = ac;

        (async () => {
            try {
                setLoading(true);
                const url = apiUrl(`locations/province-geojson?prov_id=${provId}`);
                const res = await fetch(url, { signal: ac.signal, headers: { 'cache-control': 'no-cache' } });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const text = await res.text();
                let json;
                try { json = JSON.parse(text); } catch { json = text; }
                if (!ac.signal.aborted) setData(json);
            } catch (err) {
                if (!ac.signal.aborted) setError(String(err?.message || err));
            } finally {
                if (!ac.signal.aborted) setLoading(false);
            }
        })();

        return () => ac.abort();
    }, [provId, dep]);

    return { data, loading, error };
}