module.exports = function() {
	return {
		UserSchema: require('./user/user.model'),
		LoginSchema: require('./user/login.model'),
		PowerSchema: require('./user/power.model'),
		ServiceSchema: require('./service/service.model').schema,
		SchoolSchema: require('./school/school.model'),
		SchoolVarSchema: require('./school/schoolVar.model'),
		SubjectSchema: require('./school/subject.model'),
		MessageSchema: require('./user/message.model'),
		IdeaSchema: require('./idea/idea.model')
	};
}();