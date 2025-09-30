import express from 'express';
import cors from 'cors';
import Airtable from 'airtable';
import SibApiV3Sdk from 'sib-api-v3-sdk';

// ─── ENV ────────────────────────────────────────────────────────────────
const {
  AIRTABLE_API_KEY,
  AIRTABLE_BASE_ID,
  AIRTABLE_TABLE_ID,           // same env vars reused
  BREVO_API_KEY,
  BREVO_TEMPLATE_ID = 8,
  ORIGIN_ALLOWED = '*',
  PORT = 3000,
} = process.env;

const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'info@piren-bar.se';
const BREVO_SENDER_NAME  = 'Piren AW';

// ─── APP & MIDDLEWARE ───────────────────────────────────────────────────
const app = express();
app.use(express.json());

const allowedOrigins = ORIGIN_ALLOWED.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  }
}));

// ─── AIRTABLE ───────────────────────────────────────────────────────────
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

async function findRecordByDomain(domain) {
  const formula = `AND({Status} = 'Approved', FIND("@${domain}", {Email}) > 0)`;
  const records = await base(AIRTABLE_TABLE_ID)
    .select({ maxRecords: 1, filterByFormula: formula })
    .firstPage();
  return records[0] || null;
}

// ─── BREVO ──────────────────────────────────────────────────────────────
const brevoClient = SibApiV3Sdk.ApiClient.instance;
brevoClient.authentications['api-key'].apiKey = BREVO_API_KEY;
const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

// ─── ROUTES ─────────────────────────────────────────────────────────────

// Brevo sender for the "tennis-signup" form
app.post('/send-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return res.status(400).json({ error: 'invalid email' });

    const rec = await findRecordByDomain(domain);
    if (!rec) return res.status(403).send('Domain not allowed');

    await emailApi.sendTransacEmail({
      templateId: Number(BREVO_TEMPLATE_ID),
      to: [{ email }],
      sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
      params: {
        Name:  rec.get('Name'),
        Email: email,
        Date:  new Date().toISOString().split('T')[0]
      }
    });

    res.json({ sent: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Send failed');
  }
});

// Signup handler for the "tennis-signup" form
app.post('/tennis-signup', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'name & email required' });

    await base(AIRTABLE_TABLE_ID).create([
      {
        fields: {
          Name: name,
          Email: email.toLowerCase(),
          Status: 'Pending',
          Source: 'Tennis'
        }
      }
    ]);

    res.json({ created: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Create failed');
  }
});

// ─── START ──────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
