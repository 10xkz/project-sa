import React, { useState, useEffect } from "react";
import './style.css';
import { useNavigate } from "react-router-dom";
import { donationAPI } from "../../../../services/apis";
import type { ItemDonationInterface, ItemInterface, UnitInterface } from '../../../../interfaces/Donation';

interface DonationItemFormState {
  id: string;
  itemId: string;
  quantity: string;
  unitId: string;
}

// Helper to get initial state from sessionStorage
const getInitialFormData = () => {
  try {
    const storedData = sessionStorage.getItem('donationItemsFormData');
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      // Basic validation to ensure it's not empty or malformed
      if (Array.isArray(parsedData.donationItems) && parsedData.donationItems.length > 0) {
        return parsedData;
      }
    }
  } catch (error) {
    console.error("Error parsing stored form data:", error);
  }
  // Default initial state
  return {
    donationItems: [{
      id: '1',
      itemId: '',
      quantity: '',
      unitId: ''
    }]
  };
};

const DonationItemsForm: React.FC = () => {
  const navigate = useNavigate();
  const initialData = getInitialFormData();

  const [donationItems, setDonationItems] = useState<DonationItemFormState[]>(initialData.donationItems);
  const [availableItems, setAvailableItems] = useState<ItemInterface[]>([]);
  const [availableUnits, setAvailableUnits] = useState<UnitInterface[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  
  // Fetch available items and units from the backend
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
        setError(null);
      } catch (err) {
        console.error("Failed to fetch donation options:", err);
        setError("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDonationOptions();
  }, []);

  // Save form data to sessionStorage whenever it changes
  useEffect(() => {
    const formData = { donationItems };
    sessionStorage.setItem('donationItemsFormData', JSON.stringify(formData));
  }, [donationItems]);

  const addDonationItem = () => {
    const newItem: DonationItemFormState = {
      id: Date.now().toString(),
      itemId: '',
      quantity: '',
      unitId: ''
    };
    setDonationItems([...donationItems, newItem]);
  };

  const removeDonationItem = (id: string) => {
    if (donationItems.length > 1) {
      setDonationItems(donationItems.filter(item => item.id !== id));
    }
  };

  const updateDonationItem = (id: string, field: keyof DonationItemFormState, value: string) => {
    setDonationItems(donationItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const isValid = donationItems.every(item =>
      item.itemId && item.quantity && item.unitId
    );

    if (!isValid) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วนในทุกรายการ');
      return;
    }

    // Format data for submission according to the main interface
    const formattedDonationItems: Partial<ItemDonationInterface>[] = donationItems.map(item => ({
      item_id: Number(item.itemId),
      quantity: Number(item.quantity),
      unit_id: Number(item.unitId),
    }));

    // Store the formatted data in sessionStorage for the summary page
    const currentData = JSON.parse(sessionStorage.getItem('donationFormData') || '{}');
    currentData.item_donation_details = formattedDonationItems;
    sessionStorage.setItem('donationFormData', JSON.stringify(currentData));

    console.log('Donation Items Submitted:', formattedDonationItems);
    navigate('/donation/summary');
  };

  if (isLoading) {
    return <div className="form-page-container"><div className="form-card">Loading...</div></div>;
  }

  if (error) {
    return <div className="form-page-container"><div className="form-card">{error}</div></div>;
  }

  return (
    <div className="form-page-container">
      <div className="form-card">
        <button
          onClick={() => navigate('/donation/information')}
          className="back-link"
        >
          &lt; ย้อนกลับ
        </button>

        <h1 className="form-title">บริจาคสิ่งของ</h1>
        <h1 className="form-subtitle">เลือกสิ่งของที่ต้องการบริจาค</h1>

        <form onSubmit={handleSubmit}>
          {donationItems.map((item, index) => (
            <div key={item.id} className="donation-item-group">
              <div className="item-header">
                <h3>รายการที่ {index + 1}</h3>
                {donationItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDonationItem(item.id)}
                    className="remove-item-button"
                    title="ลบรายการนี้"
                  >
                    ×
                  </button>
                )}
              </div>

              <select
                className="form-input"
                value={item.itemId}
                onChange={(e) => updateDonationItem(item.id, 'itemId', e.target.value)}
                required
              >
                <option value="">เลือกสิ่งของที่ต้องการบริจาค</option>
                {availableItems.map((i) => (
                  <option key={i.ID} value={String(i.ID)}>
                    {i.name}
                  </option>
                ))}
              </select>

              <div className="quantity-unit-row">
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="จำนวน"
                  className="form-input quantity-input"
                  value={item.quantity}
                  onChange={(e) => updateDonationItem(item.id, 'quantity', e.target.value)}
                  required
                />

                <select
                  className="form-input unit-input"
                  value={item.unitId}
                  onChange={(e) => updateDonationItem(item.id, 'unitId', e.target.value)}
                  required
                >
                  <option value="">หน่วย</option>
                  {availableUnits.map((u) => (
                    <option key={u.ID} value={String(u.ID)}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addDonationItem}
            className="add-item-button"
            style ={{ fontFamily: 'Anakotmai-Bold'}}
          >
            + เพิ่มรายการบริจาค
          </button>

          <button type="submit" className="submit-button" style ={{ fontFamily: 'Anakotmai-Bold'}}>
            ยืนยันการบริจาค
          </button>
        </form>
      </div>
    </div>
  );
};

export default DonationItemsForm;
