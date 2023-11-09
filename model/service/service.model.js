var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var sanitizeJson = require('mongoose-sanitize-json');

var serviceObject = {
	name: String,
	code: String,
	tabs: [{
		title: String,
		contents: [{
			title: String,
			cols: [{
				contentType: String,
				content: String
			}],
			border: Boolean
		}]
	}]
};

var serviceSchema = new Schema(serviceObject);

serviceSchema.plugin(sanitizeJson);

module.exports = {
	schema: serviceSchema,
	object: serviceObject
};