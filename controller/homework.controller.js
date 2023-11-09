module.exports = {
	add: add,
	update: update,
	remove: remove
};

var utils = require('../app.utils');

function add(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		UserModel = mrq.model(req, 'UserSchema'),
		payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

	UserModel.findById(payload.userId)
		.select('name myImage school')
		.populate({
			path: 'school',
			select: {
				classes: { $elemMatch: { _id: req.params.classId } },
				'classes.subjects': 1,
				'classes.students': 1
			}
		})
		.exec(function(err, user) {
			var subject, subjectIndex, notif,
				userClass = user.school.classes[0],
				socketCtrl = require('./socket.controller');
			for (var i = 0; i < userClass.subjects.length; i++) {
				subject = userClass.subjects[i];
				if (subject.subject == req.params.subjectId) {
					subjectIndex = i;
					subject.homeworks.push(req.body);
					break;
				}
			}
			notif = {
				url: JSON.stringify({ name: 'subject', params: { id: req.params.subjectId } }),
				notifType: 'homework',
				user: payload.userId,
				special: 'added'
			}
			socketCtrl.addNotif(userClass.students, UserModel, notif, { name: user.name, myImage: user.myImage });
			user.school.save(function(err, school) {
				if (!school) {
					utils.sendError(res, err);
				} else {
					res.status(200).send({ id: subject.homeworks[subject.homeworks.length - 1].id })
				}
			})
		})
}

function update(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		UserModel = mrq.model(req, 'UserSchema'),
		payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

	UserModel.findById(payload.userId)
		.select('name myImage school')
		.populate({
			path: 'school',
			select: {
				classes: { $elemMatch: { _id: req.params.classId } },
				'classes.subjects': 1,
				'classes.students': 1
			}
		})
		.exec(function(err, user) {
			var subject, subjectIndex, notif,
				userClass = user.school.classes[0],
				socketCtrl = require('./socket.controller');
			for (var i = 0; i < userClass.subjects.length; i++) {
				subject = userClass.subjects[i];
				if (subject.subject == req.params.subjectId) {
					for (var j = 0; j < subject.homeworks.length; j++) {
						if (subject.homeworks[j].id == req.params.homeworkId) {
							subject.homeworks[j] = req.body;
							break;
						}
					}
					break;
				}
			}
			notif = {
				url: JSON.stringify({ name: 'subject', params: { id: req.params.subjectId } }),
				notifType: 'homework',
				user: payload.userId,
				special: 'updated'
			}
			socketCtrl.addNotif(userClass.students, UserModel, notif, { name: user.name, myImage: user.myImage });
			user.school.save(function(err, school) {
				if (!school) {
					utils.sendError(res, err);
				} else {
					res.status(200).send({ id: subject.homeworks[subject.homeworks.length - 1].id })
				}
			})
		})
}

function remove(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		UserModel = mrq.model(req, 'UserSchema'),
		payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

	UserModel.findById(payload.userId)
		.select('name myImage school')
		.populate({
			path: 'school',
			select: {
				classes: { $elemMatch: { _id: req.params.classId } },
				'classes.subjects': 1,
				'classes.students': 1
			}
		})
		.exec(function(err, user) {
			var subject, subjectIndex, notif,
				userClass = user.school.classes[0],
				socketCtrl = require('./socket.controller');
			for (var i = 0; i < userClass.subjects.length; i++) {
				subject = userClass.subjects[i];
				if (subject.subject == req.params.subjectId) {
					for (var j = 0; j < subject.homeworks.length; j++) {
						if (subject.homeworks[j].id == req.params.homeworkId) {
							subject.homeworks.splice(j, 1);
							break;
						}
					}
					break;
				}
			}
			notif = {
				url: JSON.stringify({ name: 'subject', params: { id: req.params.subjectId } }),
				notifType: 'homework',
				user: payload.userId,
				special: 'deleted'
			}
			socketCtrl.addNotif(userClass.students, UserModel, notif, { name: user.name, myImage: user.myImage });
			user.school.save(function(err, school) {
				if (!school) {
					utils.sendError(res, err);
				} else {
					res.status(200).send({ success: true });
				}
			})
		})
}
