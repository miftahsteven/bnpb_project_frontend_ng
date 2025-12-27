import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_APP_DATABASEURL;

const useReport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getDashboardStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    const auth = localStorage.getItem('auth');
    const token = auth ? JSON.parse(auth).token : null;
    //console.log(token);
    try {
      const response = await axios.get(`${API_URL}/dashboard-stats`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getDashboardStats,
    loading,
    error,
  };
};

export default useReport;
