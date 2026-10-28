import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">HustleHub+</Link>
      <div className="nav-links">
        <Link to="/gigs">Browse Gigs</Link>

        {isAuthenticated && user?.role === 'freelancer' && (
          <>
            <Link to="/freelancer/gigs">My Gigs</Link>
            <Link to="/freelancer/bookings">My Bookings</Link>
            <Link to="/freelancer/dashboard">Income &amp; Tax</Link>
          </>
        )}

        {isAuthenticated && user?.role === 'client' && <Link to="/client/bookings">My Bookings</Link>}

        {isAuthenticated ? (
          <>
            <span className="user-badge" data-testid="user-badge">
              {user?.email} ({user?.role})
            </span>
            <button onClick={handleLogout} className="link-button">Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
