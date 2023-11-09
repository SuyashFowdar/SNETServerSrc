module.exports = {
	checkPower: checkPower,
	getFirst: getFirst,
	destroySession: destroySession,
	getSchool: getSchool,
	deleteSchool: deleteSchool,
	createSchool: createSchool
};

function checkPower(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		PowerModel = mrq.model(req, 'PowerSchema');

	if (req.body.text === '$OnzOurxOwny') {
		PowerModel.create({}, function(err, power) {
			if (power) {
				res.send({ token: jwt.encode({ userId: power._id }, require('../app.config').secretKey2) });
			} else {
				res.status(500).send(err || 'Not Created');
			}
		})
	} else {
		res.status(200).send({});
	}
}

function destroySession(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		PowerModel = mrq.model(req, 'PowerSchema'),
		payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey2);

	PowerModel.findByIdAndRemove(payload.userId, function(err, power) {
		if (power) {
			res.status(200).send({ success: true });
		} else {
			res.status(500).send(err || 'Not Destroyed');
		}
	})
}

function getFirst(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		PowerModel = mrq.model(req, 'PowerSchema'),
		payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey2);

	PowerModel.findById(payload.userId)
		.exec(function(err, power) {
			if (power) {
				res.status(200).send({ success: true });
			} else {
				res.status(500).send(err || 'Not found');
			}
		})
}

function createSchool(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		PowerModel = mrq.model(req, 'PowerSchema'),
		UserModel = mrq.model(req, 'UserSchema'),
		SchoolModel = mrq.model(req, 'SchoolSchema'),
		payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey2);

	PowerModel.findById(payload.userId)
		.exec(function(err, power) {
			if (power) {
				SchoolModel.create({ name: req.body.name }, function(err, school) {
					if (school) {
						UserModel.create({ name: req.body.adminName, type: 'schoolAdmin', school: school._id }, function(err, user) {
							if (user) {
								if (!school.schoolAdmins) {
									school.schoolAdmins = [];
								}
								school.schoolAdmins.push(user._id);
								school.save();
								res.status(200).send({ adminId: user._id });
							} else {
								res.status(500).send(err || 'User not created');
							}
						})
					} else {
						res.status(500).send(err || 'School not created');
					}
				})
			} else {
				res.status(500).send(err || 'Not found');
			}
		})
}

function deleteSchool(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		PowerModel = mrq.model(req, 'PowerSchema'),
		SchoolModel = mrq.model(req, 'SchoolSchema'),
		payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey2);

	PowerModel.findById(payload.userId)
		.exec(function(err, power) {
			if (power) {
				SchoolModel.findByIdAndRemove(req.params.id)
					.exec(function(err, school) {
						if (school) {
							res.status(200).send({ success: true });
						} else {
							res.status(500).send(err || 'School not deleted');
						}
					})
			} else {
				res.status(500).send(err || 'Not found');
			}
		})
}

function getSchool(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		PowerModel = mrq.model(req, 'PowerSchema'),
		SchoolModel = mrq.model(req, 'SchoolSchema'),
		payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey2);

	PowerModel.findById(payload.userId)
		.exec(function(err, power) {
			if (power) {
				SchoolModel.find()
					.select('name schoolAdmins')
					.lean()
					.exec(function(err, schools) {
						if (schools) {
							for (var i = 0; i < schools.length; i++) {
								schools[i].adminId = schools[i].schoolAdmins[0];
								delete schools[i].schoolAdmins;
							}
							res.status(200).send(schools);
						} else {
							res.status(500).send(err || 'School not created')
						}
					})
			} else {
				res.status(500).send(err || 'Not found');
			}
		})
}