module.exports = getHome;

function getHome(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		UserModel = mrq.model(req, 'UserSchema'),
		SchoolModel = mrq.model(req, 'SchoolSchema'),
		utils = require('../app.utils'),
		payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

	UserModel.findOne({ _id: payload.userId })
		.select('name friends school studentDetails.class teacherDetails.classes userType ideas')
		.populate('ideas.who', 'name myImage')
		.populate({
			path: 'friends.friend',
			select: { ideas: 1, name: 1, myImage: 1 },
			populate: {
				path: 'ideas.who',
				select: 'name myImage'
			}
		})
		.exec(function(err, user) {
			if (!user) {
				res.status(500).send(err || 'User not found!');
			} else {
				user = JSON.parse(JSON.stringify(user));
				var ideas = [],
					classPath = { 'ideas.$': 1 };
				addIdeas(user, 'user');
				for (var i = 0; i < user.friends.length; i++) {
					if (user.friends[i].friend) {
						addIdeas(user.friends[i].friend, 'user');
					}
				}
				if (user.userType === 'student') {
					classPath = user.studentDetails.class;
				} else if (user.userType === 'teacher') {
					classPath = { $in: user.teacherDetails.classes };
				} else {
					user.other = true;
				}
				if (user.other) {
					limitIdeas();
				} else {
					SchoolModel.findOne({ _id: user.school, 'classes._id': classPath }, { 'classes.$': 1 })
						.populate('classes.ideas.who', 'name myImage')
						.exec(function(err, school) {
							if (!school) {
								limitIdeas();
							} else {
								for (var i = 0; i < school.classes.length; i++) {
									addIdeas(JSON.parse(JSON.stringify(school.classes[i])), 'class');
								}
								limitIdeas();
							}
						})
				}
			}

			function addIdeas(ideasContainer, containerType) {
				for (var i = 0; i < ideasContainer.ideas.length; i++) {
					ideasContainer.ideas[i].date = new Date(parseInt(ideasContainer.ideas[i].id.toString().substring(0, 8), 16) * 1000);
					utils.castIdea(ideasContainer.ideas[i], payload.userId);
					if (ideasContainer.ideas[i].who.id != ideasContainer.id) {
						ideasContainer.ideas[i].where = {
							type: containerType,
							name: ideasContainer.name,
							id: ideasContainer.id
						}
					}
					ideas.push(ideasContainer.ideas[i]);
				}
			}

			function limitIdeas() {
				var result = {
						ideas: []
					},
					startIndex = parseInt(req.params.count) * 5,
					endIndex = startIndex + 5;

				utils.sortArray(ideas, 'date', true);
				for (var i = startIndex; i < endIndex; i++) {
					if (ideas[i]) {
						result.ideas.push(ideas[i]);
					} else if (!ideas[i + 1]) {
						result.over = true;
					}
				}
				res.send(result);
			}
		})
}