
const pool = require('../config/db');

// for single doctor

// exports.createAvailable = async (req, res) => {
//     try {
//         const {
//             doctor_id,
//             company,
//             available_date,
//             start_time,
//             end_time,
//             created_by
//         } = req.body;

//         if (!doctor_id || !company || !available_date) {
//             return res.status(400).json({
//                 success: false,
//                 message: "doctor_id, company, available_date required"
//             });
//         }

//         let normalizedStart = start_time || null;
//         let normalizedEnd   = end_time   || null;

//         if (normalizedStart && normalizedEnd) {
//             if (normalizedStart >= normalizedEnd) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "end_time must be greater than start_time"
//                 });
//             }
//         }

//         // =========================================
//         // 🔴 CHECK UNAVAILABLE CONFLICT
//         // =========================================
//         let unavailableQuery = `
//             SELECT id FROM DoctorAvailability
//             WHERE doctor_id = ?
//             AND company = ?
//             AND unavailable_date = ?
//         `;

//         let unavailableParams = [doctor_id, company, available_date];

//         if (normalizedStart && normalizedEnd) {
//             unavailableQuery += `
//                 AND (
//                     start_time IS NULL OR
//                     (start_time < ? AND end_time > ?)
//                 )
//             `;
//             unavailableParams.push(normalizedEnd, normalizedStart);
//         }

//         const [unavailable] = await pool.query(unavailableQuery, unavailableParams);

//         if (unavailable.length > 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: "This doctor will be unavailable on this date"
//             });
//         }

//         // =========================================
//         // 🟢 CHECK EXISTING AVAILABLE (DUPLICATE / OVERLAP)
//         // =========================================

//         let availableQuery = `
//             SELECT id FROM DoctorAvailable
//             WHERE doctor_id = ?
//             AND company = ?
//             AND available_date = ?
//         `;

//         let availableParams = [doctor_id, company, available_date];

//         const [existing] = await pool.query(availableQuery, availableParams);

//         if (existing.length > 0) {

//             // CASE 1 → inserting full-day but time slots exist
//             if (!normalizedStart && !normalizedEnd) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Availability already exists for this doctor on this date"
//                 });
//             }

//             // CASE 2 → inserting time slot → check overlap
//             const [overlap] = await pool.query(`
//                 SELECT id FROM DoctorAvailable
//                 WHERE doctor_id = ?
//                 AND company = ?
//                 AND available_date = ?
//                 AND (
//                     start_time IS NULL OR
//                     (? < end_time AND ? > start_time)
//                 )
//             `, [
//                 doctor_id,
//                 company,
//                 available_date,
//                 normalizedStart,
//                 normalizedEnd
//             ]);

//             if (overlap.length > 0) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Already exists for this doctor in this time range"
//                 });
//             }
//         }

//         // =========================================
//         // ✅ INSERT
//         // =========================================
//         await pool.query(`
//             INSERT INTO DoctorAvailable
//             (doctor_id, company, available_date, start_time, end_time, created_by)
//             VALUES (?, ?, ?, ?, ?, ?)
//         `, [
//             doctor_id,
//             company,
//             available_date,
//             normalizedStart,
//             normalizedEnd,
//             created_by || null
//         ]);

//         res.json({
//             success: true,
//             message: normalizedStart
//                 ? "Doctor available for specific time"
//                 : "Doctor available for full day"
//         });

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// };



// for array of object
exports.createAvailable = async (req, res) => {
    try {
        let doctors = req.body;

        // If frontend sends a single object instead of an array, wrap it
        if (!Array.isArray(doctors)) {
            doctors = [doctors];
        }

        if (doctors.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No doctor data provided"
            });
        }

        const results = [];

        for (const doc of doctors) {
            const { doctor_id, company, available_date, start_time, end_time, created_by } = doc;

            if (!doctor_id || !company || !available_date) {
                results.push({
                    doctor_id: doctor_id || null,
                    available_date: available_date || null,
                    success: false,
                    message: "doctor_id, company, available_date required"
                });
                continue;
            }

            let normalizedStart = start_time || null;
            let normalizedEnd = end_time || null;

            // Time validation
            if (normalizedStart && normalizedEnd && normalizedStart >= normalizedEnd) {
                results.push({
                    doctor_id,
                    available_date,
                    success: false,
                    message: "end_time must be greater than start_time"
                });
                continue;
            }

            //  Check unavailable conflict
            let unavailableQuery = `
                SELECT id FROM DoctorAvailability
                WHERE doctor_id = ? AND company = ? AND unavailable_date = ?
            `;
            const unavailableParams = [doctor_id, company, available_date];

            if (normalizedStart && normalizedEnd) {
                unavailableQuery += `
                    AND (start_time IS NULL OR (start_time < ? AND end_time > ?))
                `;
                unavailableParams.push(normalizedEnd, normalizedStart);
            }

            const [unavailable] = await pool.query(unavailableQuery, unavailableParams);
            if (unavailable.length > 0) {
                results.push({
                    doctor_id,
                    available_date,
                    success: false,
                    message: "This doctor will be unavailable on this date"
                });
                continue;
            }

            //  Check existing availability
            const [existing] = await pool.query(
                `SELECT id FROM DoctorAvailable
                 WHERE doctor_id=? AND company=? AND available_date=?`,
                [doctor_id, company, available_date]
            );

            if (existing.length > 0) {
                // Full-day conflict
                if (!normalizedStart && !normalizedEnd) {
                    results.push({
                        doctor_id,
                        available_date,
                        success: false,
                        message: "Availability already exists for this doctor on this date"
                    });
                    continue;
                }

                // Time slot overlap
                const [overlap] = await pool.query(
                    `SELECT id FROM DoctorAvailable
                     WHERE doctor_id=? AND company=? AND available_date=?
                     AND (start_time IS NULL OR (? < end_time AND ? > start_time))`,
                    [doctor_id, company, available_date, normalizedStart, normalizedEnd]
                );

                if (overlap.length > 0) {
                    results.push({
                        doctor_id,
                        available_date,
                        success: false,
                        message: "Already exists for this doctor in this time range"
                    });
                    continue;
                }
            }

            //  Insert availability
            await pool.query(
                `INSERT INTO DoctorAvailable
                 (doctor_id, company, available_date, start_time, end_time, created_by)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [doctor_id, company, available_date, normalizedStart, normalizedEnd, created_by || null]
            );

            results.push({
                doctor_id,
                available_date,
                success: true,
                message: normalizedStart
                    ? "Doctor available for specific time"
                    : "Doctor available for full day"
            });
        }

        res.json({ success: true, results });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



// GET AVAILABLE (Date Required)
exports.getAvailable = async (req, res) => {
    try {
        const {
            doctor_id,
            company,
            date,
            start_time,
            end_time
        } = req.query;

        // ✅ Required fields
        if (!company || !date) {
            return res.status(400).json({
                success: false,
                message: "company and date are required"
            });
        }

        // If one time provided but not the other → error
        if ((start_time && !end_time) || (!start_time && end_time)) {
            return res.status(400).json({
                success: false,
                message: "Both start_time and end_time are required together"
            });
        }

        if (start_time && end_time && start_time >= end_time) {
            return res.status(400).json({
                success: false,
                message: "end_time must be greater than start_time"
            });
        }

        let query = `
            SELECT *
            FROM DoctorAvailable
            WHERE company = ?
            AND available_date = ?
        `;

        let params = [company, date];

        if (doctor_id) {
            query += ` AND doctor_id = ?`;
            params.push(doctor_id);
        }

        // ✅ If time range provided → check overlap
        if (start_time && end_time) {
            query += `
                AND (
                    -- Full day availability
                    start_time IS NULL
                    OR
                    -- Overlapping time slot
                    (? < end_time AND ? > start_time)
                )
            `;
            params.push(start_time, end_time);
        }

        query += ` ORDER BY start_time`;

        const [rows] = await pool.query(query, params);

        return res.json({
            success: true,
            count: rows.length,
            available_slots: rows
        });

    } catch (error) {
        console.error("GET AVAILABLE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};