var socketSessions = {};

module.exports = {
	startSession: startSession,
	getSession: getSession,
	addNotif: addNotif,
	stopSession: stopSession
}

function addNotif(userIds, UserModel, notif, me) {
	UserModel.update({ _id: { $in: userIds } }, {
		$pull: {
			oldNotifications: { url: notif.url, notifType: notif.notifType },
			newNotifications: { url: notif.url, notifType: notif.notifType }
		}
	}, function(err, result) {
		UserModel.update({ _id: { $in: userIds } }, {
			$push: { newNotifications: { $each: [notif], $position: 0 } },
		}, function(err, result) {
			for (var i = 0; i < userIds.length; i++) {
				playWithSocket(socketSessions[userIds[i]]);
			}
		})
	})

	function playWithSocket(userSessions) {
		if (userSessions) {
			notif = JSON.parse(JSON.stringify(notif));
			notif.user = me;
			userSessions[0].emit('updatesCount', { notifications: notif, count: 1 });
		}
	}
}

function startSession(userId, socket) {
	if (socketSessions[userId]) {
		socketSessions[userId].push(socket);
	} else {
		socketSessions[userId] = [socket];
	}
}

function getSession(userId) {
	return socketSessions[userId];
}

function getMultipleUsers(list, attribute) {
	var result = {};
	for (var i = 0; i < list.length; i++) {
		if (list[i][attribute] && socketSessions[list[i][attribute]]) {
			result[list[i][attribute]] = socketSessions[list[i][attribute]];
		}
	}
	return result;
}

function stopSession(socketId) {
	for (var i = 0, keys = Object.keys(socketSessions); i < keys.length; i++) {
		if (socketSessions[keys[i]].length > 1) {
			for (var j = 0; j < socketSessions[keys[i]].length; j++) {
				if (socketSessions[keys[i]][j].id === socketId) {
					socketSessions[keys[i]].splice(j, 1);
					break;
				}
			}
		} else {
			if (socketSessions[keys[i]][0].id === socketId) {
				delete socketSessions[keys[i]];
				break;
			}
		}
	}
}