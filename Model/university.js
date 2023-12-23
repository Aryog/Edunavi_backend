const mongoose = require('mongoose')
const universitySchema = mongoose.Schema({
    org_name: {
        type: String,
        required: true
    },
    org_uname: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (value) {
                return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
            },
            message: 'Organization username must be string without spaces'
        }
    },
    org_location: {
        type: String
    },
    org_links: {
        type: [String]
    },
    org_file_path: {
        type: [String]
    },
    org_isArchived: {
        type: Boolean,
        default: false
    }
});
module.exports = mongoose.model('university', universitySchema);