import express from "express";
import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const seenSubmissions = new Set(); // Prevent duplicates

// Verify webhook signature from Webflow
function isValidSignature(req) {
  const secret = process.env.WEBFLOW_SECRET;
  const sig = req.headers["x-webflow-signature"];
  if (!secret || !sig) return false;

  const hash = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(hash));
}

// Safely format date and time strings into ISO
function formatISOTime(date, time) {
  if (!date || !time) throw new Error("Missing date or time");

  const [year, month, day] = date.split("-");
  const [hour, minute] = time.split(":");

  const t = new Date(+year, +month - 1, +day, +hour, +minute);
  if (isNaN(t)) throw new Error(`Invalid time value: ${date} ${time}`);

  return t.toISOString();
}

// Normalize checkbox-like values from Webflow into Airtable booleans
function asCheckbox(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return ["true", "on", "yes", "1", "ja"].includes(v);
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return false;
}

// Build Airtable-safe integer
function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// Webflow form POST endpoint
app.post("/webflow-form", async (req, res) => {
  try {
    console.log("⚡ Form webhook received:", req.body);

    // Accept ONLY the “abonnering” form
    const formName = req.body?.payload?.name?.trim().toLowerCase();
    if (formName !== "abonnering") {
      return res.status(200).send("Ignored – not abonnering form");
    }

    const fields = req.body?.payload?.data;
    const submissionId = req.body?.payload?.id;

    if (!fields || !submissionId) {
      throw new Error("Missing payload.data or payload.id in request");
    }

    // Dedup
    if (seenSubmissions.has(submissionId)) {
      console.log("⚠️ Duplicate submission skipped:", submissionId);
      return res.status(200).send("Duplicate ignored");
    }
    seenSubmissions.add(submissionId);

    const start = formatISOTime(fields["date-picker"], fields["start-time"]);
    const end = formatISOTime(fields["date-picker"], fields["end-time"]);

    const bordsorganiseringValue = asCheckbox(fields["Bordsorganisering"]);
    const djValue = asCheckbox(fields["DJ"]);

    const airtablePayload = {
      records: [
        {
          fields: {
            Namn: fields.namn || "",
            "E-Post": fields.email || "",
            Telefon: fields.phone || "",
            Företag: fields.company || "",
            "Antal Gäster": asNumber(fields["guest-total"]),
            Bokningsdatum: fields["date-picker"] || "",
            Starttid: start,
            Sluttid: end,

            "Småplock 1": fields["Småplock 1"] || "",
            "Småplock 1 QT": asNumber(fields["Småplock 1 Quantity"]),
            "Småplock 2": fields["Småplock 2"] || "",
            "Småplock 2 QT": asNumber(fields["Småplock 2 Quantity"]),
            "Småplock 3": fields["Småplock 3"] || "",
            "Småplock 3 QT": asNumber(fields["Småplock 3 Quantity"]),
            "Småplock 4": fields["Småplock 4"] || "",
            "Småplock 4 QT": asNumber(fields["Småplock 4 Quantity"]),

            "Rött vin": fields["wine"] || "",
            "Vitt vin": fields["wine-2"] || "",
            Kaffepaket: fields["Coffee"] || "",

            Bordsorganisering: bordsorganiseringValue,
            DJ: djValue,

            "Övriga Kommentarer": fields["message"] || "",
            Status: "Pending Response",
          },
        },
      ],
      typecast: true,
    };

    console.log("📥 Incoming checkbox raw values:", {
      Bordsorganisering: fields["Bordsorganisering"],
      DJ: fields["DJ"],
    });

    console.log("📤 Converted checkbox values:", {
      Bordsorganisering: airtablePayload.records[0].fields.Bordsorganisering,
      BordsorganiseringType:
        typeof airtablePayload.records[0].fields.Bordsorganisering,
      DJ: airtablePayload.records[0].fields.DJ,
      DJType: typeof airtablePayload.records[0].fields.DJ,
    });

    console.log(
      "📦 Airtable payload JSON:",
      JSON.stringify(airtablePayload, null, 2)
    );

    const atRes = await axios.post(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`,
      airtablePayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Airtable record created:", atRes.data);
    res.sendStatus(200);
  } catch (err) {
    console.error(
      "❌ Error handling form submission:",
      err.response?.data || err.message
    );
    res.sendStatus(500);
  }
});

// Optional webhook secured by signature
app.post("/some-other-webhook", (req, res) => {
  if (!isValidSignature(req)) return res.status(403).send("Forbidden");
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));
