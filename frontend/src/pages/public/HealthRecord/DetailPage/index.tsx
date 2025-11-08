import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message, Spin } from "antd";
import type { HealthRecord } from "../../../../interfaces/HealthRecord";
import type { DogInterface } from "../../../../interfaces/Dog";
import { healthRecordAPI, dogAPI } from "../../../../services/apis";
import { Card, Typography, Row, Col, Button, Space, Popconfirm } from "antd";
import { ArrowLeftOutlined, DeleteOutlined } from "@ant-design/icons";
import "./style.css";

const { Title, Text } = Typography;

const DetailPage: React.FC = () => {
  const { id: dogId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedDog, setSelectedDog] = useState<DogInterface | null>(null);
  const [dogHealthRecords, setDogHealthRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  useEffect(() => {
    if (dogId && !isNaN(parseInt(dogId))) { //มีค่าและเป็นตัวเลขที่แปลงได้จริง
      fetchDogAndHealthRecords();
    } else {
      message.error("รหัสสุนัขไม่ถูกต้อง");
      navigate("/dashboard/health-record");
    }
  }, [dogId]);

  const fetchDogAndHealthRecords = async () => {
    if (!dogId) return;

    setLoading(true);
    try {
      const dogIdNum = parseInt(dogId);

      // ดึงข้อมูลสุนัขและประวัติสุขภาพพร้อมกัน
      const [dogDetails, records] = await Promise.all([
        dogAPI.getById(dogIdNum),
        healthRecordAPI.getHealthRecordsByDogId(dogId),
      ]);

      setSelectedDog(dogDetails);
      setDogHealthRecords(records.data || []);
    } catch (error) {
      message.error("ไม่สามารถโหลดข้อมูลสุนัขหรือประวัติสุขภาพได้");
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewHealthRecordDetail = (record: HealthRecord) => {
    if (record.ID) {
      navigate(`/dashboard/health-record/record/${record.ID}`);
    } else {
      message.error("ไม่สามารถเปิดรายละเอียดประวัติสุขภาพได้");
    }
  };

  const handleAddHealthRecord = () => {
    navigate(`/dashboard/health-record/${dogId}/add`);
  };

  const performDelete = async (medId: number) => {
    setDeleteLoading(medId);
    try {
      const resp = await healthRecordAPI.deleteHealthRecord(medId);
      console.log("[DEL] API resp:", resp); // BE อาจตอบ 204 No Content ได้
      message.success("ลบเรียบร้อยแล้ว");
      setDogHealthRecords((prevRecords) =>
        prevRecords.filter((record) => record.ID !== medId) //สร้าง array ใหม่ที่ตัด record ที่ถูกลบออกไป
      );
    } catch (err) {
      console.error("[DEL] error:", err);
      message.error("ลบไม่สำเร็จ");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleBack = () => {
    navigate("/dashboard/health-record");
  };

  const formatDate = (dateString: string | null | undefined) => { //ช่วยจัดรูปแบบวันที่
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("th-TH");
    } catch {
      return dateString;
    }
  };

  const truncateText = ( //ช่วยตัดข้อความให้สั้นลง
    text: string | null | undefined,
    maxLength: number = 50
  ) => {
    if (!text) return "-";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px" }}>
        <Spin size="large" />
        <div style={{ marginTop: "16px" }}>
          <Text>กำลังโหลดข้อมูล...</Text>
        </div>
      </div>
    );
  }

  if (!selectedDog) {
    return (
      <div style={{ textAlign: "center", padding: "100px" }}>
        <Text type="secondary">ไม่พบข้อมูลสุนัข</Text>
        <div style={{ marginTop: "16px" }}>
          <Button onClick={handleBack} style={{ marginLeft: "30px" }}>กลับไปค้นหา</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="health-detail-page">
      <div className="form-header" style={{ marginBottom: "10px",marginTop: "-90px" }  }>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          className="back-button"
          style={{ marginTop: "-20px",zIndex: 0}}
        >
          ย้อนกลับ
        </Button>
        <Title level={2} className="page-title">
          รายละเอียดสุขภาพ - {selectedDog.name}
        </Title>
        <div className="title-underline"></div>
      </div>

      <Card className="health-detail-card">
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <img
            src={selectedDog.photo_url ?? undefined}
            alt={selectedDog.name}
            style={{
              width: "150px",
              height: "150px",
              borderRadius: "50%",
              objectFit: "cover",
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/default-dog-image.jpg"; // fallback image
            }}
          />
        </div>

        <Title
          level={3}
          style={{
            textAlign: "center",
            marginBottom: "20px",
            color: "#ff6600",
            fontSize: "29px",
            fontFamily: "Anakotmai-Bold",
          }}
        >
          ประวัติบันทึกสุขภาพ
        </Title>

        {dogHealthRecords.length === 0 ? (
          <div className="no-records">
            <Text style={{ fontFamily: "Anakotmai-Bold" }}>
              ไม่พบข้อมูลประวัติสุขภาพสำหรับสุนัขตัวนี้
            </Text>
          </div>
        ) : (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {dogHealthRecords.map((record) => (
              <Card key={record.ID} className="health-record-item" hoverable>
                <Row gutter={[16, 8]} align="middle">
                  <Col span={18}>
                    <div className="record-info">
                      <Text strong style={{ fontFamily: "Anakotmai-Bold" }}>
                        วันที่บันทึก:
                      </Text>
                      <Text style={{ fontFamily: "Anakotmai-Bold" }}>
                        {" "}
                        {formatDate(record.date_record)}
                      </Text>
                      <br />

                      <Text strong style={{ fontFamily: "Anakotmai-Bold" }}>
                        อาการที่พบ:
                      </Text>
                      <Text style={{ fontFamily: "Anakotmai-Bold" }}>
                        {" "}
                        {truncateText(record.symptoms)}
                      </Text>
                      <br />

                      <Text strong style={{ fontFamily: "Anakotmai-Bold" }}>
                        การฉีดวัคซีน:
                      </Text>
                      <Text style={{ fontFamily: "Anakotmai-Bold" }}>
                        {" "}
                        {record.vaccination === "YES" ? "ฉีดแล้ว" : "ยังไม่ฉีด"}
                      </Text>
                      <br />
                    </div>
                  </Col>
                  <Col span={6} style={{ textAlign: "right" }}>
                    <Space>
                      <Button
                        type="primary"
                        onClick={() => handleViewHealthRecordDetail(record)}
                        style={{
                          fontFamily: "Anakotmai-Bold",
                          marginLeft: "-50px",
                        }}
                      >
                        ดูรายละเอียดเพิ่มเติม
                      </Button>

                      <Popconfirm
                        title={<div style={{ fontFamily: "Anakotmai-Bold" }}>{"ยืนยันการลบ"}</div>}
                        description={<div style={{ fontFamily: "Anakotmai-Bold" }}>{"คุณแน่ใจว่าต้องการลบประวัติสุขภาพนี้หรือไม่? การลบจะไม่สามารถกู้คืนได้"}</div>}
                        okText="ลบ"
                        okButtonProps={{ danger: true }}
                        cancelText="ยกเลิก"
                        style={{ fontFamily: "Anakotmai-Bold" }}
                        onConfirm={() => performDelete(record.ID)}
                      >
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          loading={deleteLoading === record.ID}
                          style={{ fontFamily: "Anakotmai-Bold" }}
                        >
                          ลบ
                        </Button>
                      </Popconfirm>
                    </Space>
                  </Col>
                </Row>
              </Card>
            ))}
          </Space>
        )}

        <Space
          style={{ marginTop: "30px", width: "100%", justifyContent: "center" }}
        >
          <Button
            type="primary"
            size="large"
            onClick={handleAddHealthRecord}
            style={{ fontFamily: "Anakotmai-Bold" }}
          >
            เพิ่มบันทึกสุขภาพ
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default DetailPage;
