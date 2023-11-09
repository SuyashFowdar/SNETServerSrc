var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var sanitizeJson = require('mongoose-sanitize-json');

var schoolVarSchema = new Schema({
	semesterStartDate: {
		one: String,
		two: String,
		three: String
	}
});

schoolVarSchema.plugin(sanitizeJson);

module.exports = schoolVarSchema;