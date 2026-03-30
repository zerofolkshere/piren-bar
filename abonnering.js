import express from "express";
import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const seenSubmissions = new Set(); // 🚫 Prevent duplicates

// 🔐 Verify webhook signature from Webflow
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

// ⏰ Safely format date and time strings into ISO
function formatISOTime(date, time) {
  if (!date || !time) throw new Error("Missing date or time");

  const [year, month, day] = date.split("-");
  const [hour, minute] = time.split(":");

  const t = new Date(+year, +month - 1, +day, +hour, +minute);
  if (isNaN(t)) throw new Error(`Invalid time value: ${date} ${time}`);

  return t.toISOString();
}

// ☑️ Normalize checkbox-like values from Webflow into Airtable booleans
function asCheckbox(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return ["true", "on", "yes", "1", "ja"].includes(v);
  }

  return false;
}

// 📌 Webflow form POST endpoint
app.post("/webflow-form", async (req, res) => {
  try {
    console.log("⚡ Form webhook received:", req.body);

    // 🔒 Accept ONLY the “abonnering” form
    const formName = req.body?.payload?.name?.trim().toLowerCase();
    if (formName !== "abonnering") {
      return res.status(200).send("Ignored – not abonnering form");
    }

    const fields = req.body?.payload?.data;
    const submissionId = req.body?.payload?.id;

    if (!fields || !submissionId) {
      throw new Error("❌ Missing payload.data or payload.id in request");
    }

    // 🚫 Dedup
    if (seenSubmissions.has(submissionId)) {
      console.log("⚠️ Duplicate submission skipped:", submissionId);
      return res.status(200).send("Duplicate ignored");
    }
    seenSubmissions.add(submissionId);

    const start = formatISOTime(fields["date-picker"], fields["start-time"]);
    const end = formatISOTime(fields["date-picker"], fields["end-time"]);

    const airtablePayload = {
      fields: {
        Namn: fields.namn || "",
        "E-Post": fields.email || "",
        Telefon: fields.phone || "",
        Företag: fields.company || "",
        "Antal Gäster": Number(fields["guest-total"] || 0),
        Bokningsdatum: fields["date-picker"] || "",
        Starttid: start,
        Sluttid: end,

        // --- menu items -----------------------------
        "Småplock 1": fields["Småplock 1"] || "",
        "Småplock 1 QT": Number(fields["Småplock 1 Quantity"] || 0),
        "Småplock 2": fields["Småplock 2"] || "",
        "Småplock 2 QT": Number(fields["Småplock 2 Quantity"] || 0),
        "Småplock 3": fields["Småplock 3"] || "",
        "Småplock 3 QT": Number(fields["Småplock 3 Quantity"] || 0),
        "Småplock 4": fields["Småplock 4"] || "",
        "Småplock 4 QT": Number(fields["Småplock 4 Quantity"] || 0),

        // --- drinks --------------------------------
        "Rött vin": fields["wine"] || "",
        "Vitt vin": fields["wine-2"] || "",
        Kaffepaket: fields["Coffee"] || "",

        // --- addons / checkboxes -------------------
        Bordsorganisering: asCheckbox(fields["Bordsorganisering"]),
        DJ: asCheckbox(fields["DJ"]),

        // --- misc ----------------------------------
        "Övriga Kommentarer": fields["message"] || "",
        Status: "Pending Response",
      },
    };

    console.log(
      "📦 Airtable payload:",
      JSON.stringify(airtablePayload, null, 2)
    );

    // ✨ Send to Airtable
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
