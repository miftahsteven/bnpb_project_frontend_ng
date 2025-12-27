import { useState, useCallback } from 'react';

const BASE_URL = import.meta.env.VITE_APP_DATABASEURL;

const useUser = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [satuanKerja, setSatuanKerja] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  // Get token from localStorage
  const authData = localStorage.getItem("auth");
  const token = authData ? JSON.parse(authData).token : null;

  const fetchUsers = useCallback(async (page = 1, pageSize = 10, filters = {}) => {
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
  
        const response = await fetch(`${BASE_URL}/users-crud?${queryParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch users data');
        
        const result = await response.json();
        setUsers(result.data || []);
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

  const getUser = useCallback(async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/users/${id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch user detail');
      const result = await response.json();
      return result.data || result;
    } catch (err) {
      setError(err.message || 'Failed to fetch user detail');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createUser = async (userData) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error('Failed to create user');
      const result = await response.json();
      await fetchUsers();
      return result;
    } catch (err) {
      setError(err.message || 'Failed to create user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id, userData) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error('Failed to update user');
      const result = await response.json();
      await fetchUsers();
      return result;
    } catch (err) {
      setError(err.message || 'Failed to update user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/users/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,          
        },
      });
      if (!response.ok) throw new Error('Failed to delete user');
      await fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchSatuanKerja = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/users/satuan-kerja`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch satuan kerja');
      const result = await response.json();
      setSatuanKerja(Array.isArray(result) ? result : (result.data || []));
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch satuan kerja');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    users,
    loading,
    error,
    fetchUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    fetchSatuanKerja,
    satuanKerja,
    pagination,
    setPagination
  };
};

export default useUser;
