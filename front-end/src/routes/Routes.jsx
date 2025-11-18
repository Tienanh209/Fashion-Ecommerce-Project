import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router";

import {
  Home,
  Shop,
  ProductDetail,
  Cart,
  Orders,
  OrderDetail,
  Login,
  Register,
  Profile,
  Wishlists,
  Customers,
  OrdersManagement,
  Inventory,
  Settings,
  AddProduct,
  Analytics,
  Dashboard,
  Sales,
} from "../pages";

import GuestLayout from "../layouts/GuestLayout";
import CustomerLayout from "../layouts/CustomerLayout";
import AdminLayout from "../layouts/AdminLayout";

import { useAuth } from "../contexts/AuthContext";
import VirtualTryon from "../pages/shop/VirtualTryon";

function RequireAuth() {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return null;

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return <Outlet />;
}

function RequireAdmin() {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return null;
  const isAdmin = user && (user.role === "admin" || user.role_id === 1);
  if (!isAdmin) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route element={<GuestLayout/>}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/virtual-tryon" element={<VirtualTryon />} />

        </Route>
        

        {/* Private */}
        <Route element={<RequireAuth />}>
          <Route element={<CustomerLayout/>}>
          <Route path="/account" element={<Profile />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlists" element={<Wishlists />} />
          <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
          </Route>
        </Route>

        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/orders" element={<OrdersManagement />} />
            <Route path="/admin/customers" element={<Customers />} />
            <Route path="/admin/inventory" element={<Inventory />} />
            <Route path="/admin/addproduct" element={<AddProduct />} />
            <Route path="/admin/sales" element={<Sales />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="/admin/settings" element={<Settings />} />
          </Route>
        </Route>

        {/* ===== 404 -> home ===== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
