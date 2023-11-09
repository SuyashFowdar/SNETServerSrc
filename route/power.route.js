var express = require('express');

module.exports = function(controller) {

	var router = express.Router();

	router.route('/getFirst')
		.get(controller.getFirst)

	router.route('/school')
		.get(controller.getSchool)
		.post(controller.createSchool)

	router.route('/school/:id')
		.delete(controller.deleteSchool)

	router.route('/destroy')
		.delete(controller.destroySession)

	router.route('/senderrorreport')
		.post(controller.checkPower)

	return router;
};