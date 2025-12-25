import { useState, useCallback } from 'react';

const BASE_URL = import.meta.env.VITE_APP_DATABASEURL;

const useGeografis = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getGeografis = useCallback(async (lat, long) => {
    setLoading(true);
    setError(null);
    try {
      const authData = localStorage.getItem('auth');
      const token = authData ? JSON.parse(authData).token : null;
      
      const response = await fetch(`${BASE_URL}/ref/geografis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lat: parseFloat(lat), long: parseFloat(long) })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch geografis data');
      }

      const result = await response.json();
      setData(result.data);
      return result.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, getGeografis };
};

export default useGeografis;
