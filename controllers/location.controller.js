const axios = require("axios");

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
console.log(GOOGLE_API_KEY);

//  1. AUTOCOMPLETE API
exports.getAutocomplete = async (req, res) => {
    try {
        const { input } = req.query;

        if (!input) {
            return res.status(400).json({
                success: false,
                message: "Input is required"
            });
        }

        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json`;

        const response = await axios.get(url, {
            params: {
                input,
                key: GOOGLE_API_KEY,
                components: "country:in"
            }
        });

        res.json({
            success: true,
            data: response.data.predictions
        });

    } catch (error) {
        console.error("Autocomplete Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Error fetching autocomplete"
        });
    }
};


// for raw data
// exports.getPlaceDetails = async (req, res) => {
//     try {
//         const { place_id } = req.query;

//         if (!place_id) {
//             return res.status(400).json({
//                 success: false,
//                 message: "place_id is required"
//             });
//         }

//         const url = `https://maps.googleapis.com/maps/api/place/details/json`;

//         const response = await axios.get(url, {
//             params: {
//                 place_id,
//                 key: GOOGLE_API_KEY
                
//             }
//         });

//         //  RETURN RAW GOOGLE RESPONSE
//         res.json(response.data);

//     } catch (error) {
//         console.error("Place Details Error:", error.message);
//         res.status(500).json({
//             success: false,
//             message: "Error fetching place details"
//         });
//     }
// };

// for manipulated data
// exports.getPlaceDetails = async (req, res) => {
//     try {
//         const { place_id } = req.query;

//         if (!place_id) {
//             return res.status(400).json({
//                 success: false,
//                 message: "place_id is required"
//             });
//         }

//         const url = `https://maps.googleapis.com/maps/api/place/details/json`;

//         const response = await axios.get(url, {
//             params: {
//                 place_id,
//                 key: GOOGLE_API_KEY,
//                 fields: "name,address_components,formatted_address,geometry"
//             }
//         });

//         const components = response.data.result.address_components;

//         let sublocalityParts = [];

//         let result = {
//             name: response.data.result.name || "",
//             postal_code: "",
//             sublocality: "",
//             city: "",
//             district: "",
//             division: "", 
//             state: "",
//             country: "",
//             formatted_address: response.data.result.formatted_address
//         };

//         components.forEach(comp => {
//             const types = comp.types;

//             if (types.includes("postal_code")) {
//                 result.postal_code = comp.long_name;
//             }

//             if (
//                 types.includes("sublocality") || 
//                 types.includes("sublocality_level_1") || 
//                 types.includes("sublocality_level_2")
//             ) {
//                 sublocalityParts.push(comp.long_name);
//             }

//             if (types.includes("locality")) {
//                 result.city = comp.long_name;
//             }

//             if (types.includes("administrative_area_level_3")) {
//                 result.district = comp.long_name;
//             } else if (
//                 types.includes("administrative_area_level_2") &&
//                 !comp.long_name.toLowerCase().includes("division")
//             ) {
//                 result.district = comp.long_name;
//             }

//             if (
//                 types.includes("administrative_area_level_2") && 
//                 comp.long_name.toLowerCase().includes("division")
//             ) {
//                 result.division = comp.long_name;
//             }

//             if (types.includes("administrative_area_level_1")) {
//                 result.state = comp.long_name;
//             }

//             if (types.includes("country")) {
//                 result.country = comp.long_name;
//             }
//         });

//         result.sublocality = sublocalityParts.join(", ");

//         res.json({
//             success: true,
//             data: result
//         });

//     } catch (error) {
//         console.error("Place Details Error:", error.message);
//         res.status(500).json({
//             success: false,
//             message: "Error fetching place details"
//         });
//     }
// };


exports.getPlaceDetails = async (req, res) => {
    try {
        const { place_id } = req.query;

        if (!place_id) {
            return res.status(400).json({
                success: false,
                message: "place_id is required"
            });
        }

        const url = `https://maps.googleapis.com/maps/api/place/details/json`;

        const response = await axios.get(url, {
            params: {
                place_id,
                key: GOOGLE_API_KEY,
                fields: "name,address_components,formatted_address,geometry"
            }
        });

        const components = response.data.result.address_components;

        let sublocalityParts = [];
        let level2 = ""; // fallback district
        let level3 = ""; // primary district

        let result = {
            name: response.data.result.name || "",
            address_line_2: "",
            postal_code: "",
            sublocality: "",
            city: "",
            district: "",
            division: "",
            state: "",
            country: "",
            formatted_address: response.data.result.formatted_address
        };

        components.forEach(comp => {
            const types = comp.types;
            const name = comp.long_name;

            if (types.includes("postal_code")) {
                result.postal_code = name;
            }

            if (
                types.includes("sublocality") ||
                types.includes("sublocality_level_1") ||
                types.includes("sublocality_level_2")
            ) {
                sublocalityParts.push(name);
            }

            if (types.includes("locality")) {
                result.city = name;
            }

            //  Capture both levels
            if (types.includes("administrative_area_level_3")) {
                level3 = name;
            }

            if (types.includes("administrative_area_level_2")) {
                level2 = name;
            }

            // division (if exists)
            if (
                types.includes("administrative_area_level_2") &&
                name.toLowerCase().includes("division")
            ) {
                result.division = name;
            }

            if (types.includes("administrative_area_level_1")) {
                result.state = name;
            }

            if (types.includes("country")) {
                result.country = name;
            }
        });

        result.sublocality = sublocalityParts.join(", ");

        //  PRIORITY: level_3 → fallback level_2
        result.district = level3 || level2;

        //  FIX: Remove Bangladesh "Upazila" if India
        if (
            result.country === "India" &&
            result.district &&
            result.district.toLowerCase().includes("upazila")
        ) {
            result.district = level2 || "";
        }

        //  BUILD address_line_2 (clean)
        const line2Parts = [];

        if (result.sublocality) {
            line2Parts.push(result.sublocality);
        }

        if (result.city && result.city !== result.sublocality) {
            line2Parts.push(result.city);
        }

        result.address_line_2 = line2Parts.join(", ");

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error("Place Details Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Error fetching place details"
        });
    }
};


// for lan and lat
// exports.getPlaceDetails = async (req, res) => {
//     try {
//         const { place_id } = req.query;

//         if (!place_id) {
//             return res.status(400).json({ success: false, message: "place_id is required" });
//         }

//         const url = `https://maps.googleapis.com/maps/api/place/details/json`;
//         const response = await axios.get(url, {
//             params: {
//                 place_id,
//                 key: GOOGLE_API_KEY,
//                 fields: "address_components,formatted_address,geometry"
//             }
//         });

//         const resultData = response.data.result;
//         if (!resultData) throw new Error("No results found for this Place ID");

//         const components = resultData.address_components;
//         const location = resultData.geometry.location;

//         let sublocalityParts = [];
//         let result = {
//             postal_code: "",
//             sublocality: "",
//             city: "",
//             district: "",
//             division: "", 
//             state: "",
//             country: "",
//             latitude: location.lat,
//             longitude: location.lng,
//             formatted_address: resultData.formatted_address
//         };

//         // Standard extraction loop
//         components.forEach(comp => {
//             const types = comp.types;
//             if (types.includes("postal_code")) result.postal_code = comp.long_name;
//             if (types.includes("sublocality") || types.includes("sublocality_level_1") || types.includes("sublocality_level_2")) {
//                 if (!sublocalityParts.includes(comp.long_name)) sublocalityParts.push(comp.long_name);
//             }
//             if (types.includes("locality")) result.city = comp.long_name;
//             if (types.includes("administrative_area_level_3")) result.district = comp.long_name;
//             else if (types.includes("administrative_area_level_2") && !comp.long_name.toLowerCase().includes("division")) {
//                 result.district = comp.long_name;
//             }
//             if (types.includes("administrative_area_level_2") && comp.long_name.toLowerCase().includes("division")) {
//                 result.division = comp.long_name;
//             }
//             if (types.includes("administrative_area_level_1")) result.state = comp.long_name;
//             if (types.includes("country")) result.country = comp.long_name;
//         });

//         // --- IMPROVED FALLBACK ---
//         if (!result.postal_code) {
//             // Step 1: Try Regex on the formatted_address (fastest)
//             // This looks for a 6-digit Indian PIN code pattern
//             const pinMatch = result.formatted_address.match(/\b\d{6}\b/);
//             if (pinMatch) {
//                 result.postal_code = pinMatch[0];
//             } else {
//                 // Step 2: Call Reverse Geocoding API if regex failed
//                 const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json`;
//                 const geoResponse = await axios.get(geoUrl, {
//                     params: { latlng: `${location.lat},${location.lng}`, key: GOOGLE_API_KEY }
//                 });

//                 if (geoResponse.data.results) {
//                     for (let geoResult of geoResponse.data.results) {
//                         const zipComp = geoResult.address_components.find(c => c.types.includes("postal_code"));
//                         if (zipComp) {
//                             result.postal_code = zipComp.long_name;
//                             break;
//                         }
//                     }
//                 }
//             }
//         }

//         result.sublocality = sublocalityParts.join(", ");
//         res.json({ success: true, data: result });

//     } catch (error) {
//         console.error("Place Details Error:", error.message);
//         res.status(500).json({ success: false, message: "Error fetching place details" });
//     }
// };