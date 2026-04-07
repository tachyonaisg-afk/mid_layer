const cron = require("node-cron");
const pool = require("../config/db");
const fs = require("fs");
const path = require("path");

// Run every day at midnight
cron.schedule("0 0 * * *", async () => { 
    console.log("Running expired prescription cleanup...");

    try {
        const [rows] = await pool.query(
            "SELECT * FROM prescription_files WHERE expires_at < NOW()"
        );

        for (const file of rows) {

            const fileType = file.file_type || "prescription";

            const filePath = path.join(
                __dirname,
                "../uploads",
                fileType,
                String(file.user_id),
                file.file_name
            );

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log("Deleted file:", filePath);
            } else {
                console.log("File not found:", filePath);
            }

            await pool.query(
                "DELETE FROM prescription_files WHERE id = ?",
                [file.id]
            );

            console.log("Deleted DB record ID:", file.id);
        }

        console.log("Cleanup completed ✅");

    } catch (err) {
        console.error("Cron Error:", err);
    }
});