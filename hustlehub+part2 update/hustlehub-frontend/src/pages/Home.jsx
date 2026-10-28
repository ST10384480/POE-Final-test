import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="page home">
      <h1>Welcome to HustleHub+</h1>
      <p>A secure marketplace connecting clients with freelancers.</p>
      <div className="home-actions">
        <Link to="/gigs" className="button-link">Browse Gigs</Link>
        <Link to="/register" className="button-link secondary">Get Started</Link>
      </div>
    </div>
  );
}
