import express from "express";
import cors from "cors";
import PDFDocument from "pdfkit";
import https from "https";
import sgMail from "@sendgrid/mail";

const app = express();
app.use(cors());
app.use(express.json());

/* ===== SENDGRID API KEY (FROM ENV) ===== */
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/* ===== VERIFIED SENDER (MUST MATCH SENDGRID) ===== */
const VERIFIED_SENDER = {
  email: "payflowlive@gmail.com",
  name: "Payflowlive Services"
};

/* ===== LOGO URL ===== */
const LOGO_URL = "https://iili.io/fMmJlX2.md.jpg";

/* ===== FETCH LOGO BUFFER ===== */
function fetchLogoBuffer() {
  return new Promise((resolve, reject) => {
    https.get(LOGO_URL, res => {
      const data = [];
      res.on("data", d => data.push(d));
      res.on("end", () => resolve(Buffer.concat(data)));
      res.on("error", reject);
    });
  });
}

/* ===== SEND RECEIPT ===== */
app.post("/send-receipt", async (req, res) => {
  const r = req.body;

  try {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    const logo = await fetchLogoBuffer();

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(buffers);

      const recipients = r.email
        ? [r.email, VERIFIED_SENDER.email]
        : [VERIFIED_SENDER.email];

      await sgMail.send({
        to: recipients,
        from: VERIFIED_SENDER,
        subject: `Transaction Receipt – ${r.reference}`,
        html: `
          <h2 style="color:#7c3aed">Transaction Receipt</h2>
          <p><strong>Reference:</strong> ${r.reference}</p>
          <p><strong>Amount:</strong> ${r.amount}</p>
          <p><strong>Account Type:</strong> ${r.accountType}</p>
          <p><strong>Recipient:</strong> ${r.recipient}</p>
          <p><strong>Status:</strong> Pending Required Fee</p>
        `,
        attachments: [
          {
            content: pdfBuffer.toString("base64"),
            filename: `Receipt-${r.reference}.pdf`,
            type: "application/pdf",
            disposition: "attachment"
          }
        ]
      });

      res.json({ success: true });
    });

    /* ===== PDF CONTENT ===== */
    doc.image(logo, 50, 40, { width: 120 });
    doc.moveDown(3);

    doc.fontSize(20)
      .fillColor("#7c3aed")
      .text("Transaction Receipt", { align: "center" });

    doc.moveDown();
    doc.fillColor("#000").fontSize(12);
    doc.text(`Reference: ${r.reference}`);
    doc.text(`Amount: ${r.amount}`);
    doc.text(`Account Type: ${r.accountType}`);
    doc.text(`Recipient: ${r.recipient}`);
    doc.text(`Status: Pending Required Fee`);

    doc.moveDown(2);
    doc.fontSize(10)
      .fillColor("#6b7280")
      .text(
        "This receipt is system-generated and valid without signature.",
        { align: "center" }
      );

    doc.end();

  } catch (err) {
    console.error("SendGrid Error:", err);
    res.status(500).json({ success: false, error: "Email failed" });
  }
});

/* ===== HEALTH CHECK ===== */
app.get("/", (req, res) => {
  res.send("SendGrid receipt service running");
});

/* ===== START SERVER ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SendGrid backend running on port ${PORT}`);
});
