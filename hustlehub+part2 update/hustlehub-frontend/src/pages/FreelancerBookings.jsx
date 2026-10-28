import { useEffect, useState } from 'react';
import client, { apiErrorMessage } from '../api/client';
import Alert from '../components/Alert';

export default function FreelancerBookings() {
  //useState manages component state.
  const [bookings, setBookings] = useState([]);
  const [income, setIncome] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // when the component mounts.
  useEffect(() => {
    let active = true;

    // executes both API requests concurrently and waits for both results.
    Promise.all([
      client.get('/bookings/freelancer'),
      client.get('/bookings/freelancer/income')
    ])
      .then(([bookingsRes, incomeRes]) => {
        // Prevent state updates after the component is unmounted.
        if (!active) return;

        // Store booking records and total income from the API responses.
        setBookings(bookingsRes.data.bookings);
        setIncome(incomeRes.data.totalIncome);
      })
      // handles errors that occur during either API request.
      .catch((err) => {
        if (active) {
          setError(
            apiErrorMessage(err, 'Could not load your bookings.')
          );
        }
      })
      // executes after the requests succeed or fail.
      .finally(() => {
        if (active) setLoading(false);
      });

    // state updates after the component has been unmounted.
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page">
      <h2>Bookings Received</h2>

      {/* Displays API errors using the project's reusable Alert component. */}
      <Alert type="error" message={error} />

      {/* Conditional rendering displays the income summary when
          the income data has been received. */}
      {income !== null && (
        <div className="income-summary" data-testid="income-summary">
          Total income: <strong>${income}</strong>
        </div>
      )}

      {/* Conditional rendering displays loading, empty, or booking data. */}
      {loading ? (
        <p>Loading…</p>
      ) : bookings.length === 0 ? (
        <p>No bookings yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Gig</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {/* Array.map() iterates over the bookings array to create a table row for each booking. */}
            {bookings.map((b) => (
              <tr key={b._id}>
                {/* Optional chaining safely accesses nested properties, while logical OR provides a fallback gig title. */}
                <td>{b.gig?.title || b.gigTitleSnapshot}</td>

                <td>{b.client?.email}</td>

                <td>${b.amount}</td>

                <td>{b.status}</td>

                {/* Attribution: MDN Web Docs — Date and
                    toLocaleDateString() format the booking date. */}
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
 
 // MDN Web Docs (n.d.) 'Promise.all()'.
 //Available at:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
 // Accessed: 03 October 2026.
 
 // MDN Web Docs (n.d.) 'Array.prototype.map()'.
 //Available at:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
// Accessed: 05 October 2026.

 // MDN Web Docs (n.d.) 'Optional chaining (?.)'.
 // Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining
  // Accessed: 05 October 2026.

 // MDN Web Docs (n.d.) 'Date.prototype.toLocaleDateString()'.
 // Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
// Accessed: 07 October 2026.

 // React (n.d.) 'useEffect'.
 // Available at: https://react.dev/reference/react/useEffect
  // Accessed: 07 October 2026.

 // React (n.d.) 'useState'.
// Available at:https://react.dev/reference/react/useState
// Accessed: 08 October 2026.
 
