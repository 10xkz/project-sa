import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Tag,
  List,
  Spin,
  Alert,
  Empty,
  Row,
  Col,
  Button,
  Space,
  Tabs,
  Statistic,
  Avatar,
  message,
  Popconfirm,
} from 'antd';
import {
  DollarOutlined,
  GiftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  HistoryOutlined,
  WalletOutlined,
  ShoppingOutlined,
  CalendarOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useAuthUser } from '../../../hooks/useAuth';
import { donationAPI } from '../../../services/apis';
import './style.css';

const { Title, Text, Paragraph } = Typography;

interface DonationWithDetails {
  ID: number;
  donation_date: string;
  donation_type: 'money' | 'item';
  status: string;
  description?: string;
  money_donations?: Array<{
    amount: number;
    payment_type: 'one-time' | 'monthly';
    transaction_ref?: string;
    status?: 'success' | 'complete' | 'active';
    payment_method?: {
      name: string;
    };
  }>;
  item_donations?: Array<{
    quantity: number;
    item_ref?: string;
    item: {
      name: string;
    };
    unit: {
      name: string;
    };
  }>;
}

const MyDonations: React.FC = () => {
  const { user, isLoggedIn, loading: authLoading } = useAuthUser();
  const [donations, setDonations] = useState<DonationWithDetails[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'money' | 'items'>('all');
  

  useEffect(() => {
    if (isLoggedIn && user?.ID) {
      fetchMyDonations();
    } else if (!authLoading && !isLoggedIn) {
      setDonationsLoading(false);
    }
  }, [isLoggedIn, user, authLoading]);

  const fetchMyDonations = async () => {
    try {
      setDonationsLoading(true);
      setError(null);
      const response = (await donationAPI.getMyDonations()) as any;
      
      if (response && Array.isArray(response)) {
        setDonations(response);
      } else {
        throw new Error('Invalid data structure received from API');
      }
    } catch (err: any) {
      console.error('Error fetching donations:', err);
      setError('ไม่สามารถโหลดประวัติการบริจาคได้');
    } finally {
      setDonationsLoading(false);
    }
  };

  const handleConfirmCancel = async (donationId: number) => {
    try {
      setDonationsLoading(true);
      await donationAPI.updateStatus(donationId, { status: 'cancel' });
      message.success('การบริจาครายเดือนได้ถูกยกเลิกแล้ว');
      fetchMyDonations();
    } catch (err) {
      console.error('Error cancelling donation:', err);
      message.error('เกิดข้อผิดพลาดในการยกเลิกการบริจาค');
      setDonationsLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);

  const getStatusTag = (status: string) => {
    const safe = (status || '').toLowerCase();
    const map: Record<string, { cls: string; icon: React.ReactNode; text: string }> = {
      success: { cls: 'tag-success', icon: <CheckCircleOutlined style={{ color: 'green' }} />, text: 'สำเร็จ' },
      complete: { cls: 'tag-success', icon: <CheckCircleOutlined style={{ color: 'green' }} />, text: 'สำเร็จ' },
      completed: { cls: 'tag-success', icon: <CheckCircleOutlined style={{ color: 'green' }} />, text: 'สำเร็จ' },
      pending: { cls: 'tag-pending', icon: <ClockCircleOutlined style={{ color: 'orange' }} />, text: 'รอดำเนินการ' },
      active: { cls: 'tag-active', icon: <ClockCircleOutlined style={{ color: 'blue' }} />, text: 'ใช้งานอยู่' },
      cancel: { cls: 'tag-failed', icon: <CloseCircleOutlined style={{ color: 'black' }} />, text: 'ยกเลิก' },
      cancelled: { cls: 'tag-failed', icon: <CloseCircleOutlined style={{ color: 'black' }} />, text: 'ยกเลิก' },
      failed: { cls: 'tag-failed', icon: <CloseCircleOutlined style={{ color: 'red' }} />, text: 'ล้มเหลว' },
    };
    const cfg = map[safe] || { cls: 'tag-default', icon: null, text: status || 'N/A' };
    return (
      <Tag className={`mdn-tag ${cfg.cls}`} icon={cfg.icon}>
        {cfg.text}
      </Tag>
    );
  };

  const getDonationTypeTag = (type: string) =>
    type === 'money' ? (
      <Tag className="mdn-tag tag-money" icon={<DollarOutlined />}>
        <span style={{ fontFamily: 'Anakotmai' }}>บริจาคเงิน</span>
      </Tag>
    ) : (
      <Tag className="mdn-tag tag-item" icon={<GiftOutlined />}>
        <span style={{ fontFamily: 'Anakotmai' }}>บริจาคสิ่งของ</span>
      </Tag>
    );

  const getFilteredDonations = () => {
    switch (activeTab) {
      case 'money':
        return donations.filter((d) => d.donation_type === 'money');  //กรอง donations ให้เหลือเฉพาะที่ donation_type === 'money'
      case 'items':
        return donations.filter((d) => d.donation_type === 'item');
      default:
        return donations;
    }
  };

  const getDonationStats = () => {
    const money = donations.filter((d) => d.donation_type === 'money');
    const items = donations.filter((d) => d.donation_type === 'item');
    const totalAmount = money.reduce(
      (s, d) => s + (d.money_donations?.reduce((sm, m) => sm + (m.amount || 0), 0) || 0),
      0
    );
    const totalItems = items.reduce((s, d) => s + (d.item_donations?.length || 0), 0);
    return {
      total: donations.length,
      money: money.length,
      items: items.length,
      totalAmount,
      totalItemCount: totalItems,
    };
  };

  const stats = getDonationStats();

  const renderMoneyDonation = (d: DonationWithDetails) => {
    if (!d.money_donations?.length) return null;
    return d.money_donations.map((m, idx) => {
      const { amount, payment_type, transaction_ref, payment_method } = m;
      const isMonthlyActive = payment_type === 'monthly' && (d.status.toLowerCase() === 'active' || d.status.toLowerCase() === 'success');
      return (
        <Card key={idx} size="small" className="mdn-subcard mdn-subcard--money">
          <Row gutter={[16, 12]}>
            <Col xs={24} md={12}>
              <Space direction="vertical" size={4}>
                <Text className="mdn-label" style={{ fontFamily: 'Anakotmai' }}>จำนวนเงิน</Text>
                <div className="mdn-amount">{formatAmount(amount)}</div>
              </Space>
            </Col>
            <Col xs={24} md={12}>
              <Space direction="vertical" size={4}>
                <Text className="mdn-label" style={{ fontFamily: 'Anakotmai' }}>ประเภทการจ่าย</Text>
                <Tag className="mdn-pill">
                  <CalendarOutlined /> {payment_type === 'monthly' ? 'รายเดือน' : 'ครั้งเดียว'}
                </Tag>
              </Space>
            </Col>

            {payment_method && (
              <Col xs={24} md={12}>
                <Space direction="vertical" size={4}>
                  <Text className="mdn-label" style={{ fontFamily: 'Anakotmai' }}>วิธีการจ่าย</Text>
                  <Tag className="mdn-pill">
                    <BankOutlined /> {payment_method.name}
                  </Tag>
                </Space>
              </Col>
            )}

            {transaction_ref && (
              <Col xs={24} md={12}>
                <Space direction="vertical" size={4}>
                  <Text className="mdn-label" style={{ fontFamily: 'Anakotmai' }}>รหัสธุรกรรม</Text>
                  <Text code className="mdn-code">
                    {transaction_ref}
                  </Text>
                </Space>
              </Col>
            )}
          </Row>
          {isMonthlyActive && (
            <Popconfirm
              title={<div style={{ fontFamily: 'Anakotmai' }}>ยืนยันการยกเลิก</div>}
              description={<div style={{ fontFamily: 'Anakotmai' }}>คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการบริจาครายเดือนนี้?</div>}
              onConfirm={() => handleConfirmCancel(d.ID)}
              okText={<div style={{ fontFamily: 'Anakotmai' }}>ยืนยัน</div>}
              cancelText={<div style={{ fontFamily: 'Anakotmai' }}>ยกเลิก</div>}
            >
              <Button
                type="primary"
                danger
                style={{ marginTop: '10px', width: '100%' }}
                icon={<CloseCircleOutlined />}
              >
                ยกเลิกการบริจาครายเดือน
              </Button>
            </Popconfirm>
          )}
        </Card>
      );
    });
  };

  const renderItemDonation = (d: DonationWithDetails) => {
    if (!d.item_donations?.length) return null;
    
    return (
      <Card size="small" className="mdn-subcard mdn-subcard--item">
        <Title level={5} className="mdn-subtitle">รายการสิ่งของที่บริจาค</Title>
        <List
          dataSource={d.item_donations}
          renderItem={(item, idx) => {
            // ใช้ตัวเล็กตามข้อมูลจริงที่ส่งมาจาก backend
            const itemName = item.item?.name || '[ไม่พบข้อมูลสิ่งของ]';
            const unitName = item.unit?.name || '';
            
            return (
              <List.Item className={`mdn-item ${idx === d.item_donations!.length - 1 ? 'last' : ''}`}>
                <Row align="middle" style={{ width: '100%' }}>
                  <Col flex="auto">
                    <Space>
                      <Avatar size="small" icon={<GiftOutlined />} className="mdn-avatar" />
                      <div>
                        <Text strong>{itemName}</Text>
                        {item.item_ref && (
                          <div>
                            <Text type="secondary" className="mdn-muted" style={{ fontFamily: 'Anakotmai' }}>
                              รหัส: {item.item_ref}
                            </Text>
                          </div>
                        )}
                      </div>
                    </Space>
                  </Col>
                  <Col>
                    <Tag className="mdn-qty">{item.quantity} {unitName}</Tag>
                  </Col>
                </Row>
              </List.Item>
            );
          }}
        />
      </Card>
    );
  };

  const renderDonationCard = (d: DonationWithDetails) => (
    <Card key={d.ID} hoverable className="mdn-card">
      <div className={`mdn-card__accent mdn-card__accent--${d.donation_type}`} />
      <Card.Meta
        title={
          <Space>
            {getDonationTypeTag(d.donation_type)}
            {getStatusTag(d.status)}
          </Space>
        }
        description={
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary" className="mdn-muted">
              <CalendarOutlined /> {formatDate(d.donation_date)}
            </Text>
            {d.description && <Text style={{ fontFamily: 'Anakotmai' }}>{d.description}</Text>}
          </Space>
        }
      />
      {d.donation_type === 'money' && renderMoneyDonation(d)}
      {d.donation_type === 'item' && renderItemDonation(d)}
    </Card>
  );

  if (authLoading) {
    return (
      <div className="mdn-root" style={{ fontFamily: 'Anakotmai' }}>
        <div className="mdn-center">
          <Spin size="large" />
          <div className="mdn-center__text">กำลังตรวจสอบสิทธิ์...</div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="mdn-root" style={{ fontFamily: 'Anakotmai' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Title level={3} className="mdn-title">กรุณาเข้าสู่ระบบ</Title>
              <Paragraph>เพื่อดูประวัติการบริจาคของคุณ</Paragraph>
            </div>
          }
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mdn-root" style={{ fontFamily: 'Anakotmai' }}>
        <Alert
          message="เกิดข้อผิดพลาด"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={fetchMyDonations} icon={<ReloadOutlined />}>
              ลองอีกครั้ง
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mdn-root" style={{ fontFamily: 'Anakotmai' }}>
      
      <div className="mdn-header">
        <Title level={1} className="mdn-title">
          ประวัติการบริจาคของฉัน
        </Title>
        <Paragraph className="mdn-subtext">
          รายการการบริจาคทั้งหมดของ <Text strong>{user?.name}</Text>
        </Paragraph>
        <div className="title-underline" />
        <Row gutter={[16, 16]} className="mdn-stats">
          <Col xs={24} sm={8}>
            <Card hoverable className="mdn-statcard">
              <Statistic
                title={<span>การบริจาคทั้งหมด</span>}
                value={stats.total}
                prefix={<HistoryOutlined />}
                suffix="ครั้ง"
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card hoverable className="mdn-statcard">
              <Statistic
                title={<span>บริจาคเงิน</span>}
                value={stats.totalAmount}
                prefix={<WalletOutlined />}
                suffix="บาท"
                formatter={(v) => `฿${Number(v).toLocaleString()}`}
              />
              <Text className="mdn-muted">{stats.money} ครั้ง</Text>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card hoverable className="mdn-statcard">
              <Statistic
                title={<span style={{ fontFamily: 'Anakotmai' }}>บริจาคสิ่งของ</span>}
                value={stats.totalItemCount}
                prefix={<ShoppingOutlined />}
                suffix="รายการ"
              />
              <Text className="mdn-muted">{stats.items} ครั้ง</Text>
            </Card>
          </Col>
        </Row>
      </div>

      <Card className="mdn-tabs">
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as any)}
          size="large"
          centered
          items={[
            {
              key: 'all',
              label: (
                <Space>
                  <HistoryOutlined />
                  ประวัติทั้งหมด
                  <Tag className="mdn-tag tag-blue">{stats.total}</Tag>
                </Space>
              ),
            },
            {
              key: 'money',
              label: (
                <Space>
                  <WalletOutlined />
                  บริจาคเงิน
                  <Tag className="mdn-tag tag-green">{stats.money}</Tag>
                </Space>
              ),
            },
            {
              key: 'items',
              label: (
                <Space>
                  <ShoppingOutlined />
                  <span style={{ fontFamily: 'Anakotmai' }}>บริจาคสิ่งของ</span>
                  <Tag className="mdn-tag tag-orange">{stats.items}</Tag>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {donationsLoading ? (
        <div className="mdn-center">
          <Spin size="large" />
          <div className="mdn-center__text">กำลังโหลดประวัติการบริจาค...</div>
        </div>
      ) : getFilteredDonations().length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Title level={3} className="mdn-empty-title">ยังไม่มีประวัติการบริจาค</Title>
              <Paragraph>
                {activeTab === 'money' && 'ยังไม่มีประวัติการบริจาคเงิน'}
                {activeTab === 'items' && 'ยังไม่มีประวัติการบริจาคสิ่งของ'}
                {activeTab === 'all' && 'เมื่อคุณบริจาคแล้ว ประวัติจะแสดงที่นี่'}
              </Paragraph>
            </div>
          }
        />
      ) : (
        <Row gutter={[16, 16]}>
          {getFilteredDonations().map((d) => (
            <Col xs={24} sm={12} lg={8} key={d.ID}>
              {renderDonationCard(d)}
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default MyDonations;