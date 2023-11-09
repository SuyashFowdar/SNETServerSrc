var mrq = require('mongoose-rest-query'),
	jwt = require('jwt-simple'),
	utils = require('../app.utils'),
	secretKey = require('../app.config').secretKey;

module.exports = {
	request: request,
	acceptReq: acceptReq,
	remove: remove
}

function request(req, res) {
	var payload = jwt.decode(req.headers['x-auth-token'], secretKey),
		UserModel = mrq.model(req, 'UserSchema'),
		notif = {
			user: payload.userId,
			notifType: 'friend',
			url: JSON.stringify({ name: 'mypage', params: { id: payload.userId } })
		},
		socketCtrl = require('./socket.controller');

	UserModel.update({ _id: payload.userId }, { $push: { requestedFriends: req.params.id } }, function(err, result) {
		socketCtrl.addNotif([req.params.id], UserModel, notif, req.body);
		res.send({ success: true });
	})
}

function acceptReq(req, res) {
	var payload = jwt.decode(req.headers['x-auth-token'], secretKey),
		UserModel = mrq.model(req, 'UserSchema'),
		notif = {
			notifType: 'friend',
			url: JSON.stringify({ name: 'mypage', params: { id: req.params.id } }),
			user: req.params.id,
			special: 'has been'
		};

	UserModel.update({ _id: payload.userId }, {
		$pull: { newNotifications: { notifType: notif.notifType, url: notif.url } },
		$push: { oldNotifications: { $each: [notif], $position: 0 }, friends: { friend: req.params.id } }
	}, function(err, result) {
		UserModel.update({ _id: req.params.id }, {
			$pull: { requestedFriends: payload.userId },
			$push: { friends: { friend: payload.userId } }
		}, function(err, result) {
			res.status(200).send({ success: true });
		})
	})
}

function remove(req, res) {
	var payload = jwt.decode(req.headers['x-auth-token'], secretKey),
		UserModel = mrq.model(req, 'UserSchema'),
		notif = {
			notifType: 'friend',
			url: JSON.stringify({ name: 'mypage', params: { id: req.params.id } }),
			user: req.params.id,
			special: 'has not been'
		};
	if (req.query.ignore) {
		UserModel.update({ _id: payload.userId }, {
			$pull: { newNotifications: { notifType: notif.notifType, url: notif.url } },
			$push: { oldNotifications: { $each: [notif], $position: 0 } }
		}, function(err, result) {
			UserModel.update({ _id: req.params.id }, { $pull: { requestedFriends: payload.userId } }, function(err, result) {
				res.status(200).send({ success: true });
			})
		})
	} else {
		UserModel.update({ _id: payload.userId }, { $pull: { friends: { friend: req.params.id } } },
			function(err, result) {
				UserModel.update({ _id: req.params.id }, { $pull: { friends: { friend: payload.userId } } },
					function(err, result) {
						res.send({ success: true });
					})
			})
	}
}