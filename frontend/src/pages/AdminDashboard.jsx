
import { Link } from "react-router-dom";
import {
  Package,
  ShoppingCart,
  Wrench,
  ShieldCheck,
  ArrowRight,
  ClipboardList
} from "lucide-react";

import "./AdminDashboard.css";

export default function AdminDashboard() {
  const managementItems = [
    {
      title: "Product Management",
      description:
        "Add, update and manage hardware products and inventory.",
      path: "/admin/products",
      icon: Package,
      color: "blue"
    },
    {
      title: "Customer Orders",
      description:
        "View customer purchases and manage order processing.",
      path: "/admin/orders",
      icon: ShoppingCart,
      color: "orange"
    },
    {
      title: "Repair Bookings",
      description:
        "Manage repair requests and assign available workers.",
      path: "/admin/repairs",
      icon: Wrench,
      color: "green"
    },
    {
      title: "NIC Verification",
      description:
        "Review customer NIC verification requests.",
      path: "/admin/nic-requests",
      icon: ShieldCheck,
      color: "purple"
    }
  ];

  return (
    <main className="hardware-admin-content">
      <div className="hardware-admin-container">
        <section className="hardware-admin-welcome">
          <div>
            <span>ADMIN CONTROL CENTER</span>

            <h1>Welcome to Hardware Store</h1>

            <p>
              Manage products, customer orders, repair services
              and verification requests from one centralized
              dashboard.
            </p>
          </div>

          <ClipboardList
            className="hardware-admin-welcome-icon"
            size={80}
            strokeWidth={1.2}
          />
        </section>

        <section className="hardware-admin-section">
          <div className="hardware-admin-section-header">
            <div>
              <span>STORE OPERATIONS</span>
              <h2>Management Center</h2>
              <p>
                Select a section to manage your store.
              </p>
            </div>
          </div>

          <div className="hardware-admin-card-grid">
            {managementItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  to={item.path}
                  className="hardware-admin-card"
                  key={item.path}
                >
                  <div
                    className={`hardware-admin-card-icon ${item.color}`}
                  >
                    <Icon size={26} />
                  </div>

                  <h3>{item.title}</h3>

                  <p>{item.description}</p>

                  <span className="hardware-admin-card-link">
                    Manage Now
                    <ArrowRight size={17} />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
