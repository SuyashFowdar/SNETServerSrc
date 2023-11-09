var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var sanitizeJson = require('mongoose-sanitize-json');

var UserId = {
	type: Schema.Types.ObjectId,
	ref: 'UserSchema'
}

var messageSchema = new Schema({
	recipients: [UserId],
	sender: UserId,
	subject: String,
	text: String,
	files: [{ id: String, content_type: String }],
	showToSender: { type: Boolean, default: true }
});

messageSchema.plugin(sanitizeJson);

module.exports = messageSchema;