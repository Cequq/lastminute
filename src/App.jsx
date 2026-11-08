import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { PageLoader } from './components/ui/States';
import Home from './pages/Home';
import Deals from './pages/Deals';
import DealDetail from './pages/DealDetail';
import BusinessPage from './pages/BusinessPage';
import NotFound from './pages/NotFound';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Checkout from './pages/Checkout';
import MyBookings from './pages/account/MyBookings';
import Favorites from './pages/account/Favorites';
import Profile from './pages/account/Profile';
import PartnerApply from './pages/partner/PartnerApply';

// Газрын зураг (leaflet), хамтрагч, админ хэсгийг (recharts) тусад нь ачаална
const MapPage = lazy(() => import('./pages/MapPage'));
const PartnerLayout = lazy(() => import('./pages/partner/PartnerLayout'));
const partner = (name) => lazy(() => import('./pages/partner/PartnerPages').then((m) => ({ default: m[name] })));
const PartnerDashboard = partner('PartnerDashboard');
const PartnerSchedule = partner('PartnerSchedule');
const PartnerDeals = partner('PartnerDeals');
const PartnerBookings = partner('PartnerBookings');
const PartnerCheckIn = partner('PartnerCheckIn');
const PartnerProfile = partner('PartnerProfile');

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminRequests = lazy(() => import('./pages/admin/AdminRequests'));
const AdminDeals = lazy(() => import('./pages/admin/AdminDeals'));
const AdminBusinesses = lazy(() => import('./pages/admin/AdminBusinesses'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings'));
const AdminCheckIn = lazy(() => import('./components/manage/CheckIn'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            {/* Зочин: бүртгүүлэлгүй үзнэ */}
            <Route index element={<Home />} />
            <Route path="deals" element={<Deals />} />
            <Route path="deals/:id" element={<DealDetail />} />
            <Route path="places/:id" element={<BusinessPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="partner/apply" element={<PartnerApply />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />

            {/* Хэрэглэгч: нэвтэрсэн байх ёстой */}
            <Route element={<ProtectedRoute />}>
              <Route path="checkout/:bookingId" element={<Checkout />} />
              <Route path="account/bookings" element={<MyBookings />} />
              <Route path="account/favorites" element={<Favorites />} />
              <Route path="account/profile" element={<Profile />} />
            </Route>

            {/* Хамтрагч байгууллага (админ ч орж болно) */}
            <Route element={<ProtectedRoute roles={['business', 'admin']} />}>
              <Route path="partner" element={<PartnerLayout />}>
                <Route index element={<PartnerDashboard />} />
                <Route path="schedule" element={<PartnerSchedule />} />
                <Route path="deals" element={<PartnerDeals />} />
                <Route path="bookings" element={<PartnerBookings />} />
                <Route path="check-in" element={<PartnerCheckIn />} />
                <Route path="profile" element={<PartnerProfile />} />
              </Route>
            </Route>

            {/* Администратор */}
            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="requests" element={<AdminRequests />} />
                <Route path="deals" element={<AdminDeals />} />
                <Route path="businesses" element={<AdminBusinesses />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="check-in" element={<AdminCheckIn />} />
                <Route path="users" element={<AdminUsers />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
