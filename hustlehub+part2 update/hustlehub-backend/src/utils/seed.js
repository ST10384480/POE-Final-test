// Populates the database with demo accounts and gigs so the Postman
// collection / demo video have predictable data to work with.
// Usage: npm run seed
require('dotenv').config();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { User } = require('../models/User');
const { Gig } = require('../models/Gig');
const { Booking } = require('../models/Booking');
const { Transaction } = require('../models/Transaction');
const logger = require('./logger');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('Connected for seeding');

  await Promise.all([
    User.deleteMany({}),
    Gig.deleteMany({}),
    Booking.deleteMany({}),
    Transaction.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('DemoP@ss1', 12);

  const client = await User.create({ email: 'client@example.com', passwordHash, role: 'client' });
  const freelancer = await User.create({ email: 'freelancer@example.com', passwordHash, role: 'freelancer' });
  const otherFreelancer = await User.create({ email: 'freelancer2@example.com', passwordHash, role: 'freelancer' });
  await User.create({ email: 'admin@example.com', passwordHash, role: 'admin' });

  await Gig.create([
    {
      title: 'I will design a modern logo for your startup',
      description: 'Professional, minimal logo design with 3 concepts and unlimited revisions.',
      category: 'design',
      price: 75,
      deliveryDays: 3,
      freelancer: freelancer._id,
    },
    {
      title: 'I will build a responsive React landing page',
      description: 'A fast, mobile-friendly landing page built with React and deployed for you.',
      category: 'development',
      price: 250,
      deliveryDays: 7,
      freelancer: freelancer._id,
    },
    {
      title: 'I will write SEO-optimised blog content',
      description: 'Well-researched, engaging blog articles optimised for search engines.',
      category: 'writing',
      price: 40,
      deliveryDays: 2,
      freelancer: otherFreelancer._id,
    },
  ]);

  logger.info('Seed complete', {
    users: { client: client.email, freelancer: freelancer.email },
    note: 'All demo accounts use the password: DemoP@ss1',
  });

  await mongoose.disconnect();
}

seed().catch((err) => {
  logger.error('Seeding failed', { message: err.message });
  process.exit(1);
});

// REFERENCES
// npm, Inc. (n.d.) ‘dotenv’. npm. Available at: https://www.npmjs.com/package/dotenv (Accessed: 12 October 2026).
// bcrypt (n.d.) ‘bcrypt’. npm. Available at: https://www.npmjs.com/package/bcrypt (Accessed: 12 October 2026).
// Mongoose (n.d.) ‘Connecting to MongoDB’. Mongoose documentation. Available at: https://mongoosejs.com/docs/connections.html (Accessed: 12 October 2026).
// Mongoose (n.d.) ‘Model API’. Mongoose documentation. Available at: https://mongoosejs.com/docs/api/model.html (Accessed: 12 October 2026).
// Mongoose (n.d.) ‘Mongoose Queries: deleteMany()’. Mongoose documentation. Available at: https://mongoosejs.com/docs/api/model.html#Model.deleteMany() (Accessed: 12 October 2026).
// Node.js (n.d.) ‘Process’. Node.js documentation. Available at: https://nodejs.org/api/process.html (Accessed: 12 October 2026).
