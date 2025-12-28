import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const useRambu = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchRambu = useCallback(async (page = 1, pageSize = 10, filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        pageSize,
        status: ["draft", "published", "rusak", "hilang"],
        ...filters
      };

      // Ensure status is sent as comma-separated string for backend compatibility
      if (Array.isArray(params.status)) {
          params.status = params.status.join(',');
      }

      const response = await api.get('/rambu-crud', { params });
      
      const result = response.data;
      setData(result.data || []);
      setPagination(prev => ({
        ...prev,
        page,
        pageSize,
        total: result.total || (result.data ? result.data.length : 0)
      }));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch Rambu data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllRambu = useCallback(async (filters = {}) => {
    try {
        const params = {
          page: 1,
          pageSize: 10000, 
          ...filters
        };
  
        const response = await api.get('/rambu-crud', { params });
        const result = response.data;
        return result.data || [];
    } catch (err) {
        console.error(err);
        return [];
    }
  }, []);

  const detailRambu = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/rambu-detail/${id}`);
      // Usually API returns { data: ... } wrapped
      // Check original: const result = await response.json(); return result.data;
      return response.data.data;
    } catch (err) {
      setError(err?.message || 'Failed to load detail');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRambuForEdit = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/rambu/${id}`);
      // Original: return result; (where result = await response.json())
      return response.data;
    } catch (err) {
      console.error(err);
      setError(err?.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createRambu = async (payload) => {
    setLoading(true);
    try {
      // Axios handles FormData vs JSON automatically
      const response = await api.post('/rambu', payload);
      
      await fetchRambu(pagination.page, pagination.pageSize);
      return response.data;
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Failed to create Rambu';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const updateRambu = async (id, payload) => {
    setLoading(true);
    try {
      const response = await api.patch(`/rambu/${id}`, payload);
      await fetchRambu(pagination.page, pagination.pageSize);
      return response.data;
    } catch (err) {
       const msg = err?.response?.data?.error || 'Failed to update Rambu';
       setError(msg);
       throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const deleteRambu = async (id) => {
    setLoading(true);
    try {
      await api.delete(`/rambu/${id}`);
      await fetchRambu(pagination.page, pagination.pageSize);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to delete Rambu';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const deleteTrashRambu = async (id) => {
    setLoading(true);
    try {
      await api.put(`/rambu-trash/${id}`);
      await fetchRambu(pagination.page, pagination.pageSize);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to delete Rambu';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const updateRambuStatus = async (id, status) => {
    setLoading(true);
    try {
      await api.put(`/rambu-status/${id}`, { status });
      await fetchRambu(pagination.page, pagination.pageSize);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to update Rambu status';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };



  return {
    data,
    loading,
    error,
    pagination,
    setPagination,
    fetchRambu,
    createRambu,
    updateRambu,
    deleteRambu,
    detailRambu,
    deleteTrashRambu,
    getRambuForEdit,
    updateRambuStatus,
    fetchAllRambu
  };
};

export default useRambu;
