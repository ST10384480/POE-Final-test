import { Link } from 'react-router-dom';

export default function GigCard({ gig, actions }) {
  // Attribution: React documentation — props allow the component
  // to receive gig information and optional action elements.
  return (
    <div className="gig-card" data-testid="gig-card">
      <div className="gig-card-header">
        {/* Displays the gig title and category from the supplied props. */}
        <h3>{gig.title}</h3>
        <span className="gig-category">{gig.category}</span>
      </div>

      {/* Displays a description of the service offered. */}
      <p className="gig-description">{gig.description}</p>

      <div className="gig-meta">
        {/* Displays the price and estimated delivery time. */}
        <span className="gig-price">${gig.price}</span>
        <span className="gig-delivery">
          {gig.deliveryDays} day delivery
        </span>
      </div>

      {/* Attribution: JavaScript optional chaining and React conditional
          rendering display freelancer information only when an email exists. */}
      {gig.freelancer?.email && (
        <p className="gig-freelancer">
          By {gig.freelancer.email}
        </p>
      )}

      <div className="gig-card-footer">
        {/* Attribution: React Router documentation — Link navigates to
            the gig details route without a full-page browser reload.
            The template literal inserts the gig's unique ID into the URL. */}
        <Link to={`/gigs/${gig._id}`}>
          View details
        </Link>

        {/* Renders optional action elements supplied by the parent component. */}
        {actions}
      </div>
    </div>
  );
}

// REFERENCES
 
 // MDN Web Docs (n.d.) 'Template literals'.
 //Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
// Accessed: 14 August 2026.
 
 // MDN Web Docs (n.d.) 'Optional chaining (?.)'.
 //Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining
// Accessed: 14 August 2026.
 
 // React (n.d.) 'Passing props to a component'.
 // Available at: https://react.dev/learn/passing-props-to-a-component
// Accessed: 17 August 2026.
 
 //React Router (n.d.) 'Link'.
 //Available at: https://reactrouter.com/api/components/Link
// Accessed: 17 August 2026.
 

