const twilio = require("twilio");
require("dotenv").config();

const client = twilio(
    process.env.TWILIO_SID,
    process.env.TWILIO_AUTH_TOKEN
);

exports.sendPrescriptionWhatsapp = async (
    phone,
    patientName,
    referenceId, 
    token, 
    fileType = "prescription",
    companyName = "Automed AI" // Fallback name
) => {
    let templateSid;
    let variables;

    if (fileType === "report") {
        // NEW REPORT TEMPLATE: {{1}}=Name, {{2}}=ID, {{3}}=Company, {{4}}=Token
        templateSid = process.env.TWILIO_REPORT_TEMPLATE_SID;
        variables = {
            1: patientName,
            2: referenceId,
            3: companyName, 
            4: token
        };
    } else {
        // OLD PRESCRIPTION TEMPLATE: {{1}}=Name, {{2}}=ID, {{3}}=LinkPath
        templateSid = process.env.TWILIO_TEMPLATE_SID;
        variables = {
            1: patientName,
            2: referenceId,
            3: token // For prescription, this is usually /prescription/token
        };
    }

    return await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${phone}`,
        contentSid: templateSid,
        contentVariables: JSON.stringify(variables),
        statusCallback: 'https://midl.automedai.in/whatsapp/status'
    });
};