module.exports = generateTimetable;

function generateTimetable (req, res) {
	var mrq = require('mongoose-rest-query'),
	    jwt = require('jwt-simple'),
	    UserModel = mrq.model(req, 'UserSchema'),
	    payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

	    UserModel.findById(payload.userId)
	        .select('userType school')
	        .populate('school', 'name classes teachers')
	        .exec(function(err, schoolAdmin){
	        	schoolAdmin.populate('teachers subjects.subject', 'name periodsPerWeek', function(err, school){
	        		
	        	})
	        })
}