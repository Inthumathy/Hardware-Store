
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Package,
  Wrench,
  ShieldCheck,
  LogOut,
  ArrowRight,
  ArrowUpRight,
  UserRound,
  Store,
  Truck,
  Headphones,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import "./CustomerDashboard.css";

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const customerName = user?.full_name || "Customer";
  const firstName = customerName.split(" ")[0];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const menuItems = [
    {
      label: "Dashboard",
      path: "/customer",
      icon: LayoutDashboard
    },
    {
      label: "Browse Products",
      path: "/products",
      icon: ShoppingBag
    },
    {
      label: "My Cart",
      path: "/cart",
      icon: ShoppingCart
    },
    {
      label: "My Orders",
      path: "/orders",
      icon: Package
    },
    {
      label: "Repair Services",
      path: "/customer/repairs",
      icon: Wrench
    },
    {
      label: "Account Verification",
      path: "/customer/verification",
      icon: ShieldCheck
    }
  ];

  const quickActions = [
    {
      title: "Shop Hardware",
      description:
        "Explore tools, electrical supplies and building materials.",
      icon: ShoppingBag,
      path: "/products",
      color: "blue",
      button: "Browse Products"
    },
    {
      title: "Book Repair Service",
      description:
        "Find professional workers for home repair and maintenance.",
      icon: Wrench,
      path: "/customer/repairs",
      color: "orange",
      button: "Book a Service"
    },
    {
      title: "Track Your Orders",
      description:
        "View your purchases and keep track of order progress.",
      icon: Package,
      path: "/orders",
      color: "green",
      button: "View Orders"
    }
  ];

  return (
    <div className="customer-dashboard-layout">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="customer-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`customer-sidebar ${
          sidebarOpen ? "customer-sidebar-open" : ""
        }`}
      >
        <div className="customer-sidebar-brand">
          <div className="customer-brand-icon">
            <Store size={24} />
          </div>

          <div>
            <strong>HARDWARE</strong>
            <span>STORE MANAGEMENT</span>
          </div>

          <button
            className="customer-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="customer-sidebar-label">
          MAIN MENU
        </div>

        <nav className="customer-sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/customer"}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `customer-nav-link ${
                    isActive ? "customer-nav-active" : ""
                  }`
                }
              >
                <Icon size={19} strokeWidth={1.9} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="customer-sidebar-bottom">
          <div className="customer-sidebar-help">
            <Headphones size={23} />
            <strong>Need Assistance?</strong>
            <p>
              We're here to help with your shopping experience.
            </p>
          </div>

          <button
            className="customer-logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={19} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="customer-dashboard-main">
        {/* Top Header */}
        <header className="customer-topbar">
          <div className="customer-topbar-left">
            <button
              className="customer-mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={24} />
            </button>

            <div>
              <span className="customer-topbar-eyebrow">
                CUSTOMER PORTAL
              </span>
              <h2>Dashboard Overview</h2>
            </div>
          </div>

          <div className="customer-topbar-actions">
            <Link
              to="/cart"
              className="customer-topbar-cart"
              aria-label="Open shopping cart"
            >
              <ShoppingCart size={20} />
            </Link>

            <div className="customer-profile">
              <div className="customer-avatar">
                <UserRound size={21} />
              </div>

              <div className="customer-profile-info">
                <strong>{customerName}</strong>
                <span>Customer Account</span>
              </div>
            </div>
          </div>
        </header>

        <main className="customer-dashboard-content">
          {/* Welcome Banner */}
          <section className="customer-welcome-banner">
            <div className="customer-welcome-content">
              <span className="customer-welcome-tag">
                YOUR HARDWARE PARTNER
              </span>

              <h1>Welcome back, {firstName}!</h1>

              <p>
                Everything you need for your next project,
                all in one place. Shop quality products,
                manage orders and explore repair services.
              </p>

              <Link
                to="/products"
                className="customer-welcome-button"
              >
                Explore Products
                <ArrowRight size={18} />
              </Link>
            </div>

            <div
              className="customer-welcome-illustration"
              aria-hidden="true"
            >
              <Wrench size={125} strokeWidth={1} />
            </div>
          </section>

          {/* Benefits */}
          <section className="customer-benefits">
            <div className="customer-benefit">
              <div className="customer-benefit-icon blue">
                <ShoppingBag size={22} />
              </div>
              <div>
                <strong>Quality Products</strong>
                <span>Explore hardware essentials</span>
              </div>
            </div>

            <div className="customer-benefit">
              <div className="customer-benefit-icon orange">
                <Truck size={22} />
              </div>
              <div>
                <strong>Easy Ordering</strong>
                <span>Simple shopping experience</span>
              </div>
            </div>

            <div className="customer-benefit">
              <div className="customer-benefit-icon green">
                <Wrench size={22} />
              </div>
              <div>
                <strong>Repair Services</strong>
                <span>Find maintenance assistance</span>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="customer-dashboard-section">
            <div className="customer-section-heading">
              <div>
                <span className="customer-section-eyebrow">
                  GET STARTED
                </span>
                <h2>What would you like to do?</h2>
                <p>
                  Quick access to your most-used services.
                </p>
              </div>
            </div>

            <div className="customer-quick-grid">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <article
                    className="customer-action-card"
                    key={action.title}
                  >
                    <div
                      className={`customer-action-icon ${action.color}`}
                    >
                      <Icon size={26} strokeWidth={1.8} />
                    </div>

                    <h3>{action.title}</h3>
                    <p>{action.description}</p>

                    <Link
                      to={action.path}
                      className="customer-action-link"
                    >
                      {action.button}
                      <ArrowUpRight size={17} />
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Account & Shopping */}
          <section className="customer-bottom-grid">
            <div className="customer-info-panel">
              <div className="customer-panel-heading">
                <div>
                  <span className="customer-section-eyebrow">
                    YOUR ACCOUNT
                  </span>
                  <h3>Account Center</h3>
                </div>

                <div className="customer-panel-icon">
                  <UserRound size={21} />
                </div>
              </div>

              <p>
                Manage your account details and access
                verification settings when needed.
              </p>

              <div className="customer-account-details">
                <div>
                  <span>Name</span>
                  <strong>{customerName}</strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>{user?.email || "Not available"}</strong>
                </div>
              </div>

              <Link
                to="/customer/verification"
                className="customer-outline-button"
              >
                Account Verification
                <ArrowRight size={17} />
              </Link>
            </div>

            <div className="customer-shopping-panel">
              <div className="customer-shopping-icon">
                <ShoppingCart size={29} />
              </div>

              <h3>Ready for your next project?</h3>

              <p>
                Discover hardware essentials and add
                everything you need to your cart.
              </p>

              <Link
                to="/cart"
                className="customer-shopping-button"
              >
                Go to My Cart
                <ArrowRight size={17} />
              </Link>
            </div>
          </section>

          <footer className="customer-dashboard-footer">
            <span>
              © {new Date().getFullYear()} Hardware Store.
              All rights reserved.
            </span>

            <span>
              Built for a better shopping experience.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
