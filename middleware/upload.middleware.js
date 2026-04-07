const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const userId = req.body.user_id;
        const fileType = req.body.file_type || "prescription";

        //  Separate folder by type
        const uploadPath = path.join(
            __dirname,
            "../uploads",
            fileType,   //  prescription / report
            userId
        );

        // Create folder if not exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },

    filename: function (req, file, cb) {
        const fileType = req.body.file_type || "prescription";

        //  Dynamic file name
        const uniqueName = `${fileType}_${Date.now()}${path.extname(file.originalname)}`;

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF allowed"), false);
        }
    }
});

module.exports = upload;