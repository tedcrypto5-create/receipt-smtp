import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import PDFDocument from "pdfkit";

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Gmail SMTP configuration
 * IMPORTANT:
 * - Enable 2-Step Verification on the Gmail account
 * - Generate an App Password
 * - Paste the App Password below (NOT your normal Gmail password)
 */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "tedcryptobanger@gmail.com",
    pass: "@DennisKorir1874" // ← INSERT APP PASSWORD HERE
  }
});

app.post("/send-receipt", async (req, res) => {
  const r = req.body;

  try {
    // --------- CREATE PDF RECEIPT ---------
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", async () => {
      const pdfData = Buffer.concat(buffers);

      await transporter.sendMail({
        from: `"Transaction Receipt" <tedcryptobanger@gmail.com>`,

        // Send to customer email if provided, otherwise to your email
        to: r.customerEmail || "tedcryptobanger@gmail.com",

        // Optional CC / BCC
        cc: r.cc || undefined,
        bcc: r.bcc || undefined,

        subject: `Transaction Receipt – ${r.reference}`,
        html: `
          <h2>Transaction Receipt</h2>
          <hr/>
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

    // --------- PDF CONTENT ---------
    doc.fontSize(18).text("Transaction Receipt", { align: "center" });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Reference: ${r.reference}`);
    doc.text(`Amount: ${r.amount}`);
    doc.text(`Account Type: ${r.accountType}`);
    doc.text(`Recipient: ${r.recipient}`);
    doc.text(`Status: Pending Required Fee`);
    doc.moveDown();
    doc.text("This is an automated receipt.");

    doc.end();

  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ success: false, error: "Email failed" });
  }
});

app.listen(3000, () => {
  console.log("SMTP backend running at http://localhost:3000");
});
