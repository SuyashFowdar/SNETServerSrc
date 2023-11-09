var express = require('express');

module.exports = function(controller) {

	var router = express.Router();

	router.route('/:userType')
		.get(controller.getList)

	router.route('/update/:userType')
		.post(controller.addUser)
		.put(controller.editUser)

	router.route('/update/:userType/:id')
		.delete(controller.removeUser)

	router.route('/updateMany')
		.post(controller.updateMany)

	router.route('/specific/:userType')
		.get(controller.fetchSpecific)

	return router;

};