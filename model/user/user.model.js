var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var sanitizeJson = require('mongoose-sanitize-json');

var ideaSchema = require('../idea/idea.model');

var userModel = {
    type: Schema.Types.ObjectId,
    ref: 'UserSchema'
}

var messageId = {
    type: Schema.Types.ObjectId,
    ref: 'MessageSchema'
}

var notif = {
    notifType: {
        type: String,
        enum: ['friend', 'idea', 'points', 'notes', 'relives', 'homework', 'subjectNotes']
    },
    users: [userModel],
    user: userModel,
    others: Number,
    url: String,
    urlQuery: String,
    special: String
}

var settingsType = {
    type: String,
    enum: ['friends', 'everyone', 'me'],
    default: 'everyone'
}

var userSchema = new Schema({
    dummyArray: [{
        dummy: String
    }],
    name: String,
    myImage: String,
    accountInitiated: {
        type: Boolean,
        default: false
    },
    ideaOfTheDay: String,
    specialLogin: String,
    ideas: [ideaSchema],
    userType: {
        type: String,
        enum: ['student', 'teacher', 'schoolAdmin', 'other']
    },
    info: {
        DOB: String,
        address: String,
        male: Boolean,
        phone: {
            home: Number,
            mobile: Number
        }
    },
    studentDetails: {
        class: String,
        subjects: [{
            type: Schema.Types.ObjectId,
            ref: 'SubjectSchema'
        }],
        responsibleParties: [{
            name: String,
            phone: {
                office: Number,
                mobile: Number
            },
            relation: String
        }],
        performances: [{
            year: Number,
            semester: Number,
            subject: String,
            mark: Number,
            remark: String
        }],
        feePayment: [{
            year: Number
        }]
    },
    teacherDetails: {
        subjects: [{
            type: Schema.Types.ObjectId,
            ref: 'SubjectSchema'
        }],
        classes: [String],
        salaryPayment: [{
            month: Number,
            year: Number
        }]
    },
    school: {
        type: Schema.Types.ObjectId,
        ref: 'SchoolSchema'
    },
    friends: [{
        friend: userModel,
        interactions: {
            ideas: Number,
            notes: Number,
            aPluses: Number,
            reLives: Number
        }
    }],
    settings: {
        ideas: settingsType,
        details: settingsType,
        friendList: settingsType,
        shareOnMyPage: settingsType,
        allowFind: {
            type: Boolean,
            default: true
        }
    },
    attendances: [{
        date: String
    }],
    requestedFriends: [userModel],
    oldNotifications: [notif],
    newNotifications: [notif],
    oldMessages: [messageId],
    newMessages: [messageId]
});

userSchema.plugin(sanitizeJson);

module.exports = userSchema;