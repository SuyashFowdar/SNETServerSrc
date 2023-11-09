module.exports = {
	getList: getList,
	addUser: addUser,
	editUser: editUser,
	removeUser: removeUser,
	fetchSpecific: fetchSpecific,
	updateMany: updateMany
};

function addUser(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		UserModel = mrq.model(req, 'UserSchema'),
		payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey),
		userSelect;

	if (req.params.userType === 'student') {
		userSelect = 'classes.students classes._id';
	} else if (req.params.userType === 'teacher') {
		userSelect = 'teachers';
	} else if (req.params.userType === 'schoolAdmin') {
		userSelect = 'schoolAdmins';
	}

	UserModel.findById(payload.userId)
		.select('userType school')
		.populate('school', userSelect)
		.exec(function(err, schoolAdmin) {
			if (schoolAdmin && schoolAdmin.userType === 'schoolAdmin') {
				if (req.params.userType === 'class') {
					schoolAdmin.school.classes.push(req.body);
					schoolAdmin.school.save(function(err, school) {
						if (school) {
							res.status(200).send({ id: school.classes[school.classes.length - 1].id });
						} else {
							res.status(500).send(err || new Error(500));
						}
					})
				} else {
					req.body.userType = req.params.userType;
					UserModel.create(req.body, function(err, user) {
						if (user) {
							if (req.params.userType === 'student') {
								for (var i = 0; i < schoolAdmin.school.classes.length; i++) {
									if (schoolAdmin.school.classes[i].id === user.studentDetails.class) {
										schoolAdmin.school.classes[i].students.push(user.id);
									}
								}
							} else {
								schoolAdmin.school[req.params.userType + 's'].push(user.id);
							}
							schoolAdmin.school.save(function(err, school) {
								if (school) {
									res.status(200).send({ id: user.id });
								} else {
									res.status(500).send(err || new Error(500));
								}
							})
						} else {
							res.status(500).send(err || new Error(500));
						}
					})
				}
			} else {
				res.status(500).send(err || new Error(500));
			}
		})
}

function getList(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		UserModel = mrq.model(req, 'UserSchema'),
		payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey),
		userSelect, schoolPopulate, schoolSelect;

	if (req.params.userType === 'student') {
		userSelect = 'name classes.students classes.name classes.subjects.subject classes._id';
		schoolPopulate = 'classes.students classes.subjects.subject';
		schoolSelect = 'name info.DOB info.male info.phone info.address studentDetails.subjects accountInitiated';
	} else if (req.params.userType === 'teacher') {
		userSelect = 'name teachers classes.name classes._id classes.subjects.subject';
		schoolPopulate = 'teachers classes.subjects.subject';
		schoolSelect = 'name info.DOB info.male info.phone info.address teacherDetails.classes teacherDetails.subjects accountInitiated';
	} else if (req.params.userType === 'schoolAdmin') {
		userSelect = 'name schoolAdmins';
		schoolPopulate = 'schoolAdmins';
		schoolSelect = 'name info.DOB info.male info.phone info.address accountInitiated';
	}

	UserModel.findById(payload.userId)
		.select('userType school')
		.populate({
			path: 'school',
			select: userSelect,
			populate: {
				path: schoolPopulate,
				select: schoolSelect
			}
		})
		.exec(function(err, schoolAdmin) {
			if (schoolAdmin && schoolAdmin.userType === 'schoolAdmin') {
				var person;
				userSchool = JSON.parse(JSON.stringify(schoolAdmin.school));
				if (req.params.userType === 'student') {
					for (var j = 0; j < userSchool.classes.length; j++) {
						for (var i = 0; i < userSchool.classes[j].students.length; i++) {
							person = userSchool.classes[j].students[i];
							person.hasCode = !person.accountInitiated;
							delete person.accountInitiated;
						}
					}
				} else {
					for (var i = 0; i < userSchool[req.params.userType + 's'].length; i++) {
						person = userSchool[req.params.userType + 's'][i];
						person.hasCode = !person.accountInitiated;
						delete person.accountInitiated;
					}
				}
				res.status(200).send(userSchool);
			} else {
				res.status(500).send(err || new Error(500));
			}
		})
}

function editUser(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		UserModel = mrq.model(req, 'UserSchema'),
		payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

	UserModel.findById(payload.userId)
		.select('userType')
		.exec(function(err, schoolAdmin) {
			if (schoolAdmin) {
				req.body.userType = req.params.userType;
				UserModel.findById(req.body.id, function(err, user) {
					if (user) {
						for (var i in req.body) {
							if (user[i]) {
								if (typeof req.body[i] === 'object') {
									for (var j in req.body[i]) {
										user[i][j] = req.body[i][j];
									}
								} else {
									user[i] = req.body[i];
								}
							}
						}
						user.save(function(err, user) {
							if (user) {
								res.status(200).send({ success: true });
							} else {
								res.status(500).send(err || new Error(500));
							}
						})
					} else {
						res.status(500).send(err || new Error(500));
					}
				})
			} else {
				res.status(500).send(err || new Error(500));
			}
		})
}

function updateMany(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		UserModel = mrq.model(req, 'UserSchema'),
		payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

	UserModel.findById(payload.userId)
		.select('userType')
		.exec(function(err, schoolAdmin) {
			if (schoolAdmin && (schoolAdmin.userType === 'schoolAdmin' || schoolAdmin.userType === 'teacher')) {
				var obj = {};
				obj[req.body.field] = req.body.value;
				if (req.body.users.length > 0) {
					UserModel.update({ _id: { $in: req.body.users } }, { $push: obj }, { multi: true }).exec(function(err, users2) {
						res.send(users2);
					})
				}
				if (req.body.usersNot.length > 0) {
					UserModel.update({ _id: { $in: req.body.usersNot } }, { $pull: obj }, { multi: true }).exec(function(err, users2) {
						res.send(users2);
					})
				}
			}
		})
}

function fetchSpecific(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		UserModel = mrq.model(req, 'UserSchema'),
		utils = require('../app.utils'),
		payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey),
		populate;

	if (req.params.userType === 'student') {
		populate = {
			path: 'school',
			select: { classes: { $elemMatch: { _id: req.query.classId } }, 'classes.students': 1 },
			populate: {
				path: 'classes.students',
				select: 'studentDetails.feePayment'
			}
		}
	} else {
		populate = {
			path: 'school',
			select: req.params.userType + 's',
			populate: {
				path: req.params.userType + 's',
				select: 'teacherDetails.salaryPayment'
			}
		}
	}

	UserModel.findById(payload.userId)
		.select('userType')
		.populate(populate)
		.exec(function(err, schoolAdmin) {
			if (schoolAdmin && schoolAdmin.userType === 'schoolAdmin') {
				if (req.params.userType === 'student') {
					res.send(schoolAdmin.school.classes[0].students);
				} else {
					res.status(200).send(schoolAdmin.school[req.params.userType + 's']);
				}
			} else {
				utils.sendError(res, err);
			}
		})
}

function removeUser(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		UserModel = mrq.model(req, 'UserSchema'),
		SchoolModel = mrq.model(req, 'SchoolSchema'),
		payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey),
		listName = req.params.userType + 's';

	if (req.params.userType === 'student') {
		populate = {
			path: 'school',
			select: { classes: { $elemMatch: { _id: req.query.classId } }, 'classes.students': 1 },
			populate: {
				path: 'classes.students',
				select: 'accountInitiated',
				match: { _id: req.params.id }
			}
		}
	} else if (req.params.userType === 'class') {
		populate = {
			path: 'school',
			select: 'name'
		}
	} else {
		populate = {
			path: 'school',
			select: listName,
			populate: {
				path: listName,
				select: 'accountInitiated',
				match: { _id: req.params.id }
			}
		}
	}

	UserModel.findById(payload.userId)
		.select('userType school')
		.populate(populate)
		.exec(function(err, schoolAdmin) {
			if (schoolAdmin && schoolAdmin.userType === 'schoolAdmin') {
				if (req.params.userType === 'student') {
					SchoolModel.update({ _id: schoolAdmin.school.id, 'classes._id': req.query.classId }, { $pull: { 'classes.$.students': req.params.id } }).exec(function(err, users2) {
						if (!schoolAdmin.school.classes[0].students[0].accountInitiated) {
							schoolAdmin.school.classes[0].students[0].remove(function(err, userRemoved) {
								res.send({});
							})
						} else {
							res.send({});
						}
					})
				} else if (req.params.userType === 'class') {
					SchoolModel.update({ _id: schoolAdmin.school.id }, { $pull: { classes: { _id: req.params.id } } }).exec(function(err, users2) {
						res.send({});
					})
				} else {
					var pull = {};
					pull[listName] = req.params.id;
					SchoolModel.update({ _id: schoolAdmin.school.id }, { $pull: pull }).exec(function(err, users2) {
						if (!schoolAdmin.school[listName][0].accountInitiated) {
							schoolAdmin.school[listName][0].remove(function(err, userRemoved) {
								res.send({});
							})
						} else {
							res.send({});
						}
					})
				}
			} else {
				res.status(500).send(err || new Error(500));
			}
		})
}