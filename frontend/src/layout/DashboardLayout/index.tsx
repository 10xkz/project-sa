// (ไฟล์เดิม) dashboard layout
import React, { useState, useRef, useEffect } from "react";
import "./style.css";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  Home,
  Heart,
  DollarSign,
  Calendar,
  Stethoscope,
  Shield,
  PawPrint,
  BarChart3,
  Menu,
  Play,
  X,
  Search,
  Bell,
  Mail,
  Settings,
  LogOut,
  Plus,
  Edit,
  Captions,
  Users,
  Columns4,
} from "lucide-react";

// ✅ เพิ่ม: ใช้ hook ดึงโปรไฟล์พนักงาน
import { useStaffMe } from "../../hooks/useStaffsMe"; // ปรับ path ให้ตรงโปรเจ็กต์คุณ

// ⛔ ลบ interface Staff เดิม (เราใช้ข้อมูลจริงจาก hook แล้ว)
// interface Staff { ... }

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type: "info" | "warning" | "success" | "error";
}

interface MenuItem {
  id: string;
  label: string;
  icon?: any;
  path?: string;
  children?: MenuItem[];
}

const UpdatedDashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeMenu, setActiveMenu] = useState<string>("");
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState<boolean>(false);
  const [disabledParentMenu, setDisabledParentMenu] = useState<string>(""); // เก็บ parent menu ที่ถูก disable

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ ดึงข้อมูลพนักงาน
  const { staff, loading: staffLoading } = useStaffMe({ autoFetch: true });

  // Menu items definition
  const menuItems: MenuItem[] = [
    { id: "dashboard", label: "แดชบอร์ด", icon: Home, path: "/dashboard" },

    { id: "dogs", label: "จัดการข้อมูลสุนัข", icon: PawPrint, path: "/dashboard/dogs" },
    {
      id: "visit",
      label: "การเยี่ยมชม",
      icon: Play,
      children: [
        {
          id: "create-visit",
          label: "สร้างการเยี่ยมชม",
          icon: Plus,
          path: "/dashboard/create-visit",
        },
        {
          id: "update-visit",
          label: "แก้ไขการเยี่ยมชม",
          icon: Edit,
          path: "/dashboard/update-visit",
        },
      ],
    },

    { id: "manages", label: "จัดการผู้ดูแล", icon: Captions, path: "/dashboard/manage" },

    { id: "health-records", label: "บันทึกสุขภาพสุนัข", icon: Stethoscope, path: "/dashboard/health-record" },

    { id: "adoption", label: "การรับเลี้ยง", icon: Heart, path: "/dashboard/adoptions" },

    { id: "donation", label: "การบริจาค", icon: DollarSign, path: "/dashboard/donation" },

    { id: "visits", label: "ตารางการเยี่ยมชม", icon: Calendar, path: "/dashboard/visits" },

    { id: "support", label: "การอุปถัมภ์สนับสนุน", icon: Shield, path: "/dashboard/sponsorships" },

    { id: "reports", label: "รายงานสถิติ", icon: BarChart3, path: "/dashboard/reports" },

    { id: "zone-cage-management", label: "จัดการโซนและกรง", icon: Columns4, path: "/dashboard/zone-cage-management" },

    { id: "manageevent", label: "จัดการกิจกรรม", icon: Calendar, path: "/dashboard/manageevent" },

    { id: "volunteer", label: "อาสาสมัคร", icon: Users, path: "/dashboard/volunteer" },
  ];

  // ✅ ฟังก์ชันหาว่าหน้าปัจจุบันอยู่ใน submenu ไหน
  const findParentMenuFromPath = (currentPath: string): string => {
    for (const menuItem of menuItems) {
      if (menuItem.children) {
        const matchingChild = menuItem.children.find(child =>
          child.path && currentPath === child.path
        );
        if (matchingChild) {
          return menuItem.id;
        }
      }
    }
    return "";
  };

  // ✅ กันเข้าหน้านี้โดยไม่ใช่ staff session
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const type = sessionStorage.getItem("userType");
    if (!token || type !== "staff") {
      navigate("/auth/staffs", { replace: true }); // ไปหน้า login พนักงาน
    }
  }, [navigate]);

  // ✅ ตรวจสอบ path ปัจจุบันเพื่อ disable parent menu และกำหนด activeMenu
  useEffect(() => {
    const currentPath = location.pathname;

    // ตรวจสอบว่าอยู่ในหน้าที่ควร disable parent menu
    if (currentPath === "/dashboard/create-visit" || currentPath === "/dashboard/update-visit") {
      setDisabledParentMenu("visit"); // disable parent menu "การเยี่ยมชม"
    } else {
      setDisabledParentMenu(""); // enable ทุก parent menu
    }

    // ✅ หาและเปิด submenu ที่เกี่ยวข้องกับหน้าปัจจุบัน
    const parentMenuId = findParentMenuFromPath(currentPath);
    if (parentMenuId) {
      setActiveMenu(parentMenuId);
    }
  }, [location.pathname]);

  const isActive = (item: MenuItem) => {
    if (!item.path) return false;

    // สำหรับหน้า dashboard หลัก ต้องตรงทุกตัวอักษร
    if (item.id === "dashboard") {
      return location.pathname === item.path;
    }

    // สำหรับ menu อื่นๆ ตรวจสอบให้แม่นยำขึ้น
    const currentPath = location.pathname;
    const menuPath = item.path;

    // ถ้า path ตรงกันทุกตัวอักษร
    if (currentPath === menuPath) {
      return true;
    }

    // ถ้า current path เริ่มต้นด้วย menu path และตัวถัดไปเป็น "/" 
    // เช่น /dashboard/manage กับ /dashboard/manage/edit
    if (currentPath.startsWith(menuPath + "/")) {
      return true;
    }

    return false;
  };

  const sampleNotifications: Notification[] = [
    { id: "1", title: "งานใหม่เข้าระบบ", message: "มีงานใหม่ที่ต้องการการอนุมัติจากคุณ", time: "5 นาทีที่แล้ว", isRead: false, type: "info" },
    { id: "2", title: "เตือนการประชุม", message: "การประชุมทีมจะเริ่มในอีก 15 นาที", time: "10 นาทีที่แล้ว", isRead: false, type: "warning" },
  ];


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name: string): string =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  // ✅ เตรียมข้อมูลแสดงผลจาก hook
  const displayName =
    (staff?.first_name || "") + (staff?.last_name ? ` ${staff.last_name}` : "") ||
    staff?.username ||
    "พนักงาน";
  const displayEmail = staff?.email || "";

  // ✅ avatar: ถ้า BE ส่ง photo_url มา ให้โชว์ <img> ไม่งั้นโชว์ตัวอักษรย่อ
  const avatarNode = staff?.photo_url ? (
    <img src={staff.photo_url} alt="avatar" className="avatar-img" />
  ) : (
    getInitials(displayName)
  );

  const handleProfileMenuClick = (action: string): void => {
    switch (action) {
      case "profile":
        navigate("/dashboard/profile"); // ปรับเส้นทางถ้ามีหน้าโปรไฟล์
        break;
      case "settings":
        navigate("/dashboard/settings");
        break;
      case "help":
        navigate("/dashboard/help");
        break;
      case "logout":
        if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
          try { sessionStorage.clear(); } catch { }
          navigate("/", { replace: true });
        }
        break;
      default:
        break;
    }
    setIsProfileDropdownOpen(false);
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <button
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="logo-section">
            <div className="logo-icon">D</div>
            <span className="logo-text">Dog Care</span>
          </div>
        </div>

        <div className="header-right">
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Search your course..." className="search-input" />
          </div>

          <button className="icon-button">
            <Mail size={20} color="#6b7280" />
          </button>

          <div ref={notificationRef} style={{ position: "relative" }}>
            <button
              className="icon-button"
              onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
            >
              <Bell size={20} color="#6b7280" />
              <div className="notification-badge">2</div>
            </button>

            {isNotificationDropdownOpen && (
              <div className="dropdown notification-dropdown">
                <div className="dropdown-header">
                  <h3>การแจ้งเตือน</h3>
                  <button className="mark-all-read-btn">ทำเครื่องหมายอ่านทั้งหมด</button>
                </div>
                <div>
                  {sampleNotifications.map((n) => (
                    <div key={n.id} className="notification-item">
                      <h4>{n.title}</h4>
                      <p>{n.message}</p>
                      <span>{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div ref={profileRef} style={{ position: "relative" }}>
            <button
              className="profile-button"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            >
              <div className="profile-avatar">
                {/* ถ้ามีรูปจะแสดง <img>, ไม่มีก็เป็นตัวอักษรย่อ */}
                {avatarNode}
              </div>
              <span className="profile-name">
                {staffLoading ? "กำลังโหลด..." : displayName}
              </span>
            </button>

            {isProfileDropdownOpen && (
              <div className="dropdown profile-dropdown">
                <div className="profile-dropdown-header">
                  <div className="profile-dropdown-info">
                    <div className="profile-dropdown-avatar">
                      {avatarNode}
                    </div>
                    <div className="profile-dropdown-details">
                      <div className="profile-name">
                        {staffLoading ? "กำลังโหลด..." : displayName}
                      </div>
                      <div className="profile-email">
                        {staffLoading ? "" : displayEmail}
                      </div>
                      {/* เดิมมี role, ตอนนี้ไม่มีแล้ว—จะใส่ badge คงที่หรือเอาออกก็ได้ */}
                      <div className="profile-role-badge">Staff</div>
                    </div>
                  </div>
                </div>
                <div className="dropdown-menu">
                  <button
                    className="dropdown-menu-item"
                    onClick={() => handleProfileMenuClick("profile")}
                  >
                    <span>👤</span>
                    ข้อมูลส่วนตัว
                  </button>
                  <button
                    className="dropdown-menu-item"
                    onClick={() => handleProfileMenuClick("settings")}
                  >
                    <span>⚙️</span>
                    การตั้งค่า
                  </button>
                  <button
                    className="dropdown-menu-item"
                    onClick={() => handleProfileMenuClick("help")}
                  >
                    <span>❓</span>
                    ความช่วยเหลือ
                  </button>
                  <div className="menu-divider"></div>
                  <button
                    className="dropdown-menu-item logout"
                    onClick={() => handleProfileMenuClick("logout")}
                  >
                    <span>🚪</span>
                    ออกจากระบบ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="main-content-area">
        {/* Sidebar */}
        <div className={`sidebar ${!sidebarOpen ? "collapsed" : ""}`}>
          <div className="sidebar-content">
            <div className="sidebar-section-title">
              {sidebarOpen ? "OVERVIEW" : ""}
            </div>

            {menuItems.map((item) => {
              const Icon = item.icon;
              const hasChildren = !!item.children?.length;
              const active = isActive(item);
              const isDisabled = disabledParentMenu === item.id;

              return (
                <div key={item.id} className="sidebar-menu-group">
                  <button
                    type="button"
                    className={`sidebar-menu-item ${active ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
                    onClick={() => {
                      // ถ้า parent menu ถูก disable ไม่ให้ทำงาน
                      if (isDisabled) return;

                      if (hasChildren) {
                        setActiveMenu(activeMenu === item.id ? "" : item.id);
                      } else {
                        setActiveMenu("");
                        navigate(item.path ?? "/");
                      }
                    }}
                    disabled={isDisabled}
                    aria-current={active ? "page" : undefined}
                    style={{
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.5 : 1
                    }}
                  >
                    <Icon size={20} />
                    {sidebarOpen && <span>{item.label}</span>}
                  </button>

                  {hasChildren && activeMenu === item.id && sidebarOpen && (
                    <div className="sidebar-submenu">
                      {item.children!.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = isActive(child);
                        return (
                          <button
                            key={child.id}
                            type="button"
                            className={`sidebar-menu-item submenu-item ${childActive ? "active" : ""}`}
                            onClick={() => navigate(child.path!)}
                            aria-current={childActive ? "page" : undefined}
                          >
                            <ChildIcon size={16} />
                            <span>{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="sidebar-section-title">
              {sidebarOpen ? "SETTINGS" : ""}
            </div>

            <button className="sidebar-menu-item">
              <Settings size={20} />
              {sidebarOpen && <span>Setting</span>}
            </button>

            <button
              className="sidebar-menu-item logout-button"
              onClick={() => handleProfileMenuClick("logout")}
            >
              <LogOut size={20} />
              {sidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default UpdatedDashboard;