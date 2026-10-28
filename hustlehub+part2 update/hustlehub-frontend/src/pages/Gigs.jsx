import { useEffect, useState } from 'react';
import client, { apiErrorMessage } from '../api/client';
import GigCard from '../components/GigCard';
import Alert from '../components/Alert';

// Defines the available categories for filtering gig listings.
const CATEGORIES = [
  '',
  'design',
  'development',
  'writing',
  'marketing',
  'video',
  'music',
  'business',
  'other'
];

export default function Gigs() {

  // These variables store the gig listings, selected category,
  // error message, and loading status.
  const [gigs, setGigs] = useState([]);
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Get requests retrieve data from the backend API The optional category is sent as a query parameter.
  const fetchGigs = async (cat) => {
    setLoading(true);
    setError('');

    try {
      const { data } = await client.get('/gigs', {
        params: cat ? { category: cat } : {}
      });

      // Updates the state with the gigs returned by the API.
      setGigs(data.gigs);
    } catch (err) {
      // Displays a readable error if the request fails.
      setError(apiErrorMessage(err, 'Could not load gigs.'));
    } finally {
      // Resets the loading state after the request completes.
      setLoading(false);
    }
  };

  // useEffect runs the fetching function when the component mounts and whenever the category changes.
  useEffect(() => {
    fetchGigs(category);

    // The dependency warning is disabled because fetchGigs is defined
    // inside the component and is intentionally not included as a dependency.
    // The effect is triggered by changes to category.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return (
    <div className="page">
      <h2>Browse Gigs</h2>

      {/* Displays API errors using the project's reusable Alert component. */}
      <Alert type="error" message={error} />

      {/* Attribution: HTML form controls — the select element allows
          users to choose a category for filtering the gig listings. */}
      <label htmlFor="category-filter">Filter by category</label>

      <select
        id="category-filter"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {/* Array.map() creates an option for every available category. */}
        {CATEGORIES.map((c) => (
          <option key={c || 'all'} value={c}>
            {c ? c : 'All categories'}
          </option>
        ))}
      </select>

      {/* Conditional rendering displays loading, empty, or populated results states. */}
      {loading ? (
        <p>Loading gigs…</p>
      ) : gigs.length === 0 ? (
        <p>No gigs found.</p>
      ) : (
        <div className="gig-grid">
          {/* Array.map() renders a GigCard for every returned gig. The unique gig ID
              provides a stable React key. */}
          {gigs.map((gig) => (
            <GigCard key={gig._id} gig={gig} />
          ))}
        </div>
      )}
    </div>
  );
}

// REFERENCES
 
// Axios (n.d.) 'Axios API documentation'.
 // Available at: https://axios-http.com/docs/api_intro
 // Accessed: 05 October 2026.

 // MDN Web Docs (n.d.) 'Array.prototype.map()'.
 //Available at:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
 // Accessed: 05 October 2026.

 // React (n.d.) 'useEffect'.
 // Available at: https://react.dev/reference/react/useEffect
// Accessed: 07 October 2026.
 
 // React (n.d.) 'useState'.
 // Available at: https://react.dev/reference/react/useState
 // Accessed: 06 October 2026. 

