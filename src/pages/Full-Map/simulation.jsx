
import React, { useState, useEffect, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Label, Input, Row, Col, Spinner } from 'reactstrap';
import { Plus, X } from 'lucide-react';
import { toast } from "react-toastify";

// Hooks
import useRambu from '../../hooks/useRambu';
import useGeografis from '../../hooks/useGeografis';
import { useOptions, useCategories, useDisasterTypes, useModels, useCostSources } from '../../hooks/useOptions';

const MAPTILER_KEY = import.meta.env.VITE_APP_API_MAPTILER;
const styleUrl = `https://api.maptiler.com/maps/streets-v4/style.json?key=${MAPTILER_KEY}`;
import { apiUrl } from '../../lib/env';

import { useDispatch } from 'react-redux';
import { CHANGE_LAYOUT_WIDTH, SHOW_RIGHT_SIDEBAR } from '../../store/layout/actionTypes';
import { layoutWidthTypes } from '../../constants/layout';

const Simulation = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch({ type: SHOW_RIGHT_SIDEBAR, payload: false });
        dispatch({ type: CHANGE_LAYOUT_WIDTH, payload: layoutWidthTypes.FLUID });
    }, []);

    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const popupRef = useRef(null);
    // const markersRef = useRef([]); // No longer needed with GeoJSON

    // Data Hooks
    const { createRambu } = useRambu(); // Only use createRambu
    const { getGeografis } = useGeografis();

    // Map State
    const [isZoomMax, setIsZoomMax] = useState(false);

    // Form State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addForm, setAddForm] = useState({
        categoryId: '',
        description: '',
        lat: '',
        lng: '',
        prov_id: '',
        city_id: '',
        district_id: '',
        subdistrict_id: '',
        disasterTypeId: '',
        model_id: '',
        cost_id: '',
        year: new Date().getFullYear(),
        isSimulation: 1 // Default for this page
    });
    const [addFiles, setAddFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Options for Form
    const { provOptions, cityOptions, districtOptions, subdistrictOptions } = useOptions({ 
        provId: addForm.prov_id, 
        cityId: addForm.city_id, 
        districtId: addForm.district_id,
        subdistrictId: addForm.subdistrict_id
    });
    const { options: categoryOptions } = useCategories();
    const { options: disasterTypeOptions } = useDisasterTypes();
    const { options: modelOptions } = useModels();
    const { options: costSourceOptions } = useCostSources();

    const currentYear = new Date().getFullYear();
    const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

    // Fetch Rambu Data directly (FullMap style)
    const refreshRambu = async () => {
        try {
             const url = apiUrl('rambu');
             const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
             if (!res.ok) throw new Error(`HTTP ${res.status}`);
             const body = await res.json();
             
             const points = Array.isArray(body) ? body : (body?.data ?? []);
             const features = points.map((p) => {
                const lon = typeof p?.lon === 'number' ? p.lon : (typeof p?.lng === 'number' ? p.lng : null);
                const lat = typeof p?.lat === 'number' ? p.lat : null;
                if (lon == null || lat == null) return null;
                
                // Check isSimulation from RambuProps or root
                const isSim = p.RambuProps?.[0]?.isSimulation === 1 || p.RambuProps?.[0]?.isSimulation === true;

                return {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [lon, lat] },
                    properties: { 
                        id: p.id, 
                        title: p.name || "Rambu",
                        description: p?.description || "",
                        categoryName: p?.category?.name || "Rambu",
                        isSimulation: isSim,
                        status: p.status
                    },
                };
            }).filter(Boolean);

            const map = mapRef.current;
            const src = map?.getSource("rambu-source");
            if (src) {
                src.setData({ type: "FeatureCollection", features });
                
                // Optional: Fit bounds
                if (features.length > 0) {
                     const bounds = new maplibregl.LngLatBounds();
                     features.forEach((f) => bounds.extend(f.geometry.coordinates));
                     // Don't fit bounds on every refresh to avoid jumping, only if desired or first load
                     // map.fitBounds(bounds, { padding: 40, duration: 800 });
                }
            }

        } catch (e) {
            console.error("Failed load rambu:", e);
        }
    };

    // Initialize Map
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            const map = new maplibregl.Map({
                container: mapContainerRef.current,
                style: styleUrl,
                center: [118.0148634, -2.548926], // Indonesia Center
                zoom: 5,
            });

            map.addControl(new maplibregl.NavigationControl(), 'top-right');
            mapRef.current = map;

            map.on('load', async () => {
                 // Add Source
                 map.addSource("rambu-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
                 
                 // Add Layer
                 map.addLayer({
                    id: "rambu-layer",
                    type: "circle",
                    source: "rambu-source",
                    paint: {
                        "circle-radius": 6,
                        "circle-color": [
                            "case",
                            ["==", ["get", "isSimulation"], true], "#800080", // Purple for Simulation
                            "#3b82f6" // Blue for Existing
                        ],
                        "circle-stroke-width": 2,
                        "circle-stroke-color": [
                            "case",
                            ["==", ["get", "isSimulation"], true], "#ff0000", // Red outline for Simulation
                            "#ffffff" // White outline for Existing
                        ]
                    }
                 });

                 await refreshRambu();

                 // Popup for Rambu Layer
                 const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 15 });
                 map.on("click", "rambu-layer", (e) => {
                    // Prevent map click (simulation marker) if clicking strictly on a point?
                    // e.originalEvent.stopPropagation() might be needed if they conflict, 
                    // but the click listener below is on 'map', this is on 'layer'. 
                    // Layer click fires first?
                    
                    const feature = e.features?.[0];
                    if (!feature) return;
                    
                    const { coordinates } = feature.geometry;
                    const props = feature.properties;
                    
                    const isSim = props.isSimulation;
                    
                    const html = `
                        <div class="p-1">
                            <b>${props.categoryName}</b><br/>
                            ${props.description || '-'}<br/>
                            <small style="color:${isSim ? 'purple' : 'gray'}">${isSim ? '● Simulasi' : '● Eksisting'}</small>
                        </div>
                    `;
                    
                    popup.setLngLat(coordinates).setHTML(html).addTo(map);
                 });
                 
                 map.on("mouseenter", "rambu-layer", () => (map.getCanvas().style.cursor = "pointer"));
                 map.on("mouseleave", "rambu-layer", () => (map.getCanvas().style.cursor = ""));
            });

            // Zoom Listener
            map.on('zoomend', () => {
                const z = map.getZoom();
                setIsZoomMax(z >= 14); 
            });
            
            // Click Listener (Click) for Simulation Marker
            map.on('click', async (e) => {
                // If we clicked on an existing rambu, the popup from 'rambu-layer' might open.
                // We should check if event.defaultPrevented or similar? 
                // MapLibre doesn't stop prop easily between layer and map click.
                // Simple hack: Check if we are hovering a feature
                const features = map.queryRenderedFeatures(e.point, { layers: ['rambu-layer'] });
                if (features.length > 0) return; // Clicked on existing point, don't drop marker

                const { lng, lat } = e.lngLat;
                
                // Clear existing temp marker
                if (markerRef.current) markerRef.current.remove();
                if (popupRef.current) popupRef.current.remove();

                // Create Marker: Orange with Black Outline
                const el = document.createElement('div');
                el.className = 'custom-marker-sim';
                el.style.backgroundColor = '#FFA500'; // Orange
                el.style.width = '20px';
                el.style.height = '20px';
                el.style.borderRadius = '50%';
                el.style.border = '2px solid black';
                el.style.cursor = 'pointer';

                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat([lng, lat])
                    .addTo(map);
                
                markerRef.current = marker;

                // Show Loading Popup first
                const popupNode = document.createElement('div');
                popupNode.innerHTML = '<div class="p-2">Loading address...</div>';
                
                const popup = new maplibregl.Popup({ closeOnClick: false })
                    .setLngLat([lng, lat])
                    .setDOMContent(popupNode)
                    .addTo(map);
                
                popupRef.current = popup;

                // Fetch Geografis
                try {
                    const geo = await getGeografis(lat, lng);
                    
                    // Update Popup Content
                    const canAdd = map.getZoom() >= 14; 
                    
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'p-2';
                    contentDiv.innerHTML = `
                        <div class="mb-2">
                            <strong>Koordinat:</strong><br/>
                            ${lat.toFixed(6)}, ${lng.toFixed(6)}
                        </div>
                        <div class="mb-2">
                             <strong>Wilayah:</strong><br/>
                             ${geo?.province || '-'}<br/>
                             ${geo?.city || '-'}<br/>
                             ${geo?.district || '-'}<br/>
                             ${geo?.village || '-'}
                        </div>
                    `;

                    const linkBtn = document.createElement('button');
                    linkBtn.className = 'btn btn-sm btn-primary w-100 mt-1';
                    linkBtn.innerText = 'Tambah Simulasi Rambu';
                    linkBtn.onclick = () => {
                         openAddModal({ lat, lng, geo });
                         popup.remove(); // Close popup
                    };
                    
                    if (canAdd) {
                        contentDiv.appendChild(linkBtn);
                    } else {
                        const hint = document.createElement('small');
                        hint.className = 'text-muted d-block mt-1';
                        hint.style.fontStyle = 'italic';
                        hint.innerText = '*Zoom in max untuk menambah rambu';
                        contentDiv.appendChild(hint);
                    }

                    popup.setDOMContent(contentDiv);
                    
                    if(!popup.isOpen()) popup.addTo(map);

                } catch (error) {
                    console.error("Geo error", error);
                    popup.setHTML('<div class="p-2 text-danger">Gagal mengambil data wilayah</div>');
                }
            });
        }

        return () => {
             // Cleanup
        };
    }, [getGeografis]); // Run once on mount


    // Handle Escape Key to cancel simulation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (markerRef.current) {
                    markerRef.current.remove();
                    markerRef.current = null;
                }
                if (popupRef.current) {
                    popupRef.current.remove();
                    popupRef.current = null;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Open Modal Logic
    const openAddModal = ({ lat, lng, geo }) => {
        setAddForm(prev => ({
            ...prev,
            lat: lat.toFixed(6),
            lng: lng.toFixed(6),
            isSimulation: 1, 
            prov_id: '', city_id: '', district_id: '', subdistrict_id: '' 
        }));
        setAddFiles([]);
        setPendingGeo(geo); // Trigger auto-fill
        setIsAddModalOpen(true);
    };

    // Auto-fill logic from Geo Object
    const [pendingGeo, setPendingGeo] = useState(null);

    // Effect to match Province
    useEffect(() => {
        if (isAddModalOpen && pendingGeo && provOptions.length > 0 && !addForm.prov_id) {
             const matched = provOptions.find(o => o.label.toLowerCase() === pendingGeo.province.toLowerCase());
             if (matched) {
                 setAddForm(p => ({ ...p, prov_id: matched.value }));
             }
        }
    }, [isAddModalOpen, pendingGeo, provOptions]);

    // Effect to match City
    useEffect(() => {
        if (isAddModalOpen && pendingGeo && addForm.prov_id && cityOptions.length > 0 && !addForm.city_id) {
             const matched = cityOptions.find(o => o.label.toLowerCase() === pendingGeo.city.toLowerCase());
             if (matched) {
                 setAddForm(p => ({ ...p, city_id: matched.value }));
             }
        }
    }, [addForm.prov_id, cityOptions, pendingGeo]);

     // Effect to match District
     useEffect(() => {
        if (isAddModalOpen && pendingGeo && addForm.city_id && districtOptions.length > 0 && !addForm.district_id) {
             const matched = districtOptions.find(o => o.label.toLowerCase() === pendingGeo.district.toLowerCase());
             if (matched) {
                 setAddForm(p => ({ ...p, district_id: matched.value }));
             }
        }
    }, [addForm.city_id, districtOptions, pendingGeo]);

    // Effect to match Village
    useEffect(() => {
        if (isAddModalOpen && pendingGeo && addForm.district_id && subdistrictOptions.length > 0 && !addForm.subdistrict_id) {
             const matched = subdistrictOptions.find(o => o.label.toLowerCase() === pendingGeo.village.toLowerCase());
             if (matched) {
                 setAddForm(p => ({ ...p, subdistrict_id: matched.value }));
             }
        }
    }, [addForm.district_id, subdistrictOptions, pendingGeo]);


    // Form Handlers
    const handleAddChange = (e) => {
        const { name, value } = e.target;
        setAddForm(prev => ({
            ...prev,
            [name]: value,
            ...(name === 'prov_id' && { city_id: '', district_id: '', subdistrict_id: '' }),
            ...(name === 'city_id' && { district_id: '', subdistrict_id: '' }),
            ...(name === 'district_id' && { subdistrict_id: '' }),
        }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (addFiles.length + files.length > 4) {
            alert("Maksimal 4 gambar.");
            return;
        }
        const newFiles = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
        setAddFiles(prev => [...prev, ...newFiles]);
    };

    const removeFile = (index) => {
        setAddFiles(prev => {
            const newFiles = [...prev];
            URL.revokeObjectURL(newFiles[index].preview); 
            newFiles.splice(index, 1);
            return newFiles;
        });
    };

    const handleAddSubmit = async () => {
        if (!addFiles.length) return alert("Minimal 1 gambar wajib.");
        if (!addForm.lat || !addForm.lng) return alert("Lokasi wajib.");

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            Object.keys(addForm).forEach(key => {
                if (addForm[key] !== undefined && addForm[key] !== null) formData.append(key, addForm[key]);
            });
            if (addFiles[0]) formData.append('photo_gps', addFiles[0].file);
            addFiles.slice(1).forEach((f, i) => formData.append(`photo_additional_${i+1}`, f.file));

            await createRambu(formData);
            
            setIsAddModalOpen(false);
            setAddForm(prev => ({ ...prev, categoryId: '', description: '', model_id: '', cost_id: '' })); // partial reset
            toast.success("Simulasi Rambu berhasil ditambahkan!");
            
            // Remove temp marker
            if (markerRef.current) markerRef.current.remove();
            if (popupRef.current) popupRef.current.remove();

            refreshRambu(); // Refresh map using new method
        } catch (e) {
            console.error(e);
            toast.error("Gagal menambahkan simulasi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="page-content">
            <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", overflow: "hidden", background: "#fff" }}>
            <div ref={mapContainerRef} style={{ position: "fixed", inset: 0, zIndex: 0 }} />
            
                 <h4>Peta Simulasi Rambu</h4>
                 {/* <div className="alert alert-info">
                    <i className="mdi mdi-information me-1"></i>
                    <b>Klik Kiri</b> pada peta untuk menambahkan simulasi titik rambu baru.
                 </div> */}

                 {/* <div 
                    ref={mapContainerRef} 
                    style={{ width: '100%', height: '75vh', borderRadius: '8px', border: '1px solid #ddd' }} 
                 /> */}

                 {/* ADD MODAL */}
                 <Modal isOpen={isAddModalOpen} toggle={() => setIsAddModalOpen(!isAddModalOpen)} size="lg">
                    <ModalHeader toggle={() => setIsAddModalOpen(!isAddModalOpen)}>Tambah Simulasi Rambu</ModalHeader>
                    <ModalBody>
                        <Row>
                            <Col md={12}>
                                <div className="mb-3">
                                    <Label>Foto Rambu (Min 1, Max 4)</Label>
                                    <Input type="file" multiple onChange={handleFileChange} accept="image/*" />
                                    <div className="d-flex gap-2 mt-2 flex-wrap">
                                        {addFiles.map((f, i) => (
                                            <div key={i} className="position-relative">
                                                <img src={f.preview} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }} />
                                                <button 
                                                    className="btn btn-danger btn-sm p-0 position-absolute top-0 end-0 rounded-circle"
                                                    style={{ width: 20, height: 20, lineHeight: 1 }}
                                                    onClick={() => removeFile(i)}
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <div className="mb-3">
                                    <Label>Latitude</Label>
                                    <Input type="text" name="lat" value={addForm.lat} readOnly />
                                </div>
                            </Col>
                            <Col md={6}>
                                <div className="mb-3">
                                    <Label>Longitude</Label>
                                    <Input type="text" name="lng" value={addForm.lng} readOnly />
                                </div>
                            </Col>
                        </Row>
                        <Row>
                             <Col md={6}>
                                <div className="mb-3">
                                    <Label>Provinsi</Label>
                                    <Input type="select" name="prov_id" value={addForm.prov_id} onChange={handleAddChange}>
                                        <option value="">Pilih Provinsi</option>
                                        {provOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </div>
                            </Col>
                            <Col md={6}>
                                <div className="mb-3">
                                    <Label>Kabupaten / Kota</Label>
                                    <Input type="select" name="city_id" value={addForm.city_id} onChange={handleAddChange}>
                                        <option value="">Pilih Kota</option>
                                        {cityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </div>
                            </Col>
                            <Col md={6}>
                                <div className="mb-3">
                                    <Label>Kecamatan</Label>
                                    <Input type="select" name="district_id" value={addForm.district_id} onChange={handleAddChange}>
                                        <option value="">Pilih Kecamatan</option>
                                        {districtOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </div>
                            </Col>
                            <Col md={6}>
                                <div className="mb-3">
                                    <Label>Kelurahan / Desa</Label>
                                    <Input type="select" name="subdistrict_id" value={addForm.subdistrict_id} onChange={handleAddChange}>
                                        <option value="">Pilih Kelurahan</option>
                                        {subdistrictOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </div>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <div className="mb-3">
                                    <Label>Kategori Rambu</Label>
                                    <Input type="select" name="categoryId" value={addForm.categoryId} onChange={handleAddChange}>
                                        <option value="">Pilih Kategori</option>
                                        {categoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </div>
                            </Col>
                             <Col md={6}>
                                <div className="mb-3">
                                    <Label>Jenis Bencana</Label>
                                    <Input type="select" name="disasterTypeId" value={addForm.disasterTypeId} onChange={handleAddChange}>
                                        <option value="">Pilih Jenis Bencana</option>
                                        {disasterTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </div>
                            </Col>
                            <Col md={6}>
                                <div className="mb-3">
                                    <Label>Model Rambu</Label>
                                    <Input type="select" name="model_id" value={addForm.model_id} onChange={handleAddChange}>
                                        <option value="">Pilih Model</option>
                                        {modelOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </div>
                            </Col>
                            <Col md={6}>
                                <div className="mb-3">
                                    <Label>Sumber Dana</Label>
                                    <Input type="select" name="cost_id" value={addForm.cost_id} onChange={handleAddChange}>
                                        <option value="">Pilih Sumber Dana</option>
                                        {costSourceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </div>
                            </Col>
                            <Col md={6}>
                                <div className="mb-3">
                                    <Label>Tahun Pengadaan</Label>
                                    <Input type="select" name="year" value={addForm.year} onChange={handleAddChange}>
                                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                                    </Input>
                                </div>
                            </Col>
                             <Col md={12}>
                                <div className="mb-3">
                                    <Label>Keterangan / Deskripsi</Label>
                                    <Input type="textarea" name="description" rows="3" value={addForm.description} onChange={handleAddChange} />
                                </div>
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={() => setIsAddModalOpen(false)}>Batal</Button>
                        <Button color="primary" onClick={handleAddSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <><Spinner size="sm" className="me-1"/> Menyimpan...</> : 'Simpan Simulasi'}
                        </Button>
                    </ModalFooter>
                 </Modal>
            </div>
        </div>
    );
};

export default Simulation;
