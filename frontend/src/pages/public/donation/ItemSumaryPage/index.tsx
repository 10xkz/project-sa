import React, { useState, useEffect } from "react";
import './style.css';
import { useNavigate } from "react-router-dom";
import { message } from "antd";

import { donationAPI } from "../../../../services/apis";
import type { DonorInterface, ItemDonationInterface, CreateDonationRequest, ItemInterface, UnitInterface } from "../../../../interfaces/Donation";

interface DonationItem { 
  itemName: string;
  quantity: string;
  unit: string;
}

interface DonationItemFormState {
  id: string;
  itemId: string;
  quantity: string;
  unitId: string;
}

// Helper to get donation data from sessionStorage
const getDonationData = () => {
  try {
    const storedData = sessionStorage.getItem('donationItemsFormData');
    return storedData ? JSON.parse(storedData) : { donationItems: [] };
  } catch (error) {
    console.error("Error parsing stored donation data:", error);
    return { donationItems: [] };
  }
};

const DonationSummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [createAccount, setCreateAccount] = useState<boolean | null>(null);
  const [summaryData] = useState(getDonationData());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // เพิ่ม state สำหรับเก็บข้อมูล items และ units
  const [availableItems, setAvailableItems] = useState<ItemInterface[]>([]);
  const [availableUnits, setAvailableUnits] = useState<UnitInterface[]>([]);
  const [donationItemsWithNames, setDonationItemsWithNames] = useState<DonationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  // Fetch available items และ units จาก backend
  useEffect(() => {
    const fetchDonationOptions = async () => {
      try {
        setIsLoading(true);
        const [itemsResponse, unitsResponse] = await Promise.all([
          donationAPI.getAllItems(),
          donationAPI.getAllUnits(),
        ]);
        setAvailableItems(itemsResponse || []);
        setAvailableUnits(unitsResponse || []);
      } catch (err) {
        console.error("Failed to fetch donation options:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDonationOptions();
  }, []);

  // แปลงข้อมูลจาก ID เป็นชื่อ
  useEffect(() => {
    if (availableItems.length > 0 && availableUnits.length > 0 && summaryData.donationItems) {
      const itemsWithNames: DonationItem[] = summaryData.donationItems.map((item: DonationItemFormState) => {
        const itemData = availableItems.find(i => i.ID === Number(item.itemId));
        const unitData = availableUnits.find(u => u.ID === Number(item.unitId));
        
        return {
          itemName: itemData?.name || 'ไม่พบข้อมูล',
          quantity: item.quantity,
          unit: unitData?.name || 'ไม่พบข้อมูล'
        };
      });
      
      setDonationItemsWithNames(itemsWithNames);
    }
  }, [availableItems, availableUnits, summaryData]);

  const handleNext = async () => {
    if (!isLoggedIn && createAccount === null) {
      message.error('กรุณาเลือกตัวเลือกการสร้างบัญชีการบริจาค');
      return;
    }

    if (!isLoggedIn && createAccount) {
      const donorInfoString = sessionStorage.getItem('donationInfoFormData');
      if (donorInfoString) {
        const donorInfo = JSON.parse(donorInfoString);
        const signupPrefillData = {
          first_name: donorInfo.first_name,
          last_name: donorInfo.last_name,
          email: donorInfo.email,
          phone: donorInfo.phone,
        };
        sessionStorage.setItem('signupPrefillData', JSON.stringify(signupPrefillData));
      }
      sessionStorage.setItem('returnTo', '/donation/summary');
      navigate('/auth/users');
      return;
    }

    // API Call Logic
    const donorInfoString = sessionStorage.getItem('donationInfoFormData');
    console.log(donorInfoString);
    const itemDetailsString = sessionStorage.getItem('donationItemsFormData');
    const donationType = sessionStorage.getItem('donationType');

    if (!donorInfoString || !itemDetailsString || donationType !== 'item') {
      messageApi.open({ type: "error", content: "ข้อมูลการบริจาคไม่สมบูรณ์ กรุณาเริ่มต้นใหม่อีกครั้ง" });
      navigate('/donation/options');
      return;
    }

    try {
      const donorInfo: DonorInterface = JSON.parse(donorInfoString);
      const itemDetailsRaw = JSON.parse(itemDetailsString);

      const token = sessionStorage.getItem('token');
      const userId = sessionStorage.getItem('id');
      donorInfo.donor_type = token ? "user" : "guest";
      if (token && userId) {
        donorInfo.user_id = parseInt(userId, 10);
      }

      const transactionNumber = `SA-ITEM-${Date.now()}`;
      const itemDetails: ItemDonationInterface[] = itemDetailsRaw.donationItems.map((item: any) => ({
        item_id: Number(item.itemId),
        quantity: Number(item.quantity),
        unit_id: Number(item.unitId),
        item_ref: `${transactionNumber}-${item.itemId}`
      }));

      const payload: CreateDonationRequest = {
        donor_info: donorInfo,
        donation_type: donationType,
        item_donation_details: itemDetails,
      };
      
      const result = await donationAPI.create(payload);

      if (result.status === 200) {
        messageApi.open({ type: "success", content: "การบริจาคสำเร็จ ขอบคุณ!" });
        sessionStorage.removeItem('donationInfoFormData');
        sessionStorage.removeItem('donationItemsFormData');
        sessionStorage.removeItem('donationType');
        sessionStorage.removeItem('createAccount');
        navigate('/donation/thankyou');
      } else {
        messageApi.open({ type: "error", content: result.data?.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
      }
    } catch (error) {
      console.error("Error processing donation:", error);
      messageApi.open({ type: "error", content: "เกิดข้อผิดพลาดในการประมวลผลข้อมูล" });
    }
  };

  const handleBack = () => {
    navigate('/donation/item');
  };

  if (isLoading) {
    return (
      <div className="summary-page-container">
        <div className="summary-content">
          <div>กำลังโหลดข้อมูล...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      <div className="summary-page-container">
        <div className="summary-content">
          <button onClick={handleBack} className="back-button" style={{ fontFamily: 'Anakotmai-Medium' }}>
            &lt; ย้อนกลับ
          </button>
          <h1 className="summary-main-title" style={{ fontSize: '50px' }}>รายละเอียดการบริจาคสิ่งของ</h1>
          <div className="summary-box">
            <h2 className="summary-section-title">สรุปรายการบริจาคสิ่งของ</h2>
            <ul className="donation-list">
              {donationItemsWithNames.length > 0 ? (
                donationItemsWithNames.map((item: DonationItem, index: number) => (
                  <li key={index} className="donation-list-item">
                    {item.itemName} จำนวน {item.quantity} {item.unit}
                  </li>
                ))
              ) : (
                <li className="donation-list-item">ไม่มีข้อมูล</li>
              )}
            </ul>
          </div>
          <div className="delivery-box">
            <h2 className="delivery-section-title">วิธีการจัดส่ง</h2>
            <p className="delivery-description">
              ท่านสามารถนำมาบริจาคด้วยตนเองหรือส่งมาให้ได้ จ่าหน้าถึง <strong>DOG CARE (ของบริจาค)</strong>
            </p>
            <p className="delivery-address">
              111 ถนนมหาวิทยาลัย ตำบลสุรนารี อำเภอเมือง จังหวัดนครราชสีมา 30000<br />
              โทร.0-4422-3000
            </p>
          </div>
          {!isLoggedIn && (
            <div className="account-box">
              <h2 className="account-section-title">สร้างบัญชีบริจาค</h2>
              <div className="radio-group">
                <label className={`radio-option ${createAccount === true ? 'selected' : ''}`}>
                  <input type="radio" name="createAccount" value="true" checked={createAccount === true} onChange={() => setCreateAccount(true)} />
                  <span className="radio-indicator"></span>
                  <span className="radio-text">ฉันต้องการสร้างบัญชีการบริจาค</span>
                </label>
                <label className={`radio-option ${createAccount === false ? 'selected' : ''}`}>
                  <input type="radio" name="createAccount" value="false" checked={createAccount === false} onChange={() => setCreateAccount(false)} />
                  <span className="radio-indicator"></span>
                  <span className="radio-text">ฉันไม่ต้องการสร้างบัญชีการบริจาค</span>
                </label>
              </div>
            </div>
          )}
          <button onClick={handleNext} className="continue-button" style={{ fontFamily: 'Anakotmai-Medium' }}>
            ยืนยันและเสร็จสิ้น
          </button>
        </div>
      </div>
    </>
  );
};

export default DonationSummaryPage;