import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Gigs from './pages/Gigs';
import GigDetail from './pages/GigDetail';
import FreelancerGigs from './pages/FreelancerGigs';
import FreelancerBookings from './pages/FreelancerBookings';
import FreelancerDashboard from './pages/FreelancerDashboard';
import ClientBookings from './pages/ClientBookings';
import './styles.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/gigs" element={<Gigs />} />
            <Route path="/gigs/:id" element={<GigDetail />} />

            <Route
              path="/freelancer/gigs"
              element={
                <PrivateRoute allowedRoles={['freelancer']}>
                  <FreelancerGigs />
                </PrivateRoute>
              }
            />
            <Route
              path="/freelancer/bookings"
              element={
                <PrivateRoute allowedRoles={['freelancer']}>
                  <FreelancerBookings />
                </PrivateRoute>
              }
            />
            <Route
              path="/freelancer/dashboard"
              element={
                <PrivateRoute allowedRoles={['freelancer']}>
                  <FreelancerDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/client/bookings"
              element={
                <PrivateRoute allowedRoles={['client']}>
                  <ClientBookings />
                </PrivateRoute>
              }
            />

            <Route path="*" element={<p className="page">Page not found.</p>} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
