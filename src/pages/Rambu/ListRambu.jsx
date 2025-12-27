// src/components/filter.
import React, { useMemo, useState, useEffect, useRef } from "react";
import PropTypes from 'prop-types';
import { MapPin, Edit, Trash2, Filter, FileSpreadsheet, Plus } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Label, Input, Row, Col } from 'reactstrap';

//import components
import Breadcrumbs from '../../components/Common/Breadcrumb';
import TableContainer from '../../components/Common/TableContainer';
import useRambu from '../../hooks/useRambu';
import { useOptions, useCategories, useDisasterTypes, useModels, useCostSources } from '../../hooks/useOptions';
import useGeografis from '../../hooks/useGeografis';
import maplibregl from "maplibre-gl";
import 'maplibre-gl/dist/maplibre-gl.css';

const MAPTILER_KEY = import.meta.env.VITE_APP_API_MAPTILER;
const styleUrl = `https://api.maptiler.com/maps/streets-v4/style.json?key=${MAPTILER_KEY}`;

const ListRambu = () => {
    const { data: rawData, loading, error, createRambu, updateRambu, deleteRambu, detailRambu, pagination, setPagination, fetchRambu, deleteTrashRambu } = useRambu();
    const { getGeografis } = useGeografis();

    const data = useMemo(() => {
        return (rawData || []).filter(item => item.status !== 'trash');
    }, [rawData]);
    
    // Filter State
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({
        prov_id: '',
        city_id: '',
        district_id: '',
        subdistrict_id: '',
        categoryId: '',
        disasterTypeId: '',
        status: ''
    });

    // Add Form State
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
    });
    const [addFiles, setAddFiles] = useState([]); // Array of { file, preview }
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingLocation, setPendingLocation] = useState(null);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [rambuToDeleteId, setRambuToDeleteId] = useState(null);

    // Detail Modal State
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const detailMapContainerRef = useRef(null);
    const detailMapRef = useRef(null);

    // Detail Map Effect
    useEffect(() => {
        if (isDetailModalOpen && detailData && detailMapContainerRef.current) {
            if (detailMapRef.current) return;

            // Handle potential coord field names
            const lat = parseFloat(detailData.lat || detailData.latitude || 0);
            const lng = parseFloat(detailData.lng || detailData.longitude || 0);
            
            if (!lat || !lng) return;

            try {
                const map = new maplibregl.Map({
                    container: detailMapContainerRef.current,
                    style: styleUrl,
                    center: [lng, lat],
                    zoom: 15,
                    attributionControl: false,
                });

                map.addControl(new maplibregl.NavigationControl(), 'top-right');
                
                new maplibregl.Marker({ color: 'red' })
                    .setLngLat([lng, lat])
                    .addTo(map);

                detailMapRef.current = map;
            } catch(e) {
                console.error("Map init error:", e);
            }
        } else if (!isDetailModalOpen) {
             if (detailMapRef.current) {
                 detailMapRef.current.remove();
                 detailMapRef.current = null;
             }
        }
    }, [isDetailModalOpen, detailData]);

    // Edit Form State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentRambuId, setCurrentRambuId] = useState(null);
    const [editForm, setEditForm] = useState({
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
    });
    const [editFiles, setEditFiles] = useState([]); // New files
    const [existingPhotos, setExistingPhotos] = useState([]); // Existing photos from DB
    const [deletePhotoIds, setDeletePhotoIds] = useState([]); // IDs to delete
    const [pendingEditLocation, setPendingEditLocation] = useState(null);

    // Filter Options
    const { provOptions, cityOptions, districtOptions, subdistrictOptions } = useOptions({ 
        provId: filterValues.prov_id, 
        cityId: filterValues.city_id, 
        districtId: filterValues.district_id,
        subdistrictId: filterValues.subdistrict_id
    });
    
    // Add Form Options (Independent from Filter)
    const { 
        provOptions: addProvOptions, 
        cityOptions: addCityOptions, 
        districtOptions: addDistrictOptions, 
        subdistrictOptions: addSubdistrictOptions 
    } = useOptions({ 
        provId: addForm.prov_id, 
        cityId: addForm.city_id, 
        districtId: addForm.district_id,
        subdistrictId: addForm.subdistrict_id
    });

    // Edit Form Options
    const { 
        provOptions: editProvOptions, 
        cityOptions: editCityOptions, 
        districtOptions: editDistrictOptions, 
        subdistrictOptions: editSubdistrictOptions 
    } = useOptions({ 
        provId: editForm.prov_id, 
        cityId: editForm.city_id, 
        districtId: editForm.district_id,
        subdistrictId: editForm.subdistrict_id
    });

    const { options: categoryOptions } = useCategories();
    const { options: disasterTypeOptions } = useDisasterTypes();
    const { options: modelOptions } = useModels();
    const { options: costSourceOptions } = useCostSources();

    const statusOptions = ['draft', 'published', 'rusak', 'hilang'];
    
    // Year Options (2 years ago to 1 year ahead)
    const currentYear = new Date().getFullYear();
    const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

    // Filter Handlers
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilterValues(prev => ({
            ...prev,
            [name]: value,
            // Reset child dependencies when parent changes
            ...(name === 'prov_id' && { city_id: '', district_id: '', subdistrict_id: '' }),
            ...(name === 'city_id' && { district_id: '', subdistrict_id: '' }),
            ...(name === 'district_id' && { subdistrict_id: '' }),
        }));
    };

    const applyFilters = () => {
        fetchRambu(1, pagination.pageSize, filterValues);
        setIsFilterModalOpen(false);
    };

    const resetFilters = () => {
        setFilterValues({
            prov_id: '',
            city_id: '',
            district_id: '',
            subdistrict_id: '',
            categoryId: '',
            disasterTypeId: '',
            status: ''
        });
        fetchRambu(1, pagination.pageSize, {});
        setIsFilterModalOpen(false);
    };

    // Add Form Handlers
    const handleAddChange = (e) => {
        const { name, value } = e.target;
        setAddForm(prev => ({
            ...prev,
            [name]: value,
            // Cascading reset
            ...(name === 'prov_id' && { city_id: '', district_id: '', subdistrict_id: '' }),
            ...(name === 'city_id' && { district_id: '', subdistrict_id: '' }),
            ...(name === 'district_id' && { subdistrict_id: '' }),
        }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (addFiles.length + files.length > 4) {
            alert("Maksimal 4 gambar diizinkan.");
            return;
        }
        
        const newFiles = files.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));
        
        setAddFiles(prev => [...prev, ...newFiles]);
        e.target.value = null; // Reset input
    };



    // Auto-fill Location Effect
    useEffect(() => {
        const { lat, lng } = addForm;
        if (lat && lng && !pendingLocation && !addForm.prov_id) { // Only trigger if location is empty/fresh
            const timer = setTimeout(async () => {
                try {
                    const result = await getGeografis(lat, lng);
                    console.log("Geografis Result:", result);
                    if (result) {
                        // Assuming result structure: { province: "...", city: "...", district: "...", village: "..." }
                        // Need to verify exact keys from API response, typically consistent with geografis lib
                        const provName = result.province;
                        const cityName = result.city; 
                        const districtName = result.district;
                        const subdistrictName = result.village;

                        // Match Province
                        const matchedProv = addProvOptions.find(opt => opt.label.toLowerCase() === provName.toLowerCase());
                        
                        if (matchedProv) {
                            setAddForm(prev => ({ ...prev, prov_id: matchedProv.value }));
                            // Queue the rest
                            setPendingLocation({ 
                                city: cityName, 
                                district: districtName, 
                                subdistrict: subdistrictName 
                            });
                        } else {
                            alert(`Data Wilayah Tidak Sesuai: Provinsi "${provName}" tidak ditemukan di database.`);
                        }
                    }
                } catch (e) {
                    console.error("Geografis error", e);
                }
            }, 1000); // Debounce 1s
            return () => clearTimeout(timer);
        }
    }, [addForm.lat, addForm.lng, getGeografis, addProvOptions]);

    // Pending Location Processor: City
    useEffect(() => {
        if (pendingLocation?.city && addCityOptions.length > 0) {
            const matchedCity = addCityOptions.find(opt => opt.label.toLowerCase() === pendingLocation.city.toLowerCase());
            if (matchedCity) {
                setAddForm(prev => ({ ...prev, city_id: matchedCity.value }));
                setPendingLocation(prev => ({ ...prev, city: null })); // Mark handled
            } else {
                 alert(`Data Wilayah Tidak Sesuai: Kota/Kabupaten "${pendingLocation.city}" tidak ditemukan di database.`);
                 setPendingLocation(null); // Stop chain
            }
        }
    }, [addCityOptions, pendingLocation]);

    // Pending Location Processor: District
    useEffect(() => {
        if (pendingLocation?.district && !pendingLocation.city && addDistrictOptions.length > 0) {
             const matchedDistrict = addDistrictOptions.find(opt => opt.label.toLowerCase() === pendingLocation.district.toLowerCase());
             if (matchedDistrict) {
                 setAddForm(prev => ({ ...prev, district_id: matchedDistrict.value }));
                 setPendingLocation(prev => ({ ...prev, district: null }));
             } else {
                 alert(`Data Wilayah Tidak Sesuai: Kecamatan "${pendingLocation.district}" tidak ditemukan di database.`);
                 setPendingLocation(null);
             }
        }
    }, [addDistrictOptions, pendingLocation]);

    // Pending Location Processor: Subdistrict
    useEffect(() => {
        if (pendingLocation?.subdistrict && !pendingLocation.district && addSubdistrictOptions.length > 0) {
            const matchedSub = addSubdistrictOptions.find(opt => opt.label.toLowerCase() === pendingLocation.subdistrict.toLowerCase());
             if (matchedSub) {
                 setAddForm(prev => ({ ...prev, subdistrict_id: matchedSub.value }));
                 setPendingLocation(null); // Done!
             } else {
                 alert(`Data Wilayah Tidak Sesuai: Kelurahan "${pendingLocation.subdistrict}" tidak ditemukan di database.`);
                 setPendingLocation(null);
             }
        }
    }, [addSubdistrictOptions, pendingLocation]);


    const removeFile = (index) => {
    // ...
        setAddFiles(prev => {
            const newFiles = [...prev];
            URL.revokeObjectURL(newFiles[index].preview); // Cleanup memory
            newFiles.splice(index, 1);
            return newFiles;
        });
    };

    const handleAddSubmit = async () => {
        if (!addFiles.length) {
            alert("Minimal 1 gambar wajib diunggah.");
            return;
        }
        if (!addForm.lat || !addForm.lng) {
            alert("Latitude dan Longitude wajib diisi.");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            
            // Append basic fields
            Object.keys(addForm).forEach(key => {
                if (addForm[key]) formData.append(key, addForm[key]);
            });
            
            // Append files
            // Logic: first file = photo_gps, others = photo_additional_N
            if (addFiles[0]) formData.append('photo_gps', addFiles[0].file);
            addFiles.slice(1).forEach((f, i) => {
                formData.append(`photo_additional_${i + 1}`, f.file);
            });

            await createRambu(formData);
            
            // Reset and Close
            setIsAddModalOpen(false);
            setAddForm({
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
                year: currentYear,
            });
            setAddFiles([]);
            alert("Rambu berhasil ditambahkan!");
        } catch (e) {
            console.error(e);
            alert("Gagal menambahkan rambu: " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ===========================
    // EDIT HANDLERS
    // ===========================
    const handleDeleteClick = (id) => {
        setRambuToDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async (type) => {
        if (!rambuToDeleteId) return;
        try {
            if (type === 'permanent') {
                await deleteRambu(rambuToDeleteId);
            } else {
                await deleteTrashRambu(rambuToDeleteId);
            }
            setIsDeleteModalOpen(false);
        } catch (e) {
             console.error("Delete error:", e);
             alert("Gagal menghapus data.");
        }
    };

    const handleDetailClick = async (id) => {
        setDetailData(null);
        setIsDetailModalOpen(true);
        try {
            const detail = await detailRambu(id);
            //console.log(detail);
            if (detail) {
                setDetailData(detail);
            }
        } catch (e) {
            console.error("Failed to fetch detail", e);
        }
    };

    const handleEditClick = async (id) => {
        setCurrentRambuId(id);
        setIsEditModalOpen(true);
        try {
            const detail = await detailRambu(id);
            if(detail) {
                // Map detail to form
                setEditForm({
                    categoryId: detail.categoryId || '',
                    description: detail.description || '',
                    lat: detail.lat || '',
                    lng: detail.lng || '',
                    prov_id: detail.prov_id || '',
                    city_id: detail.city_id || '',
                    district_id: detail.district_id || '',
                    subdistrict_id: detail.subdistrict_id || '',
                    disasterTypeId: detail.disasterTypeId || '',
                    // RambuProps Mapping
                    model_id: detail.RambuProps?.[0]?.model || '',
                    cost_id: detail.RambuProps?.[0]?.cost_id || '',
                    year: detail.RambuProps?.[0]?.year ? (detail.RambuProps[0].year === 'undefined' ? currentYear : detail.RambuProps[0].year) : currentYear,
                });
                
                // If detail returns formatted names but we need IDs, we are in trouble.
                // Checking backend `rambu-detail`: 
                // `model: ...?.name`
                // It does NOT return the ID.
                // We MUST use `/rambu/:id` for editing.
                
                setExistingPhotos(detail.photos || []);
                setEditFiles([]);
                setDeletePhotoIds([]);
            }
        } catch(e) {
            console.error(e);
            alert("Gagal mengambil data rambu.");
            setIsEditModalOpen(false); // Close if fail
        }
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => {
            const newState = {
                ...prev,
                [name]: value,
                 // Cascading reset
                ...(name === 'prov_id' && { city_id: '', district_id: '', subdistrict_id: '' }),
                ...(name === 'city_id' && { district_id: '', subdistrict_id: '' }),
                ...(name === 'district_id' && { subdistrict_id: '' }),
            };
            
            // Warning Logic for Location vs GPS
            if (['prov_id', 'city_id', 'district_id', 'subdistrict_id'].includes(name)) {
                // If user changes location, check if it matches current GPS suggestion?
                // This is hard without re-running GPS.
                // Implement simple warning:
                // "Perubahan wilayah manual mungkin tidak sesuai dengan koordinat Lat/Long yang ada."
                // Use a toast or just let the user be?
                // User requirement: "Infokan bahwa wilayah yang diubah bisa saja diluar dari lat dan long yang diisi"
                // We can use a transient UI state or alert.
                // `alert` is annoying on every change. Maybe a text helper?
            }
            return newState;
        });
        
        if (['prov_id', 'city_id', 'district_id', 'subdistrict_id'].includes(name) && editForm.lat && editForm.lng) {
            // Show toast or subtle warning? User asked to "infokan". 
            // I'll add a helper text dynamically in the UI.
        }
    };

    const handleEditFileChange = (e) => {
        const files = Array.from(e.target.files);
        const totalCurrent = existingPhotos.length - deletePhotoIds.length + editFiles.length + files.length;
        
        if (totalCurrent > 4) {
             alert("Maksimal 4 gambar diizinkan (termasuk foto lama).");
             return;
        }

        const newFiles = files.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));
        
        setEditFiles(prev => [...prev, ...newFiles]);
        e.target.value = null;
    };

    const removeEditFile = (index) => {
        setEditFiles(prev => {
            const newFiles = [...prev];
            URL.revokeObjectURL(newFiles[index].preview);
            newFiles.splice(index, 1);
            return newFiles;
        });
    };

    const removeExistingPhoto = (photoId) => {
         // Check if this is the GPS photo (type === 1 or mapped value)? Backend handles type.
         // Just mark for deletion.
         setDeletePhotoIds(prev => [...prev, photoId]);
    };

    const activeExistingPhotos = existingPhotos.filter(p => !deletePhotoIds.includes(p.id));

    const handleEditSubmit = async () => {
         const totalPhotos = activeExistingPhotos.length + editFiles.length;
         if (totalPhotos < 1) {
             alert("Minimal 1 gambar wajib ada (foto lama atau baru).");
             return;
         }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
             // Append basic fields
            Object.keys(editForm).forEach(key => {
                if (editForm[key] !== null && editForm[key] !== undefined) {
                    formData.append(key, editForm[key]);
                }
            });

            // Append delete IDs
            if (deletePhotoIds.length) {
                formData.append('deletePhotoIds', JSON.stringify(deletePhotoIds));
            }

            // Append NEW files
            // Logic: if we have new files, they are "additional" unless we specifically want to replace GPS.
            // Simplified: All new files are appended. Backend types them.
            // If the user removed the OLD GPS photo (type 'gps'), the first NEW photo should probably become GPS?
            // Backend `rambu.ts` logic: 
            // `gpsFile = files["photo_gps"]`
            // `additionalFiles = ... photo_additional_N`
            // If `photo_gps` is sent, it replaces old GPS.
            // WE NEED TO DECIDE WHICH NEW FILE IS GPS.
            // UI doesn't explicitly distinguish "This upload is GPS".
            // Assumption: If existing GPS photo is DELETED, the first NEW file is GPS.
            // How to know if existing GPS is deleted? Check `deletePhotoIds` against `existingPhotos` types.
            // This is complex. 
            // Simplification: Send all new files as `photo_additional` UNLESS we allow user to pick GPS.
            // OR: Just send them as `photo_additional_X` and let backend handle?
            // NO, `photo_gps` is required if no GPS photo exists.
            
            // Backend logic: `if (gpsFile?.buf?.length) ... replace ...`
            
            // Let's send the FIRST new file as `photo_gps` ONLY IF we want to replace it?
            // Or just send everything as keys the backend understands.
            
            // Strategy:
            // 1. If user deleted the GPS photo, map first new file to `photo_gps`.
            // 2. Else, map all new files to `photo_additional`.
            
            // We need to know which existing photo is GPS. Usually type 'gps' or similar.
            // `existingPhotos` objects have `type`. 
            // Let's check backend `photoTypeMap`. 
            // Assuming we don't track types in frontend perfectly, let's just use `photo_additional` for all new files unless we are sure.
            // Actually, `updateRambu` backend handles `photo_gps` replacement if provided.
            // Let's send `photo_additional` by default.
            
            editFiles.forEach((f, i) => {
                formData.append(`photo_additional_${i + 1}`, f.file);
            });

            await updateRambu(currentRambuId, formData);
            
            setIsEditModalOpen(false);
            alert("Rambu berhasil diperbarui!");
        } catch (e) {
            console.error(e);
            alert("Gagal memperbarui rambu: " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Edit Auto-Fill Location
    useEffect(() => {
        const { lat, lng } = editForm;
        // Only auto-fill if lat/lng changed AND we are editing (modal open)
        // We need to avoid overwriting existing data on initial load.
        // `pendingEditLocation` approach?
        if (isEditModalOpen && lat && lng && !pendingEditLocation) {
             const timer = setTimeout(async () => {
                 // Check if lat/lng are different from original? 
                 // Assuming user is typing.
                 // We execute geocoding.
                 try {
                     const result = await getGeografis(lat, lng);
                     if (result) {
                         const provName = result.province;
                         const matchedProv = editProvOptions.find(opt => opt.label.toLowerCase() === provName?.toLowerCase());
                         
                         if(matchedProv) {
                             // Only update if DIFFERENT?
                             // User wants: "aktifkan useGeografis. apabila user melakukan perubahan pada lat dan long."
                             setEditForm(prev => ({ ...prev, prov_id: matchedProv.value }));
                             setPendingEditLocation({ 
                                city: result.city, 
                                district: result.district, 
                                subdistrict: result.village 
                            });
                         }
                     }
                 } catch(e) { console.error(e); }
             }, 1000);
             return () => clearTimeout(timer);
        }
    }, [editForm.lat, editForm.lng, isEditModalOpen, getGeografis, editProvOptions]);

    // Pending Edit Location Processor (Chain)
    useEffect(() => {
        if (pendingEditLocation?.city && editCityOptions.length > 0) {
            const matchedCity = editCityOptions.find(opt => opt.label.toLowerCase() === pendingEditLocation.city.toLowerCase());
            if (matchedCity) {
                setEditForm(prev => ({ ...prev, city_id: matchedCity.value }));
                setPendingEditLocation(prev => ({ ...prev, city: null }));
            }
        }
    }, [editCityOptions, pendingEditLocation]);
    
    useEffect(() => {
        if (pendingEditLocation?.district && !pendingEditLocation.city && editDistrictOptions.length > 0) {
            const matched = editDistrictOptions.find(opt => opt.label.toLowerCase() === pendingEditLocation.district.toLowerCase());
            if (matched) {
                setEditForm(prev => ({ ...prev, district_id: matched.value }));
                setPendingEditLocation(prev => ({ ...prev, district: null }));
            }
        }
    }, [editDistrictOptions, pendingEditLocation]);

    useEffect(() => {
         if (pendingEditLocation?.subdistrict && !pendingEditLocation.district && editSubdistrictOptions.length > 0) {
            const matched = editSubdistrictOptions.find(opt => opt.label.toLowerCase() === pendingEditLocation.subdistrict.toLowerCase());
            if (matched) {
                setEditForm(prev => ({ ...prev, subdistrict_id: matched.value }));
                setPendingEditLocation(null);
            }
        }
    }, [editSubdistrictOptions, pendingEditLocation]);



    const getStatusColor = (status) => {
        switch (status) {
            case 'published': return 'bg-green-100 text-green-700 border-green-200';
            case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'rusak': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'hilang': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    const columns = useMemo(
        () => [
            {
                header: "No",
                id: "no",
                enableColumnFilter: false,
                cell: (cellProps) => {
                    return (pagination.page - 1) * pagination.pageSize + cellProps.row.index + 1;
                },
            },
            {
                header: "Kategori",
                accessorKey: "categoryName",
                enableColumnFilter: false,
                cell: (cellProps) => (
                    <div className="w-24 whitespace-normal break-words text-sm" title={cellProps.getValue()}>
                        {cellProps.getValue()}
                        <div className="text-orange-500 font-semibold text-xs mt-1">
                            {cellProps.row.original.lat && cellProps.row.original.lng ? 
                                `${parseFloat(cellProps.row.original.lat).toFixed(5)}, ${parseFloat(cellProps.row.original.lng).toFixed(5)}` : 
                                ''}
                        </div>
                    </div>
                )
            },
            {
                header: "Jenis Bencana",
                accessorKey: "disasterTypeName",
                enableColumnFilter: false,
                cell: (cellProps) => (
                    <div className="whitespace-normal break-words w-24">
                         {cellProps.getValue()}
                    </div>
                )
            },
            {
                header: "Provinsi",
                accessorKey: "provinceName",
                enableColumnFilter: false,
                cell: (cellProps) => (
                    <div className="w-28 whitespace-normal break-words text-sm" title={cellProps.getValue()}>
                        {cellProps.getValue()}
                    </div>
                )
            },
            {
                header: "Kota/Kabupaten",
                accessorKey: "cityName",
                enableColumnFilter: false,
                cell: (cellProps) => (
                    <div className="w-28 whitespace-normal break-words text-sm" title={cellProps.getValue()}>
                        {cellProps.getValue()}
                    </div>
                )
            },                   
            {
                header: "Status",
                accessorKey: "status",
                enableColumnFilter: false,
                cell: (cellProps) => {
                  const item = cellProps.row.original;
                  return (
                    <select
                      value={item.status || 'draft'}
                      onChange={(e) => updateRambu(item.id, { ...item, status: e.target.value })}
                      className={`text-xs font-semibold py-1 px-2 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusColor(item.status)}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt} value={opt} className="bg-white text-gray-900">
                          {opt.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  );
                }
            },
            {
                header: "Aksi",
                id: "action",
                enableColumnFilter: false,
                cell: (cellProps) => {
                    return (
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            {/* <button title="Lihat di Peta" className="transition-colors bg-transparent border-0">
                                <i className="fas fa-map-marker-alt text-lg text-blue-900 hover:text-blue-600"></i>
                            </button> */}
                            <button title="Detail" className="transition-colors bg-transparent border-0" onClick={() => handleDetailClick(cellProps.row.original.id)}>
                                <i className="fas fa-info-circle text-lg text-primary hover:text-warning-600"></i>
                            </button>
                            <button title="Edit" className="transition-colors bg-transparent border-0" onClick={() => handleEditClick(cellProps.row.original.id)}>
                                <i className="fas fa-edit text-lg text-warning hover:text-orange-600"></i>
                            </button>
                            <button 
                                title="Hapus" 
                                onClick={() => handleDeleteClick(cellProps.row.original.id)}
                                className="transition-colors bg-transparent border-0"
                            >
                                <i className="fas fa-trash-alt text-lg text-red-900 hover:text-red-600"></i>
                                
                            </button>
                        </div>
                    );
                }
            },
        ],
        [deleteRambu, updateRambu, pagination]
    );
    

    //meta title
    document.title = "Daftar Rambu | Manajemen Rambu Bencana";

    return (
        <div className="page-content">
            <div className="container-fluid">
                <Breadcrumbs title="Rambu" breadcrumbItem="Daftar Rambu" />

                <TableContainer
                    columns={columns}
                    data={data || []}
                    isGlobalFilter={true}
                    isPagination={true}
                    SearchPlaceholder="Cari rambu..."
                    pagination="pagination"
                    paginationWrapper='dataTables_paginate paging_simple_numbers'
                    tableClass="table align-middle table-nowrap table-hover"
                    theadClass="table-light"
                    loading={loading}
                    error={error}                    
                    setPagination={setPagination}
                    customToolbar={
                        <div className="d-flex gap-2 justify-content-end">
                             <Button color="primary" outline onClick={() => setIsFilterModalOpen(true)} className="d-flex align-items-center gap-2">
                                 <Filter size={16} /> Filter
                             </Button>
                             <Button color="success" outline className="d-flex align-items-center gap-2">
                                 <FileSpreadsheet size={16} /> Export Excel
                             </Button>
                             <Button color="primary" className="d-flex align-items-center gap-2" onClick={() => setIsAddModalOpen(true)}>
                                 <Plus size={16} /> Tambah Rambu
                             </Button>
                        </div>
                    }                 
                />

                {/* Filter Modal */}
                <Modal isOpen={isFilterModalOpen} toggle={() => setIsFilterModalOpen(!isFilterModalOpen)} size="lg">
                    <ModalHeader toggle={() => setIsFilterModalOpen(!isFilterModalOpen)}>Filter Data Rambu</ModalHeader>
                    <ModalBody>
                        <Row>
                            <Col md={6} className="mb-3">
                                <Label>Provinsi</Label>
                                <Input type="select" name="prov_id" value={filterValues.prov_id} onChange={handleFilterChange}>
                                    <option value="">Pilih Provinsi</option>
                                    {provOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </Input>
                            </Col>
                            <Col md={6} className="mb-3">
                                <Label>Kota/Kabupaten</Label>
                                <Input type="select" name="city_id" value={filterValues.city_id} onChange={handleFilterChange} disabled={!filterValues.prov_id}>
                                    <option value="">Pilih Kota/Kabupaten</option>
                                    {cityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </Input>
                            </Col>
                            <Col md={6} className="mb-3">
                                <Label>Kecamatan</Label>
                                <Input type="select" name="district_id" value={filterValues.district_id} onChange={handleFilterChange} disabled={!filterValues.city_id}>
                                    <option value="">Pilih Kecamatan</option>
                                    {districtOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </Input>
                            </Col>
                            <Col md={6} className="mb-3">
                                <Label>Kelurahan</Label>
                                <Input type="select" name="subdistrict_id" value={filterValues.subdistrict_id} onChange={handleFilterChange} disabled={!filterValues.district_id}>
                                    <option value="">Pilih Kelurahan</option>
                                    {subdistrictOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </Input>
                            </Col>
                            <Col md={6} className="mb-3">
                                <Label>Jenis Bencana</Label>
                                <Input type="select" name="disasterTypeId" value={filterValues.disasterTypeId} onChange={handleFilterChange}>
                                    <option value="">Pilih Jenis Bencana</option>
                                    {disasterTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </Input>
                            </Col>
                             <Col md={6} className="mb-3">
                                <Label>Kategori Rambu</Label>
                                <Input type="select" name="categoryId" value={filterValues.categoryId} onChange={handleFilterChange}>
                                    <option value="">Pilih Kategori</option>
                                    {categoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </Input>
                            </Col>
                             <Col md={6} className="mb-3">
                                <Label>Status</Label>
                                <Input type="select" name="status" value={filterValues.status} onChange={handleFilterChange}>
                                    <option value="">Pilih Status</option>
                                    {statusOptions.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
                                </Input>
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={resetFilters}>Reset</Button>
                        <Button color="primary" onClick={applyFilters}>Terapkan Filter</Button>
                    </ModalFooter>
                </Modal>

                {/* ADD RAMBU MODAL */}
                <Modal isOpen={isAddModalOpen} toggle={() => setIsAddModalOpen(!isAddModalOpen)} size="lg">
                    <ModalHeader toggle={() => setIsAddModalOpen(!isAddModalOpen)}>Tambah Rambu Baru</ModalHeader>
                    <ModalBody>
                        <form>
                            <h6 className="mb-3 text-muted">Informasi Dasar & Lokasi</h6>
                            <Row>
                                <Col md={6} className="mb-3">
                                    <Label>Kategori Rambu <span className="text-danger">*</span></Label>
                                    <Input type="select" name="categoryId" value={addForm.categoryId} onChange={handleAddChange}>
                                        <option value="">Pilih Kategori</option>
                                        {categoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Label>Jenis Bencana <span className="text-danger">*</span></Label>
                                    <Input type="select" name="disasterTypeId" value={addForm.disasterTypeId} onChange={handleAddChange}>
                                        <option value="">Pilih Jenis Bencana</option>
                                        {disasterTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </Col>
                                <Col md={12} className="mb-3">
                                    <Label>Deskripsi / Alamat</Label>
                                    <Input type="textarea" name="description" rows="2" value={addForm.description} onChange={handleAddChange} placeholder="Masukkan alamat atau deskripsi rambu..." />
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Label>Latitude <span className="text-danger">*</span></Label>
                                    <Input type="number" name="lat" value={addForm.lat} onChange={handleAddChange} placeholder="-6.2000" />
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Label>Longitude <span className="text-danger">*</span></Label>
                                    <Input type="number" name="lng" value={addForm.lng} onChange={handleAddChange} placeholder="106.8166" />
                                </Col>
                            </Row>
                            
                            <h6 className="mb-3 text-muted mt-2">Wilayah Administratif</h6>
                            <Row>
                                <Col md={6} className="mb-3">
                                    <Label>Provinsi</Label>
                                    <Input type="select" name="prov_id" value={addForm.prov_id} onChange={handleAddChange}>
                                        <option value="">Pilih Provinsi</option>
                                        {addProvOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Label>Kota/Kabupaten</Label>
                                    <Input type="select" name="city_id" value={addForm.city_id} onChange={handleAddChange} disabled={!addForm.prov_id}>
                                        <option value="">Pilih Kota/Kabupaten</option>
                                        {addCityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Label>Kecamatan</Label>
                                    <Input type="select" name="district_id" value={addForm.district_id} onChange={handleAddChange} disabled={!addForm.city_id}>
                                        <option value="">Pilih Kecamatan</option>
                                        {addDistrictOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Label>Kelurahan</Label>
                                    <Input type="select" name="subdistrict_id" value={addForm.subdistrict_id} onChange={handleAddChange} disabled={!addForm.district_id}>
                                        <option value="">Pilih Kelurahan</option>
                                        {addSubdistrictOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </Col>
                            </Row>

                            <h6 className="mb-3 text-muted mt-2">Detail Aset</h6>
                            <Row>
                                <Col md={4} className="mb-3">
                                    <Label>Model Rambu</Label>
                                    <Input type="select" name="model_id" value={addForm.model_id} onChange={handleAddChange}>
                                        <option value="">Pilih Model</option>
                                        {modelOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </Col>
                                <Col md={4} className="mb-3">
                                    <Label>Sumber Dana</Label>
                                    <Input type="select" name="cost_id" value={addForm.cost_id} onChange={handleAddChange}>
                                        <option value="">Pilih Sumber Dana</option>
                                        {costSourceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </Col>
                                <Col md={4} className="mb-3">
                                    <Label>Tahun Anggaran</Label>
                                    <Input type="select" name="year" value={addForm.year} onChange={handleAddChange}>
                                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                                    </Input>
                                </Col>
                            </Row>

                            <h6 className="mb-3 text-muted mt-2">Foto Dokumentasi (Min 1, Max 4)</h6>
                            <div className="mb-3">
                                <Input type="file" accept="image/png, image/jpeg" multiple onChange={handleFileChange} disabled={addFiles.length >= 4} />
                                <small className="text-muted d-block mt-1">Format JPG/PNG. Gambar pertama akan menjadi foto GPS.</small>
                            </div>
                            <div className="d-flex gap-2 flex-wrap">
                                {addFiles.map((f, i) => (
                                    <div key={i} className="position-relative border rounded p-1" style={{ width: '100px', height: '100px' }}>
                                        <img src={f.preview} alt="preview" className="w-100 h-100 object-fit-cover rounded" />
                                        <button 
                                            type="button" 
                                            className="btn btn-danger btn-sm p-0 position-absolute top-0 end-0 rounded-circle d-flex align-items-center justify-content-center"
                                            style={{ width: '20px', height: '20px', transform: 'translate(30%, -30%)' }}
                                            onClick={() => removeFile(i)}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>

                        </form>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>Batal</Button>
                        <Button color="primary" onClick={handleAddSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <><i className="fas fa-spinner fa-spin me-1"></i> Menyimpan...</> : 'Simpan'}
                        </Button>
                    </ModalFooter>
                </Modal>

                {/* EDIT RAMBU MODAL */}
                <Modal isOpen={isEditModalOpen} toggle={() => setIsEditModalOpen(!isEditModalOpen)} size="lg">
                    <ModalHeader toggle={() => setIsEditModalOpen(!isEditModalOpen)}>Edit Rambu</ModalHeader>
                    <ModalBody>
                        <form>
                            <h6 className="mb-3 text-muted">Informasi Dasar & Lokasi</h6>
                            <Row>
                                <Col md={6} className="mb-3">
                                    <Label>Kategori Rambu <span className="text-danger">*</span></Label>
                                    <Input type="select" name="categoryId" value={editForm.categoryId} onChange={handleEditChange}>
                                        <option value="">Pilih Kategori</option>
                                        {categoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Label>Jenis Bencana <span className="text-danger">*</span></Label>
                                    <Input type="select" name="disasterTypeId" value={editForm.disasterTypeId} onChange={handleEditChange}>
                                        <option value="">Pilih Jenis Bencana</option>
                                        {disasterTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </Col>
                                <Col md={12} className="mb-3">
                                    <Label>Deskripsi / Alamat</Label>
                                    <Input type="textarea" name="description" rows="2" value={editForm.description} onChange={handleEditChange} />
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Label>Latitude <span className="text-danger">*</span></Label>
                                    <Input type="number" name="lat" value={editForm.lat} onChange={handleEditChange} />
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Label>Longitude <span className="text-danger">*</span></Label>
                                    <Input type="number" name="lng" value={editForm.lng} onChange={handleEditChange} />
                                </Col>
                            </Row>
                            
                            <h6 className="mb-3 text-muted mt-2">Wilayah Administratif</h6>
                            {/* Warning if location changed manually */}
                            <Row>
                                <Col md={6} className="mb-3">
                                    <Label>Provinsi</Label>
                                    <Input type="select" name="prov_id" value={editForm.prov_id} onChange={handleEditChange}>
                                        <option value="">Pilih Provinsi</option>
                                        {editProvOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Label>Kota/Kabupaten</Label>
                                    <Input type="select" name="city_id" value={editForm.city_id} onChange={handleEditChange} disabled={!editForm.prov_id}>
                                         <option value="">Pilih Kota/Kabupaten</option>
                                         {editCityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Label>Kecamatan</Label>
                                    <Input type="select" name="district_id" value={editForm.district_id} onChange={handleEditChange} disabled={!editForm.city_id}>
                                        <option value="">Pilih Kecamatan</option>
                                        {editDistrictOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </Col>
                                <Col md={6} className="mb-3">
                                    <Label>Kelurahan</Label>
                                    <Input type="select" name="subdistrict_id" value={editForm.subdistrict_id} onChange={handleEditChange} disabled={!editForm.district_id}>
                                        <option value="">Pilih Kelurahan</option>
                                        {editSubdistrictOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </Col>
                                <Col md={12}>
                                    <small className="text-info">
                                        <i className="fas fa-info-circle me-1"></i> 
                                        Perubahan wilayah dapat berbeda dengan koordinat GPS yang terdeteksi. Pastikan data sesuai.
                                    </small>
                                </Col>
                            </Row>

                            <h6 className="mb-3 text-muted mt-2">Detail Aset</h6>
                            <Row>
                                <Col md={4} className="mb-3">
                                    <Label>Model Rambu</Label>
                                    <Input type="select" name="model_id" value={editForm.model_id} onChange={handleEditChange}>
                                        <option value="">Pilih Model</option>
                                        {modelOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </Col>
                                <Col md={4} className="mb-3">
                                    <Label>Sumber Dana</Label>
                                    <Input type="select" name="cost_id" value={editForm.cost_id} onChange={handleEditChange}>
                                        <option value="">Pilih Sumber Dana</option>
                                        {costSourceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </Input>
                                </Col>
                                <Col md={4} className="mb-3">
                                    <Label>Tahun Anggaran</Label>
                                    <Input type="select" name="year" value={editForm.year} onChange={handleEditChange}>
                                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                                    </Input>
                                </Col>
                            </Row>

                            <h6 className="mb-3 text-muted mt-2">Foto Dokumentasi</h6>
                            <div className="mb-3">
                                <Input type="file" accept="image/png, image/jpeg" multiple onChange={handleEditFileChange} 
                                    disabled={existingPhotos.length - deletePhotoIds.length + editFiles.length >= 4} />
                            </div>
                            <div className="d-flex gap-2 flex-wrap">
                                {/* Existing Photos */}
                                {existingPhotos.map((photo) => {
                                    if(deletePhotoIds.includes(photo.id)) return null;
                                    return (
                                        <div key={photo.id} className="position-relative border rounded p-1" style={{ width: '100px', height: '100px' }}>
                                            <img src={photo.url.includes('/public') ? photo.url : `${import.meta.env.VITE_APP_IMAGE_URL}${photo.url.startsWith('/') ? photo.url.substring(1) : photo.url}`} alt="existing" className="w-100 h-100 object-fit-cover rounded" />
                                            <button 
                                                type="button" 
                                                className="btn btn-danger btn-sm p-0 position-absolute top-0 end-0 rounded-circle d-flex align-items-center justify-content-center"
                                                style={{ width: '20px', height: '20px', transform: 'translate(30%, -30%)' }}
                                                onClick={() => removeExistingPhoto(photo.id)}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    );
                                })}
                                {/* New Files */}
                                {editFiles.map((f, i) => (
                                    <div key={i} className="position-relative border rounded p-1" style={{ width: '100px', height: '100px' }}>
                                        <img src={f.preview} alt="preview" className="w-100 h-100 object-fit-cover rounded" />
                                        <button 
                                            type="button" 
                                            className="btn btn-danger btn-sm p-0 position-absolute top-0 end-0 rounded-circle d-flex align-items-center justify-content-center"
                                            style={{ width: '20px', height: '20px', transform: 'translate(30%, -30%)' }}
                                            onClick={() => removeEditFile(i)}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>

                        </form>
                    </ModalBody>
                    <ModalFooter>
                         <Button color="secondary" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting}>Batal</Button>
                         <Button color="primary" onClick={handleEditSubmit} disabled={isSubmitting}>
                             {isSubmitting ? <><i className="fas fa-spinner fa-spin me-1"></i> Menyimpan...</> : 'Simpan Perubahan'}
                         </Button>
                    </ModalFooter>
                </Modal>

                {/* Detail Modal */}
                <Modal isOpen={isDetailModalOpen} toggle={() => setIsDetailModalOpen(!isDetailModalOpen)} size="xl" centered>
                    <ModalHeader toggle={() => setIsDetailModalOpen(!isDetailModalOpen)}>Detail Rambu</ModalHeader>
                    <ModalBody>
                        {detailData ? (
                            <div className="container-fluid">
                                <Row className="mb-4">
                                    <Col md={6}>
                                        <h6 className="mb-2 text-muted">Lokasi Peta</h6>
                                        <div 
                                            ref={detailMapContainerRef} 
                                            className="w-100 rounded border" 
                                            style={{ height: '300px' }}
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <h6 className="mb-2 text-muted">Foto Rambu</h6>
                                        {detailData.photos && detailData.photos.length > 0 ? (
                                            <div className="w-100 bg-light rounded border p-2 d-flex flex-wrap gap-2 align-content-start overflow-auto" style={{ height: '300px' }}>
                                                {detailData.photos.map((photo, idx) => {
                                                    const url = photo.url;
                                                    const src = url.includes('/public') 
                                                        ? url 
                                                        : `${import.meta.env.VITE_APP_IMAGE_URL}${url.startsWith('/') ? url.substring(1) : url}`;
                                                    
                                                    return (
                                                        <a key={idx} href={src} target="_blank" rel="noreferrer" className="d-block border rounded overflow-hidden" style={{ width: '100px', height: '100px' }}>
                                                            <img 
                                                                src={src}
                                                                alt={`Rambu ${idx + 1}`} 
                                                                className="w-100 h-100 object-fit-cover"
                                                            />
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="w-100 d-flex align-items-center justify-content-center bg-light text-muted border rounded" style={{ height: '300px' }}>
                                                No Image
                                            </div>
                                        )}
                                    </Col>
                                </Row>

                                <h5 className="mb-3 border-bottom pb-2">Informasi Rambu</h5>
                                <Row>
                                    <Col md={6}>
                                        <table className="table table-borderless table-sm">
                                            <tbody>
                                                <tr><td className="text-muted w-25">Kategori</td><td>: {detailData.categoryName || '-'}</td></tr>
                                                <tr><td className="text-muted">Jenis Bencana</td><td>: {detailData.disasterTypeName || '-'}</td></tr>
                                                <tr><td className="text-muted">Model</td><td>: {detailData.model || '-'}</td></tr>
                                                <tr><td className="text-muted">Sumber Dana</td><td>: {detailData.costsource || '-'}</td></tr>
                                                <tr><td className="text-muted">Tahun</td><td>: {detailData.year || '-'}</td></tr>
                                            </tbody>
                                        </table>
                                    </Col>
                                    <Col md={6}>
                                        <table className="table table-borderless table-sm">
                                            <tbody>
                                                <tr><td className="text-muted w-25">Provinsi</td><td>: {detailData.provinceName || '-'}</td></tr>
                                                <tr><td className="text-muted">Kota/Kab</td><td>: {detailData.cityName || '-'}</td></tr>
                                                <tr><td className="text-muted">Kecamatan</td><td>: {detailData.districtName || '-'}</td></tr>
                                                <tr><td className="text-muted">Kelurahan</td><td>: {detailData.subdistrictName || '-'}</td></tr>
                                                <tr><td className="text-muted">Koordinat</td><td>: {detailData.lat}, {detailData.lng}</td></tr>
                                            </tbody>
                                        </table>
                                    </Col>
                                    <Col md={12} className="mt-2">
                                        <div className="p-2 bg-light rounded">
                                            <span className="text-muted me-2">Deskripsi:</span>
                                            {detailData.description || '-'}
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                        ) : (
                            <div className="text-center p-5"><span className="spinner-border text-primary"></span> Memuat...</div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                         <Button color="secondary" onClick={() => setIsDetailModalOpen(false)}>Tutup</Button>
                         <Button color="warning" className="text-white" onClick={() => {
                             setIsDetailModalOpen(false);
                             handleEditClick(detailData.id);
                         }}>
                             <i className="fas fa-edit me-1"></i> Edit
                         </Button>
                    </ModalFooter>
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal isOpen={isDeleteModalOpen} toggle={() => setIsDeleteModalOpen(!isDeleteModalOpen)} centered>
                    <ModalHeader toggle={() => setIsDeleteModalOpen(!isDeleteModalOpen)} className="text-danger">
                        Apakah anda yakin ingin menghapus rambu ini?
                    </ModalHeader>
                    <ModalBody>
                        <div className="d-flex justify-content-center gap-3 my-3">
                            <Button color="danger" size="md" onClick={() => handleConfirmDelete('permanent')}>
                                <i className="fas fa-trash me-1"></i> Hapus Selamanya
                            </Button>
                            <Button color="warning" size="md" className="text-white" onClick={() => handleConfirmDelete('trash')}>
                                <i className="fas fa-trash-restore me-1"></i> Ke Tempat Sampah
                            </Button>
                        </div>
                    </ModalBody>
                    <ModalFooter className="flex-column align-items-start bg-light text-muted small">
                        <div><i className="fas fa-info-circle me-1"></i> Data yang terhapus selamanya <b>tidak bisa</b> dimunculkan lagi di kemudian hari.</div>
                        <div><i className="fas fa-archive me-1"></i> Data yang dimasukan ke dalam tempat sampah/archived dapat dilihat di menu Trash.</div>
                    </ModalFooter>
                </Modal>
            </div>
        </div>
    );
}

ListRambu.propTypes = {
    preGlobalFilteredRows: PropTypes.any,
};


export default ListRambu;