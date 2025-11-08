import React, { useEffect } from "react";
import './style.css';
import { useNavigate } from "react-router-dom";
import { Select, Form, Input, message, Button } from "antd";
import { Segmented } from 'antd';
import paw_heart from '../../../../assets/paw-heart.png';

import { paymentMethodAPI } from "../../../../services/apis";
import type { PaymentMethodInterface } from "../../../../interfaces/PaymentMethod";
import type { MoneyDonationInterface } from '../../../../interfaces/Donation';

const getInitialDonationMoneyData = () => {
  try {
    const storedData = sessionStorage.getItem('donationMoneyFormData');
    if (storedData) {
      return JSON.parse(storedData);
    }
    return {};
  } catch (error) {
    console.error("Error parsing stored donation money data:", error);
    return {};
  }
};

const DonationMoneyForm: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const initialData = getInitialDonationMoneyData();
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethodInterface[]>([]);
  const [messageApi, contextHolder] = message.useMessage();
  const [createAccount, setCreateAccount] = React.useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const res = await paymentMethodAPI.getAll();
      setPaymentMethods(res);
    } catch (err) {
      console.error('fetchPaymentMethods error:', err);
      messageApi.open({
        type: 'error',
        content: 'ไม่พบข้อมูลวิธีการชำระเงิน',
      });
    }
  };

  const handleSubmit = async (values: any) => {
    console.log('Form values on submit:', values);

    const type = values.donationFrequency;

    if (type === 'รายครั้ง' && !isLoggedIn && createAccount === null) {
      messageApi.open({
        type: "error",
        content: "กรุณาเลือกการสร้างบัญชีบริจาค",
      });
      return;
    }

    if (type === 'รายครั้ง' && !values.paymentMethod) {
      messageApi.open({
        type: "error",
        content: "กรุณาเลือกวิธีการชำระเงิน",
      });
      return;
    }

    const finalData: MoneyDonationInterface = {
      amount: type === 'รายเดือน' ? Number(values.monthlyAmount) : Number(values.oneTimeAmount),
      payment_method_id: type === 'รายเดือน' ? 1 : values.paymentMethod,
      payment_type: type === 'รายเดือน' ? 'monthly' : 'one-time',
      billing_date: type === 'รายเดือน' ? String(values.billingDate) : "-",
      next_payment_date: "-", // Default value
    };

    if (type === 'รายเดือน') {
      const today = new Date();
      const billingDay = Number(values.billingDate);
      let nextPaymentDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
      if (today.getDate() >= billingDay) {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      }
      finalData.next_payment_date = nextPaymentDate.toISOString().split('T')[0];
    }

    console.log('Final data before navigation:', finalData);

    sessionStorage.setItem('moneyDonationData', JSON.stringify(finalData));

    const isMonthly = type === 'รายเดือน';
    const isOneTime = type === 'รายครั้ง';
    const wantsToCreateAccount = createAccount === 3;

    // Condition to redirect to signup page
    const shouldSignUp = !isLoggedIn && (isMonthly || (isOneTime && wantsToCreateAccount));

    if (shouldSignUp) {
      // Prepare prefill data for signup form
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

      let returnTo = '/donation/money';

      if (isMonthly) {
        returnTo = '/donation/payment/creditcard';
      } else {
        if (values.paymentMethod === 1 || values.paymentMethod === 'บัตรเครดิต') {
          returnTo = '/donation/payment/creditcard';
        } else if (values.paymentMethod === 2 || values.paymentMethod === 'พร้อมเพย์') {
          returnTo = '/donation/payment/banktransfer';
        }
      }

      sessionStorage.setItem('returnTo', returnTo);

      navigate('/auth/users');
    } else {
      navigateToNextPage(type, values.paymentMethod);
    }
  };

  const navigateToNextPage = (donationType: string, paymentMethodId: number) => {
    if (donationType === 'รายเดือน') {
      navigate('/donation/payment/creditcard');
    } else {
      if (paymentMethodId === 1) {
        navigate('/donation/payment/creditcard');
      } else if (paymentMethodId === 2) {
        navigate('/donation/payment/banktransfer');
      } else {
        navigate('/donation/thankyou');
      }
    }
  };

  const handlePresetMonthlyAmount = (amount: number) => {
    form.setFieldsValue({ monthlyAmount: amount.toString() });
  };

  const handlePresetOneTimeAmount = (amount: number) => {
    form.setFieldsValue({ oneTimeAmount: amount.toString() });
  };

  const validateMinAmount = (_: any, value: string) => {
    if (value && Number(value) < 300) {
      return Promise.reject(new Error('จำนวนเงินขั้นต่ำคือ 300 บาท'));
    }
    return Promise.resolve();
  };

  const validateMinOneTimeAmount = (_: any, value: string) => {
    if (value && Number(value) < 50) {
      return Promise.reject(new Error('จำนวนเงินขั้นต่ำคือ 50 บาท'));
    }
    return Promise.resolve();
  };

  const donationType = Form.useWatch('donationFrequency', form);
  const monthlyAmount = Form.useWatch('monthlyAmount', form);
  const months = Form.useWatch('months', form);
  const billingDate = Form.useWatch('billingDate', form);


  return (
    <>
      {contextHolder}
      <div className="form-page-container">
        <div className="form-card">
          <button onClick={() => {
            sessionStorage.removeItem('donationMoneyFormData');
            navigate('/donation/information');
          }} className="back-link" style={{ fontFamily: 'Anakotmai-Medium' }}>
            &lt; ย้อนกลับ
          </button>

          <h1 className="form-title">ร่วมบริจาคเงิน</h1>

          <Form
            form={form}
            onFinish={handleSubmit}
            initialValues={{
              ...initialData,
              donationFrequency: initialData.donationFrequency || 'รายเดือน',
            }}
            onValuesChange={(_, allValues) => {
              sessionStorage.setItem('donationMoneyFormData', JSON.stringify(allValues));
            }}
          >
            <Form.Item name="donationFrequency">
              <Segmented
                className="custom-large-segmented"
                options={[
                  {
                    label: 'รายเดือน',
                    value: 'รายเดือน',
                    icon: <img src={paw_heart} alt="paw heart" />,
                  },
                  {
                    label: <span className="once-label">รายครั้ง</span>,
                    value: 'รายครั้ง',
                    icon: <img src={paw_heart} alt="" style={{ visibility: 'hidden' }} />,
                  },
                ]}
                size="large"
                onChange={(value) => form.setFieldValue('donationFrequency', value)}
              />
            </Form.Item>

            {donationType === 'รายเดือน' ? (
              <div className="amount-input-row">
                <Button onClick={() => handlePresetMonthlyAmount(500)}>500 บาท</Button>
                <Button onClick={() => handlePresetMonthlyAmount(1000)}>1,000 บาท</Button>
                <Button onClick={() => handlePresetMonthlyAmount(2000)}>2,000 บาท</Button>
                <Form.Item
                  name="monthlyAmount"
                  rules={[
                    { required: true, message: 'กรุณากรอกจำนวนเงินรายเดือน!' },
                    { validator: validateMinAmount },
                  ]}
                  className="amount-input-item"
                >
                  <Input
                    type="number"
                    placeholder="หรือระบุจำนวนเงิน"
                    className="form-input1"
                  />
                </Form.Item>
              </div>
            ) : (
              <div className="amount-input-row" style={{ gap: '65px' }}>
                <Button onClick={() => handlePresetOneTimeAmount(100)}>100 บาท</Button>
                <Button onClick={() => handlePresetOneTimeAmount(300)}>300 บาท</Button>
                <Button onClick={() => handlePresetOneTimeAmount(500)}>500 บาท</Button>
                <Form.Item
                  name="oneTimeAmount"
                  rules={[{ required: true, message: 'กรุณากรอกจำนวนเงิน!' }, { validator: validateMinOneTimeAmount }]}
                  className="amount-input-item"
                >
                  <Input
                    type="number"
                    placeholder="หรือระบุจำนวนเงิน"
                    className="form-input1"
                  />
                </Form.Item>
              </div>
            )}

            <div className="form-row">
              {donationType === 'รายเดือน' ? (
                <>
                  <Form.Item
                    name="months"
                    label={<div style={{ textAlign: "center", fontFamily: "Anakotmai", fontSize: "1.4em", width: "100%", marginLeft: "30px", marginTop: "55px", maxWidth: "175px", marginRight: "15px" }}>จำนวนเดือนที่จะบริจาค:</div>}
                    colon={false}
                    rules={[{ required: false, message: 'กรุณาเลือกจำนวนเดือน!' }]}
                    className="form-row-item"
                  >
                    <Select
                      style={{ width: "100%", marginLeft: "10px", marginRight: "-10px", maxWidth: "750px" }}
                      placeholder="เลือกจำนวนเดือน"
                      className="form-input2"
                      options={[
                        { label: '3 เดือน', value: 3 },
                        { label: '6 เดือน', value: 6 },
                        { label: '12 เดือน', value: 12 },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item
                    name="billingDate"
                    label={<div style={{ textAlign: "center", fontFamily: "Anakotmai", fontSize: "1.4em", width: "100%", marginLeft: "20px", marginTop: "55px" }}>วันที่ตัดบัตร:</div>}
                    colon={false}
                    rules={[
                      { required: false, message: 'กรุณาเลือกวันที่ตัดบัตร!' },
                    ]}
                    className="form-row-item"
                  >
                    <Select
                      style={{ width: "100%", marginLeft: "10px", marginRight: "20px", maxWidth: "700px" }}
                      placeholder="เลือกวันที่ตัดบัตร"
                      className="form-input2"
                      options={Array.from({ length: 31 }, (_, i) => ({ label: `${i + 1}`, value: i + 1 }))}
                    />
                  </Form.Item>
                </>
              ) : (
                <>
                  <p className="pk" style={{ marginBottom: "20px" }}>ช่องทางการชำระเงิน</p>
                  <Form.Item
                    style={{ marginTop: "70px", marginLeft: "-1250px" }}
                    name="paymentMethod"
                    rules={[{ required: true, message: 'กรุณาเลือกวิธีการชำระเงิน!' }]}
                    className="form-row-item-full"
                  >
                    <Select
                      placeholder="เลือกวิธีการชำระเงิน"
                      className="form-input3"
                      onChange={(value) => {
                        form.setFieldValue('paymentMethod', value);
                      }}
                    >
                      {paymentMethods.map((method) => (
                        <Select.Option key={method.ID} value={method.ID}>
                          {method.name}
                        </Select.Option>
                      ))}
                    </Select>

                    {!isLoggedIn && (
                      <div className="account-options-container">
                        <p className="jk">สร้างบัญชีบริจาค</p>
                        <Button
                          style={{ marginLeft: "70px", marginTop: "15px" }}
                          onClick={() => setCreateAccount(3)}
                          className={`account-option-button ${createAccount === 3 ? 'selected' : ''}`}
                        >
                          ฉันต้องการสร้างบัญชีบริจาค
                        </Button>
                        <Button
                          style={{ marginLeft: "70px" }}
                          onClick={() => setCreateAccount(4)}
                          className={`account-option-button ${createAccount === 4 ? 'selected' : ''}`}
                        >
                          ฉันไม่ต้องการสร้างบัญชีบริจาค
                        </Button>
                      </div>
                    )}
                  </Form.Item>
                </>
              )}
            </div>

            {donationType === 'รายเดือน' && (
              <>
                <div style={{ textAlign: 'left', marginTop: '30px', fontSize: '1.5em', color: '#333', fontFamily: 'Anakotmai', marginLeft: '30px' }}>
                  <p>ยอดเงินที่บริจาคแต่ละเดือน: {monthlyAmount && <span style={{ fontWeight: 'bold', color: '#FF6600', fontFamily: 'Anakotmai' }}>{Number(monthlyAmount)} บาท</span>}</p>
                  <p>เป็นจำนวน: {months && <span style={{ fontWeight: 'bold', color: '#FF6600', fontFamily: 'Anakotmai' }}>{months} เดือน</span>}</p>
                  <p>รวมยอดบริจาคทั้งสิ้น: {monthlyAmount && months && Number(monthlyAmount) >= 300 && <span style={{ fontWeight: 'bold', color: '#FF6600', fontFamily: 'Anakotmai' }}>{Number(monthlyAmount) * months} บาท</span>}</p>
                  <p>ตัดบัตรทุกวันที่: {billingDate && <span style={{ fontWeight: 'bold', color: '#FF6600', fontFamily: 'Anakotmai' }}>{billingDate} ของทุกเดือน</span>}</p>
                </div>
                <p className="form-declaration">ระบบจะสร้างบัญชีบริจาคให้อัตโนมัติเพื่อให้คุณสามารถแก้ไขและปรับปรุงข้อมูลการบริจาคแบบรายเดือนของคุณได้</p>
              </>
            )}

            <Form.Item>
              <button
                type="submit"
                className="submit-button"
                style={{
                  marginTop: donationType === 'รายครั้ง' ? '20px' : '20px',
                  width: donationType === 'รายครั้ง' ? '90%' : '100%',
                  maxWidth: donationType === 'รายครั้ง' ? '9000px' : 'auto',
                  marginLeft: donationType === 'รายครั้ง' ? '-15px' : '0'
                }}
              >
                ต่อไป
              </button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </>
  );
};

export default DonationMoneyForm;