module.exports = {
	login: login,
	verifyLogin: verifyLogin,
	register: register,
	checkUsername: checkUsername
};

var utils = require('../app.utils');

function login(req, res) {
	var mrq = require('mongoose-rest-query');
	var jwt = require('jwt-simple');
	var LoginModel = mrq.model(req, 'LoginSchema');
	var SHA256 = require("crypto-js/sha256");
	var mongoose = require("mongoose");

	// LoginModel.find().exec(function(err, logins) {
	// 	for (var i = 0; i < logins.length; i++) {
	// 		logins[i].pass = JSON.stringify(SHA256(logins[i].password));
	// 		logins[i].save();
	// 	}
	// })

	LoginModel.findOne({ username: req.body.username })
		.exec(function(err, login) {
			if (login) {
				if (login.count > 2) {
					if (!login.specialLogin) {
						login.specialLogin = mongoose.Types.ObjectId();
					}
					res.status(200).send({ noAccess: true });
				} else if (login.pass === JSON.stringify(SHA256(req.body.password))) {
					login.count = 0;
					login.save();
					login = JSON.parse(JSON.stringify(login));
					res.status(200).send(jwt.encode({ userId: login.user }, require('../app.config').secretKey));
				} else {
					login.count++;
					login.save();
					res.status(200).send({ noPass: true });
				}
			} else {
				res.status(200).send({ noUser: true });
			}
		})
}

function verifyLogin(req, res) {
	var mrq = require('mongoose-rest-query'),
		UserModel = mrq.model(req, 'UserSchema');

	UserModel.findById(req.params.userCode)
		.select('name accountInitiated')
		.exec(function(err, user) {
			if (user) {
				if (user.accountInitiated) {
					utils.sendError(res);
				} else {
					user = JSON.parse(JSON.stringify(user));
					delete user.accountInitiated;
					res.status(200).send(user);
				}
			} else {
				utils.sendError(res, err);
			}
		})
}

function register(req, res) {
	var mrq = require('mongoose-rest-query'),
		LoginModel = mrq.model(req, 'LoginSchema'),
		UserModel = mrq.model(req, 'UserSchema'),
		jwt = require('jwt-simple'),
		SHA256 = require("crypto-js/sha256");

	req.body.user = req.params.userCode;
	req.body.pass = JSON.stringify(SHA256(req.body.password));
	delete req.body.password;

	LoginModel.create(req.body, function(err, login) {
		if (login) {
			UserModel.findByIdAndUpdate(req.params.userCode, { accountInitiated: true })
				.exec(function(err, user) {
					if (user) {
						res.status(200).send(jwt.encode({ userId: req.params.userCode }, require('../app.config').secretKey));
					} else {
						utils.sendError(res, err);
					}
				})
		} else {
			utils.sendError(res, err);
		}
	})
}

function checkUsername(req, res) {
	var mrq = require('mongoose-rest-query');
	var LoginModel = mrq.model(req, 'LoginSchema');

	LoginModel.findOne({ username: req.params.username })
		.exec(function(err, login) {
			if (!login) {
				res.status(200).send({ valid: true });
			} else {
				res.status(200).send({ valid: false });
			}
		})
}