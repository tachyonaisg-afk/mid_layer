const pool = require('../config/db');



// exports.createAppointment = async (req, res) => {

//     const { appointment_id, doctor_id, patient_id, company, appointment_date } = req.body;

//     const conn = await pool.getConnection();

//     try {

//         await conn.beginTransaction();

//         const [rows] = await conn.query(
//             `SELECT COUNT(*) AS total
//              FROM QueueTable
//              WHERE doctor_id = ?
//              AND company = ?
//              AND appointment_date = ?`,
//             [doctor_id, company, appointment_date]
//         );

//         const queue_no = rows[0].total + 1;

//         await conn.query(
//             `INSERT INTO QueueTable
//              (appointment_id, doctor_id, patient_id, company, appointment_date, queue_no)
//              VALUES (?, ?, ?, ?, ?, ?)`,
//             [appointment_id, doctor_id, patient_id, company, appointment_date, queue_no]
//         );

//         await conn.commit();

//         res.json({
//             success: true,
//             message: "Appointment created successfully",
//             data: {
//                 appointment_id,
//                 doctor_id,
//                 patient_id,
//                 company,
//                 appointment_date,
//                 queue_no
//             }
//         });

//     } catch (err) {

//         await conn.rollback();

//         if (err.code === 'ER_DUP_ENTRY') {
//             return res.status(400).json({
//                 success: false,
//                 message: "Appointment ID already exists. Please send a unique appointment_id."
//             });
//         }

//         return res.status(500).json({
//             success: false,
//             message: "Database error while creating appointment"
//         });

//     } finally {

//         conn.release();

//     }

// };

exports.createAppointment = async (req, res) => {

    const { appointment_id, doctor_id, patient_id, company, appointment_date } = req.body;

    const conn = await pool.getConnection();

    try {

        await conn.beginTransaction();

        // 🔹 1. GET MAX PATIENT LIMIT FROM DoctorRoomMap
        const [slot] = await conn.query(
            `SELECT max_patients
             FROM DoctorRoomMap
             WHERE doctor_id = ?
             AND company = ?
             AND schedule_date = ?`,
            [doctor_id, company, appointment_date]
        );

        if (slot.length === 0) {
            throw new Error("Doctor schedule not found for this date");
        }

        const maxPatients = slot[0].max_patients;

        // 🔹 2. COUNT CURRENT APPOINTMENTS
        const [rows] = await conn.query(
            `SELECT COUNT(*) AS total
             FROM QueueTable
             WHERE doctor_id = ?
             AND company = ?
             AND appointment_date = ?`,
            [doctor_id, company, appointment_date]
        );

        const queue_no = rows[0].total + 1;

        // 🔹 3. CHECK MAX PATIENT LIMIT
        if (maxPatients !== null && queue_no > maxPatients) {
            throw new Error(`Maximum patient limit (${maxPatients}) reached for this doctor`);
        }

        // 🔹 4. INSERT APPOINTMENT
        await conn.query(
            `INSERT INTO QueueTable
             (appointment_id, doctor_id, patient_id, company, appointment_date, queue_no)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [appointment_id, doctor_id, patient_id, company, appointment_date, queue_no]
        );

        await conn.commit();

        res.json({
            success: true,
            message: "Appointment created successfully",
            data: {
                appointment_id,
                doctor_id,
                patient_id,
                company,
                appointment_date,
                queue_no
            }
        });

    } catch (err) {

        await conn.rollback();

        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Appointment ID already exists. Please send a unique appointment_id."
            });
        }

        return res.status(400).json({
            success: false,
            message: err.message || "Database error while creating appointment"
        });

    } finally {

        conn.release();

    }

};

exports.getQueueByAppointment = async (req, res) => {
    const { appointment_id, company } = req.params;

    try {

        const [rows] = await pool.query(
            `SELECT 
                appointment_id,
                doctor_id,
                patient_id,
                company,
                appointment_date,
                queue_no
             FROM QueueTable
             WHERE appointment_id = ? AND company = ?`,
            [appointment_id, company]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found for this clinic"
            });
        }

        return res.json({
            success: true,
            message: "Queue details fetched successfully",
            data: rows[0]
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Database error while fetching queue"
        });

    }
};


// Total patients

exports.getPatientCountByDoctorDate = async (req, res) => {
    const { doctor_id, company, appointment_date } = req.query;

    if (!doctor_id || !company || !appointment_date) {
        return res.status(400).json({
            success: false,
            message: "doctor_id, company and appointment_date are required"
        });
    }

    try {

        const [rows] = await pool.query(
            `SELECT COUNT(*) AS total_patients
             FROM QueueTable
             WHERE doctor_id = ?
             AND company = ?
             AND appointment_date = ?`,
            [doctor_id, company, appointment_date]
        );

        return res.json({
            success: true,
            message: "Patient count fetched successfully",
            data: {
                doctor_id,
                company,
                appointment_date,
                total_patients: rows[0].total_patients
            }
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Database error while fetching patient count"
        });

    }
};


// total patients for a clinic

exports.getTotalPatientsByCompanyDate = async (req, res) => {
    const { company, appointment_date } = req.query;

    if (!company || !appointment_date) {
        return res.status(400).json({
            success: false,
            message: "company and appointment_date are required"
        });
    }

    try {

        const [rows] = await pool.query(
            `SELECT COUNT(*) AS total_patients
             FROM QueueTable
             WHERE company = ?
             AND appointment_date = ?`,
            [company, appointment_date]
        );

        return res.json({
            success: true,
            message: "Total patients fetched successfully",
            data: {
                company,
                appointment_date,
                total_patients: rows[0].total_patients
            }
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Database error while fetching total patients"
        });

    }
};