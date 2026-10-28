// End-to-end API tests (supertest). Requires a MongoDB instance reachable at
// MONGO_URI_TEST (default mongodb://127.0.0.1:27017/hustlehub_test). In CI this is
// provided by a MongoDB service container; locally use `docker compose up -d mongo`.
const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const app = require('../../src/app');
const { User } = require('../../src/models/User');
const logger = require('../../src/utils/logger');

jest.setTimeout(60000);

const PASSWORD = 'Str0ng!Passw0rd';

async function register(email, role) {
  return request(app).post('/api/auth/register').send({ email, password: PASSWORD, role });
}

async function registerAndLogin(email, role) {
  await register(email, role).expect(201);
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
  return res.body.token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const gigPayload = (overrides = {}) => ({
  title: 'Professional logo design',
  description: 'I will design a clean modern logo for your brand.',
  category: 'design',
  price: 3000,
  deliveryDays: 3,
  ...overrides,
});

let freelancerToken;
let freelancer2Token;
let clientToken;
let gigId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST);
  await mongoose.connection.dropDatabase();
  await User.init();
  freelancerToken = await registerAndLogin('freelancer@test.example.com', 'freelancer');
  freelancer2Token = await registerAndLogin('freelancer2@test.example.com', 'freelancer');
  clientToken = await registerAndLogin('client@test.example.com', 'client');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('health & basic hardening', () => {
  it('GET /api/health reports ok when the database is connected', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
  });

  it('sets security headers and a request id', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('returns a clean 404 for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist').expect(404);
    expect(res.body.message).toBe('Resource not found.');
  });

  it('returns 400 (not a stack trace) for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ')
      .expect(400);
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js/);
  });
});

describe('authentication', () => {
  it('rejects weak passwords', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'weak@test.example.com', password: 'password', role: 'client' })
      .expect(400);
    expect(res.body.message).toBe('Validation failed.');
  });

  it('does not allow public registration of the admin role (privilege escalation)', async () => {
    await register('sneaky@test.example.com', 'admin').expect(400);
  });

  it('rejects duplicate e-mail registration', async () => {
    await register('freelancer@test.example.com', 'freelancer').expect(409);
  });

  it('never returns the password hash', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'client@test.example.com', password: PASSWORD })
      .expect(200);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('uses the same generic error for unknown e-mail and wrong password', async () => {
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.example.com', password: PASSWORD })
      .expect(401);
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: 'client@test.example.com', password: 'Wrong!Passw0rd' })
      .expect(401);
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  it('blocks NoSQL operator injection in the login body', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } })
      .expect(400);
  });

  it('locks an account after repeated failed logins (even with the right password)', async () => {
    await registerAndLogin('lock@test.example.com', 'client');
    for (let i = 0; i < 3; i += 1) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'lock@test.example.com', password: 'Wrong!Passw0rd' })
        .expect(401);
    }
    const locked = await request(app)
      .post('/api/auth/login')
      .send({ email: 'lock@test.example.com', password: PASSWORD })
      .expect(423);
    expect(locked.body.message).toMatch(/temporarily locked/i);
  });

  it('rejects requests without a valid token', async () => {
    await request(app).get('/api/auth/profile').expect(401);
    await request(app).get('/api/auth/profile').set(auth('not.a.token')).expect(401);
  });
});

describe('gigs, RBAC and ownership', () => {
  it('lets a freelancer create a gig and strips XSS from the input', async () => {
    const res = await request(app)
      .post('/api/gigs')
      .set(auth(freelancerToken))
      .send(gigPayload({ title: 'Logo design<script>alert(1)</script> deal' }))
      .expect(201);
    expect(res.body.gig.title).not.toContain('<script');
    gigId = res.body.gig._id;
  });

  it('forbids clients from creating gigs (403)', async () => {
    await request(app).post('/api/gigs').set(auth(clientToken)).send(gigPayload()).expect(403);
  });

  it('forbids another freelancer from modifying someone else\'s gig (403)', async () => {
    await request(app)
      .put(`/api/gigs/${gigId}`)
      .set(auth(freelancer2Token))
      .send({ price: 1 })
      .expect(403);
  });

  it('validates identifiers and payloads', async () => {
    await request(app).get('/api/gigs/not-an-id').expect(400);
    await request(app)
      .post('/api/gigs')
      .set(auth(freelancerToken))
      .send(gigPayload({ price: -5 }))
      .expect(400);
  });

  it('searches safely when the query contains regex characters', async () => {
    await request(app).get('/api/gigs').query({ search: '(.*+' }).expect(200);
  });
});

describe('bookings, transactions and tax estimation', () => {
  it('forbids freelancers from creating bookings (403)', async () => {
    await request(app).post('/api/bookings').set(auth(freelancerToken)).send({ gigId }).expect(403);
  });

  it('creates a booking and a simulated transaction for a client', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set(auth(clientToken))
      .send({ gigId, note: 'Please use blue.' })
      .expect(201);
    expect(res.body.booking.status).toBe('confirmed');
    expect(res.body.transaction.reference).toMatch(/^SIM-/);
    expect(res.body.transaction.amount).toBe(3000);
  });

  it('reports income for the freelancer', async () => {
    const res = await request(app)
      .get('/api/bookings/freelancer/income')
      .set(auth(freelancerToken))
      .expect(200);
    expect(res.body.totalIncome).toBe(3000);
    expect(res.body.transactions).toHaveLength(1);
  });

  it('returns the tax summary (3000 income -> 330 tax -> 2670 net)', async () => {
    const res = await request(app)
      .get('/api/bookings/freelancer/tax-summary')
      .set(auth(freelancerToken))
      .expect(200);
    expect(res.body.totalIncome).toBe(3000);
    expect(res.body.estimatedTax).toBe(330);
    expect(res.body.netIncome).toBe(2670);
    expect(res.body.effectiveRate).toBe(11);
    expect(res.body.monthly).toHaveLength(6);
    expect(res.body.monthly[5].income).toBe(3000);
    expect(res.body.method).toBeDefined();
    expect(res.body.disclaimer).toBeDefined();
  });

  it('only exposes the tax summary to freelancers', async () => {
    await request(app).get('/api/bookings/freelancer/tax-summary').set(auth(clientToken)).expect(403);
    await request(app).get('/api/bookings/freelancer/tax-summary').expect(401);
  });

  it('a freelancer with no income has zero tax', async () => {
    const res = await request(app)
      .get('/api/bookings/freelancer/tax-summary')
      .set(auth(freelancer2Token))
      .expect(200);
    expect(res.body.estimatedTax).toBe(0);
    expect(res.body.totalIncome).toBe(0);
  });
});

describe('monitoring', () => {
  it('rejects non-admin users', async () => {
    await request(app).get('/api/monitoring/summary').set(auth(clientToken)).expect(403);
  });

  it('gives admins counters for the key security events', async () => {
    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    await User.create({ email: 'admin@test.example.com', passwordHash, role: 'admin' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.example.com', password: PASSWORD })
      .expect(200);

    const res = await request(app)
      .get('/api/monitoring/summary')
      .set(auth(login.body.token))
      .expect(200);

    expect(res.body.database).toBe('connected');
    expect(res.body.counters.loginSuccess).toBeGreaterThan(0);
    expect(res.body.counters.loginFailure).toBeGreaterThan(0);
    expect(res.body.counters.accountLockouts).toBeGreaterThan(0);
    expect(res.body.counters.bookingsCreated).toBe(1);
    expect(res.body.counters.transactionsRecorded).toBe(1);
    expect(res.body.counters.accessDenied).toBeGreaterThan(0);
    expect(logger.getMetrics().counters.registrations).toBeGreaterThan(0);
  });
});
