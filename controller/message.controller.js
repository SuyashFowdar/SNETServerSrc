module.exports = {
    send: send,
    fetch: fetch,
    remove: remove
}

function send(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        UserModel = mrq.model(req, 'UserSchema'),
        MessageModel = mrq.model(req, 'MessageSchema'),
        utils = require('../app.utils'),
        payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

    UserModel.findById(payload.userId)
        .select('name myImage')
        .exec(function(err, user) {
            var socketCtrl = require('./socket.controller'),
                socketSessions;
            if (!user) {
                utils.sendError(res, err);
            } else {
                req.body.sender = payload.userId;
                MessageModel.create(req.body, function(err, message) {
                    if (!message) {
                        utils.sendError(res, err);
                    } else {
                        UserModel.find({ _id: { $in: req.body.recipients } })
                            .select('newMessages')
                            .exec(function(err, users) {
                                if (!users) {
                                    utils.sendError(res, err);
                                } else {
                                    for (var i = 0; i < users.length; i++) {
                                        users[i].newMessages.unshift(message.id);
                                        users[i].save();
                                        socketSessions = socketCtrl.getSession(users[i].id);
                                        if (socketSessions) {
                                            for (var j = 0; j < socketSessions.length; j++) {
                                                var sessionIndex = j;
                                                message = JSON.parse(JSON.stringify(message));
                                                message.sender = user;
                                                socketSessions[j].emit('updatesCount', { messages: message });
                                            }
                                        }
                                    }
                                    res.send({ id: message.id });
                                }
                            })
                    }
                })
            }
        })
}

function fetch(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        UserModel = mrq.model(req, 'UserSchema'),
        MessageModel = mrq.model(req, 'MessageSchema'),
        utils = require('../app.utils'),
        payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

    UserModel.findById(payload.userId)
        .select('newMessages oldMessages')
        .exec(function(err, user) {
            if (!user) {
                utils.sendError(res, err);
            } else {
                MessageModel.findById(req.params.id)
                    .populate('sender recipients', 'name')
                    .exec(function(err, message) {
                        if (!message) {
                            utils.sendError(res, err);
                        } else {
                            var found = false;
                            if (message.sender.id == payload.userId) {
                                found = true;
                            } else {
                                for (var i = 0; i < user.newMessages.length; i++) {
                                    if (user.newMessages[i] == message.id) {
                                        user.newMessages.splice(i, 1);
                                        user.oldMessages.unshift(message.id);
                                        user.save();
                                        found = true;
                                        break;
                                    }
                                }
                            }
                            if (!found) {
                                for (var i = 0; i < user.oldMessages.length; i++) {
                                    if (user.oldMessages[i] == message.id) {
                                        found = true;
                                        break;
                                    }
                                }
                            }
                            if (!found) {
                                utils.sendError(res, 'Message not viewable!');
                            } else {
                                res.status(200).send(message);
                            }
                        }
                    })
            }
        })


}

function remove(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        MessageModel = mrq.model(req, 'MessageSchema'),
        UserModel = mrq.model(req, 'UserSchema'),
        utils = require('../app.utils'),
        payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

    if (req.query.sender) {
        MessageModel.findById(req.params.id)
            .exec(function(err, message) {
                if (!message) {
                    utils.sendError(res, err);
                } else {
                    message.showToSender = false;
                    message.save(function(err, message) {
                        if (!message) {
                            utils.sendError(req, err);
                        } else {
                            res.status(200).send({ success: true });
                        }
                    })
                    // if ((message.deletedBy.length + 1) === (message.recipients.length + 1)) {
                    //     message.remove(function(err, deletedMessage) {
                    //         if (!deletedMessage) {
                    //             utils.sendError(res, err);
                    //         } else {
                    //             res.status(200).send({ success: true });
                    //         }
                    //     })
                    // } else {
                    //     message.deletedBy.push(payload.userId);
                    //     message.save(function(err, message) {
                    //         if (!message) {
                    //             utils.sendError(res, err);
                    //         } else {
                    //             message = JSON.parse(JSON.stringify(message));
                    //             delete message.readBy;
                    //             res.status(200).send({ success: true });
                    //         }
                    //     })
                    // }
                }
            })
    } else {
        UserModel.findById(payload.userId)
            .select('newMessages oldMessages')
            .exec(function(err, user) {
                var workDone;
                for (var i = 0; i < user.oldMessages.length; i++) {
                    if (user.oldMessages[i] == req.params.id) {
                        user.oldMessages.splice(i, 1);
                        workDone = true;
                        break;
                    }
                }
                if (!workDone) {
                    for (var i = 0; i < user.newMessages.length; i++) {
                        if (user.newMessages[i] == req.params.id) {
                            user.newMessages.splice(i, 1);
                            break;
                        }
                    }
                }
                user.save(function(err, user) {
                    if (!user) {
                        utils.sendError(req, err);
                    } else {
                        res.status(200).send({ success: true });
                    }
                })
            })
    }
}