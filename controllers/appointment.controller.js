const pool = require('../config/db');

exports.createAppointment = async (req, res) => {
    const { appointment_id, doctor_id, patient_id, appointment_date } = req.body;

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            `SELECT COUNT(*) AS total
             FROM QueueTable
             WHERE doctor_id = ? AND appointment_date = ?`,
            [doctor_id, appointment_date]
        );

        const queue_no = rows[0].total + 1;

        await conn.query(
            `INSERT INTO QueueTable
             (appointment_id, doctor_id, patient_id, appointment_date, queue_no)
             VALUES (?, ?, ?, ?, ?)`,
            [appointment_id, doctor_id, patient_id, appointment_date, queue_no]
        );

        await conn.commit();

        res.json({
    success: true,
    message: "Appointment created successfully",
    data: {
        appointment_id,
        doctor_id,
        patient_id,
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

        return res.status(500).json({
            success: false,
            message: "Database error while creating appointment"
        });
    } finally {
        conn.release();
    }
};




exports.getQueueByAppointment = async (req, res) => {
    const { appointment_id } = req.params;

    try {
        const [rows] = await pool.query(
            `SELECT appointment_id, doctor_id, patient_id, appointment_date, queue_no
             FROM QueueTable
             WHERE appointment_id = ?`,
            [appointment_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found"
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
