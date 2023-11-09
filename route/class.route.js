var express = require('express');

module.exports = function(controller) {

	var router = express.Router();

	router.route('')
		.get(controller.getClass)

	router.route('/students')
		.post(controller.saveStudents)

	router.route('/students/:classId')
		.get(controller.getStudents)

	return router;
};