function getMypage(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        utils = require('../app.utils'),
        UserModel = mrq.model(req, 'UserSchema'),
        SchoolModel = mrq.model(req, 'SchoolSchema'),
        async = require('async'),
            payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey),
            obj = {
                userToSend: {}
            };

    async.waterfall([function(callback) {
            UserModel.findById(req.params.pageId)
                .select('name myImage info studentDetails school ideas settings')
                .populate('ideas.who', 'name myImage')
                .exec(function(err, user) {
                    if (user) {
                        obj.user = JSON.parse(JSON.stringify(user));
                        callback(null, obj)
                    } else {
                        utils.sendError(res, err)
                    }
                })
        }, function(obj, callback) {
            SchoolModel.findOne({ _id: obj.user.school }, { classes: { $elemMatch: { _id: obj.user.studentDetails.class } } })
                .select('name classes.name')
                .exec(function(err, school) {
                    if (school) {
                        obj.school = JSON.parse(JSON.stringify(school));
                        callback(null, obj)
                    } else {
                        utils.sendError(res, err)
                    }
                })
        }, function(obj, callback) {
            if (obj.user.id === payload.userId) {
                obj.userToSend.mine = true;
                callback(null, obj);
            } else {
                UserModel.findById(payload.userId)
                    .select('friends requestedFriends')
                    .exec(function(errMe, me) {
                        if (me) {
                            obj.me = me;
                            for (var i = 0; i < me.requestedFriends.length; i++) {
                                if (me.requestedFriends[i] == obj.user.id) {
                                    obj.userToSend.requested = true;
                                    break;
                                }
                            }
                            if (!obj.userToSend.requested) {
                                for (var i = 0; i < me.friends.length; i++) {
                                    if (me.friends[i].friend == obj.user.id) {
                                        obj.userToSend.friend = true;
                                        break;
                                    }
                                }
                            }
                            callback(null, obj);
                        } else {
                            utils.sendError(res, errMe);
                        }
                    })
            }
        }, function(obj, callback) {
            var idea, date, inCategory;
            obj.userToSend.ideas = [];
            for (var i = 0; i < obj.user.ideas.length; i++) {
                idea = obj.user.ideas[i];
                if (obj.userToSend.mine || isViewable(idea)) {
                    utils.castIdea(idea, payload.userId);
                    obj.userToSend.ideas.unshift(idea);
                }
            }
            obj.userToSend.myImage = obj.user.myImage;
            obj.userToSend.name = obj.user.name;
            if (obj.user.settings.details === 'everyone' || (obj.user.settings.details === 'friends' && obj.userToSend.friend)) {
                obj.userToSend.info = obj.user.info;
            }
            console.log('obj.userToSend.info', obj.userToSend.info);
            console.log('obj.school', obj.school);
            obj.userToSend.school = obj.school;
            obj.userToSend.ideaOfTheDay = obj.user.ideaOfTheDay;
            obj.userToSend.id = obj.user.id;
            callback(null, obj);

            function isViewable(idea) {
                if (idea.viewable.by === 'everyone') {
                    return true;
                } else if (idea.viewable.by === 'friends' && obj.userToSend.friend) {
                    return true;
                } else {
                    return false;
                }
            }
        }],
        function(error, result) {
            if (result) {
                res.status(200).send(result.userToSend);
            } else {
                utils.sendError(res, error);
            }
        })
}

module.exports = getMypage;