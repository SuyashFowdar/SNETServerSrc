function search(req, res) {
	var mrq = require('mongoose-rest-query'),
		utils = require('../app.utils'),
		UserModel = mrq.model(req, 'UserSchema');

	UserModel.find({ name: { "$regex": req.params.search, "$options": "i" } })
		.select('name myImage userType')
		.exec(function(err, result) {
			if (result) {
				// console.log('result', result);
				res.status(200).send(result);
			} else {
				utils.sendError(res, err);
			}
		})
}

module.exports = search;