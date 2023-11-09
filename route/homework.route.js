var express = require('express');

module.exports = function(controller) {

	var router = express.Router();

	router.route('/:classId/:subjectId')
		.post(controller.add)

	router.route('/:classId/:subjectId/:homeworkId')
		.put(controller.update)
		.delete(controller.remove)


	return router;

};