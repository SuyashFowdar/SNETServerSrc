var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var sanitizeJson = require('mongoose-sanitize-json');

var loginSchema = new Schema({
	username: String,
	password: String,
	pass: String,
	user: String,
	count: { type: Number, default: 0 }
});

loginSchema.plugin(sanitizeJson);

module.exports = loginSchema;