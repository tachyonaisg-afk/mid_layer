
const pool = require("../config/db");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs"); 


const { sendPrescriptionWhatsapp } = require("../services/whatsapp.service");



exports.showPasswordPage = async (req, res) => {
    try {
        const { token } = req.params;

        const [rows] = await pool.query(
            "SELECT * FROM prescription_files WHERE token = ?",
            [token]
        );

        if (!rows.length) {
            return res.send("<h3>Invalid or broken link</h3>");
        }

        const file = rows[0];

        // CHECK EXPIRY HERE
        if (new Date() > new Date(file.expires_at)) {
            return res.send(`
                <div style="text-align:center; margin-top:50px;">
                    <h2 style="color:red;">Link Expired ⛔</h2>
                    <p>This prescription link is valid only for 7 Days.</p>
                </div>
            `);
        }

        //  SHOW PASSWORD FORM + EXPIRY INFO
        res.send(`
            <div style="font-family: Arial; text-align: center; margin-top: 50px;">
               <h2>Enter Surname to Download ${file.file_type.toUpperCase()}</h2>
                
                <p style="color: gray;">
                    ⏳ Link expires at: ${new Date(file.expires_at).toLocaleString()}
                </p>

                <form method="POST">
                    <input type="password" name="password" placeholder="Enter Surname" required 
                        style="padding: 10px; border-radius: 5px; border: 1px solid #ccc;" />
                    <br><br>
                    <button type="submit" 
                        style="padding: 10px 20px; background: #25D366; color: white; border: none; border-radius: 5px;">
                        Download PDF
                    </button>
                </form>
            </div>
        `);

    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
};

exports.verifyPasswordAndDownload = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const [rows] = await pool.query(
            "SELECT * FROM prescription_files WHERE token = ?",
            [token]
        );

        if (!rows.length) return res.status(404).send("Invalid link or file not found.");

        const file = rows[0];

        // Check Expiry
        if (new Date() > new Date(file.expires_at)) {
            return res.status(403).send("This link has expired (valid for 24 hours only).");
        }

        // Verify Password (Surname)
        const match = await bcrypt.compare(password.toLowerCase(), file.password_hash);
        if (!match) return res.send("Wrong password. Please try again.");

        // Construct Absolute Path
      const filePath = path.join(
    __dirname,
    "../uploads",
    file.file_type,  //  dynamic folder
    String(file.user_id),
    file.file_name
);

        // Check if file physically exists on disk
       if (fs.existsSync(filePath)) {
    // ADD THIS QUERY TO UPDATE THE STATUS TO DOWNLOADED
    await pool.query(
        "UPDATE prescription_files SET delivery_status = 'downloaded' WHERE token = ?",
        [token]
    );
    
    res.download(filePath);
} else {
            console.error("File missing at path:", filePath);
            res.status(404).send("File no longer exists on the server.");
        }
    } catch (error) {
        console.error("Download Error:", error);
        res.status(500).send("An error occurred while processing your download.");
    }
};



// Webhook for Twilio to update delivery status automatically
exports.updateMessageStatus = async (req, res) => {
    const { MessageSid, MessageStatus } = req.body;

    try {
        await pool.query(
            "UPDATE prescription_files SET delivery_status = ? WHERE message_sid = ?",
            [MessageStatus, MessageSid]
        );
        res.sendStatus(200);
    } catch (err) {
        console.error("Webhook Update Error:", err);
        res.sendStatus(500);
    }
};


exports.uploadAndSendPrescription = async (req, res) => {
    try {
        const { 
            user_id, 
            encounter_id, 
            item_id, 
            patient_name, 
            phone, 
            file_type, 
            company_name 
        } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "PDF file required" });
        }

        const type = file_type || "prescription";

        if (type === "prescription" && !encounter_id) {
            return res.status(400).json({ message: "encounter_id is required" });
        }
        if (type === "report" && !item_id) {
            return res.status(400).json({ message: "item_id is required" });
        }

        const nameParts = patient_name.trim().split(" ");
        const extractedSurname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : patient_name;
        const passwordHash = await bcrypt.hash(extractedSurname.toLowerCase(), 10);

        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const fileName = req.file.filename;
        const referenceId = type === "report" ? item_id : encounter_id;

        /**
         * UPDATED LOGIC:
         * For reports, we send 'report/TOKEN' so the Twilio button 
         * link becomes https://midl.automedai.in/report/TOKEN
         */
        const whatsappLinkVariable = type === "report" ? `report/${token}` : `prescription/${token}`;

        const whatsappResponse = await sendPrescriptionWhatsapp(
            phone,
            patient_name,
            referenceId, 
            whatsappLinkVariable,
            type,
            company_name
        );

        const enrolledIdValue = type === "prescription" ? encounter_id : null;
        const itemIdValue = type === "report" ? item_id : null;

        await pool.query(
            `INSERT INTO prescription_files 
            (user_id, company_name, encounter_id, item_id, patient_name, file_name, token, password_hash, expires_at, message_sid, delivery_status, file_type) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id, 
                company_name,
                enrolledIdValue, 
                itemIdValue, 
                patient_name, 
                fileName, 
                token, 
                passwordHash, 
                expiresAt, 
                whatsappResponse.sid, 
                whatsappResponse.status, 
                type
            ]
        );

        res.json({ success: true, message: `${type.toUpperCase()} sent successfully` });

    } catch (err) {
        console.error("Critical Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// exports.uploadAndSendPrescription = async (req, res) => {
//     try {
//         const { user_id, appointment_id, patient_name, phone, file_type } = req.body;

//         if (!req.file) {
//             return res.status(400).json({ message: "PDF file required" });
//         }

//         //  Default file type
//         const type = file_type || "prescription";

//         //  Extract surname
//         const nameParts = patient_name.trim().split(" ");
//         const extractedSurname =
//             nameParts.length > 1 ? nameParts[nameParts.length - 1] : patient_name;

//         //  Hash password
//         const passwordHash = await bcrypt.hash(extractedSurname.toLowerCase(), 10);

//         //  Token & expiry
//         const token = uuidv4();
//         const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
       
//         //  Uploaded file name from multer
//         const fileName = req.file.filename;

//         //  Send WhatsApp
//      const fullDownloadUrl =
//     type === "report"
//         ? `/report/${token}`
//         : `/prescription/${token}`;


//         const whatsappResponse = await sendPrescriptionWhatsapp(
//             phone,
//             patient_name,
//             appointment_id,
//             fullDownloadUrl,
//             type
//         );

//         //  Save DB ( UPDATED with file_type)
//         await pool.query(
//             `INSERT INTO prescription_files 
//             (user_id, appointment_id, patient_name, file_name, token, password_hash, expires_at, message_sid, delivery_status, file_type) 
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//             [
//                 user_id,
//                 appointment_id,
//                 patient_name,
//                 fileName,
//                 token,
//                 passwordHash,
//                 expiresAt,
//                 whatsappResponse.sid,
//                 whatsappResponse.status,
//                 type 
//             ]
//         );

//         res.json({
//             success: true,
//             message: `${type.toUpperCase()} uploaded & sent successfully`
//         });

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: "Server error" });
//     }
// };