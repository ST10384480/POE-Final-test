
import { useEffect, useState } from 'react';
import client, { apiErrorMessage } from '../api/client';
import Alert from '../components/Alert';

export default function ClientBookings() {
  
  // Separate state variables track bookings, errors, and loading status.
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  
  // when the component mounts.
  useEffect(() => {
    // Prevent state updates if the component has been unmounted.
    let active = true;

    // Attribution: Axios (2026) - GET requests retrieve data from an API.
    // The custom client is configured in the project's API client module.
    client
      .get('/bookings/mine')

      // Attribution: Axios (2026) - Promise handling processes
      // a successful HTTP response.
      .then(({ data }) => {
        if (active) {
          // Store the bookings returned by the backend.
          setBookings(data.bookings);
        }
      })

      
      // The custom helper converts the error into a readable message.
      .catch((err) => {
        if (active) {
          setError(
            apiErrorMessage(err, 'Could not load your bookings.')
          );
        }
      })

      
      // finally() runs whether the request succeeds or fails.
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    
    // updates after the component has been unmounted.
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page">
      <h2>My Bookings</h2>

      {/* Display an error message when the API request fails.
          Attribution: Custom Alert component from this project. */}
      <Alert type="error" message={error} />

      {/* conditional rendering selects the appropriate interface state. */}
      {loading ? (
        <p>Loading…</p>
      ) : bookings.length === 0 ? (
        <p>You haven't booked any gigs yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Gig</th>
              <th>Freelancer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {/* Array.map() transforms each booking into a table row. */}
            {bookings.map((b) => (
              <tr key={b._id}>
                {/*Optional chaining and logical OR provide fallback values. */}
                <td>{b.gig?.title || b.gigTitleSnapshot}</td>

                <td>{b.freelancer?.email}</td>

                {/* Display the booking amount with a dollar sign. */}
                <td>${b.amount}</td>

                <td>{b.status}</td>

                {/*Date and toLocaleDateString() format the booking date. */}
                <td>
                  {new Date(b.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// REFERENCES
// Axios (2026) 'Axios API documentation'. Available at: https://axios-http.com/docs/api_intro (Accessed: 04 October 2026).
// MDN Web Docs (2026a) 'Array.prototype.map()'. Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map (Accessed: 04 October 2026).
// MDN Web Docs (2026b) 'Date.prototype.toLocaleDateString()'. Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString (Accessed: 07 October 2026).
// MDN Web Docs (2026c) 'Optional chaining (?.)' . Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining (Accessed: 07 October 2026).
// React (2026a) 'useEffect' Available at: https://react.dev/reference/react/useEffect (Accessed: 12 October 2026).
// React (2026b) 'useState'.Available at: https://react.dev/reference/react/useState(Accessed: 12 October 2026).
 
