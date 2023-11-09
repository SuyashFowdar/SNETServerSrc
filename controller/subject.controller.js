module.exports = {
	getClass: getClass,
	saveNotes: saveNotes,
	deleteNotes: deleteNotes
};

function getClass(req, res) {
	var mrq = require('mongoose-rest-query'),
		config = require('../app.config'),
		utils = require('../app.utils'),
		obj = {},
		async = require('async');

	async.waterfall([getUser, getSchool, getSubject, castSubject], function(error, subject) {
		if (subject) {
			res.status(200).send(subject);
		} else {
			utils.sendError(res, error);
		}

	})

	function getUser(callback) {
		var jwt = require('jwt-simple'),
			UserModel = mrq.model(req, 'UserSchema');

		obj.payload = jwt.decode(req.headers['x-auth-token'], config.secretKey);
		UserModel.findById(obj.payload.userId)
			.select('userType school studentDetails.class teacherDetails.classes newNotifications oldNotifications')
			.exec(function(err, user) {
				if (user) {
					obj.userModel = user;
					obj.user = JSON.parse(JSON.stringify(user));
					callback(null, obj);
				} else {
					utils.sendError(res, err)
				}
			})
	}

	function getSchool(obj, callback) {
		var SchoolModel = mrq.model(req, 'SchoolSchema'),
			classIds;

		if (obj.user.userType === 'student') {
			classIds = obj.user.studentDetails.class;
		} else {
			classIds = { $in: obj.user.teacherDetails.classes };
		}
		SchoolModel.findOne({ _id: obj.user.school }, { classes: { $elemMatch: { _id: classIds }, multi: true } })
			.select('classes.name classes.subjects.homeworks classes.subjects.subject classes.weeklyTimetable classes._id')
			.exec(function(err, school) {
				if (!school) {
					utils.sendError(res, err);
				} else {
					obj.classes = JSON.parse(JSON.stringify(school.classes));
					callback(null, obj);
				}
			})
	}

	function getSubject(obj, callback) {
		var SubjectModel = mrq.model(req, 'SubjectSchema');

		SubjectModel.findById(req.params.id)
			.select('name notes')
			.exec(function(err, subject) {
				if (subject) {
					obj.subject = JSON.parse(JSON.stringify(subject));
					callback(null, obj);
				} else {
					utils.sendError(res, err);
				}
			})
	}

	function castSubject(obj, callback) {
		var day, classSubject, homeworkDueDate,
			moment = require('moment');
		if (obj.user.userType === 'student') {
			clearNotifs();
			generateStudentSubjectTimetable();
			generateStudentSubjectHomeworkList();
			generateStudentNotes();
		} else {
			generateTeacherSubjectTimetable();
			generateTeacherNotes();
		}
		callback(null, obj.subject);

		function generateStudentSubjectTimetable() {
			obj.subject.week = {};
			for (var i = 0; i < obj.classes[0].weeklyTimetable.length; i++) {
				day = obj.classes[0].weeklyTimetable[i];
				for (var j = 0; j < day.periods.length; j++) {
					if (checkSubject(day.periods[j].subjects)) {
						if (obj.subject.week[day.day]) {
							obj.subject.week[day.day].push({ which: day.periods[j].which });
						} else {
							obj.subject.week[day.day] = [{ which: day.periods[j].which }];
						}
					}
				}
			}
		}

		function clearNotifs() {
			for (var i = 0; i < obj.userModel.newNotifications.length; i++) {
				if (obj.userModel.newNotifications[i].url === JSON.stringify({ name: 'subject', params: { id: req.params.id } })) {
					obj.userModel.oldNotifications.unshift(obj.userModel.newNotifications[i]);
					obj.userModel.newNotifications.splice(i, 1);
				}
			}
			obj.userModel.save();
		}

		function generateStudentSubjectHomeworkList() {
			obj.subject.homeworks = [];
			for (var i = 0; i < obj.classes[0].subjects.length; i++) {
				classSubject = obj.classes[0].subjects[i];
				if (classSubject.subject == req.params.id) {
					for (var j = 0; j < classSubject.homeworks.length; j++) {
						homeworkDueDate = new Date(classSubject.homeworks[j].dueDate);
						if (moment().isBefore(homeworkDueDate)) {
							classSubject.homeworks[j].dueDay = homeworkDueDate.getDay();
							classSubject.homeworks[j].dueDay = config.weekDays[classSubject.homeworks[j].dueDay - 1];
							obj.subject.homeworks.push(classSubject.homeworks[j]);
						}

					}
				}
			}
		}

		function generateTeacherSubjectTimetable() {
			obj.subject.week = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] };
			weekDays = config.weekDays;
			for (var k = 0; k < obj.classes.length; k++) {
				for (var i = 0; i < obj.classes[k].weeklyTimetable.length; i++) {
					dayFromTimetable = obj.classes[k].weeklyTimetable[i];
					for (var j = 0; j < dayFromTimetable.periods.length; j++) {
						if (checkSubject(dayFromTimetable.periods[j].subjects)) {
							addSubject(dayFromTimetable.day, dayFromTimetable.periods[j].which, obj.classes[k].name)
						}
					}
				}
			}

			for (var i = 0; i < weekDays.length; i++) {
				utils.sortArray(obj.subject.week[weekDays[i]], 'which');
			}
		}

		function generateTeacherNotes() {
			for (var i = 0; i < obj.subject.notes.length; i++) {
				if (obj.subject.notes[i].givenBy != obj.payload.userId) {
					obj.subject.notes.splice(i, 1);
				}
			}
		}

		function generateStudentNotes() {
			var notes, viewable;
			for (var i = 0; i < obj.subject.notes.length; i++) {
				notes = obj.subject.notes[i];
				viewable = false;
				for (var j = 0; j < notes.viewableBy.length; j++) {
					if (notes.viewableBy[j] === obj.classes[0].name) {
						viewable = true;
					}
				}
				if (!viewable) {
					obj.subject.notes.splice(i, 1);
				}
			}
		}

		function checkSubject(subjectList) {
			for (var i = 0; i < subjectList.length; i++) {
				if (obj.subject.id == subjectList[i].details) {
					return true;
				}
			}
		}

		function addSubject(day, whichPeriod, className) {
			for (var i = 0; i < weekDays.length; i++) {
				if (weekDays[i] === day) {
					obj.subject.week[day].push({ which: whichPeriod, className: className });
				}
			}
		}
	}

}

function saveNotes(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		utils = require('../app.utils'),
		secretKey = require('../app.config').secretKey,
		UserModel = mrq.model(req, 'UserSchema'),
		SubjectModel = mrq.model(req, 'SubjectSchema'),
		socketCtrl = require('./socket.controller'),
		payload = jwt.decode(req.headers['x-auth-token'], secretKey),
		notif = {
			user: payload.userId,
			url: JSON.stringify({ name: 'subject', params: { id: req.params.subjectId } }),
			special: 'updated',
			notifType: 'subjectNotes'
		};

	UserModel.findById(payload.userId)
		.select('school')
		.populate({
			path: 'school',
			select: { classes: { $elemMatch: { name: req.body.viewableBy[0] }, multi: true }, 'classes.students': 1 }
		})
		.exec(function(err, user) {
			if (!user) {
				res.status(500).send(err || 'User not found!');
			} else {
				if (req.body._id) {
					SubjectModel.update({ _id: req.params.subjectId, 'notes._id': req.body._id }, { $set: { 'notes.$': req.body } }).exec(function(err, subject) {
						socketCtrl.addNotif(user.school.classes[0].students, UserModel, notif, { name: user.name, myImage: user.myImage })
						res.send(subject);
					})
				} else {
					req.body.givenBy = payload.userId;
					SubjectModel.findOneAndUpdate({ _id: req.params.subjectId }, { $push: { notes: req.body } }).exec(function(err, subject) {
						res.send({ _id: subject.notes[subject.notes.length - 1]._id });
					})
				}
			}
		})
}

function deleteNotes(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		utils = require('../app.utils'),
		secretKey = require('../app.config').secretKey,
		SubjectModel = mrq.model(req, 'SubjectSchema'),
		payload = jwt.decode(req.headers['x-auth-token'], secretKey);

	SubjectModel.update({ _id: req.params.subjectId }, { $pull: { notes: { _id: req.params.id } } }).exec(function(err, subject) {
		res.send(subject);
	})
}