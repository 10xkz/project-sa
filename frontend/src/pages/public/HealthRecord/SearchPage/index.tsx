import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { message, Spin } from 'antd';
import { 
  Input, 
  Card,
  Typography,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { DogInterface } from '../../../../interfaces/Dog';
import { healthRecordAPI } from '../../../../services/apis';
import "./style.css";

const { Title, Text } = Typography;

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [dogSearchResults, setDogSearchResults] = useState<DogInterface[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      const fetchDogs = async () => {
        if (searchQuery.trim()) {
          setLoading(true);
          setHasSearched(true);
          try {
            const results = await healthRecordAPI.searchDogs(searchQuery.trim());
            setDogSearchResults(results || []);
          } catch (error) {
            message.error('เกิดข้อผิดพลาดในการค้นหาสุนัข');
            console.error('Search error:', error);
            setDogSearchResults([]);
          } finally {
            setLoading(false);
          }
        } else {
          setDogSearchResults([]);
          setHasSearched(false);
          setLoading(false);
        }
      };
      fetchDogs();
    }, 300); // 300ms delay for debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDogSelect = (dog: DogInterface) => {
    if (dog.ID) {
      navigate(`/dashboard/health-record/dog/${dog.ID}`);  
    } else {
      message.error('ไม่สามารถเปิดข้อมูลสุนัขได้');
    }
  };


  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="search-page">
      <div className="search-header">
        <Title level={2} className="page-title">
          บันทึกสุขภาพสุนัข
        </Title>
        <div className="title-underline"></div>
        
        <div className="search-container">
          <Input
            placeholder="ค้นหาด้วยชื่อหรือรหัสสุนัข"
            value={searchQuery}
            onChange={handleSearchChange}
            suffix={loading ? <Spin size="small" /> : <SearchOutlined />}
            size="large"
            className="search-input"
            style={{width: '100%', maxWidth: '1200px'}}
          />
        </div>
      </div>

      <div className="search-results">
        {loading && searchQuery && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>
              <Text type="secondary">กำลังค้นหา...</Text>
            </div>
          </div>
        )}

        {!loading && hasSearched && dogSearchResults.length === 0 && searchQuery.trim() && (
          <div className="no-results">
            <div className="dog-silhouette" />
            <Text type="secondary" style={{ fontFamily: 'Anakotmai-Bold' }}>
              ไม่พบสุนัขที่ค้นหา
            </Text>
          </div>
        )}

        {!loading && dogSearchResults.map((dog) => (
          <Card 
            key={dog.ID}
            className="dog-result-card"
            onClick={() => handleDogSelect(dog)}
            hoverable
          >
            <div className="dog-image">
              <img 
                src={dog.photo_url || '/default-dog-image.jpg'} 
                alt={dog.name || 'Dog'}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/default-dog-image.jpg'; // fallback image
                }}
              />
            </div>
            
            <div className="dog-info">
              <Title level={4} className="dog-name">{dog.name}</Title>
              <Text type="secondary">ID: {dog.ID}</Text>
              
              {dog.breed && (
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary">สายพันธุ์: {dog.breed.name}</Text>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SearchPage;