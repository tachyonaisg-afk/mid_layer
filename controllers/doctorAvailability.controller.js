const pool = require('../config/db');


// CREATE doctor unavailable slot



exports.addUnavailable = async (req, res) => {
    const {
        doctor_id,
        company,
        start_date,
        end_date,     
        start_time,
        end_time,
        reason,
        user_id
    } = req.body;

    if (!doctor_id || !company || !start_date) {
        return res.status(400).json({
            success: false,
            message: "doctor_id, company and start_date required"
        });
    }

    const finalEndDate = end_date || start_date;

    if (new Date(start_date) > new Date(finalEndDate)) {
        return res.status(400).json({
            success: false,
            message: "Start date cannot be after end date"
        });
    }

    if (start_time && end_time && start_time >= end_time) {
        return res.status(400).json({
            success: false,
            message: "End time must be greater than start time"
        });
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    try {
        let current = new Date(start_date);
        const end = new Date(finalEndDate);
        const values = [];

        while (current <= end) {
            const dateStr = current.toISOString().slice(0, 10); // YYYY-MM-DD

            const slotStartTime = start_time || "00:00:00";
            const slotEndTime = end_time || "23:59:59";

            const [sh, sm, ss] = slotStartTime.split(":").map(Number);
            const [eh, em, es] = slotEndTime.split(":").map(Number);

            const slotStart = new Date(dateStr);
            slotStart.setHours(sh, sm, ss || 0);

            const slotEnd = new Date(dateStr);
            slotEnd.setHours(eh, em, es || 0);

            // Skip entire past dates
            if (new Date(dateStr) < new Date(todayStr)) {
                current.setDate(current.getDate() + 1);
                continue;
            }

            // Only block past time for today if start_time provided
            if (dateStr === todayStr && start_time && slotStart <= now) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot add unavailable slot in past time on ${dateStr} at ${slotStartTime}`
                });
            }

            values.push([
                doctor_id,
                company,
                dateStr,
                slotStartTime,
                slotEndTime,
                reason || null,
                user_id || null
            ]);

            current.setDate(current.getDate() + 1);
        }

        if (values.length === 0) {
            return res.status(400).json({
                success: false,
                message: "All slots are in the past and cannot be added"
            });
        }

        const [result] = await pool.query(
            `INSERT IGNORE INTO DoctorAvailability
             (doctor_id, company, unavailable_date, start_time, end_time, reason, created_by)
             VALUES ?`,
            [values]
        );

        if (result.affectedRows === 0) {
            return res.json({
                success: false,
                message: "These unavailable dates already assigned"
            });
        }

        res.json({
            success: true,
            message: "Doctor unavailable dates added successfully"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
// GET doctor availability for date

exports.getDoctorAvailability = async (req, res) => {
    try {
        const { doctor_id, company, date, start_time, end_time } = req.query;

        if (!doctor_id || !company) {
            return res.status(400).json({
                success: false,
                message: "doctor_id and company are required"
            });
        }

        // Base query
        let query = `
            SELECT *
            FROM DoctorAvailability
            WHERE doctor_id = ?
            AND company = ?
        `;

        let params = [doctor_id, company];

        // Case 2 → filter by date
        if (date) {
            query += ` AND unavailable_date = ?`;
            params.push(date);
        }

        // Case 3 → filter by time range also
        if (start_time && end_time) {
            query += `
                AND (
                    (start_time <= ? AND end_time > ?) OR
                    (start_time < ? AND end_time >= ?) OR
                    (start_time >= ? AND end_time <= ?)
                )
            `;
            params.push(end_time, start_time, end_time, start_time, start_time, end_time);
        }

        query += ` ORDER BY unavailable_date, start_time`;

        const [rows] = await pool.query(query, params);

        return res.json({
            success: true,
            count: rows.length,
            unavailable_slots: rows
        });

    } catch (error) {
        console.error("Doctor availability error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// DELETE unavailable slot
exports.deleteUnavailable = async (req,res)=>{
    const { id } = req.params;
    const { company } = req.query;   // or req.body

    if(!company){
        return res.status(400).json({
            success:false,
            message:"company is required"
        });
    }

    const [result] = await pool.query(
        `DELETE FROM DoctorAvailability 
         WHERE id=? AND company=?`,
        [id, company]
    );

    if(result.affectedRows === 0){
        return res.status(404).json({
            success:false,
            message:"Slot not found for this company"
        });
    }

    res.json({
        success:true,
        message:"Slot removed successfully"
    });
};


// for update
exports.updateUnavailable = async (req, res) => {
    try {
        const {
            id,
            doctor_id,
            company,
            start_date,
            end_date,
            start_time,
            end_time,
            reason,
            user_id
        } = req.body;

        if (!doctor_id || !company) {
            return res.status(400).json({
                success: false,
                message: "doctor_id and company are required"
            });
        }

        const now = new Date();
        const todayStr = new Date().toISOString().slice(0, 10);

        // CASE 1 → UPDATE SINGLE RECORD BY ID
        if (id) {

            const normalizedStart = start_time || "00:00:00";
            const normalizedEnd   = end_time   || "23:59:59";

            if (normalizedStart >= normalizedEnd) {
                return res.status(400).json({
                    success: false,
                    message: "End time must be greater than start time"
                });
            }

            const [rows] = await pool.query(
                `SELECT DATE_FORMAT(unavailable_date,'%Y-%m-%d') AS unavailable_date
                 FROM DoctorAvailability
                 WHERE id=? AND doctor_id=? AND company=?`,
                [id, doctor_id, company]
            );

            //  If ID not found
            if (!rows.length) {
                return res.status(404).json({
                    success: false,
                    message: "No unavailable slot found for this id"
                });
            }

            const recordDateStr = rows[0].unavailable_date;

            //  Block past date
            if (recordDateStr < todayStr) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot update past unavailable date"
                });
            }

            // Block past time (if today)
            if (recordDateStr === todayStr) {
                const slotStart = new Date(`${recordDateStr}T${normalizedStart}`);
                if (slotStart <= now) {
                    return res.status(400).json({
                        success: false,
                        message: "Cannot update past time slot for today"
                    });
                }
            }

            await pool.query(
                `UPDATE DoctorAvailability
                 SET start_time=?,
                     end_time=?,
                     reason=?,
                     updated_by=?,
                     updated_at=NOW()
                 WHERE id=? AND doctor_id=? AND company=?`,
                [
                    normalizedStart,
                    normalizedEnd,
                    reason || null,
                    user_id || null,
                    id,
                    doctor_id,
                    company
                ]
            );

            return res.json({
                success: true,
                message: "Unavailable slot updated successfully"
            });
        }

//  CASE 2 → RANGE FULL REPLACEMENT LOGIC (CORRECT)


if (!start_date || !end_date) {
    return res.status(400).json({
        success: false,
        message: "Provide id OR start_date & end_date"
    });
}

if (start_date > end_date) {
    return res.status(400).json({
        success: false,
        message: "start_date cannot be after end_date"
    });
}

const normalizedStart = start_time || "00:00:00";
const normalizedEnd   = end_time   || "23:59:59";

if (normalizedStart >= normalizedEnd) {
    return res.status(400).json({
        success: false,
        message: "End time must be greater than start time"
    });
}

if (start_date < todayStr) {
    return res.status(400).json({
        success: false,
        message: "Cannot create/update unavailable slot for past dates"
    });
}

//  STEP 1 → DELETE ALL FUTURE SLOTS FOR THIS DOCTOR
await pool.query(
    `DELETE FROM DoctorAvailability
     WHERE doctor_id=? AND company=? 
     AND unavailable_date >= ?`,
    [doctor_id, company, todayStr]   
);

//  STEP 2 → INSERT NEW RANGE
let current = new Date(start_date);
const end   = new Date(end_date);
const values = [];

while (current <= end) {

    const dateStr = current.toISOString().slice(0, 10);

    //  Block past time for today
    if (dateStr === todayStr) {
        const slotStart = new Date(`${dateStr}T${normalizedStart}`);
        if (slotStart <= now) {
            return res.status(400).json({
                success: false,
                message: `Cannot create/update past time slot for today (${normalizedStart})`
            });
        }
    }

    values.push([
        doctor_id,
        company,
        dateStr,
        normalizedStart,
        normalizedEnd,
        reason || null,
        user_id || null
    ]);

    current.setDate(current.getDate() + 1);
}

if (!values.length) {
    return res.status(400).json({
        success: false,
        message: "No valid dates to insert"
    });
}

await pool.query(`
    INSERT INTO DoctorAvailability
    (doctor_id, company, unavailable_date, start_time, end_time, reason, updated_by)
    VALUES ?
`, [values]);

return res.json({
    success: true,
    message: "Doctor unavailable slots replaced successfully"
});

    } catch (error) {
        console.error("UPDATE UNAVAILABLE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};