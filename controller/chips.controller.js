module.exports = getChips;

function getChips(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		utils = require('../app.utils'),
		secretKey = require('../app.config').secretKey,
		payload = jwt.decode(req.headers['x-auth-token'], secretKey),
		Model, tabData;

	if (req.params.type === 'friends') {
		Model = mrq.model(req, 'UserSchema');
		Model.findById(payload.userId)
			.populate({
				path: 'friends.friend',
				select: 'name',
				match: { name: { $regex: req.params.value, $options: 'i' } }
			})
			.exec(function(err, user) {
				if (!user) {
					utils.sendError(res, err);
				} else {
					var result = [];
					for (var i = 0; i < user.friends.length; i++) {
						if (user.friends[i].friend) {
							result.push(user.friends[i].friend);
						}
					}
					res.send(result);
				}
			})
	} else if (req.params.type === 'teachers') {
		Model = mrq.model(req, 'UserSchema');
		Model.findById(payload.userId)
			.select('school')
			.populate({
				path: 'school',
				select: 'teachers',
				populate: {
					path: 'teachers',
					select: 'name',
					match: { name: { $regex: req.params.value, $options: 'i' } }
				}
			})
			.exec(function(err, user) {
				if (!user) {
					utils.sendError(res, err);
				} else {
					res.send(user.school.teachers);
				}
			})
	} else if (req.params.type === 'subjects') {
		Model = mrq.model(req, 'SubjectSchema');
		Model.find({ name: { "$regex": req.params.value, "$options": "i" } })
			.select('name')
			.exec(function(err, subjects) {
				if (!subjects) {
					utils.sendError(res, err);
				} else {
					res.send(subjects);
				}
			})
	}
}