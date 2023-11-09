module.exports = dummy;

function dummy(req, res) {
	var mrq = require('mongoose-rest-query'),
		jwt = require('jwt-simple'),
		UserModel = mrq.model(req, 'UserSchema'),
		payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

	UserModel.find().exec(function(err, users) {
		var userIds = [];
		for (var i = 0; i < users.length; i++) {
			userIds.push(users[i].id);
		}
		UserModel.update({ _id: { $in: userIds } }, { $push: { dummyArray: { dummy: 'Val3' } } }, { multi: true }).exec(function(err, users2) {
			res.send(users2);
		})
		//Remove Attribute
		//
		// UserModel.update({ _id: { $in: userIds } }, { $unset: { dummyAttribute: 1 } }, { multi: true }).exec(function(err, users2) {
		// 	res.send(users2);
		// })
		//
		// Update SubDocument Array
		//
		// YourModel.update(
		//   {_id: /* doc id */, 'dots.id': /* subdoc id */ },
		//   {$push: {'dots.$.location': { /* your subdoc */ }},
		//   callback
		// );
		// console.log('UserModel.findOneAndUpdate', UserModel.findOneAndUpdate);
		// res.send({})
	})
}