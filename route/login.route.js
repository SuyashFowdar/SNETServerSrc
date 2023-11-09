var express = require('express');

module.exports = function(controller) {

	var router = express.Router();

	router.route('')
		.post(controller.login)

	router.route('/register/:userCode')
		.post(controller.register)

	router.route('/verify/:userCode')
		.get(controller.verifyLogin)

	router.route('/checkUsername/:username')
		.get(controller.checkUsername)

	return router;
};