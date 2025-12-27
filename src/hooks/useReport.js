import { useState, useCallback } from 'react';
import api from '../api/axios';

const useReport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getDashboardStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/dashboard-stats');
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getReportPerProvince = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/report-perprovince');
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getReportPerUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/report-peruser');
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
    getReportPerProvince,
    getReportPerUser,
    loading,
    error,
  };
};

export default useReport;
