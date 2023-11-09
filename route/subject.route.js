var express = require('express');

module.exports = function(controller) {

	var router = express.Router();

	router.route('/:id')
		.get(controller.getClass)

	router.route('/notes/:subjectId')
		.post(controller.saveNotes)

	router.route('/notes/:subjectId/:id')
		.delete(controller.deleteNotes)

	return router;
};