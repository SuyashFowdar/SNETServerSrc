module.exports = {
    getMe: getMe,
    getSettings: getSettings,
    updateSettings: updateSettings,
    getTab: getTab,
    markChecked: markChecked,
    getTabMore: getTabMore,
    getTabUpdate: getTabUpdate
};

function getMe(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        UserModel = mrq.model(req, 'UserSchema'),
        SchoolModel = mrq.model(req, 'SchoolSchema'),
        utils = require('../app.utils');

    var payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

    UserModel.findById(payload.userId)
        .select('name myImage newMessages newNotifications userType school studentDetails.class teacherDetails.classes studentDetails.subjects teacherDetails.subjects')
        .populate('school', 'code name classes.name classes.code classes._id classes.coordinators')
        .populate('studentDetails.subjects teacherDetails.subjects', 'name')
        .lean()
        .exec(function(err, user) {
            if (user) {
                user.newNotifications = user.newNotifications.length;
                user.newMessages = user.newMessages ? user.newMessages.length : 0;
                if (user.userType === 'student') {
                    for (var i = 0; i < user.school.classes.length; i++) {
                        if (user.school.classes[i]._id == user.studentDetails.class) {
                            user.school.class = user.school.classes[i];
                        }
                    }
                    delete user.school.classes;
                    delete user.teacherDetails;
                    res.status(200).send(user);
                } else if (user.userType === 'teacher') {
                    var classes = [];
                    user.school.coordinated = [];
                    for (var i = 0; i < user.school.classes.length; i++) {
                        for (var j = 0; j < user.teacherDetails.classes.length; j++) {
                            if (user.school.classes[i]._id == user.teacherDetails.classes[j]) {
                                classes.push(user.school.classes[i]);
                            }
                        }
                        if (user.school.classes[i].coordinators) {
                            for (var j = 0; j < user.school.classes[i].coordinators.length; j++) {
                                if (user.school.classes[i].coordinators[j].toString() == user._id.toString()) {
                                    user.school.coordinated.push(user.school.classes[i]);
                                }
                            }
                        }
                    }
                    user.school.classes = classes;
                    delete user.studentDetails;
                    user.newNotifications = user.newNotifications.length;
                    res.status(200).send(user);
                } else {
                    res.status(200).send(user);
                }
            } else {
                utils.sendError(res, err);
            }
        })
}

function getSettings(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        UserModel = mrq.model(req, 'UserSchema'),
        utils = require('../app.utils'),
        payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

    UserModel.findById(payload.userId)
        .select('settings')
        .exec(function(err, user) {
            if (!user) {
                utils.sendError(res, err);
            } else {
                res.status(200).send(user);
            }
        })
}

function updateSettings(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        UserModel = mrq.model(req, 'UserSchema'),
        utils = require('../app.utils'),
        payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

    UserModel.findById(payload.userId)
        .select('settings')
        .exec(function(err, user) {
            if (!user) {
                utils.sendError(res, err);
            } else {
                user.settings = req.body;
                user.save(function(err, user) {
                    if (!user) {
                        utils.sendError(res, err);
                    } else {
                        res.status(200).send({ success: true });
                    }
                })
            }
        })
}

function getTab(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        utils = require('../app.utils'),
        mongoose = require('mongoose'),
        secretKey = require('../app.config').secretKey,
        UserModel = mrq.model(req, 'UserSchema'),
        IdeaModel = mrq.model(req, 'IdeaSchema'),
        MessageModel = mrq.model(req, 'MessageSchema'),
        payload = jwt.decode(req.headers['x-auth-token'], secretKey),
        async = require('async');

    if (req.params.tab === 'notifications') {
        UserModel.findById(payload.userId)
            .select({ newNotifications: 1, oldNotifications: { $slice: 3 } })
            .populate('newNotifications.user oldNotifications.user', 'name myImage')
            .exec(function(err, user) {
                if (user) {
                    res.status(200).send(user);
                } else {
                    utils.sendError(res, err);
                }
            })
    } else if (req.params.tab === 'messages') {
        async.waterfall([fetchReceivedMessages, fetchSentMessages], function(err, result) {
            if (!result) {
                utils.sendError(res, err);
            } else {
                res.status(200).send(result);
            }
        })

        function fetchReceivedMessages(callback) {
            UserModel.findById(payload.userId)
                .select('newMessages oldMessages')
                .populate({
                    path: 'oldMessages',
                    select: 'subject text sender',
                    options: {
                        sort: { '_id': -1 },
                        limit: 3
                    },
                    populate: {
                        path: 'sender',
                        select: 'name myImage'
                    }
                })
                .populate({
                    path: 'newMessages',
                    select: 'subject text sender',
                    populate: {
                        path: 'sender',
                        select: 'name myImage'
                    }
                })
                .exec(function(err, user) {
                    if (user) {
                        var obj = {
                            read: user.oldMessages,
                            unread: user.newMessages
                        }
                        callback(null, obj);
                    } else {
                        utils.sendError(res, err);
                    }
                })
        }

        function fetchSentMessages(obj, callback) {
            MessageModel.find({ sender: payload.userId, showToSender: true })
                .sort({ '_id': -1 })
                .limit(3)
                .populate('recipients.0', 'name myImage')
                .exec(function(err, messages) {
                    if (!messages) {
                        utils.sendError(res, err);
                    } else {
                        obj.sent = messages;
                        callback(null, obj);
                    }
                })
        }
    } else if (req.params.tab === 'friends') {
        UserModel.findById(payload.userId)
            .select('friends')
            .populate('friends.friend', 'name myImage')
            .exec(function(err, user) {
                var friends = [];
                if (user) {
                    for (var i = 0; i < 10; i++) {
                        // UserModel.findById(user.friends[i])
                        // .exec(function(err, friend){
                        if (user.friends[i]) {
                            friends.push(user.friends[i].friend);
                        }
                        // })
                    }
                    res.status(200).send(friends);
                } else {
                    utils.sendError(res, err);
                }
            })
    }
}

function getTabMore(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        utils = require('../app.utils'),
        UserModel = mrq.model(req, 'UserSchema'),
        MessageModel = mrq.model(req, 'MessageSchema'),
        payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

    if (req.params.category === 'notifs') {
        UserModel.findById(payload.userId)
            .select({ oldNotifications: { $slice: [req.params.count * 3, 3] } })
            .populate('oldNotifications.user', 'name myImage')
            .exec(function(err, user) {
                if (user) {
                    res.status(200).send(user.oldNotifications);
                } else {
                    utils.sendError(res, err);
                }
            })
    } else if (req.params.category === 'read') {
        UserModel.findById(payload.userId)
            .select('newMessages oldMessages')
            .populate({
                path: 'oldMessages',
                select: 'subject text sender',
                options: {
                    sort: { '_id': -1 },
                    skip: req.params.count * 3,
                    limit: 3
                },
                populate: {
                    path: 'sender',
                    select: 'name myImage'
                }
            })
            .exec(function(err, user) {
                if (user) {
                    res.status(200).send(user.oldMessages);
                } else {
                    utils.sendError(res, err);
                }
            })
    } else if (req.params.category === 'sent') {
        MessageModel.find({ sender: payload.userId, showToSender: true })
            .sort({ '_id': -1 })
            .skip(req.params.count * 3)
            .limit(3)
            .populate('recipients.0', 'name myImage')
            .exec(function(err, messages) {
                if (!messages) {
                    utils.sendError(res, err);
                } else {
                    res.status(200).send(messages);
                }
            })
    } else if (req.params.category === 'friends') {
        UserModel.findById(payload.userId)
            .select('friends')
            .populate('friends.friend', 'name myImage')
            .exec(function(err, user) {
                var friends = [];
                if (user) {
                    for (var i = (req.params.count * 10); i < ((req.params.count + 1) * 10); i++) {
                        if (user.friends[i]) {
                            friends.push(user.friends[i].friend);
                        }
                    }
                    res.status(200).send(friends);
                } else {
                    utils.sendError(res, err);
                }
            })
    }
}

function getTabUpdate(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        utils = require('../app.utils'),
        secretKey = require('../app.config').secretKey,
        UserModel = mrq.model(req, 'UserSchema'),
        MessageModel = mrq.model(req, 'MessageSchema'),
        payload = jwt.decode(req.headers['x-auth-token'], secretKey),
        async = require('async');

    if (req.params.tab === 'notifications') {
        UserModel.findById(payload.userId)
            .select('newNotifications')
            .populate('newNotifications.users.0', 'name myImage')
            .exec(function(err, user) {
                if (user) {
                    var notifications = [];
                    for (var i = 0; i < user.newNotifications.length; i++) {
                        for (var j = 0; j < req.body.length; j++) {
                            if (user.newNotifications[i].id == req.body[j]) {
                                notifications.push(user.newNotifications[i]);
                            }
                        }
                    }
                    res.status(200).send(notifications);
                } else {
                    utils.sendError(res, err);
                }
            })
    } else if (req.params.tab === 'messages') {
        UserModel.findById(payload.userId)
            .select('newMessages')
            .populate({
                path: 'newMessages',
                select: 'subject text sender',
                populate: {
                    path: 'sender',
                    select: 'name myImage'
                }
            })
            .exec(function(err, user) {
                if (user) {
                    var messages = [];
                    for (var i = 0; i < user.newMessages.length; i++) {
                        for (var j = 0; j < req.body.length; j++) {
                            if (user.newMessages[i].id == req.body[j]) {
                                messages.push(user.newMessages[i]);
                            }
                        }
                    }
                    res.status(200).send(messages);
                } else {
                    utils.sendError(res, err);
                }
            })
    }
}

function markChecked(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        UserModel = mrq.model(req, 'UserSchema'),
        utils = require('../app.utils'),
        payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

    UserModel.findById(payload.userId)
        .select('newNotifications oldNotifications')
        .exec(function(err, me) {
            if (!me) {
                utils.sendError(res, err);
            } else {
                for (var i = 0; i < me.newNotifications.length; i++) {
                    if (me.newNotifications[i]._id == req.params.id) {
                        me.oldNotifications.unshift(me.newNotifications[i]);
                        me.newNotifications.splice(i, 1);
                        me.save();
                        res.status(200).send({ success: true });
                    }
                }
            }
        })
}