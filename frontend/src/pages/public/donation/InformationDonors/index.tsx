import React, { useState, useEffect } from "react";
import './style.css';

import { useNavigate } from "react-router-dom";
import type { DonorInterface } from '../../../../interfaces/Donation'; // Import DonorsInterface

// Helper to get initial state from sessionStorage
const getInitialFormData = () => {
  try {
    const storedData = sessionStorage.getItem('donationInfoFormData');
    return storedData ? JSON.parse(storedData) : {};
  } catch (error) {
    console.error("Error parsing stored form data:", error);
    return {};
  }
};

const InformationDonors: React.FC = () => {
  const navigate = useNavigate();
  const initialData = getInitialFormData();

  // สร้าง State สำหรับเก็บค่าของแต่ละ Input
  const [firstName, setFirstName] = useState(initialData.first_name || '');
  const [lastName, setLastName] = useState(initialData.last_name || '');
  const [phone, setPhone] = useState(initialData.phone || '');
  const [email, setEmail] = useState(initialData.email || '');

  useEffect(() => {
    const prefillData = sessionStorage.getItem('prefillUserData');
    if (prefillData) {
      try {
        const parsedPrefillData = JSON.parse(prefillData);
        setFirstName(parsedPrefillData.first_name || '');
        setLastName(parsedPrefillData.last_name || '');
        setPhone(parsedPrefillData.phone || '');
        setEmail(parsedPrefillData.email || '');
        sessionStorage.removeItem('prefillUserData'); // Clear after use
      } catch (error) {
        console.error("Error parsing prefill user data:", error);
      }
    }
  }, []); // Run only once on mount

  useEffect(() => {
    const formData = { first_name: firstName, last_name: lastName, phone, email };
    sessionStorage.setItem('donationInfoFormData', JSON.stringify(formData));
  }, [firstName, lastName, phone, email]); // Dependencies array

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault(); // ป้องกันการรีเฟรชหน้าเมื่อกดส่งฟอร์ม
    const formData: DonorInterface = { // Cast to DonorsInterface
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      email: email,
    };
    console.log('Form Data Submitted:', formData);

    const donationType = sessionStorage.getItem('donationType');
    if (donationType === 'money') {
      navigate('/donation/money');
    } else if (donationType === 'item') {
      navigate('/donation/item');
    } else {
      // Fallback or error handling
      navigate('/donation/options');
    }
  };

  return (
    <div className="form-page-container">
      <div className="form-card">
        {/* ปุ่มย้อนกลับ */}
        <button onClick={() => {
          navigate('/donation/options');
        }} className="back-link">
          &lt; ย้อนกลับ
        </button>
        <h1 className="form-title">ข้อมูลการบริจาค</h1>
        <h2 className="form-subtitle">ผู้บริจาค</h2>

        {/* ฟอร์ม */}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="ชื่อ"
            className="form-input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="นามสกุล"
            className="form-input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <input
            type="tel"
            placeholder="เบอร์โทรศัพท์"
            className="form-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="อีเมล"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* ปุ่มส่งฟอร์ม */}
          <button type="submit" className="submit-button">
            ต่อไป
          </button>
        </form>
      </div>
    </div>
  );
};

export default InformationDonors;