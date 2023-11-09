var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var sanitizeJson = require('mongoose-sanitize-json');

var ideaSchema = require('../idea/idea.model');

var UserId = {
	type: Schema.Types.ObjectId,
	ref: 'UserSchema'
}

var SubjectId = {
	type: Schema.Types.ObjectId,
	ref: 'SubjectSchema'
}

var timeTableDay = {
	day: String,
	date: String,
	periods: [{
		which: Number,
		by: UserId,
		subjects: [{
			details: SubjectId,
			by: UserId
		}],
		paper: String,
		startTime: String,
		endTime: String
	}]
}

var classSchema = {
	name: String,
	code: String,
	students: [UserId],
	coordinators: [UserId],
	representatives: [UserId],
	subjects: [{
		subject: SubjectId,
		periodsPerWeek: Number,
		homeworks: [{
			book: String,
			details: String,
			file: { id: String, content_type: String },
			dueDate: String,
			by: UserId
		}],
		subjectNotes: [{
			file: String,
			text: String
		}]
	}],
	ideas: [ideaSchema],
	weeklyTimetable: [timeTableDay],
	examTimetable: [timeTableDay]
};

var schoolObject = require('../service/service.model').object;

schoolObject.periodTimes = [{
	start: { hours: Number, minutes: Number },
	end: { hours: Number, minutes: Number }
}]
schoolObject.classes = [classSchema];
schoolObject.teachers = [UserId];
schoolObject.schoolAdmins = [UserId];

var schoolSchema = new Schema(schoolObject);

schoolSchema.plugin(sanitizeJson);

module.exports = schoolSchema;