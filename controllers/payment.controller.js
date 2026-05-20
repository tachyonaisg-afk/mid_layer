const QRCode = require('qrcode');
const pool = require('../config/db');
const crypto = require('crypto');
const razorpay = require('../config/razorpay');



// Create Payment

exports.createPayment = async (req, res) => {
    const {
        patient_id,
        company,
        posting_date,
        party_type,
        party,
        invoice_no,
        due_amount
    } = req.body;

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // QR CREATE
        const qr = await razorpay.qrCode.create({
            type: "upi_qr",
            name: company,
            usage: "single_use",
            fixed_amount: true,
            payment_amount: due_amount * 100,
            description: `Invoice ${invoice_no}`,
            notes: { patient_id, invoice_no }
        });

        // PAYMENT LINK CREATE
        const paymentLink = await razorpay.paymentLink.create({
            amount: due_amount * 100,
            currency: "INR",
            description: `Invoice ${invoice_no}`,
            callback_url: "https://midl.automedai.in/payments/success",
            callback_method: "get",
            notes: { patient_id, invoice_no }
        });

        // INSERT DB
        await conn.query(
            `INSERT INTO Payments (
                patient_id, company, posting_date, party_type, party,
                invoice_no, due_amount, paid_amount,
                payment_link, razorpay_qr_id, razorpay_link_id,
                status, mode_of_payment, payment_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'pending', NULL, NULL)`,

            [
                patient_id,
                company,
                posting_date,
                party_type,
                party,
                invoice_no,
                due_amount,
                paymentLink.short_url,
                qr.id,
                paymentLink.id
            ]
        );

        await conn.commit();

        return res.json({
            success: true,
            message: "Payment initiated",
            data: {
                patient_id,
                company,
                posting_date,
                party_type,
                party,
                invoice_no,
                amount: due_amount,
                qr: { image: qr.image_url, id: qr.id },
                payment_link: { url: paymentLink.short_url, id: paymentLink.id },
                status: "pending"
            }
        });

    } catch (err) {
        await conn.rollback();
        return res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
};

// WEBHOOK (FIXED + SAFE)

exports.paymentWebhook = async (req, res) => {
    try {

        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!Buffer.isBuffer(req.body)) {
            return res.status(400).json({ success: false, message: "Invalid body format" });
        }

        const rawBody = req.body;
        const signature = req.headers["x-razorpay-signature"];

        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(rawBody)
            .digest("hex");

        if (expectedSignature !== signature) {
            return res.status(400).json({ success: false, message: "Invalid signature" });
        }

        const body = JSON.parse(rawBody.toString());
        const { event, payload } = body;

        const io = req.app.get("io");

        let updateData = null;

        // ========================= QR =========================
        if (event === "qr_code.credited" && payload?.payment?.entity) {

            const payment = payload.payment.entity;

            const qr_id = payment.qr_code_id;
            const payment_id = payment.id;
            const method = payment.method || "UNKNOWN";

            const [result] = await pool.query(
                `UPDATE Payments 
                 SET status='paid',
                     paid_amount=due_amount,
                     razorpay_payment_id=?,
                     reference_no=?,
                     reference_date=NOW(),
                     mode_of_payment=?,
                     payment_type='Receive',
                     paid_at=NOW()
                 WHERE razorpay_qr_id=? AND status='pending'`,
                [payment_id, payment_id, method, qr_id]
            );

            if (result.affectedRows) {

                const [rows] = await pool.query(
                    `SELECT * FROM Payments WHERE razorpay_qr_id=? LIMIT 1`,
                    [qr_id]
                );

                if (rows && rows[0]) {
                    updateData = buildResponse(rows[0]);
                }
            }
        }

        // ========================= LINK =========================
        if (event === "payment_link.paid" && payload?.payment_link?.entity) {

            const link = payload.payment_link.entity;

            const link_id = link.id;
            const payment_id = link.payment_id || link.id;
            const method = link.method || "UNKNOWN";

            const [result] = await pool.query(
                `UPDATE Payments 
                 SET status='paid',
                     paid_amount=due_amount,
                     razorpay_payment_id=?,
                     reference_no=?,
                     reference_date=NOW(),
                     mode_of_payment=?,
                     payment_type='Receive',
                     paid_at=NOW()
                 WHERE razorpay_link_id=? AND status='pending'`,
                [payment_id, payment_id, method, link_id]
            );

            if (result.affectedRows) {

                const [rows] = await pool.query(
                    `SELECT * FROM Payments WHERE razorpay_link_id=? LIMIT 1`,
                    [link_id]
                );

                if (rows && rows[0]) {
                    updateData = buildResponse(rows[0]);
                }
            }
        }

        if (io && updateData) {
            io.emit("payment_success", updateData);
        }

        return res.json({ success: true });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false });
    }
};


function buildResponse(row) {
    return {
        success: true,
        message: "Payment successful",
        data: {
            payment_type: row.payment_type || "Receive",

            payment_date: row.paid_at
                ? new Date(row.paid_at).toISOString().split("T")[0]
                : null,

            company: row.company,
            mode_of_payment: row.mode_of_payment,

            party_type: row.party_type,
            party: row.party,

            invoice_no: row.invoice_no,

            paid_amount: row.paid_amount,
            received_amount: row.paid_amount,

            reference_no: row.razorpay_payment_id || row.reference_no,

            reference_date: row.reference_date
                ? new Date(row.reference_date).toISOString().split("T")[0]
                : null,

            paid_to_account_currency: "INR",

            status: "paid"
        }
    };
}


exports.paymentSuccess = async (req, res) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_payment_link_status
        } = req.query;

        const isPaid = razorpay_payment_link_status === 'paid';

        return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Payment Status | AutoMed AI</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
                <style>
                    :root {
                        --success: #22c55e;
                        --warning: #f59e0b;
                        --text-main: #1e293b;
                        --text-muted: #64748b;
                        --bg: #f8fafc;
                    }

                    body {
                        margin: 0;
                        padding: 0;
                        font-family: 'Inter', sans-serif;
                        background-color: var(--bg);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        color: var(--text-main);
                    }

                    .card {
                        background: white;
                        padding: 48px 32px;
                        border-radius: 24px;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                        text-align: center;
                        max-width: 420px;
                        width: 90%;
                        animation: fadeIn 0.6s ease-out;
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    /* Big Animated Icon Container */
                    .icon-wrapper {
                        position: relative;
                        width: 100px;
                        height: 100px;
                        margin: 0 auto 24px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }

                    .success-circle {
                        width: 100px;
                        height: 100px;
                        background: var(--success);
                        border-radius: 50%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        color: white;
                        font-size: 50px;
                        box-shadow: 0 10px 15px -3px rgba(34, 197, 94, 0.4);
                        animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                    }

                    .processing-circle {
                        width: 100px;
                        height: 100px;
                        background: var(--warning);
                        border-radius: 50%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        color: white;
                        font-size: 50px;
                        animation: pulse 1.5s infinite ease-in-out;
                    }

                    @keyframes scaleIn {
                        0% { transform: scale(0); }
                        100% { transform: scale(1); }
                    }

                    @keyframes pulse {
                        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
                        70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(245, 158, 11, 0); }
                        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
                    }

                    h2 { margin: 0 0 12px; font-weight: 600; font-size: 24px; }
                    p { margin: 0; color: var(--text-muted); line-height: 1.5; font-size: 16px; }

                    .details-box {
                        margin-top: 32px;
                        padding-top: 24px;
                        border-top: 1px solid #f1f5f9;
                        text-align: left;
                    }

                    .detail-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                        font-size: 14px;
                    }

                    .label { color: var(--text-muted); font-weight: 400; }
                    .value { color: var(--text-main); font-weight: 600; font-family: monospace; }

                    .btn {
                        display: inline-block;
                        margin-top: 32px;
                        width: 100%;
                        background: #0f172a;
                        color: white;
                        text-decoration: none;
                        padding: 14px 0;
                        border-radius: 12px;
                        font-weight: 500;
                        transition: all 0.2s;
                    }

                    .btn:hover { background: #334155; transform: translateY(-1px); }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon-wrapper">
                        ${isPaid ? `
                            <div class="success-circle">✓</div>
                        ` : `
                            <div class="processing-circle">!</div>
                        `}
                    </div>

                    <h2>${isPaid ? 'Payment Received!' : 'Processing Payment'}</h2>
                    <p>${isPaid ? 'Your appointment has been confirmed. A receipt has been sent to your WhatsApp.' : 'We are verifying your transaction with the bank. This usually takes a few seconds.'}</p>
                    
                    <div class="details-box">
                        <div class="detail-row">
                            <span class="label">Payment ID</span>
                            <span class="value">${razorpay_payment_id || '---'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Status</span>
                            <span class="value" style="color: ${isPaid ? 'var(--success)' : 'var(--warning)'}; text-transform: uppercase;">${razorpay_payment_link_status}</span>
                        </div>
                    </div>

                </div>
            </body>
            </html>
        `);

    } catch (err) {
        console.error("UI Success Page Error:", err);
        return res.status(500).send("An error occurred loading the success page.");
    }
};
