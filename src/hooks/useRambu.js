import { useState, useEffect, useCallback } from 'react';

const BASE_URL = import.meta.env.VITE_APP_DATABASEURL;

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
      const authData = localStorage.getItem("auth");
      const token = authData ? JSON.parse(authData).token : null;
      
      const queryParams = new URLSearchParams({
        page,
        pageSize,
        ...filters
      });

      const response = await fetch(`${BASE_URL}/rambu-crud?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch Rambu data');
      
      const result = await response.json();
      setData(result.data || []);
      setPagination(prev => ({
        ...prev,
        page,
        pageSize,
        total: result.total || (result.data ? result.data.length : 0)
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllRambu = useCallback(async (filters = {}) => {
    try {
        const authData = localStorage.getItem("auth");
        const token = authData ? JSON.parse(authData).token : null;
        
        // Use a large pageSize to get all data (or handle recursive paging if needed)
        // For now, assuming 10000 is enough or backend handles 'all'
        const queryParams = new URLSearchParams({
          page: 1,
          pageSize: 10000, 
          ...filters
        });
  
        const response = await fetch(`${BASE_URL}/rambu-crud?${queryParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch filter data');
        
        const result = await response.json();
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
      const authData = localStorage.getItem("auth");
      const token = authData ? JSON.parse(authData).token : null;
      
      const response = await fetch(`${BASE_URL}/rambu-detail/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch Rambu data');
      
      const result = await response.json();
      return result.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRambuForEdit = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const authData = localStorage.getItem("auth");
      const token = authData ? JSON.parse(authData).token : null;
      
      const response = await fetch(`${BASE_URL}/rambu/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch Rambu data');
      
      const result = await response.json();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createRambu = async (payload) => {
    setLoading(true);
    try {
      const authData = localStorage.getItem("auth");
      const token = authData ? JSON.parse(authData).token : null;
      
      const isFormData = payload instanceof FormData;
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${BASE_URL}/rambu`, {
        method: 'POST',
        headers,
        body: isFormData ? payload : JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errRes = await response.json();
        throw new Error(errRes.error || 'Failed to create Rambu');
      }
      
      await fetchRambu(pagination.page, pagination.pageSize);
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateRambu = async (id, payload) => {
    setLoading(true);
    try {
      const authData = localStorage.getItem("auth");
      const token = authData ? JSON.parse(authData).token : null;
      
      const isFormData = payload instanceof FormData;
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${BASE_URL}/rambu/${id}`, {
        method: 'PATCH',
        headers,
        body: isFormData ? payload : JSON.stringify(payload),
      });
      
      if (!response.ok) {
         try {
            const errRes = await response.json();
            throw new Error(errRes.error || 'Failed to update Rambu');
         } catch (e) {
            throw new Error('Failed to update Rambu (Status ' + response.status + ')');
         }
      }
      await fetchRambu(pagination.page, pagination.pageSize);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteRambu = async (id) => {
    setLoading(true);
    try {
      const authData = localStorage.getItem("auth");
      const token = authData ? JSON.parse(authData).token : null;
      const response = await fetch(`${BASE_URL}/rambu/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete Rambu');
      await fetchRambu(pagination.page, pagination.pageSize);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteTrashRambu = async (id) => {
    setLoading(true);
    try {
      const authData = localStorage.getItem("auth");
      const token = authData ? JSON.parse(authData).token : null;
      const response = await fetch(`${BASE_URL}/rambu-trash/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete Rambu');
      await fetchRambu(pagination.page, pagination.pageSize);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateRambuStatus = async (id, status) => {
    setLoading(true);
    try {
      const authData = localStorage.getItem("auth");
      const token = authData ? JSON.parse(authData).token : null;
      const response = await fetch(`${BASE_URL}/rambu-status/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to update Rambu status');
      await fetchRambu(pagination.page, pagination.pageSize);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRambu(pagination.page, pagination.pageSize);
  }, [fetchRambu, pagination.page, pagination.pageSize]);

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
    deleteTrashRambu,
    getRambuForEdit,
    updateRambuStatus,
    fetchAllRambu
  };
};

export default useRambu;
