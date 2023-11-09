var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var sanitizeJson = require('mongoose-sanitize-json');

var powerSchema = new Schema({
	username: String
});

powerSchema.plugin(sanitizeJson);

module.exports = powerSchema;