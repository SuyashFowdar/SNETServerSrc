var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var sanitizeJson = require('mongoose-sanitize-json');

var userLink = {
    type: Schema.Types.ObjectId,
    ref: 'UserSchema'
}

var whatDetails = {
    text: String,
    files: [{ id: String, content_type: String }],
    link: String
}

var ideaSchema = new Schema({
    who: userLink,
    what: whatDetails,
    viewable: {
        by: {
            type: String,
            enum: ['me', 'friends', 'everyone', 'specified']
        },
        specifiedCan: [String],
        specifiedCannot: [String]
    },
    points: [{
        who: userLink
    }],
    notes: [{
        who: userLink,
        what: whatDetails,
        points: [{
            who: userLink
        }]
    }],
    reLives: [{
        where: {
            idea: {
                type: Schema.Types.ObjectId,
                ref: 'IdeaSchema'
            },
            placeType: {
                type: String,
                enum: ['mypage', 'class']
            },
            classId: String
        }
    }]
}, {
    timestamps: true
});

ideaSchema.plugin(sanitizeJson);

module.exports = ideaSchema;