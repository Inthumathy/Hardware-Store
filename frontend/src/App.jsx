
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";

// Authentication
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Authentication Pages
import Login from "./pages/Login";
import Register from "./pages/Register";

// Dashboard Pages
import CustomerDashboard from "./pages/CustomerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import WorkerDashboard from "./pages/WorkerDashboard";

// Verification Pages
import CustomerVerification from "./pages/CustomerVerification";
import AdminNICRequests from "./pages/AdminNICRequests";

// Product Pages
import ProductCatalog from "./pages/ProductCatalog";
import AdminProducts from "./pages/AdminProducts";

// Shopping Pages
import ShoppingCart from "./pages/ShoppingCart";
import Checkout from "./pages/Checkout";

// Order Pages
import MyOrders from "./pages/MyOrders";
import OrderDetails from "./pages/OrderDetails";
import AdminOrders from "./pages/AdminOrders";

// Repair Booking Pages
import CustomerRepairBooking from "./pages/CustomerRepairBooking";
import AdminRepairBookings from "./pages/AdminRepairBookings";
import MyRepairBookings from "./pages/MyRepairBookings";

// Layout
import SiteChrome from "./components/SiteChrome";

// Styles
import "./App.css";
import "./styles/storefront-fix.css";




export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SiteChrome>
          <Routes>
            {/* ==================================
                PUBLIC ROUTES
            ================================== */}

            <Route
              path="/"
              element={
                <Navigate to="/login" replace />
              }
            />

            <Route
              path="/login"
              element={<Login />}
            />

            <Route
              path="/register"
              element={<Register />}
            />

            <Route
              path="/products"
              element={<ProductCatalog />}
            />

            {/* ==================================
                CUSTOMER ROUTES
            ================================== */}

            <Route
              path="/customer"
              element={
                <ProtectedRoute
                  allowedRoles={["CUSTOMER"]}
                >
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/verification"
              element={
                <ProtectedRoute
                  allowedRoles={["CUSTOMER"]}
                >
                  <CustomerVerification />
                </ProtectedRoute>
              }
            />

            <Route
              path="/cart"
              element={
                <ProtectedRoute
                  allowedRoles={["CUSTOMER"]}
                >
                  <ShoppingCart />
                </ProtectedRoute>
              }
            />

            <Route
              path="/checkout"
              element={
                <ProtectedRoute
                  allowedRoles={["CUSTOMER"]}
                >
                  <Checkout />
                </ProtectedRoute>
              }
            />

            <Route
              path="/orders"
              element={
                <ProtectedRoute
                  allowedRoles={["CUSTOMER"]}
                >
                  <MyOrders />
                </ProtectedRoute>
              }
            />

            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute
                  allowedRoles={["CUSTOMER"]}
                >
                  <OrderDetails />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/repairs"
              element={
                <ProtectedRoute
                  allowedRoles={["CUSTOMER"]}
                >
                  <CustomerRepairBooking />
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-repair-bookings"
              element={
                <ProtectedRoute
                  allowedRoles={["CUSTOMER"]}
                >
                  <MyRepairBookings />
                </ProtectedRoute>
              }
            />

            {/* ==================================
                ADMIN ROUTES
            ================================== */}

            <Route
              path="/admin"
              element={
                <ProtectedRoute
                  allowedRoles={["ADMIN"]}
                >
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/nic-requests"
              element={
                <ProtectedRoute
                  allowedRoles={["ADMIN"]}
                >
                  <AdminNICRequests />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/products"
              element={
                <ProtectedRoute
                  allowedRoles={["ADMIN"]}
                >
                  <AdminProducts />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/orders"
              element={
                <ProtectedRoute
                  allowedRoles={["ADMIN"]}
                >
                  <AdminOrders />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/repairs"
              element={
                <ProtectedRoute
                  allowedRoles={["ADMIN"]}
                >
                  <AdminRepairBookings />
                </ProtectedRoute>
              }
            />

            {/* ==================================
                WORKER ROUTES
            ================================== */}

            <Route
              path="/worker"
              element={
                <ProtectedRoute
                  allowedRoles={["WORKER"]}
                >
                  <WorkerDashboard />
                </ProtectedRoute>
              }
            />

            {/* ==================================
                UNKNOWN ROUTES
            ================================== */}

            <Route
              path="*"
              element={
                <Navigate to="/login" replace />
              }
            />

            <Route
  path="/worker/dashboard"
  element={
    <ProtectedRoute allowedRoles={["WORKER"]}>
      <WorkerDashboard />
    </ProtectedRoute>
  }
/>
          </Routes>
        </SiteChrome>
      </AuthProvider>
    </BrowserRouter>
  );
}
