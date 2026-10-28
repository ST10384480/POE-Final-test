const crypto = require('crypto');
//Imports Node.js cryptographic utilities to generate random bytes
//for unique simulated transaction references (Node.js, n.d.-a).

const { Gig } = require('../models/Gig');
const { Booking } = require('../models/Booking');
const { Transaction } = require('../models/Transaction');
const logger = require('../utils/logger');
// Imports project-specific Mongoose models and logging functionality.
const {
  estimateTax,
  monthlyIncome,
  TAX_METHOD_DESCRIPTION,
  TAX_DISCLAIMER,
  TAX_BRACKETS,
} = require('../utils/tax');
// Imports the tax-estimation helpers (see src/utils/tax.js for the method).


// POST /api/bookings (client only)
//Creates a booking against a gig and a simulated transaction record.
//No real payment gateway is involved — this represents a confirmed,
//simulated payment as permitted by the assignment spec.
async function createBooking(req, res, next) {
  try {
    const { gigId, note } = req.body;
    // Extracts the gig identifier and booking note from the request.

    const gig = await Gig.findById(gigId);
    // Retrieves a gig by its MongoDB document identifier
    // (Mongoose, n.d.).

    if (!gig || !gig.isActive) {
      return res.status(404).json({
        message: 'Gig not found or no longer available.'
      });
      // Returns HTTP 404 if the gig does not exist or is inactive.
    }

    if (gig.freelancer.toString() === req.user.id) {
      return res.status(400).json({
        message: 'You cannot book your own gig.'
      });
      // Prevents a user from booking their own gig.
      // req.user.id is assumed to be supplied by authentication middleware.
    }

    const booking = await Booking.create({
      gig: gig._id,
      client: req.user.id,
      freelancer: gig.freelancer,
      gigTitleSnapshot: gig.title,
      amount: gig.price,
      status: 'confirmed',
      note,
    });
    // Creates a booking document using the Mongoose model
    // (Mongoose, n.d.).

    let transaction;
    try {
      transaction = await Transaction.create({
        booking: booking._id,
        client: req.user.id,
        freelancer: gig.freelancer,
        amount: gig.price,
        status: 'completed',
        reference: `SIM-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      });
    } catch (txErr) {
      // Keep data consistent: never leave a booking without its transaction record.
      await Booking.deleteOne({ _id: booking._id });
      logger.error('Transaction failed; booking rolled back', {
        bookingId: booking._id.toString(),
        message: txErr.message,
        ...logger.reqMeta(req),
      });
      throw txErr;
    }
    // Creates a simulated transaction record. Node.js crypto provides
    // randomBytes() for generating cryptographically strong random data
    // (Node.js, n.d.-a).
    // This does not process or verify an actual payment.

    logger.audit('booking_created', {
      bookingId: booking._id.toString(),
      gigId: gig._id.toString(),
      clientId: req.user.id,
      freelancerId: gig.freelancer.toString(),
      ...logger.reqMeta(req),
    });
    logger.audit('transaction_recorded', {
      transactionId: transaction._id.toString(),
      reference: transaction.reference,
      amount: transaction.amount,
      bookingId: booking._id.toString(),
      ...logger.reqMeta(req),
    });
    // Records booking details using the project's custom logger.

    return res.status(201).json({
      message: 'Booking confirmed (simulated payment).',
      booking,
      transaction,
    });
    // Returns HTTP 201 to indicate that the booking resource was created.
  } catch (err) {
    next(err);
    // Passes errors to Express error-handling middleware
    // (Express, n.d.).
  }
}


// GET /api/bookings/mine (client only — bookings they made)
async function getMyBookings(req, res, next) {
  try {
    const bookings = await Booking.find({ client: req.user.id })
      .populate('gig', 'title category')
      .populate('freelancer', 'email')
      .sort({ createdAt: -1 });
    // Queries bookings for the authenticated client, populates selected
    // fields from referenced documents and sorts newest first
    // (Mongoose, n.d.).

    return res.status(200).json({ bookings });
    // Returns the matching bookings as JSON.
  } catch (err) {
    next(err);
    // Passes errors to Express error-handling middleware
    // (Express, n.d.).
  }
}


// GET /api/bookings/freelancer (freelancer only — bookings received)
async function getFreelancerBookings(req, res, next) {
  try {
    const bookings = await Booking.find({ freelancer: req.user.id })
      .populate('gig', 'title category')
      .populate('client', 'email')
      .sort({ createdAt: -1 });
    // Retrieves bookings associated with the authenticated freelancer,
    // populates selected gig and client fields, and sorts by date
    // (Mongoose, n.d.).

    return res.status(200).json({ bookings });
  } catch (err) {
    next(err);
    // Forwards errors to the central Express error handler
    // (Express, n.d.).
  }
}


// GET /api/bookings/freelancer/income
// (freelancer only — total + per-transaction income)
async function getFreelancerIncome(req, res, next) {
  try {
    const transactions = await Transaction.find({
      freelancer: req.user.id
    })
      .populate('client', 'email')
      .populate('booking', 'gigTitleSnapshot')
      .sort({ createdAt: -1 });
    // Retrieves the freelancer's transaction records and populates
    // selected related fields (Mongoose, n.d.).

    const totalIncome = transactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );
    // Uses Array.prototype.reduce() to calculate the sum of transaction
    // amounts (MDN Web Docs, n.d.).

    return res.status(200).json({ totalIncome, transactions });
    // Returns the calculated total and transaction details as JSON.
  } catch (err) {
    next(err);
    // Passes errors to Express error-handling middleware
    // (Express, n.d.).
  }
}

// GET /api/bookings/freelancer/tax-summary
// (freelancer only — income, estimated tax, net income and chart data)
async function getFreelancerTaxSummary(req, res, next) {
  try {
    const transactions = await Transaction.find({ freelancer: req.user.id }).sort({ createdAt: -1 });

    const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);
    const estimate = estimateTax(totalIncome);

    return res.status(200).json({
      ...estimate,
      transactionCount: transactions.length,
      monthly: monthlyIncome(transactions, 6),
      brackets: TAX_BRACKETS.map((b) => ({ upTo: b.upTo === Infinity ? null : b.upTo, rate: b.rate })),
      method: TAX_METHOD_DESCRIPTION,
      disclaimer: TAX_DISCLAIMER,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBooking,
  getMyBookings,
  getFreelancerBookings,
  getFreelancerIncome,
  getFreelancerTaxSummary
};
// Exports the controller functions for use by the route modules
// (Node.js, n.d.-b).


//References
//Express (n.d.) Error handling. Available at: https://expressjs.com/en/guide/error-handling.html (Accessed: 7 October 2026).
//MDN Web Docs (n.d.) Array.prototype.reduce(). Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce (Accessed: 7 October 2026).
//Node.js (n.d.-c) Process: uptime and environment. Available at: https://nodejs.org/api/process.html (Accessed: 15 October 2026).
//Mongoose (n.d.) Queries. Available at: https://mongoosejs.com/docs/queries.html (Accessed: 7 October 2026).
//Mongoose (n.d.-b) Populate. Available at: https://mongoosejs.com/docs/populate.html (Accessed: 7 October 2026).
//Node.js (n.d.-a) Crypto. Available at: https://nodejs.org/api/crypto.html (Accessed: 7 October 2026).
//Node.js (n.d.-b) Modules: CommonJS modules. Available at: https://nodejs.org/api/modules.html (Accessed: 7 October 2026).
