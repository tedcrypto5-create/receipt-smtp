import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import PDFDocument from "pdfkit";
import https from "https";

const app = express();
app.use(cors());
app.use(express.json());

/* ===== SMTP CONFIG ===== */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "tedcryptobanger@gmail.com",
    pass: "@DennisKorir1874" // ← INSERT APP PASSWORD ONLY
  }
});

/* ===== LOGO URL (USED FOR ALL RECEIPTS) ===== */
const LOGO_URL = "https://iili.io/fMmJlX2.md.jpg";

/* ===== DOWNLOAD LOGO AS BUFFER ===== */
function fetchLogoBuffer() {
  return new Promise((resolve, reject) => {
    https.get(LOGO_URL, res => {
      const data = [];
      res.on("data", chunk => data.push(chunk));
      res.on("end", () => resolve(Buffer.concat(data)));
      res.on("error", reject);
    });
  });
}

/* ===== RECEIPT ENDPOINT ===== */
app.post("/send-receipt", async (req, res) => {
  const r = req.body;

  try {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    const logoBuffer = await fetchLogoBuffer();

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", async () => {
      const pdfData = Buffer.concat(buffers);

      await transporter.sendMail({
        from: `"Transaction Receipt" <tedcryptobanger@gmail.com>`,

        /* Send to user email if provided, always CC you */
        to: r.customerEmail || "tedcryptobanger@gmail.com",
        cc: "tedcryptobanger@gmail.com",

        subject: `Transaction Receipt – ${r.reference}`,
        html: `
          <h2 style="color:#7c3aed">Transaction Receipt</h2>
          <p><strong>Reference:</strong> ${r.reference}</p>
          <p><strong>Amount:</strong> ${r.amount}</p>
          <p><strong>Account Type:</strong> ${r.accountType}</p>
          <p><strong>Recipient:</strong> ${r.recipient}</p>
          <p><strong>Status:</strong> Pending Required Fee</p>
          <br/>
          <small>This receipt was generated automatically.</small>
        `,
        attachments: [
          {
            filename: `Receipt-${r.reference}.pdf`,
            content: pdfData
          }
        ]
      });

      res.json({ success: true });
    });

    /* ===== PDF CONTENT WITH BRANDING ===== */

    // LOGO
    doc.image(logoBuffer, 50, 40, { width: 120 });
    doc.moveDown(3);

    // HEADER
    doc
      .fontSize(20)
      .fillColor("#7c3aed")
      .text("Transaction Receipt", { align: "center" });

    doc.moveDown();
    doc.fillColor("#000").fontSize(12);

    // DETAILS
    doc.text(`Reference: ${r.reference}`);
    doc.text(`Amount: ${r.amount}`);
    doc.text(`Account Type: ${r.accountType}`);
    doc.text(`Recipient: ${r.recipient}`);
    doc.text(`Status: Pending Required Fee`);

    doc.moveDown(2);

    // FOOTER
    doc
      .fontSize(10)
      .fillColor("#6b7280")
      .text(
        "This receipt is system-generated and valid without signature.",
        { align: "center" }
      );

    doc.end();

  } catch (err) {
    console.error("Receipt error:", err);
    res.status(500).json({ success: false });
  }
});

app.listen(3000, () => {
  console.log("SMTP backend running at https://receipt-smtp.onrender.com");
});
