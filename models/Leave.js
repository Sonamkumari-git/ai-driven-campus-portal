const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    // 1. Kisne Apply Kiya? (Identity)
    applicantId: { 
        type: String, 
        required: true 
    }, // Student ka ID ya Teacher/Staff ka ID
    applicantName: { 
        type: String, 
        required: true 
    },
    applicantRole: { 
        type: String, 
        required: true,
        // enum lagane se database me sirf inhi 3 logo ki leave save hogi
        enum: ['Student', 'Teacher', 'Staff', 'BCA (Sem 1)'] // Aap apne hisaab se classes/roles bhi add kar sakte ho
    }, 

    // 2. Chhutti Ki Details (Dates & Type)
    leaveType: { 
        type: String, 
        required: true 
    }, // e.g., 'Sick Leave', 'Casual Leave', 'Emergency'
    startDate: { 
        type: String, 
        required: true 
    }, // Kahan SE chhutti chahiye (YYYY-MM-DD)
    endDate: { 
        type: String, 
        required: true 
    },   // Kahan TAK chhutti chahiye (YYYY-MM-DD)
    totalDays: { 
        type: Number, 
        required: true 
    }, // Total kitne din ki chhutti hai

    // 3. Reason aur Medical Proof
    reason: { 
        type: String, 
        required: true 
    }, // Bimari ya kaam ka explanation
    documentUrl: { 
        type: String, 
        default: "" 
    }, // Medical slip / PDF ka Cloudinary link (PNG format me)

    // 4. HOD / Admin Ka Faisla (Approval/Rejection)
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Rejected'], 
        default: 'Pending' 
    }, // Shuru me hamesha Pending rahega
    hodRemark: { 
        type: String, 
        default: "" 
    } // HOD/Admin chhutti approve/reject karte time jo message likhega wo yahan aayega

}, { timestamps: true }); // timestamps: true se "Applied On" date automatically save ho jayegi (createdAt)

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave;
