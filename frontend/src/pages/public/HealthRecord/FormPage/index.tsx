/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message } from 'antd';
import { 
  Form, 
  Input, 
  Button, 
  DatePicker, 
  InputNumber,
  Card,
  Row,
  Col,
  Typography,
  Space,
  Select,
  Divider,
} from 'antd';
import { 
  ArrowLeftOutlined, 
  HeartOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { vaccineRecord, vaccine } from '../../../../interfaces/HealthRecord';
import { healthRecordAPI, vaccineAPI } from '../../../../services/apis';
import "./style.css";

const { Title } = Typography;
const { TextArea } = Input;

const FormPage: React.FC = () => {
  const { id: dogId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [hasVaccination, setHasVaccination] = useState<string>('NO');
  const [vaccines, setVaccines] = useState<vaccine[]>([]);
  const [vaccineRecords, setVaccineRecords] = useState<vaccineRecord[]>([]);

  useEffect(() => {
    if (!dogId || isNaN(parseInt(dogId))) {
      message.error('รหัสสุนัขไม่ถูกต้อง');
      navigate('/dashboard/health-record');
      return;
    }

    // Load vaccines list
    loadVaccines();

    // Initialize form for new record
    form.resetFields();
    form.setFieldsValue({
      recordDate: dayjs(),
      hasVaccination: 'NO',
    });
    setHasVaccination('NO');
    setVaccineRecords([]);
    
  }, [dogId, form]);

  const loadVaccines = async () => {
    try {
      const response = await vaccineAPI.getAll();
      setVaccines(response || []);
    } catch (error) {
      console.error('Error loading vaccines:', error);
      message.error('ไม่สามารถโหลดข้อมูลวัคซีนได้');
    }
  };

  const handleVaccinationChange = (value: string) => {
    setHasVaccination(value);
    if (value === 'NO') {
      setVaccineRecords([]);
    } else if (value === 'YES' && vaccineRecords.length === 0) {
      addVaccineRecord();
    }
  };

  const addVaccineRecord = () => {
    const newRecord: vaccineRecord = {
      ID: 0, // Default non-existent ID
      med_id: 0,
      vaccine_id: 0,
      dose_number: 1,
      lot_number: '',
      next_due_date: undefined,
    };
    setVaccineRecords([...vaccineRecords, newRecord]);
  };

  const removeVaccineRecord = (index: number) => {
    if (vaccineRecords.length > 1) {
      const newRecords = [...vaccineRecords];
      newRecords.splice(index, 1); //ลบเฉพาะ index ที่เลือก
      setVaccineRecords(newRecords);
    }
  };

  const updateVaccineRecord = (index: number, field: keyof vaccineRecord, value: any) => {
    const newRecords = [...vaccineRecords];
    const recordToUpdate = { ...newRecords[index] };
    (recordToUpdate as any)[field] = value;
    newRecords[index] = recordToUpdate;
    setVaccineRecords(newRecords);  //อัปเดตเฉพาะ index ที่แก้ แล้วเซ็ตกลับเข้า state
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = async (values: any) => {
    if (!dogId) return;

    // Validate required fields
    if (!values.weight || !values.temperature || !values.symptoms) {
      message.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    // Validate vaccination fields if hasVaccination is YES
    if (values.hasVaccination === 'YES') {
      if (vaccineRecords.length === 0) {
        message.error('กรุณาเพิ่มข้อมูลวัคซีนอย่างน้อย 1 รายการ');
        return;
      }

      // Validate each vaccine record
      const isValidVaccineRecords = vaccineRecords.every(record => 
        record.vaccine_id && record.dose_number && record.lot_number && record.next_due_date
      );

      if (!isValidVaccineRecords) {
        message.error('กรุณากรอกข้อมูลวัคซีนให้ครบถ้วนในทุกรายการ');
        return;
      }
    }

    setSubmitLoading(true);

    const healthRecordData = {
      dog_id: parseInt(dogId),
      staff_id: 1, // Assuming staff ID 1 exists for now
      weight: parseFloat(values.weight),
      temperature: parseFloat(values.temperature),
      symptoms: values.symptoms?.trim(),
      diagnosis: values.diagnosis?.trim() || null,
      treatment: values.treatment?.trim() || null,
      medication: values.medication?.trim() || null,
      vaccination: values.hasVaccination,
      notes: values.notes?.trim() || null,
      date_record: values.recordDate ? values.recordDate.toISOString() : new Date().toISOString(),
    };

    const finalVaccineRecords = values.hasVaccination === 'YES' 
      ? vaccineRecords.map(vr => ({ ...vr, next_due_date: vr.next_due_date ? dayjs(vr.next_due_date).toISOString() : undefined }))
      : [];

    const payload = {
      health_record: healthRecordData,
      vaccine_records: finalVaccineRecords,
    };

    try {
      await healthRecordAPI.createHealthRecord(payload);
      message.success('บันทึกข้อมูลสุขภาพเรียบร้อยแล้ว');
      navigate(`/dashboard/health-record/dog/${dogId}`);
    } catch (error) {
      message.error('ไม่สามารถบันทึกข้อมูลสุขภาพได้');
      console.error('Submit error:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/dashboard/health-record/dog/${dogId}`);
  };

  const validateTemperature = (_: any, value: number) => {
    if (value && (value < 35 || value > 45)) {
      return Promise.reject(new Error('อุณหภูมิควรอยู่ระหว่าง 35-45 องศาเซลเซียส'));
    }
    return Promise.resolve();
  };

  const validateWeight = (_: any, value: number) => {
    if (value && value <= 0) {
      return Promise.reject(new Error('น้ำหนักต้องมากกว่า 0 กิโลกรัม'));
    }
    return Promise.resolve();
  };

  return (
    <div className="health-form-page">
      <div className="form-header">
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBack}
          className="back-button"
          style={{marginRight: '-100px'}}
        >
          ย้อนกลับ
        </Button>
        
        <Title level={2} className="page-title" style={{ fontFamily: 'Anakotmai-Bold',marginTop: '20px',marginLeft: '30px',color: '#FF6600' }}>
          {'บันทึกสุขภาพสุนัข'}
        </Title>
      </div>

      <Card className="health-form-card">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          scrollToFirstError
        >
          {/* Basic Information Section */}
          <div className="form-section">
            <h3 className="section-title" style={{ fontFamily: 'Anakotmai-Bold' }}>
              <FileTextOutlined /> ข้อมูลพื้นฐาน
            </h3>
            <Row gutter={24}>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="weight"
                  label={<div style={{ fontFamily: "Anakotmai", width: "100%", marginLeft: "0px", marginTop: "5px" }}>น้ำหนัก (กก.)</div>}
                  rules={[
                    { required: true, message: 'กรุณากรอกน้ำหนัก' },
                    { validator: validateWeight }
                  ]}
                >
                  <InputNumber 
                    placeholder="12.5" 
                    min={0} 
                    step={0.1} 
                    style={{ width: '100%' }}
                    precision={1}
                    className="custom-input-number"
                    rootClassName="ank-num"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="temperature"
                  label={<div style={{ fontFamily: "Anakotmai", width: "100%", marginLeft: "0px", marginTop: "5px" }}>อุณหภูมิ (°C)</div>}
                  rules={[
                    { required: true, message: 'กรุณากรอกอุณหภูมิ' },
                    { validator: validateTemperature }
                  ]}
                >
                  <InputNumber 
                    placeholder="38.2" 
                    min={35} 
                    max={45} 
                    step={0.1} 
                    precision={1}
                    className="custom-input-number"
                    rootClassName="ank-num"
                    style={{ width: '100%', fontFamily: 'Anakotmai-Bold', fontWeight: 700 }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="recordDate"
                  label={<div style={{ fontFamily: "Anakotmai", width: "100%", marginLeft: "0px", marginTop: "5px" }}>วันที่บันทึก</div>}
                  rules={[{ required: true, message: 'กรุณาเลือกวันที่' }]}
                >
                  <DatePicker 
                    style={{ width: '100%', fontFamily: 'Anakotmai' }} 
                    format="DD/MM/YYYY"
                    placeholder="เลือกวันที่"
                    className="custom-datepicker"
                    suffixIcon={<CalendarOutlined />}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Divider />

          {/* Medical Information Section */}
          <div className="form-section">
            <h3 className="section-title" style={{ fontFamily: 'Anakotmai-Bold' }}>
              <MedicineBoxOutlined /> ข้อมูลการตรวจรักษา
            </h3>
            
            <Form.Item
              name="symptoms"
              label={<div style={{ fontFamily: "Anakotmai",  width: "100%", marginLeft: "0px", marginTop: "5px" }}>อาการที่พบ</div>}
              rules={[
                { required: true, message: 'กรุณากรอกอาการที่พบ' },
                { min: 10, message: 'อาการที่พบควรมีอย่างน้อย 10 ตัวอักษร' }
              ]}
            >
              <TextArea 
                rows={3} 
                placeholder="อธิบายอาการที่พบในสุนัข..."
                showCount
                maxLength={500}
                className="custom-textarea"
                style={{ fontFamily: 'Anakotmai' }}
              />
            </Form.Item>

            <Form.Item
              name="diagnosis"
              label={<div style={{ fontFamily: "Anakotmai", width: "100%", marginLeft: "0px", marginTop: "5px" }}>การวินิจฉัย</div>}
              rules={[
                { min: 5, message: 'การวินิจฉัยควรมีอย่างน้อย 5 ตัวอักษร' }
              ]}
            >
              <TextArea 
                rows={3} 
                placeholder="ผลการวินิจฉัยโรค..."
                showCount
                maxLength={500}
                className="custom-textarea"
                style={{ fontFamily: 'Anakotmai' }}
              />
            </Form.Item>

            <Form.Item
              name="treatment"
              label={<div style={{ fontFamily: "Anakotmai", width: "100%", marginLeft: "0px", marginTop: "5px" }}>การรักษา</div>}
              rules={[
                { min: 5, message: 'การรักษาควรมีอย่างน้อย 5 ตัวอักษร' }
              ]}
            >
              <TextArea 
                rows={3} 
                placeholder="วิธีการรักษาที่ให้..."
                showCount
                maxLength={500}
                className="custom-textarea"
                style={{ fontFamily: 'Anakotmai' }}
              />
            </Form.Item>

            <Row gutter={24}>
              <Col xs={24} sm={24}>
                <Form.Item
                  name="medication"
                  label={<div style={{ fontFamily: "Anakotmai", width: "100%", marginLeft: "0px", marginTop: "5px" }}>ยาที่ให้</div>}
                >
                  <Input 
                    placeholder="ชื่อยาและขนาด" 
                    maxLength={200}
                    className="custom-input"
                    style={{ fontFamily: 'Anakotmai-Bold' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Divider />

          {/* Vaccination Section */}
          <div className="form-section vaccination-section">
            <h3 className="section-title" style={{ fontFamily: 'Anakotmai-Bold' }}>
              <SafetyCertificateOutlined /> ข้อมูลการฉีดวัคซีน
            </h3>
            
            <Form.Item
              name="hasVaccination"
              label={<div style={{ fontFamily: "Anakotmai", width: "100%", marginLeft: "0px", marginTop: "5px" }}>วัคซีน</div>}
              rules={[{ required: true, message: 'กรุณาเลือกสถานะการฉีดวัคซีน' }]}
            >
              <Select 
                placeholder="เลือกสถานะ" 
                onChange={handleVaccinationChange}
                className="custom-select"
                style={{ fontFamily: 'Anakotmai' }}
              >
                <Select.Option value="YES" style={{ fontFamily: "Anakotmai" }}>มีการฉีดวัคซีน</Select.Option>
                <Select.Option value="NO" style={{ fontFamily: "Anakotmai" }}>ไม่มีการฉีดวัคซีน</Select.Option>
              </Select>
            </Form.Item>

            {hasVaccination === 'YES' && (
              <div className="vaccination-fields">
                {vaccineRecords.map((record, index) => (
                  <Card 
                    key={index} 
                    size="small" 
                    style={{ marginBottom: '16px' }}
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'Anakotmai-Bold' }}>วัคซีนที่ {index + 1}</span>
                        {vaccineRecords.length > 1 && (
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => removeVaccineRecord(index)}
                            title="ลบรายการนี้"
                          >
                            ลบ
                          </Button>
                        )}
                      </div>
                    }
                  >
                    <Row gutter={16}>
                      <Col xs={24} sm={6}>
                        <div style={{ fontFamily: "Anakotmai", marginBottom: "8px" }}>ชนิดวัคซีน</div>
                        <Select
                          placeholder="เลือกชนิดวัคซีน"
                          value={record.vaccine_id || undefined}
                          onChange={(value) => updateVaccineRecord(index, 'vaccine_id', value)}
                          style={{ width: '100%', fontFamily: 'Anakotmai' }}
                          className="custom-select"
                        >
                          {vaccines.map((vaccine) => (
                            <Select.Option key={vaccine.ID} value={vaccine.ID}>
                              {vaccine.name} ({vaccine.manufacturer})
                            </Select.Option>
                          ))}
                        </Select>
                      </Col>
                      <Col xs={24} sm={6}>
                        <div style={{ fontFamily: "Anakotmai", marginBottom: "8px" }}>เข็มที่</div>
                        <InputNumber 
                          min={1} 
                          placeholder="1" 
                          value={record.dose_number}
                          onChange={(value) => updateVaccineRecord(index, 'dose_number', value || 1)}
                          style={{ width: '100%' }}
                          className="custom-input-number"
                          rootClassName="ank-num"
                        />
                      </Col>
                      <Col xs={24} sm={6}>
                        <div style={{ fontFamily: "Anakotmai", marginBottom: "8px" }}>หมายเลขลอต</div>
                        <Input 
                          placeholder="LOT123456" 
                          value={record.lot_number}
                          onChange={(e) => updateVaccineRecord(index, 'lot_number', e.target.value)}
                          className="custom-input"
                          style={{ fontFamily: 'Anakotmai' }}
                        />
                      </Col>
                      <Col xs={24} sm={6}>
                        <div style={{ fontFamily: "Anakotmai", marginBottom: "8px" }}>วันนัดหมายครั้งต่อไป</div>
                        <DatePicker 
                          placeholder="เลือกวันที่"
                          value={record.next_due_date ? dayjs(record.next_due_date) : null}
                          onChange={(date) => updateVaccineRecord(index, 'next_due_date', date?.format('YYYY-MM-DD'))}
                          style={{ width: '100%' }} 
                          format="DD/MM/YYYY"
                          className="custom-datepicker"
                          disabledDate={(current) => current && current < dayjs().startOf('day')}
                          suffixIcon={<CalendarOutlined />}
                        />
                      </Col>
                    </Row>
                  </Card>
                ))}

                <Button
                  type="dashed"
                  onClick={addVaccineRecord}
                  icon={<PlusOutlined />}
                  style={{ 
                    width: '100%', 
                    marginTop: '16px',
                    fontFamily: 'Anakotmai-Bold',
                    borderColor: '#FF6600',
                    color: '#FF6600'
                  }}
                >
                  เพิ่มรายการวัคซีน
                </Button>
              </div>
            )}
          </div>

          <Divider />

          {/* Notes Section */}
          <div className="form-section">
            <Form.Item
              name="notes"
              label={<div style={{ fontFamily: "Anakotmai", width: "100%", marginLeft: "0px", marginTop: "5px" }}>หมายเหตุเพิ่มเติม</div>}
            >
              <TextArea 
                rows={2} 
                placeholder="บันทึกเพิ่มเติม..."
                showCount
                maxLength={300}
                className="custom-textarea"
                style={{ fontFamily: 'Anakotmai' }}
              />
            </Form.Item>
          </div>

          {/* Submit Section */}
          <Form.Item className="submit-section">
            <Space size="middle">
              <Button 
                size="large"
                onClick={handleBack} 
                disabled={submitLoading}
                className="cancel-button"
                style={{ fontFamily: 'Anakotmai-Bold' }}
              >
                ยกเลิก
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large"
                loading={submitLoading}
                className="submit-button"
                icon={<HeartOutlined />}
                style={{ fontFamily: 'Anakotmai-Bold' }}
              >
                {'บันทึก'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default FormPage;