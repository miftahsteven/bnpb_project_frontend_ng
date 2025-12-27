import React, { useEffect, useState } from 'react';
import { Container } from 'reactstrap';
import useReport from '../../hooks/useReport';
import ReactApexChart from "react-apexcharts";


const Report = () => {
  const { getDashboardStats, getReportPerProvince, getReportPerUser, loading, error } = useReport();
  const [data, setData] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const [statsResponse, provinceResponse, userResponse] = await Promise.all([
        getDashboardStats(),
        getReportPerProvince(),
        getReportPerUser()
      ]);
      
      const mergedData = {
        summary: statsResponse?.summary || {},
        rambuPerProvince: provinceResponse?.data || [],
        rambuPerUser: userResponse?.data || []
      };
      
      setData(mergedData);
    };
    fetchData();
  }, [getDashboardStats, getReportPerProvince, getReportPerUser]);

  const summary = data?.summary || {};

  const stats = [
    { label: 'Rambu Draft', value: summary.draft || 0, bg: '#E3F2FD', color: '#1976D2' },
    { label: 'Rambu Published', value: summary.published || 0, bg: '#E8F5E9', color: '#2E7D32' },
    { label: 'Rambu Rusak', value: summary.rusak || 0, bg: '#FFF3E0', color: '#EF6C00' },
    { label: 'Rambu Hilang', value: summary.hilang || 0, bg: '#FFEBEE', color: '#C62828' },
    { label: 'Total Semua Rambu', value: summary.total || 0, bg: '#F3E5F5', color: '#7B1FA2' },
  ];

  const rambuPerProvince = data?.rambuPerProvince || [];

  const options = {
    chart: {
      type: 'bar',
      height: 350,
      zoom: {
        enabled: false
      }
    },
    plotOptions: {
      bar: {
        horizontal: true, // Horizontal bars for easier reading of province names
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: rambuPerProvince.map((item) => item.label),
    },
    title: {
      text: 'Jumlah Rambu per Provinsi',
      align: 'left'
    }
  };

  const series = [
    {
      name: 'Jumlah Rambu',
      data: rambuPerProvince.map((item) => item.value),
    },
  ];    

  const rambuPerUser = data?.rambuPerUser || [];

  const optionsUser = {
    chart: {
      type: 'bar',
      height: 350,
      zoom: {
        enabled: false
      }
    },
    plotOptions: {
      bar: {
        horizontal: true, // Horizontal bars for easier reading of province names
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: rambuPerUser.map((item) => item.label),
    },
    title: {
      text: 'Jumlah Rambu per User',
      align: 'left'
    }
  };

  const seriesUser = [
    {
      name: 'Jumlah Rambu',
      data: rambuPerUser.map((item) => item.value),
    },
  ];        

  return (
    <div className="page-content">
    <Container fluid>        
      <div className="row g-3 mb-4">
        {stats.map((item, index) => (
          <div key={index} className="col">
            <div 
              className="card border-0 shadow-sm" 
              style={{ 
                backgroundColor: item.bg, 
                borderRadius: '15px',
                transition: 'transform 0.2s'
              }}
            >
              <div className="card-body p-4 text-center">
                <div 
                  className="text-uppercase mb-2 fw-bold" 
                  style={{ fontSize: '0.75rem', color: item.color, letterSpacing: '0.5px' }}
                >
                  {item.label}
                </div>
                <div 
                  className="h2 mb-0 fw-bold" 
                  style={{ color: '#2c3e50' }}
                >
                  {item.value.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="row">
        <div className="col-12 col-md-6">
            <div className="card border-0 shadow-sm">
                <div className="card-body">
                    <ReactApexChart
                        options={options}
                        series={series}
                        type="bar"
                        height={350}
                        className="apex-charts"
                    />  
                </div>
            </div>
        </div>
        <div className="col-12 col-md-6">
            <div className="card border-0 shadow-sm">
                <div className="card-body">
                    <ReactApexChart
                        options={optionsUser}
                        series={seriesUser}
                        type="bar"
                        height={350}
                        className="apex-charts"
                    />  
                </div>
            </div>  
        </div>
      </div>
    </Container>    
    </div>
  );
};

export default Report;
