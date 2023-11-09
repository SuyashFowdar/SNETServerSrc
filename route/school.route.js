var express = require('express');

module.exports = function(controller) {

	var router = express.Router();

	router.route('/settings')
		.get(controller.getSettings)
		.put(controller.saveSettings)

	router.route('/settings/:classId')
		.get(controller.getTimetable)
		.put(controller.saveTimetable)

	router.route('/:code')
		.get(controller.getSchool)

	return router;
};