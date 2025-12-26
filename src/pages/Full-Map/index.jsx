import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import 'maplibre-gl/dist/maplibre-gl.css';
import { useDispatch } from 'react-redux';
import { CHANGE_LAYOUT_WIDTH, SHOW_RIGHT_SIDEBAR } from '../../store/layout/actionTypes';
import { layoutWidthTypes } from '../../constants/layout';
import { apiUrl } from '../../lib/env';
import { useProvinceGeom } from '../../hooks/useProvinceGeom';
import useProvinse from '../../hooks/useProvinse';
import { useOptions, useCategories, useDisasterTypes, useModels, useCostSources, useSatuanKerja } from '../../hooks/useOptions';
import { set } from "lodash";


const MAPTILER_KEY = import.meta.env.VITE_APP_API_MAPTILER;
const styleUrl = `https://api.maptiler.com/maps/streets-v4/style.json?key=${MAPTILER_KEY}`;
const fallbackStyle = "https://demotiles.maplibre.org/style.json";

const FilterIcon = ({ size = 18, color = "#334155" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polygon points="3 4 21 4 14 12.46 14 19 10 21 10 12.46 3 4" />
    </svg>
);

function showImageFromBackend(imagePath) {
    if (!imagePath) return null;
    const baseUrl = apiUrl(''); // Ambil base URL dari env
    return `${baseUrl}/${imagePath.replace(/^\/+/, '')}`;
}

export default function FullMap() {
    const dispatch = useDispatch();
    const mapRef = useRef(null);
    const mapContainerRef = useRef(null);

    const [mapStyle, setMapStyle] = useState(styleUrl);
    const [selectedProv, setSelectedProv] = useState(null); // number | null
    const { data: provGeom } = useProvinceGeom(selectedProv || undefined, selectedProv || 0);
    const [categoryId, setCategoryId] = useState(null);
    const [modelId, setModelId] = useState(null);
    const [costSourceId, setCostSourceId] = useState(null);
    const [disasterTypeId, setDisasterTypeId] = useState(null);
    const [satkerId, setSatkerId] = useState(null);
    const [status, setStatus] = useState(null); // 'draft' | 'published' | 'rusak' | 'hilang' | null
    const [filteredCount, setFilteredCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [isFiltered, setIsFiltered] = useState(false);

    //untuk filter
    const [filterOpen, setFilterOpen] = useState(false);
    //const { options: provOptions, loading: provLoading, error: provError } = useProvinse();
    //end of filter
    const [provId, setProvId] = useState(null);
    const [cityId, setCityId] = useState(null);
    const [districtId, setDistrictId] = useState(null);
    const [subdistrictId, setSubdistrictId] = useState(null);
    const { options: categoryOptions, loading: catLoading, error: catError } = useCategories();
    const { options: modelOptions, loading: modelLoading, error: modelError } = useModels();
    const { options: costOptions, loading: costLoading, error: costError } = useCostSources();
    const { options: disasterOptions, loading: disLoading, error: disError } = useDisasterTypes();
    const { options: satkerOptions, loading: satLoading, error: satError } = useSatuanKerja();

    //simulation purpose
    const simPopupRef = useRef(null);
    const [simPoint, setSimPoint] = useState(null);        // { lat, lng } | null
    const [simOpen, setSimOpen] = useState(false);         // form simulasi terbuka?
    const [simGeo, setSimGeo] = useState(null);            // hasil fetchGeografis
    const [simLoading, setSimLoading] = useState(false);   // loading geografis
    const [simErr, setSimErr] = useState(null);            // error geografis
    const [simScreen, setSimScreen] = useState(null);
    const SIM_MIN_ZOOM = 18;
    const FORM_WIDTH = 520;
    const simReqRef = useRef({ id: 0, abort: null }); // track fetch terbaru
    // state untuk mapping otomatis dan warning mismatch
    const [simProvId, setSimProvId] = useState(null);
    const [simCityId, setSimCityId] = useState(null);
    const [simDistrictId, setSimDistrictId] = useState(null);
    const [simSubdistrictId, setSimSubdistrictId] = useState(null);
    const [simMismatch, setSimMismatch] = useState({ prov: null, city: null, dist: null, subdist: null });

    const { provOptions, cityOptions, districtOptions, subdistrictOptions, loading: locLoading, error: locError } =
        useOptions({ provId, cityId, districtId });


    // Tutup right sidebar dan paksa layout FLUID
    useEffect(() => {
        dispatch({ type: SHOW_RIGHT_SIDEBAR, payload: false });
        dispatch({ type: CHANGE_LAYOUT_WIDTH, payload: layoutWidthTypes.FLUID });
    }, [dispatch]);

    // Tentukan style (fallback jika primary gagal)
    useEffect(() => {
        let abortController = new AbortController();
        (async () => {
            try {
                const res = await fetch(styleUrl, { signal: abortController.signal });
                if (!res.ok) throw new Error('Primary style unavailable');
                setMapStyle(styleUrl);
            } catch {
                setMapStyle(fallbackStyle);
            }
        })();
        return () => abortController.abort();
    }, []);

    // Init map sekali
    useEffect(() => {
        if (!mapContainerRef.current || !mapStyle) return;
        if (mapRef.current) return;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: mapStyle,
            center: [118.0, -2.5],
            zoom: 4,
            attributionControl: true,
        });
        mapRef.current = map;

        const nav = new maplibregl.NavigationControl({ visualizePitch: false, showZoom: true, showCompass: false });
        map.addControl(nav, "top-right");
        map.addControl(new maplibregl.ScaleControl({ unit: "metric" }));

        map.once("load", async () => {
            // Tambah source & layer kosong untuk rambu
            const sourceId = "rambu-source";
            const layerId = "rambu-layer";
            map.addSource(sourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
            map.addLayer({
                id: layerId,
                type: "circle",
                source: sourceId,
                // paint: {
                //     "circle-radius": 5,
                //     "circle-color": "#e74c3c",
                //     "circle-stroke-width": 1.5,
                //     "circle-stroke-color": "#ffffff",
                // },
                filter: ["!=", ["get", "categoryId"], 3], // exclude kategori 3, sisanya tetap bulatan

                paint: {
                    // radius tetap
                    "circle-radius": 5,
                    // warna berdasarkan status
                    "circle-color": [
                        "match",
                        ["get", "status"],
                        "published", "#ac4bc1",     // biru muda
                        "rusak", "#f29d00",         // hitam
                        "hilang", "#000000",        // hitam (outline beda)
                      /* default (draft/unknown) */ "#e74c3c"  // warna sekarang
                    ],
                    // outline warna: hilang = merah tua, selain itu putih
                    "circle-stroke-color": [
                        //berikan warna merah tua untuk status hilang dan rusak, dengan default outline warna orange
                        "case",
                        ["==", ["get", "status"], "hilang"],
                        "#7a1c1c", // merah tua
                        ["==", ["get", "status"], "rusak"],
                        "#7a1c1c", // coklat tua
                        "#ffffff"  // putih untuk lainnya
                    ],
                    // ketebalan outline: hilang lebih tebal
                    "circle-stroke-width": [
                        "case",
                        ["==", ["get", "status"], "hilang"],
                        3,
                        ["==", ["get", "status"], "rusak"],
                        2.5,
                        1
                    ],
                },
            });

            // 2) Tambah image SDF kotak untuk kategori 3
            const size = 40;
            const canvas = document.createElement("canvas");
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, size, size);
            ctx.fillStyle = "#ffffff"; // isi putih agar bisa ditint via icon-color
            ctx.strokeStyle = "#000000"; // border hitam untuk halo
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.rect(8, 8, size - 16, size - 16);
            ctx.fill();
            ctx.stroke();
            map.addImage("rambu-square-sdf", ctx.getImageData(0, 0, size, size), { sdf: true });
            // 3) Symbol layer kotak: hanya untuk categoryId = 3 (warna & outline mengikuti status yang sama)
            map.addLayer({
                id: "rambu-square-layer",
                type: "symbol",
                source: sourceId,
                filter: ["==", ["get", "categoryId"], 3],
                layout: {
                    "icon-image": "rambu-square-sdf",
                    "icon-size": 0.35,         // sesuaikan ukuran kotak
                    "icon-allow-overlap": true
                },
                paint: {
                    // warna isi kotak mengikuti status
                    "icon-color": [
                        "match",
                        ["get", "status"],
                        "published", "#ac4bc1",
                        "rusak", "#f29d00",
                        "hilang", "#000000",
        /* default */ "#e74c3c"
                    ],
                    // outline mengikuti status: hilang & rusak merah tua, lainnya putih
                    "icon-halo-color": [
                        "case",
                        ["==", ["get", "status"], "hilang"], "#7a1c1c",
                        ["==", ["get", "status"], "rusak"], "#7a1c1c",
                        "#ffffff"
                    ],
                    "icon-halo-width": [
                        "case",
                        ["==", ["get", "status"], "hilang"], 3,
                        ["==", ["get", "status"], "rusak"], 2.5,
                        1
                    ],
                }
            });

            // Ambil rambu dari backend (env-based)
            await refreshRambu();

            // Popup
            const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true });
            map.on("click", layerId, (e) => {
                const feature = e.features?.[0];
                if (!feature) return;
                const { coordinates } = feature.geometry;
                const { title, id } = feature.properties || {};
                const html =
                    `<div style="min-width:180px">
             <strong>${title || "Rambu"}</strong><br/>
             ID: ${id || "-"}<br/>             
             Deskripsi : ${feature.properties?.description || "-"}<br/>                
             Lon, Lat: ${coordinates[0].toFixed(5)}, ${coordinates[1].toFixed(5)}
           </div>`;
                popup.setLngLat(coordinates).setHTML(html).addTo(map);
            });
            map.on("mouseenter", layerId, () => (map.getCanvas().style.cursor = "pointer"));
            map.on("mouseleave", layerId, () => (map.getCanvas().style.cursor = ""));
        });

    
        async function refreshRambu() {
            try {
                const url = apiUrl('rambu'); // pastikan .env: VITE_APP_DATABASEURL=http://localhost:8044/api
                console.debug('[FullMap] fetch rambu =>', url);
                const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const body = await res.json();
                console.debug('[FullMap] rambu resp:', body);

                const points = Array.isArray(body) ? body : (body?.data ?? []);
                const features = points
                    .map((p) => {
                        const lon = typeof p?.lon === 'number' ? p.lon : (typeof p?.lng === 'number' ? p.lng : null);
                        const lat = typeof p?.lat === 'number' ? p.lat : null;
                        if (lon == null || lat == null) return null;
                        return {
                            type: "Feature",
                            geometry: { type: "Point", coordinates: [lon, lat] },
                            properties: { id: p.id ?? `${lon},${lat}`, title: p.name ?? "Rambu", ...p },
                        };
                    })
                    .filter(Boolean);

                const src = map.getSource("rambu-source");
                if (src) src.setData({ type: "FeatureCollection", features });

                if (features.length > 0) {
                    const bounds = new maplibregl.LngLatBounds();
                    features.forEach((f) => bounds.extend(f.geometry.coordinates));
                    map.fitBounds(bounds, { padding: 40, duration: 800 });
                } else {
                    console.warn('[FullMap] rambu kosong atau tidak ada koordinat valid');
                }
            } catch (e) {
                console.error("Failed load rambu:", e);
            }
        }

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, [mapStyle]);


    // Saat membuka form, tetapkan select prov/kota/kec/kel secara otomatis dari simGeo
    useEffect(() => {
        if (!simOpen || !simGeo) return;
        // reset mismatch
        setSimMismatch({ prov: null, city: null, dist: null, subdist: null });

        // 1) map Provinsi
        const provIdAuto = findIdByLabel(provOptions, simGeo.province);
        setSimProvId(provIdAuto);
        if (!provIdAuto && simGeo.province) {
            setSimMismatch(m => ({ ...m, prov: `Provinsi "${simGeo.province}" tidak ditemukan/berbeda dengan data database.` }));
        }

        // 2) map Kota/Kab (bergantung provIdAuto). Jika options kota disediakan sudah terfilter by provId, cocokkan nama.
        const cityIdAuto = findIdByLabel(cityOptions, simGeo.city);
        setSimCityId(cityIdAuto);
        if (!cityIdAuto && simGeo.city) {
            setSimMismatch(m => ({ ...m, city: `Kota/Kab "${simGeo.city}" tidak ditemukan/berbeda dengan data database.` }));
        }

        // 3) map Kecamatan
        const distIdAuto = findIdByLabel(districtOptions, simGeo.district);
        setSimDistrictId(distIdAuto);
        if (!distIdAuto && simGeo.district) {
            setSimMismatch(m => ({ ...m, dist: `Kecamatan "${simGeo.district}" tidak ditemukan/berbeda dengan data database.` }));
        }

        // 4) map Kelurahan/Desa
        const subName = simGeo.village ?? simGeo.subdistrict ?? null;
        const subIdAuto = findIdByLabel(subdistrictOptions, subName);
        setSimSubdistrictId(subIdAuto);
        if (!subIdAuto && subName) {
            setSimMismatch(m => ({ ...m, subdist: `Kelurahan/Desa "${subName}" tidak ditemukan/berbeda dengan data database.` }));
        }
    }, [simOpen, simGeo, provOptions, cityOptions, districtOptions, subdistrictOptions]);


    // Render province geojson saat filter dipilih
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map?.isStyleLoaded?.()) return;

        const provSourceId = "prov-geom";
        const provFillId = "prov-fill";
        const provLineId = "prov-outline";

        if (map.getLayer(provFillId)) map.removeLayer(provFillId);
        if (map.getLayer(provLineId)) map.removeLayer(provLineId);
        if (map.getSource(provSourceId)) map.removeSource(provSourceId);

        if (!provGeom) return;

        try {
            map.addSource(provSourceId, { type: "geojson", data: provGeom });
            map.addLayer({
                id: provFillId,
                type: "fill",
                source: provSourceId,
                paint: { "fill-color": "#2563eb", "fill-opacity": 0.15 },
            });
            map.addLayer({
                id: provLineId,
                type: "line",
                source: provSourceId,
                paint: { "line-color": "#2563eb", "line-width": 2 },
            });

            // FitBounds ke geom provinsi dengan batas zoom agar tidak terlalu dekat
            const b = new maplibregl.LngLatBounds();
            const walk = (geom) => {
                const type = geom?.type;
                const coords = geom?.coordinates;
                if (!type || !coords) return;
                const add = (c) => b.extend(c);
                if (type === 'Polygon') {
                    coords.forEach((ring) => ring.forEach(add));
                } else if (type === 'MultiPolygon') {
                    coords.forEach((poly) => poly.forEach((ring) => ring.forEach(add)));
                }
            };
            const gj = provGeom?.type === 'FeatureCollection' ? provGeom : { type: 'FeatureCollection', features: [provGeom] };
            gj.features?.forEach((f) => walk(f.geometry));

            if (!b.isEmpty()) {
                map.fitBounds(b, {
                    padding: 80,    // tambah ruang
                    duration: 700,
                    maxZoom: 8      // turunkan agar lebih jauh
                });
            }
        } catch (e) {
            console.error("Failed render province geom:", e);
        }
    }, [provGeom]);

    const handleApplyFilter = async () => {
        // selectedProv hanya di-set saat provinsi dipilih (agar tidak memaksa geom provinsi ketika hanya kategori dipilih)
        setSelectedProv(provId || null);

        // Build params
        const params = new URLSearchParams();
        // lokasi
        if (provId != null) params.set('prov_id', String(provId));
        if (cityId != null) params.set('city_id', String(cityId));
        if (districtId != null) params.set('district_id', String(districtId));
        if (subdistrictId != null) params.set('subdistrict_id', String(subdistrictId));
        // referensi
        if (categoryId != null) params.set('categoryId', String(categoryId)); // coba key utama
        if (modelId != null) params.set('modelId', String(modelId));
        if (costSourceId != null) params.set('costsourceId', String(costSourceId));
        if (disasterTypeId != null) params.set('disasterTypeId', String(disasterTypeId));
        if (satkerId != null) params.set('satker_id', String(satkerId));
        if (status) params.set('status', status); // status filter

        setIsFiltered(params.toString().length > 0);

        let url = params.toString() ? apiUrl(`rambu?${params}`) : apiUrl('rambu');
        console.debug('[Filter] apply =>', { categoryId, provId, cityId, districtId, subdistrictId, url });

        // Fetch dengan fallback key kategori bila perlu
        let body;
        try {
            const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            body = await res.json();
        } catch (e) {
            console.error('[Filter] fetch error:', e);
            body = null;
        }

        // Jika hanya kategori dipilih dan hasil kosong, coba key alternatif "category"
        let points = Array.isArray(body) ? body : (body?.data ?? []);
        const onlyCategory =
            categoryId != null &&
            provId == null && cityId == null && districtId == null && subdistrictId == null;

        if (onlyCategory && (!points || points.length === 0)) {
            const alt = new URLSearchParams(params);
            alt.delete('category_id');
            alt.set('category', String(categoryId)); // fallback key
            const altUrl = apiUrl(`rambu?${alt.toString()}`);
            console.debug('[Filter] retry with alt category key =>', altUrl);
            try {
                const res2 = await fetch(altUrl, { headers: { 'cache-control': 'no-cache' } });
                if (res2.ok) {
                    const b2 = await res2.json();
                    points = Array.isArray(b2) ? b2 : (b2?.data ?? []);
                    url = altUrl;
                }
            } catch (e2) {
                console.warn('[Filter] alt category fetch failed:', e2);
            }
        }

        const features = (Array.isArray(points) ? points : []).map((p) => {
            const lon = typeof p?.lon === 'number' ? p.lon : (typeof p?.lng === 'number' ? p.lng : null);
            const lat = typeof p?.lat === 'number' ? p.lat : null;
            if (lon == null || lat == null) return null;
            return {
                type: "Feature",
                geometry: { type: "Point", coordinates: [lon, lat] },
                properties: {
                    id: p.id ?? `${lon},${lat}`, title: p.name ?? "Rambu"
                    , categoryId: p.categoryId ?? p.category_id ?? null, // penting untuk filter kotak kategori 3
                    ...p
                },
            };
        }).filter(Boolean);

        const map = mapRef.current;
        const src = map?.getSource("rambu-source");
        if (src) {
            src.setData({ type: "FeatureCollection", features });
            setTotalCount(features.length);
            setFilteredCount(features.length);
            setIsFiltered(false);
        }

        const hasRambu = features.length > 0;

        if (map?.getLayer("rambu-layer")) {
            map.setFilter("rambu-layer", ["!=", ["get", "categoryId"], 3]);
        }
        if (map?.getLayer("rambu-square-layer")) {
            map.setFilter("rambu-square-layer", ["==", ["get", "categoryId"], 3]);
        }

        // Jika provinsi dipilih: selalu tampilkan geom provinsi (meski rambu kosong)
        if (provId) {
            let geom = provGeom;
            if (!geom) {
                try {
                    const gRes = await fetch(apiUrl(`locations/province-geojson?prov_id=${provId}`), { headers: { 'cache-control': 'no-cache' } });
                    if (gRes.ok) {
                        const gText = await gRes.text();
                        try { geom = JSON.parse(gText); } catch { geom = null; }
                    }
                } catch { }
            }
            if (geom) {
                const provSourceId = "prov-geom";
                const provFillId = "prov-fill";
                const provLineId = "prov-outline";
                if (!map.getSource(provSourceId)) { map.addSource(provSourceId, { type: "geojson", data: geom }); }
                else { map.getSource(provSourceId).setData(geom); }
                if (!map.getLayer(provFillId)) {
                    map.addLayer({ id: provFillId, type: "fill", source: provSourceId, paint: { "fill-color": "#2563eb", "fill-opacity": 0.15 } });
                }
                if (!map.getLayer(provLineId)) {
                    map.addLayer({ id: provLineId, type: "line", source: provSourceId, paint: { "line-color": "#2563eb", "line-width": 2 } });
                }

                // Hitung bounds provinsi dan union dengan rambu jika ada
                const provBounds = new maplibregl.LngLatBounds();
                const walk = (g) => {
                    const type = g?.type, coords = g?.coordinates;
                    if (!type || !coords) return;
                    const add = (c) => provBounds.extend(c);
                    if (type === 'Polygon') coords.forEach((ring) => ring.forEach(add));
                    else if (type === 'MultiPolygon') coords.forEach((poly) => poly.forEach((ring) => ring.forEach(add)));
                };
                const gj = geom?.type === 'FeatureCollection' ? geom : { type: 'FeatureCollection', features: [geom] };
                gj.features?.forEach((f) => walk(f.geometry));

                if (!provBounds.isEmpty()) {
                    if (hasRambu) {
                        const rambuBounds = new maplibregl.LngLatBounds();
                        features.forEach((f) => rambuBounds.extend(f.geometry.coordinates));
                        provBounds.extend(rambuBounds.getNorthEast());
                        provBounds.extend(rambuBounds.getSouthWest());
                    }
                    map.fitBounds(provBounds, { padding: 80, duration: 800, maxZoom: 8 });
                    return; // jangan fit ke rambu lagi
                }
            }
        }

        // Jika tidak memilih provinsi atau gagal hitung bounds provinsi, fit ke rambu bila ada
        if (hasRambu) {
            const bounds = new maplibregl.LngLatBounds();
            features.forEach((f) => bounds.extend(f.geometry.coordinates));
            map.fitBounds(bounds, { padding: 80, duration: 800, maxZoom: 9 });
        }

        console.debug('[Filter] done =>', { url, featuresCount: features.length });
    };

    async function saveSimulation() {
        try {
            if (!simPoint) return;
            const payload = {
                category_id: categoryId ?? null,
                model_id: modelId ?? null,
                costsource_id: costSourceId ?? null,
                disaster_type_id: disasterTypeId ?? null,
                lon: simPoint.lng,
                lat: simPoint.lat,
                address: simDesc ?? '',
                prov_id: simGeo?.prov_id ?? null,
                city_id: simGeo?.city_id ?? null,
                district_id: simGeo?.district_id ?? null,
                subdistrict_id: simGeo?.subdistrict_id ?? null,
            };
            const res = await fetch(apiUrl('rambu-simulasi'), {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setSimOpen(false);
            alert('Rambu simulasi berhasil dibuat.');
        } catch (err) {
            alert(err?.message || 'Gagal menyimpan simulasi');
        }
    }

    useEffect(() => {
        // setiap kali categoryId berubah, apply filter berdasar state saat ini
        // jika ingin hanya via tombol, hapus effect ini
        if (categoryId !== null) {
            handleApplyFilter();
        }
    }, [categoryId]);

    //simulation purpose
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            const map = mapRef.current;
            const clickSrc = map?.getSource('sim-click');
            clickSrc && clickSrc.setData({ type: 'FeatureCollection', features: [] }); // hide marker
            if (simPopupRef.current) { try { simPopupRef.current.remove(); } catch { } simPopupRef.current = null; }
            setSimOpen(false);
            setSimPoint(null);
            setSimGeo(null);
            setSimErr(null);
            setSimLoading(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const updateScreenPos = () => {
            if (!simPoint) return;
            const p = map.project([simPoint.lng, simPoint.lat]);
            setSimScreen({ x: p.x, y: p.y });
        };
        map.on('move', updateScreenPos);
        map.on('zoom', updateScreenPos);
        return () => {
            map.off('move', updateScreenPos);
            map.off('zoom', updateScreenPos);
        };
    }, [simPoint]);

    // UI sederhana untuk filter provinsi
    return (
        <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", overflow: "hidden", background: "#fff" }}>
            <div ref={mapContainerRef} style={{ position: "fixed", inset: 0, zIndex: 0 }} />
            {/* Floating Filter Button (di atas map, selalu terlihat) */}
            <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                aria-label="Filter peta"
                title="Filter peta"
                style={{
                    position: "relative", zIndex: 99999, marginTop: 150, left: "94%", transform: "translateX(-100%)",
                    width: 40, height: 40, borderRadius: 20, border: "none", background: "#fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                }}
            >
                <FilterIcon />
            </button>

            {/* Panel Filter (fixed juga) */}
            {filterOpen && (
                <div
                    style={{
                        position: "fixed", top: 170, right: 65, zIndex: 9998,
                        //width: 560, maxHeight: "80vh", overflowY: "auto", padding: 16, borderRadius: 12, background: "#f8fafc",
                        width: 560, maxHeight: "80vh", overflowY: "auto", padding: 12, borderRadius: 12, background: "#f8fafc",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
                        Filter Lokasi
                    </div>

                    {/* Row 1: Provinsi + Kota */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Provinsi</label>
                            <select
                                value={provId ?? ""}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setProvId(v ? Number(v) : null);
                                    setCityId(null); setDistrictId(null); setSubdistrictId(null);
                                }}
                                disabled={locLoading.prov}
                                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", height: 32 }}
                            >
                                <option value="">{locLoading.prov ? "Memuat..." : "-- Semua --"}</option>
                                {provOptions.map((opt) => (
                                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                                ))}
                            </select>
                            {locError.prov && <div style={{ color: "#dc2626", fontSize: 11 }}>{locError.prov}</div>}
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Kota</label>
                            <select
                                value={cityId ?? ""}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setCityId(v ? Number(v) : null);
                                    setDistrictId(null); setSubdistrictId(null);
                                }}
                                disabled={locLoading.city || !provId}
                                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", height: 32 }}
                            >
                                <option value="">{locLoading.city ? "Memuat..." : "-- Semua --"}</option>
                                {cityId === null && !provId ? null : cityOptions.map((opt) => (
                                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                                ))}
                            </select>
                            {locError.city && <div style={{ color: "#dc2626", fontSize: 11 }}>{locError.city}</div>}
                        </div>
                    </div>
                    {/* Row 2: Kecamatan + Kelurahan */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Kecamatan</label>
                            <select
                                value={districtId ?? ""}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setDistrictId(v ? Number(v) : null);
                                    setSubdistrictId(null);
                                }}
                                disabled={locLoading.dist || !cityId}
                                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", height: 32 }}
                            >
                                <option value="">{locLoading.dist ? "Memuat..." : "-- Semua --"}</option>
                                {districtOptions.map((opt) => (
                                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                                ))}
                            </select>
                            {locError.dist && <div style={{ color: "#dc2626", fontSize: 11 }}>{locError.dist}</div>}
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Kelurahan</label>
                            <select
                                value={subdistrictId ?? ""}
                                onChange={(e) => setSubdistrictId(e.target.value ? Number(e.target.value) : null)}
                                disabled={locLoading.subdist || !districtId}
                                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", height: 32 }}
                            >
                                <option value="">{locLoading.subdist ? "Memuat..." : "-- Semua --"}</option>
                                {subdistrictOptions.map((opt) => (
                                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                                ))}
                            </select>
                            {locError.subdist && <div style={{ color: "#dc2626", fontSize: 11 }}>{locError.subdist}</div>}
                        </div>
                    </div>
                    {/* Row 3: Kategori + Model */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Kategori</label>
                            <select
                                value={categoryId ?? ""}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    // gunakan Number jika id numeric, fallback ke string agar tidak NaN
                                    setCategoryId(v ? (Number.isFinite(Number(v)) ? Number(v) : String(v)) : null);
                                }}
                                disabled={catLoading}
                                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", height: 32 }}
                            >
                                <option value="">{catLoading ? "Memuat..." : "-- Semua --"}</option>
                                {categoryOptions.map((opt) => (
                                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                                ))}
                            </select>
                            {catError && <div style={{ color: "#dc2626", fontSize: 11 }}>{catError}</div>}
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Model</label>
                            <select
                                value={modelId ?? ""}
                                onChange={(e) => setModelId(e.target.value ? Number(e.target.value) : null)}
                                disabled={modelLoading}
                                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", height: 32 }}
                            >
                                <option value="">{modelLoading ? "Memuat..." : "-- Semua --"}</option>
                                {modelOptions.map((opt) => (
                                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                                ))}
                            </select>
                            {modelError && <div style={{ color: "#dc2626", fontSize: 11 }}>{modelError}</div>}
                        </div>
                    </div>
                    {/* Row 4: Sumber Biaya + Jenis Bencana */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Sumber Biaya</label>
                            <select
                                value={costSourceId ?? ""}
                                onChange={(e) => setCostSourceId(e.target.value ? Number(e.target.value) : null)}
                                disabled={costLoading}
                                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", height: 32 }}
                            >
                                <option value="">{costLoading ? "Memuat..." : "-- Semua --"}</option>
                                {costOptions.map((opt) => (
                                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                                ))}
                            </select>
                            {costError && <div style={{ color: "#dc2626", fontSize: 11 }}>{costError}</div>}
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Jenis Bencana</label>
                            <select
                                value={disasterTypeId ?? ""}
                                onChange={(e) => setDisasterTypeId(e.target.value ? Number(e.target.value) : null)}
                                disabled={disLoading}
                                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", height: 32 }}
                            >
                                <option value="">{disLoading ? "Memuat..." : "-- Semua --"}</option>
                                {disasterOptions.map((opt) => (
                                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                                ))}
                            </select>
                            {disError && <div style={{ color: "#dc2626", fontSize: 11 }}>{disError}</div>}
                        </div>
                    </div>
                    {/* Row: Status (full width, compact) */}
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Status</label>
                        <select
                            value={status ?? ""}
                            onChange={(e) => {
                                const v = e.target.value;
                                setStatus(v || null);
                            }}
                            style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", height: 32 }}
                        >
                            <option value="">{/* -- Semua Status -- */}-- Semua Status --</option>
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="rusak">Rusak</option>
                            <option value="hilang">Hilang</option>
                        </select>
                    </div>

                    {/* Tombol Apply Filter */}
                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            type="button"
                            onClick={handleApplyFilter}
                            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #0ea5e9", background: "#0ea5e9", color: "#fff", fontSize: 12 }}
                        >
                            Filter
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setProvId(null); setCityId(null); setDistrictId(null); setSubdistrictId(null);
                                setSelectedProv(null);
                                setStatus(null);
                                setCategoryId(null); setModelId(null); setCostSourceId(null); setDisasterTypeId(null);
                                // reset rambu ke semua
                                handleApplyFilter();
                            }}
                            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: 12 }}
                        >
                            Reset
                        </button>
                    </div>
                    {/* berikan informasi total rambu yang terfilter di sebelah tombol reset */}
                    <div style={{ marginTop: 8, fontSize: 11, color: "#475569" }}>
                        * Total rambu terfilter:
                        {' '}
                        <strong>
                            {/* berikan informasi default, total keseluruhan rambu yang disajikan pertama kali, lalu jika data terfilter, maka ikut jumlah data yg terfilter */}
                            {isFiltered ? filteredCount : totalCount}
                        </strong>
                    </div>

                </div>
            )}

            {/* Overlay modal: pusat + blur background saat simOpen */}
            {simOpen && (
                <div
                    style={{
                        position: "fixed", inset: 0, zIndex: 99998,
                        backdropFilter: "blur(2px)", background: "rgba(15, 23, 42, 0.08)"
                    }}
                    onClick={() => { /* klik overlay tidak menutup agar aman, gunakan tombol Batal */ }}
                />
            )}

            {simOpen && simPoint && (
                <div
                    style={{
                        //position: "fixed", top: 130, left: "50%", transform: "translateX(-50%)",
                        // position: "fixed",
                        // top: (simScreen?.y ?? 130) - 180,            // sedikit di atas titik; sesuaikan offset vertikal
                        // left: (simScreen?.x ?? 0) + 24,              // 24px di kanan titik simulasi
                        // transform: "none",
                        position: "fixed",
                        top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                        zIndex: 99999, width: 520, maxHeight: "70vh", overflowY: "auto",
                        background: "#fff", borderRadius: 12, boxShadow: "0 10px 20px rgba(0,0,0,0.15)", padding: 12
                    }}
                >
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
                        Form Rambu Simulasi
                    </div>

                    {simGeo && (
                        <div style={{ fontSize: 11, color: "#334155", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, marginBottom: 8 }}>
                            Otomatis dari titik: Provinsi {simGeo.province ?? "-"} • Kota/Kab {simGeo.city ?? "-"} • Kecamatan {simGeo.district ?? "-"} • Kelurahan {simGeo.village ?? simGeo.subdistrict ?? "-"}
                        </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Kategori</label>
                            <select
                                value={categoryId ?? ""}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setCategoryId(v ? (Number.isFinite(Number(v)) ? Number(v) : String(v)) : null);
                                }}
                                disabled={catLoading}
                                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", height: 32 }}
                            >
                                <option value="">{catLoading ? "Memuat..." : "-- Pilih Kategori --"}</option>
                                {categoryOptions.map((opt) => (
                                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Model</label>
                            <select
                                value={modelId ?? ""}
                                onChange={(e) => setModelId(e.target.value ? Number(e.target.value) : null)}
                                disabled={modelLoading}
                                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", height: 32 }}
                            >
                                <option value="">{modelLoading ? "Memuat..." : "-- Pilih Model --"}</option>
                                {modelOptions.map((opt) => (
                                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Sumber Biaya</label>
                            <select
                                value={costSourceId ?? ""}
                                onChange={(e) => setCostSourceId(e.target.value ? Number(e.target.value) : null)}
                                disabled={costLoading}
                                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", height: 32 }}
                            >
                                <option value="">{costLoading ? "Memuat..." : "-- Pilih Sumber Biaya --"}</option>
                                {costOptions.map((opt) => (
                                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Jenis Bencana</label>
                            <select
                                value={disasterTypeId ?? ""}
                                onChange={(e) => setDisasterTypeId(e.target.value ? Number(e.target.value) : null)}
                                disabled={disLoading}
                                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", height: 32 }}
                            >
                                <option value="">{disLoading ? "Memuat..." : "-- Pilih Jenis Bencana --"}</option>
                                {disasterOptions.map((opt) => (
                                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ marginTop: 8 }}>
                        <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Alamat/Deskripsi</label>
                        <textarea
                            rows={3}
                            placeholder="Tulis alamat atau deskripsi titik simulasi..."
                            style={{ width: "100%", padding: 8, fontSize: 12, borderRadius: 8, border: "1px solid #cbd5e1" }}
                            onChange={(e) => setSimDesc(e.target.value)}
                        />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Longitude</label>
                            <input value={simPoint.lng} readOnly style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1" }} />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Latitude</label>
                            <input value={simPoint.lat} readOnly style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1" }} />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Provinsi</label>
                            <select
                                value={simProvId ?? ""}
                                onChange={(e) => { const v = e.target.value; setSimProvId(v ? Number(v) : null); setSimCityId(null); setSimDistrictId(null); setSimSubdistrictId(null); }}
                                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1" }}
                            >
                                <option value="">{/* -- Pilih Provinsi -- */}-- Pilih Provinsi --</option>
                                {provOptions.map((opt) => (<option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>))}
                            </select>
                            {simMismatch.prov && <div style={{ color: "#dc2626", fontSize: 11, marginTop: 4 }}>{simMismatch.prov}</div>}
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Kota/Kabupaten</label>
                            <select
                                value={simCityId ?? ""}
                                onChange={(e) => { const v = e.target.value; setSimCityId(v ? Number(v) : null); setSimDistrictId(null); setSimSubdistrictId(null); }}
                                disabled={!simProvId}
                                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1" }}
                            >
                                <option value="">{/* -- Pilih Kota/Kab -- */}-- Pilih Kota/Kab --</option>
                                {cityOptions.map((opt) => (<option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>))}
                            </select>
                            {simMismatch.city && <div style={{ color: "#dc2626", fontSize: 11, marginTop: 4 }}>{simMismatch.city}</div>}
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Kecamatan</label>
                            <select
                                value={simDistrictId ?? ""}
                                onChange={(e) => { const v = e.target.value; setSimDistrictId(v ? Number(v) : null); setSimSubdistrictId(null); }}
                                disabled={!simCityId}
                                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1" }}
                            >
                                <option value="">{/* -- Pilih Kecamatan -- */}-- Pilih Kecamatan --</option>
                                {districtOptions.map((opt) => (<option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>))}
                            </select>
                            {simMismatch.dist && <div style={{ color: "#dc2626", fontSize: 11, marginTop: 4 }}>{simMismatch.dist}</div>}
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4 }}>Kelurahan</label>
                            <select
                                value={simSubdistrictId ?? ""}
                                onChange={(e) => { const v = e.target.value; setSimSubdistrictId(v ? Number(v) : null); }}
                                disabled={!simDistrictId}
                                style={{ width: "100%", padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1" }}
                            >
                                <option value="">{/* -- Pilih Kelurahan -- */}-- Pilih Kelurahan --</option>
                                {subdistrictOptions.map((opt) => (<option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>))}
                            </select>
                            {simMismatch.subdist && <div style={{ color: "#dc2626", fontSize: 11, marginTop: 4 }}>{simMismatch.subdist}</div>}
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button
                            type="button"
                            onClick={saveSimulation}
                            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #0ea5e9", background: "#0ea5e9", color: "#fff", fontSize: 12 }}
                        >
                            Simpan
                        </button>
                        <button
                            type="button"
                            onClick={() => { setSimOpen(false); }}
                            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: 12 }}
                        >
                            Batal
                        </button>
                    </div>
                </div>
            )}
        </div>

    );
}
