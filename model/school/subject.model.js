var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var sanitizeJson = require('mongoose-sanitize-json');

var ideaSchema = require('../idea/idea.model');

var subjectSchema = new Schema({
	name: String,
	papers: [{
		name: String,
		url: String
	}],
	notes: [{
		name: String,
		description: String,
		file: { id: String, content_type: String },
		givenBy: String,
		viewableBy: [String]
	}]
});

subjectSchema.plugin(sanitizeJson);

module.exports = subjectSchema;