import { useState } from 'react';
import axios from 'axios';

const useExcel = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_APP_DATABASEURL;

  const importExcel = async (file) => {
    setLoading(true);
    setError(null);

    try {
      // Backend expects a multipart/form-data upload
      const formData = new FormData();
      formData.append('file', file);

      // axios automatically sets 'Content-Type': 'multipart/form-data' when sending FormData
      // but explicitly setting headers doesn't hurt, though axios does it best automatically.
      const response = await axios.post(`${API_BASE_URL}/import-excel`, formData, {
         headers: {
             'Content-Type': 'multipart/form-data'
         }
      });
      return response.data;
    } catch (err) {
      console.error("Upload error", err);
      const msg = err.response?.data?.message || err.message;
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  return { importExcel, loading, error };
};

export default useExcel;
