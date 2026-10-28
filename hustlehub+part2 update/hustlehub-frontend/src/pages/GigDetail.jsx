import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';

export default function GigDetail() {
  // the gig ID from the current URL.
  const { id } = useParams();
  
  // programmatic navigation to another route.
  const navigate = useNavigate();

  // the current user's authentication status and account details.
  const { isAuthenticated, user } = useAuth();

  // state for gig information, form input, messages, and loading status.
  const [gig, setGig] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  // to retrieve gig details when the component mounts or the gig ID changes.
  useEffect(() => {
    let active = true;
  setLoading(true);

    // Get retrieves the selected gig's details from the backend API.
    client
      .get(`/gigs/${id}`)
      .then(({ data }) => {
        if (active) setGig(data.gig);
      })

      // Handles errors if the gig cannot be retrieved.
      .catch((err) => {
        if (active) {
          setError(apiErrorMessage(err, 'Gig not found.'));
        }
      })

      // Resets the loading state after the request completes.
      .finally(() => {
        if (active) setLoading(false);
      });

   
    // state updates after the effect has been cleaned up.
    return () => {
      active = false;
    };
  }, [id]);

  // Handles the booking form submission.
  const handleBook = async (e) => {
    // PreventDefault() prevents the browser's default form submission behaviour.
    e.preventDefault();

    setError('');
    setSuccess('');

    // Redirects unauthenticated users to the login page.
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Indicates that a booking request is being processed.
    setBooking(true);

    try {
      // Post sends the gig ID and optional note to the backend booking endpoint.
      const { data } = await client.post('/bookings', {
        gigId: id,
        note
      });

      // Displays the transaction reference returned by the API.
      setSuccess(
        `Booking confirmed! Reference: ${data.transaction.reference}`
      );

      // Clears the note after a successful booking.
      setNote('');
    } catch (err) {
      // Displays a readable message if booking fails.
      setError(
        apiErrorMessage(err, 'Could not complete booking.')
      );
    } finally {
      // Resets the booking state whether the request succeeds or fails.
      setBooking(false);
    }
  };

  // loading, error, or empty states before the main gig interface.
  if (loading) return <p className="page">Loading…</p>;

  if (error && !gig) {
    return (
      <div className="page">
        <Alert type="error" message={error} />
      </div>
    );
  }

  if (!gig) return null;

  // Determines whether the currently logged-in user owns this gig.
  const isOwnGig =
    user && gig.freelancer && user.id === gig.freelancer._id;

  return (
    <div className="page gig-detail">
      {/* Displays the gig's main information from the API response. */}
      <h2>{gig.title}</h2>

      <p className="gig-category">{gig.category}</p>

      <p>{gig.description}</p>

      <p className="gig-price">
        ${gig.price} &middot; {gig.deliveryDays} day delivery
      </p>

      {/* Attribution: React conditional rendering — displays the
          freelancer's email only when it is available. */}
      {gig.freelancer?.email && (
        <p>Offered by {gig.freelancer.email}</p>
      )}

      {/* Reusable project component displays errors and success messages. */}
      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      {/* Conditional rendering restricts booking form visibility to
          guests and clients who are not viewing their own gig. */}
      {(!user || user.role === 'client') && !isOwnGig && (
        <form onSubmit={handleBook} className="booking-form">
          <label htmlFor="note">
            Note to freelancer (optional)
          </label>

          {/* controlled textarea input synchronises user input with component state. */}
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />

          {/* Disables the button while booking is in progress and
              changes its label according to authentication and loading. */}
          <button type="submit" disabled={booking}>
            {booking
              ? 'Booking…'
              : isAuthenticated
                ? 'Book this gig'
                : 'Log in to book'}
          </button>
        </form>
      )}

      {/* Informs freelancers that they cannot book another freelancer's gig. */}
      {user?.role === 'freelancer' && !isOwnGig && (
        <p className="hint">Only clients can book gigs.</p>
      )}
    </div>
  );
}

// REFERENCES
 
 // Axios (n.d.) 'Axios API documentation'.
 // Available at: https://axios-http.com/docs/api_intro
// Accessed: 09 October 2026.
 
 // MDN Web Docs (n.d.) 'Event: preventDefault() method'.
 // Available at: https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault
 // Accessed: 09 October 2026.
 
 // React (n.d.) 'useEffect'.
 // Available at: https://react.dev/reference/react/useEffect
 // Accessed: 11 October 2026.

 // React (n.d.) 'useState'.
 // Available at:https://react.dev/reference/react/useState
 // Accessed: 11 October 2026.

 // React Router (n.d.) 'useNavigate'.
// Available at: https://reactrouter.com/api/hooks/useNavigate
 // Accessed: 12 October 2026..

 // React Router (n.d.) 'useParams'.
 //Available at: https://reactrouter.com/api/hooks/useParams
// Accessed: 12 October 2026.
 
