var express = require('express');

module.exports = function(controller) {

	var router = express.Router();

	router.route('')
		.get(controller.getMe)

	router.route('/settings')
		.get(controller.getSettings)
		.post(controller.updateSettings)

	router.route('/tab/:tab')
		.get(controller.getTab)
		.put(controller.getTabUpdate)

	router.route('/tabMore/:category/:count')
		.get(controller.getTabMore)

	router.route('/check/notifications/:id')
		.get(controller.markChecked)

	return router;
};