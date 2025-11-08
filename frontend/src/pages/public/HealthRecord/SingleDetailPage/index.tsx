/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message, Spin } from 'antd';
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
  Descriptions,
  Divider,
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  SaveOutlined,
  CloseOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { HealthRecord, vaccineRecord, vaccine } from '../../../../interfaces/HealthRecord';
import { healthRecordAPI, vaccineAPI } from '../../../../services/apis';
import './style.css';
const { Title, Text } = Typography;
const { TextArea } = Input;

const SingleDetailPage: React.FC = () => {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [healthRecord, setHealthRecord] = useState<HealthRecord | null>(null);
  const [vaccines, setVaccines] = useState<vaccine[]>([]);
  const [vaccineRecords, setVaccineRecords] = useState<vaccineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [hasVaccination, setHasVaccination] = useState<string>('NO');

  useEffect(() => {
    if (recordId && !isNaN(parseInt(recordId))) {
      initializeData();
    } else {
      message.error('รหัสประวัติสุขภาพไม่ถูกต้อง');
      navigate(-1);
    }
  }, [recordId]);

  const initializeData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchRecord(), loadVaccines()]);
    } catch (error) {
      console.error('Error initializing data:', error);
      message.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const loadVaccines = async () => {
    try {
      const response = await vaccineAPI.getAll();
      // Handle response structure - check if it's wrapped in data property
      const vaccineData = response?.data || response || [];
      setVaccines(Array.isArray(vaccineData) ? vaccineData : []);
    } catch (error) {
      console.error('Error loading vaccines:', error);
      message.error('ไม่สามารถโหลดข้อมูลวัคซีนได้');
      setVaccines([]);
    }
  };

  const fetchRecord = async () => {
    if (!recordId) return;

    try {
      const response = await healthRecordAPI.getHealthRecordById(parseInt(recordId));
      // Handle response structure - the record might be wrapped in data property
      const record = response?.data || response;
      
      if (!record) {
        throw new Error('No record found');
      }

      setHealthRecord(record);
      
      const hasVacc = record.vaccination === 'YES' ? 'YES' : 'NO';
      setHasVaccination(hasVacc);
      
      // Set form values after data fetch
      form.setFieldsValue({
        ...record,
        recordDate: record.date_record ? dayjs(record.date_record) : null,
        hasVaccination: hasVacc,
        weight: record.weight,
        temperature: record.temperature,
        symptoms: record.symptoms,
        diagnosis: record.diagnosis,
        treatment: record.treatment, // Note: BE uses TreatmentPlan but FE expects treatment
        medication: record.medication,
        notes: record.notes,
      });

      // Handle vaccine records if they exist
      if (hasVacc === 'YES' && record.vaccine_records && record.vaccine_records.length > 0) {
        const formattedVaccineRecords = record.vaccine_records.map((vr: any) => ({
          ID: vr.ID || 0,
          med_id: vr.med_id || record.ID,
          vaccine_id: vr.vaccine_id,
          dose_number: vr.dose_number,
          lot_number: vr.lot_number,
          next_due_date: vr.next_due_date ? dayjs(vr.next_due_date).format('YYYY-MM-DD') : undefined
        }));
        setVaccineRecords(formattedVaccineRecords);
      } else {
        setVaccineRecords([]);
      }
    } catch (error) {
      message.error('ไม่สามารถโหลดข้อมูลประวัติสุขภาพได้');
      console.error('Fetch record error:', error);
      navigate(-1);
    }
  };

  const handleBack = () => {
    if (healthRecord && healthRecord.dog_id) {
      navigate(`/dashboard/health-record/dog/${healthRecord.dog_id}`);
    } else {
      navigate(-1);
    }
  };

  const handleEditToggle = () => {  //ปุ่ม toggle Edit/Cancel
    if (editMode) {
      // Cancel edit mode - restore original values
      if (healthRecord) {
        const hasVacc = healthRecord.vaccination === 'YES' ? 'YES' : 'NO';
        setHasVaccination(hasVacc);
        form.setFieldsValue({
          ...healthRecord,
          recordDate: healthRecord.date_record ? dayjs(healthRecord.date_record) : null,
          hasVaccination: hasVacc,
        });
        if (hasVacc === 'YES' && healthRecord.vaccine_records) {
          setVaccineRecords(healthRecord.vaccine_records);
        } else {
          setVaccineRecords([]);
        }
      }
    }
    setEditMode(!editMode);
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
      ID: 0,
      med_id: parseInt(recordId || '0'),
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
      newRecords.splice(index, 1);
      setVaccineRecords(newRecords);
    }
  };

  const updateVaccineRecord = (index: number, field: keyof vaccineRecord, value: any) => {
    const newRecords = [...vaccineRecords];
    const recordToUpdate = { ...newRecords[index] };
    (recordToUpdate as any)[field] = value;
    newRecords[index] = recordToUpdate;
    setVaccineRecords(newRecords);
  };

  const handleSave = async (values: any) => {
  if (!recordId || !healthRecord) return;

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

    const isValidVaccineRecords = vaccineRecords.every(record => 
      record.vaccine_id && record.dose_number && record.lot_number && record.next_due_date
    );

    if (!isValidVaccineRecords) {
      message.error('กรุณากรอกข้อมูลวัคซีนให้ครบถ้วนในทุกรายการ');
      return;
    }
  }

  setSubmitLoading(true);

  // Prepare health record data matching BE structure
  const healthRecordData = {
    dog_id: healthRecord.dog_id,
    staff_id: healthRecord.staff_id,
    weight: parseFloat(values.weight.toString()),
    temperature: parseFloat(values.temperature.toString()),
    symptoms: values.symptoms?.trim() || '',
    diagnosis: values.diagnosis?.trim() || '',
    treatment: values.treatment?.trim() || '',
    medication: values.medication?.trim() || '',
    vaccination: values.hasVaccination,
    notes: values.notes?.trim() || '',
    date_record: values.recordDate ? values.recordDate.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]') : healthRecord.date_record,
    // เพิ่ม vaccine records ถ้ามี
    vaccine_records: values.hasVaccination === 'YES' ? vaccineRecords.map(record => ({
      ID: record.ID,
      med_id: parseInt(recordId),
      vaccine_id: record.vaccine_id,
      dose_number: record.dose_number,
      lot_number: record.lot_number.trim(),
      next_due_date: record.next_due_date
    })) : []
  };


  try {
    const response = await healthRecordAPI.updateHealthRecord(parseInt(recordId), healthRecordData);
    console.log('Backend response:', response);
    
    message.success('อัปเดตข้อมูลสุขภาพเรียบร้อยแล้ว');
    
    // Refresh data
    await fetchRecord();
    setEditMode(false);
  } catch (error: any) {
    console.error('Update error:', error);
    console.error('Error response:', error?.response?.data);
    
    const errorMessage = error?.response?.data?.error || error?.message || 'ไม่สามารถอัปเดตข้อมูลสุขภาพได้';
    message.error(errorMessage);
  } finally {
    setSubmitLoading(false);
  }
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

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      return dayjs(dateString).format('DD/MM/YYYY');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text style={{ fontFamily: 'Anakotmai' }}>กำลังโหลดข้อมูล...</Text>
        </div>
      </div>
    );
  }

  if (!healthRecord) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Text style={{ fontFamily: 'Anakotmai' }} type="secondary">ไม่พบข้อมูลประวัติสุขภาพ</Text>
        <div style={{ marginTop: '16px' }}>
          <Button onClick={handleBack} style={{ fontFamily: 'Anakotmai' }}>ย้อนกลับ</Button>
        </div>
      </div>
    );
  }

  return (
    <><Button
      type="text"
      icon={<ArrowLeftOutlined />}
      onClick={handleBack}
      className="back-button"
    >
      <span style={{ fontFamily: 'Anakotmai' }}>ย้อนกลับ</span>
    </Button><div className="health-form-page">
        <div className="form-header">


          <Title level={2} className="page-title" style={{
            fontFamily: 'Anakotmai',
            marginTop: '20px',
            marginLeft: '30px',
            color: '#ff6600'
          }}>
            {editMode ? 'แก้ไขบันทึกสุขภาพ' : 'รายละเอียดบันทึกสุขภาพ'}
          </Title>
        </div>

        <Card className="health-form-card">
          {/* Summary Information */}
          <div style={{ marginBottom: '24px' }}>
            <Descriptions
              title={<span style={{ fontFamily: 'Anakotmai' }}>ข้อมูลทั่วไป</span>}
              bordered
              column={2}
              labelStyle={{ fontFamily: 'Anakotmai' }}
              contentStyle={{ fontFamily: 'Anakotmai' }}
            >
              <Descriptions.Item label="รหัสประวัติ">{healthRecord.ID}</Descriptions.Item>
              <Descriptions.Item label="รหัสสุนัข">{healthRecord.dog_id}</Descriptions.Item>
              <Descriptions.Item label="วันที่บันทึก">{formatDate(healthRecord.date_record)}</Descriptions.Item>
              <Descriptions.Item label="การฉีดวัคซีน">{healthRecord.vaccination === 'YES' ? 'ฉีดแล้ว' : 'ยังไม่ฉีด'}</Descriptions.Item>
            </Descriptions>
          </div>

          <Divider />

          {/* Form for editing/viewing */}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            scrollToFirstError
          >
            {/* Basic Information */}
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="weight"
                  label={<span style={{ fontFamily: 'Anakotmai' }}>น้ำหนัก (กก.)</span>}
                  rules={editMode ? [
                    { required: true, message: 'กรุณากรอกน้ำหนัก' },
                    { validator: validateWeight }
                  ] : []}
                >
                  <InputNumber
                    placeholder="12.5"
                    min={0}
                    step={0.1}
                    style={{ width: '100%', fontFamily: 'Anakotmai' }}
                    readOnly={!editMode}
                    precision={1} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="temperature"
                  label={<span style={{ fontFamily: 'Anakotmai' }}>อุณหภูมิ (°C)</span>}
                  rules={editMode ? [
                    { required: true, message: 'กรุณากรอกอุณหภูมิ' },
                    { validator: validateTemperature }
                  ] : []}
                >
                  <InputNumber
                    placeholder="38.2"
                    min={35}
                    max={45}
                    step={0.1}
                    precision={1}
                    style={{ width: '100%', fontFamily: 'Anakotmai' }}
                    readOnly={!editMode} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="recordDate"
                  label={<span style={{ fontFamily: 'Anakotmai' }}>วันที่บันทึก</span>}
                  rules={editMode ? [{ required: true, message: 'กรุณาเลือกวันที่' }] : []}
                >
                  <DatePicker
                    style={{ width: '100%', fontFamily: 'Anakotmai' }}
                    disabled={!editMode}
                    format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="symptoms"
              label={<span style={{ fontFamily: 'Anakotmai' }}>อาการที่พบ</span>}
              rules={editMode ? [
                { required: true, message: 'กรุณากรอกอาการที่พบ' },
                { min: 10, message: 'อาการที่พบควรมีอย่างน้อย 10 ตัวอักษร' }
              ] : []}
            >
              <TextArea
                rows={4}
                placeholder="ไม่มีข้อมูล"
                readOnly={!editMode}
                style={{ fontFamily: 'Anakotmai' }}
                showCount={editMode}
                maxLength={editMode ? 500 : undefined} />
            </Form.Item>

            <Form.Item
              name="diagnosis"
              label={<span style={{ fontFamily: 'Anakotmai' }}>การวินิจฉัย</span>}
              rules={editMode ? [
                { min: 5, message: 'การวินิจฉัยควรมีอย่างน้อย 5 ตัวอักษร' }
              ] : []}
            >
              <TextArea
                rows={4}
                placeholder="ไม่มีข้อมูล"
                readOnly={!editMode}
                style={{ fontFamily: 'Anakotmai' }}
                showCount={editMode}
                maxLength={editMode ? 500 : undefined} />
            </Form.Item>

            <Form.Item
              name="treatment"
              label={<span style={{ fontFamily: 'Anakotmai' }}>การรักษา</span>}
              rules={editMode ? [
                { min: 5, message: 'การรักษาควรมีอย่างน้อย 5 ตัวอักษร' }
              ] : []}
            >
              <TextArea
                rows={4}
                placeholder="ไม่มีข้อมูล"
                readOnly={!editMode}
                style={{ fontFamily: 'Anakotmai' }}
                showCount={editMode}
                maxLength={editMode ? 500 : undefined} />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={24}>
                <Form.Item
                  name="medication"
                  label={<span style={{ fontFamily: 'Anakotmai' }}>ยาที่ให้</span>}
                >
                  <Input
                    placeholder="ไม่มีข้อมูล"
                    readOnly={!editMode}
                    style={{ fontFamily: 'Anakotmai' }}
                    maxLength={editMode ? 200 : undefined} />
                </Form.Item>
              </Col>
            </Row>

            {/* Vaccination Section */}
            <Divider />
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="hasVaccination"
                  label={<span style={{ fontFamily: 'Anakotmai' }}>การฉีดวัคซีน</span>}
                  rules={editMode ? [{ required: true, message: 'กรุณาเลือกสถานะการฉีดวัคซีน' }] : []}
                >
                  <Select
                    placeholder="ไม่มีข้อมูล"
                    disabled={!editMode}
                    onChange={handleVaccinationChange}
                    style={{ fontFamily: 'Anakotmai' }}
                  >
                    <Select.Option value="YES" style={{ fontFamily: 'Anakotmai' }}>ฉีดแล้ว</Select.Option>
                    <Select.Option value="NO" style={{ fontFamily: 'Anakotmai' }}>ยังไม่ฉีด</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Vaccine Records Section - View Mode */}
            {hasVaccination === 'YES' && !editMode && vaccineRecords.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <Title level={4} style={{ fontFamily: 'Anakotmai', marginBottom: '16px' }}>รายการวัคซีนที่ได้รับ</Title>
                {vaccineRecords.map((record, index) => {
                  const vaccineInfo = vaccines.find(v => v.ID === record.vaccine_id);
                  return (
                    <Card
                      key={index}
                      size="small"
                      style={{ marginBottom: '16px' }}
                      title={<span style={{ fontFamily: 'Anakotmai' }}>วัคซีนที่ {index + 1}</span>}
                    >
                      <Descriptions column={2} labelStyle={{ fontFamily: 'Anakotmai' }} contentStyle={{ fontFamily: 'Anakotmai' }}>
                        <Descriptions.Item label="ชนิดวัคซีน">
                          {vaccineInfo ? `${vaccineInfo.name} (${vaccineInfo.manufacturer})` : 'ไม่พบข้อมูล'}
                        </Descriptions.Item>
                        <Descriptions.Item label="เข็มที่">
                          {record.dose_number}
                        </Descriptions.Item>
                        <Descriptions.Item label="หมายเลขล็อต">
                          {record.lot_number || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="วันนัดหมายครั้งต่อไป">
                          {record.next_due_date ? formatDate(record.next_due_date) : '-'}
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Vaccine Records Section - Edit Mode */}
            {hasVaccination === 'YES' && editMode && (
              <div style={{ marginBottom: '16px' }}>
                <Title level={4} style={{ fontFamily: 'Anakotmai', marginBottom: '16px' }}>แก้ไขรายการวัคซีน</Title>
                {vaccineRecords.map((record, index) => (
                  <Card
                    key={index}
                    size="small"
                    style={{ marginBottom: '16px' }}
                    title={<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Anakotmai' }}>วัคซีนที่ {index + 1}</span>
                      {vaccineRecords.length > 1 && (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => removeVaccineRecord(index)}
                        >
                          ลบ
                        </Button>
                      )}
                    </div>}
                  >
                    <Row gutter={16}>
                      <Col xs={24} sm={6}>
                        <div style={{ fontFamily: "Anakotmai", marginBottom: "8px" }}>ชนิดวัคซีน</div>
                        <Select
                          placeholder="เลือกชนิดวัคซีน"
                          value={record.vaccine_id || undefined}
                          onChange={(value) => updateVaccineRecord(index, 'vaccine_id', value)}
                          style={{ width: '100%', fontFamily: 'Anakotmai' }}
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
                          style={{ width: '100%', fontFamily: 'Anakotmai' }} />
                      </Col>
                      <Col xs={24} sm={6}>
                        <div style={{ fontFamily: "Anakotmai", marginBottom: "8px" }}>หมายเลขล็อต</div>
                        <Input
                          placeholder="LOT123456"
                          value={record.lot_number}
                          onChange={(e) => updateVaccineRecord(index, 'lot_number', e.target.value)}
                          style={{ fontFamily: 'Anakotmai' }} />
                      </Col>
                      <Col xs={24} sm={6}>
                        <div style={{ fontFamily: "Anakotmai", marginBottom: "8px" }}>วันนัดหมายครั้งต่อไป</div>
                        <DatePicker
                          placeholder="เลือกวันที่"
                          value={record.next_due_date ? dayjs(record.next_due_date) : null}
                          onChange={(date) => updateVaccineRecord(index, 'next_due_date', date?.format('YYYY-MM-DD'))}
                          style={{ width: '100%', fontFamily: 'Anakotmai' }}
                          format="DD/MM/YYYY"
                          disabledDate={(current) => current && current < dayjs().startOf('day')} />
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
                    fontFamily: 'Anakotmai',
                    borderColor: '#FF6600',
                    color: '#FF6600'
                  }}
                >
                  เพิ่มรายการวัคซีน
                </Button>
              </div>
            )}

            <Form.Item
              name="notes"
              label={<span style={{ fontFamily: 'Anakotmai' }}>หมายเหตุเพิ่มเติม</span>}
            >
              <TextArea
                rows={3}
                placeholder="ไม่มีหมายเหตุเพิ่มเติม"
                readOnly={!editMode}
                style={{ fontFamily: 'Anakotmai' }}
                showCount={editMode}
                maxLength={editMode ? 300 : undefined} />
            </Form.Item>

            {/* Action Buttons */}
            <Form.Item className="submit-section">
              <Space size="large">
                <Button onClick={handleBack} size="large" style={{ fontFamily: 'Anakotmai' }}>
                  ย้อนกลับ
                </Button>

                {editMode ? (
                  <>
                    <Button
                      onClick={handleEditToggle}
                      size="large"
                      icon={<CloseOutlined />}
                      style={{ fontFamily: 'Anakotmai' }}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      loading={submitLoading}
                      icon={<SaveOutlined />}
                      style={{ fontFamily: 'Anakotmai' }}
                    >
                      บันทึกการเปลี่ยนแปลง
                    </Button>
                  </>
                ) : (
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={handleEditToggle}
                    size="large"
                    style={{ fontFamily: 'Anakotmai' }}
                  >
                    แก้ไขข้อมูล
                  </Button>
                )}
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div></>
  );
};

export default SingleDetailPage;