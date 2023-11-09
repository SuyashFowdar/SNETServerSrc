var mrq = require('mongoose-rest-query'),
    jwt = require('jwt-simple'),
    utils = require('../app.utils'),
    secretKey = require('../app.config').secretKey,
    async = require('async'),
        _ = require('lodash');

module.exports = {
    getIdeaDetails: getIdeaDetails,
    postIdeaDetail: postIdeaDetail,
    postIdea: postIdea,
    deleteIdeaDetail: deleteIdeaDetail,
    deleteIdea: deleteIdea,
    getIdeaOnly: getIdeaOnly
}

function getIdeaDetails(req, res) {
    var obj;
    async.waterfall([initiateObj, getIdea, function(obj, callback) {
        if (obj.req.query.notePoint) {
            ifNotePoint(obj, callback);
        } else {
            ifNotNotePoint(obj, callback);
        }
    }], function(error, obj) {
        if (obj) {
            obj.res.status(200).send(obj.result);
        } else {
            utils.sendError(obj.res, error);
        }
    })

    function initiateObj(callback) {
        obj = {
            req: req,
            res: res,
            payload: jwt.decode(req.headers['x-auth-token'], secretKey)
        }
        callback(null, obj);
    }

    function ifNotePoint(obj, callback) {
        var noteIndex;
        for (var i = 0; i < obj.idea.notes.length; i++) {
            if (obj.idea.notes[i].id === req.query.notePoint) {
                noteIndex = i;
                break;
            }
        }
        if (noteIndex != undefined) {
            obj.ideasContainer.populate('ideas.0.notes.' + noteIndex + '.points.who', 'name myImage', function(err, noteIdeasContainer) {
                if (noteIdeasContainer) {
                    obj.result = obj.idea.notes[noteIndex].points;
                    callback(null, obj);
                } else {
                    utils.sendError(res, err);
                }
            })
        } else {
            utils.sendError(res, 'Note not found!');
        }
    }

    function ifNotNotePoint(obj, callback) {
        var date,
            details = JSON.parse(JSON.stringify(obj.idea[req.params.detailType]));
        for (var i = 0; i < details.length; i++) {
            if (details[i].who.id === obj.payload.userId) {
                details[i].mine = true;
            }
            if (req.params.detailType !== 'points') {
                date = new Date(parseInt(details[i]._id.toString().substring(0, 8), 16) * 1000);
                details[i].when = 'on ' + date.getDate() + ' / ' + (date.getMonth() + 1) + ' / ' + date.getFullYear() + ' at ' + date.getHours() + ':' + date.getMinutes();
                if (req.params.detailType === 'notes') {
                    for (var j = 0; j < details[i].points.length; j++) {
                        if (details[i].points[j].who == obj.payload.userId) {
                            details[i].pointGiven = true;
                        }
                    }
                    details[i].pointCount = details[i].points.length;
                    details[i].points = null;
                }
            }
        }
        obj.result = details;
        callback(null, obj);
    }
}

function postIdeaDetail(req, res) {
    var obj;
    async.waterfall([initiateObj, getIdea, function(obj, callback) {
        if (req.query.notePoint) {
            ifNotePoint(obj, callback);
        } else {
            ifNotNotePoint(obj, callback);
        }
    }], function(error, obj) {
        if (obj) {
            res.status(200).send(obj.result);
        } else {
            utils.sendError(res, error);
        }
    })

    function initiateObj(callback) {
        obj = {
            req: req,
            res: res,
            payload: jwt.decode(req.headers['x-auth-token'], secretKey)
        }
        callback(null, obj);
    }

    function ifNotNotePoint(obj, callback) {
        if (obj.idea && obj.idea[req.params.detailType]) {
            req.body.who = obj.payload.userId;
            obj.idea[req.params.detailType].push(req.body);
            var set = {};
            if (req.params.whereType === 'class') {
                set['classes.$.ideas'] = obj.ideasContainer.ideas;
                obj.SchoolModel.update({ _id: obj.schoolId, 'classes._id': obj.classId }, { $set: set }, sendResult);
            } else {
                set['ideas.$.' + req.params.detailType] = obj.idea[req.params.detailType];
                obj.UserModel.update({ _id: obj.req.params.whereId, 'ideas._id': obj.idea._id }, { $set: set }, sendResult);
            }

            function sendResult(err, result) {
                var details = obj.idea[req.params.detailType],
                    userIds = [];
                if (result && result.nModified && details) {
                    obj.result = details[details.length - 1];
                    if (obj.payload.userId != obj.idea.who.id) {
                        userIds.push(obj.idea.who._id);
                    }
                    // if (req.params.whereType === 'user' && req.params.whereId != obj.payload.userId) {
                    //     userIds.push(req.params.whereId);
                    // }
                    // if (req.params.detailType === 'notes') {
                    //     for (var i = 0; i < obj.idea.notes.length; i++) {
                    //         if (obj.idea.notes[i].who != obj.payload.userId) {
                    //             userIds.push(obj.idea.notes[i].who);
                    //         }
                    //     }
                    // }
                    if (userIds.length > 0) {
                        addNotif(_.uniq(userIds));
                    }
                    callback(null, obj);
                } else {
                    utils.sendError(res, err);
                }

                function addNotif(userIds) {
                    var socketCtrl = require('./socket.controller'),
                        url = {
                            name: 'Idea',
                            params: {
                                whereType: req.params.whereType,
                                whereId: req.params.whereType === 'class' ? obj.ideasContainer._id : req.params.whereId,
                                ideaId: obj.idea._id
                            }
                        };
                    console.log('obj.ideasContainer', obj.ideasContainer);
                    console.log('url.params', url.params);
                    url = JSON.stringify(url);
                    var others = _.uniqBy(obj.idea[req.params.detailType], function(detail) {
                        return detail.who.toString();
                    })
                    var notif = {
                        url: url,
                        notifType: req.params.detailType,
                        user: obj.payload.userId,
                        others: others.length - 1
                    };
                    if (req.params.detailType === 'notes') {
                        notif.urlQuery = JSON.stringify({ note: obj.result._id });
                    }
                    socketCtrl.addNotif(userIds, obj.UserModel, notif, obj.me);
                }
            }
        }
    }

    function ifNotePoint(obj, callback) {
        var noteIndex, set = {};
        for (var i = 0; i < obj.idea.notes.length; i++) {
            if (obj.idea.notes[i].id === req.query.notePoint) {
                noteIndex = i;
                break;
            }
        }
        if (noteIndex != undefined) {
            obj.idea.notes[noteIndex].points.push({ who: obj.payload.userId });
            if (req.params.whereType === 'class') {
                set['classes.$.ideas'] = obj.ideasContainer.ideas;
                obj.SchoolModel.update({ _id: obj.schoolId, 'classes._id': obj.classId }, { $set: set }, sendResult);
            } else {
                set['ideas.$.' + req.params.detailType] = obj.idea[req.params.detailType];
                obj.UserModel.update({ _id: obj.req.params.whereId, 'ideas._id': obj.idea._id }, { $set: set }, sendResult);
            }

            function sendResult(err, result) {
                var details = obj.idea[req.params.detailType];
                if (result && details) {
                    obj.result = details[details.length - 1];
                    callback(null, obj);
                } else {
                    utils.sendError(res, err);
                }
            }
        } else {
            utils.sendError(res, 'Note not found!');
        }
    }
}

function deleteIdeaDetail(req, res) {
    var obj;
    async.waterfall([initiateObj, getIdea, function(obj, callback) {
        if (req.query.notePoint) {
            ifNotePoint(obj, callback);
        } else {
            ifNotNotePoint(obj, callback);
        }
    }], function(error, result) {
        if (obj) {
            res.status(200).send(result);
        } else {
            utils.sendError(res, error);
        }
    })

    function initiateObj(callback) {
        obj = {
            req: req,
            res: res,
            payload: jwt.decode(req.headers['x-auth-token'], secretKey)
        }
        callback(null, obj);
    }

    function ifNotNotePoint(obj, callback) {
        if (obj.idea && obj.idea[req.params.detailType]) {
            var details = obj.idea[req.params.detailType];
            for (var i = 0; i < details.length; i++) {
                if (req.params.detailType !== 'points') {
                    if (details[i].id === req.params.detailId) {
                        details.splice(i, 1);
                    }
                } else if (details[i].who.id === obj.payload.userId) {
                    details.splice(i, 1);
                }
            }
            var set = {};
            if (req.params.whereType === 'class') {
                set['classes.$.ideas'] = obj.ideasContainer.ideas;
                obj.SchoolModel.update({ _id: obj.schoolId, 'classes._id': obj.classId }, { $set: set }, sendResult);
            } else {
                set['ideas.$.' + req.params.detailType] = obj.idea[req.params.detailType];
                obj.UserModel.update({ _id: obj.req.params.whereId, 'ideas._id': obj.idea._id }, { $set: set }, sendResult);
            }

        }

        function sendResult(err, result) {
            if (result) {
                callback(null, {});
            } else {
                utils.sendError(res, err);
            }
        }
    }

    function ifNotePoint(obj, callback) {
        var noteIndex, set = {};
        for (var i = 0; i < obj.idea.notes.length; i++) {
            if (obj.idea.notes[i].id === req.query.notePoint) {
                noteIndex = i;
                break;
            }
        }
        if (noteIndex != undefined) {
            for (var i = 0; i < obj.idea.notes[noteIndex].points.length; i++) {
                if (obj.idea.notes[noteIndex].points[i].who == obj.payload.userId) {
                    obj.idea.notes[noteIndex].points.splice(i, 1);
                }
            }
            if (req.params.whereType === 'class') {
                set['classes.$.ideas'] = obj.ideasContainer.ideas;
                obj.SchoolModel.update({ _id: obj.schoolId, 'classes._id': obj.classId }, { $set: set }, sendResult);
            } else {
                set['ideas.$.' + req.params.detailType] = obj.idea[req.params.detailType];
                obj.UserModel.update({ _id: obj.req.params.whereId, 'ideas._id': obj.idea._id }, { $set: set }, sendResult);
            }

            function sendResult(err, result) {
                if (result) {
                    callback(null, {});
                } else {
                    utils.sendError(res, err);
                }
            }
        } else {
            utils.sendError(res, 'Note not found!');
        }
    }
}

function postIdea(req, res) {
    var payload = jwt.decode(req.headers['x-auth-token'], secretKey),
        UserModel = mrq.model(req, 'UserSchema'),
        params = req.params;
    if (params.whereType === 'user') {
        if (payload.userId === params.whereId) {
            UserModel.findById(payload.userId)
                .select('ideas')
                .exec(function(err, user) {
                    if (user) {
                        req.body.who = payload.userId;
                        user.ideas.push(req.body);
                        user.save(function(err, result) {
                            if (result) {
                                res.status(200).send(result.ideas[result.ideas.length - 1])
                            } else {
                                utils.sendError(res, err)
                            }
                        })
                    } else {
                        utils.sendError(res, err);
                    }
                })
        } else {
            UserModel.find({ _id: { $in: [payload.userId, req.params.whereId] } })
                .select('ideas')
                .exec(function(err, users) {
                    var ideasContainer;
                    if (!users) {
                        utils.sendError(res, err);
                    } else {
                        if (users[0] && users[0].id == payload.userId) {
                            ideasContainer = users[1];
                        } else if (users[1] && users[1].id == payload.userId) {
                            ideasContainer = users[0];
                        } else {
                            utils.sendError(res, 'User not found!');
                        }
                        if (!ideasContainer) {
                            utils.sendError(res, 'User not found!');
                        } else {
                            req.body.who = payload.userId;
                            ideasContainer.ideas.push(req.body);
                            ideasContainer.save(function(err, result) {
                                if (result) {
                                    res.status(200).send(result.ideas[result.ideas.length - 1])
                                } else {
                                    utils.sendError(res, err)
                                }
                            })
                        }
                    }
                })
        }
    } else if (params.whereType === 'class') {
        UserModel.findById(payload.userId)
            .select('userType school studentDetails.class')
            .exec(function(err, user) {
                if (user) {
                    req.body.who = payload.userId;
                    user.populate('school', 'classes.ideas classes._id', function(err, user) {
                        if (user) {
                            var classId, classIndex;
                            if (user.userType === 'student') {
                                classId = user.studentDetails.class;
                            } else {
                                classId = req.params.whereId;
                            }
                            for (var i = 0; i < user.school.classes.length; i++) {
                                if (user.school.classes[i]._id == classId) {
                                    classIndex = i;
                                }
                            }
                            user.school.classes[classIndex].ideas.push(req.body);
                            user.school.save(function(err3, school) {
                                if (school) {
                                    res.status(200).send(school.classes[classIndex].ideas[school.classes[classIndex].ideas.length - 1]);
                                } else {
                                    utils.sendError(res, err3);
                                }
                            })
                        } else {
                            utils.sendError(res, err);
                        }
                    });
                } else {
                    utils.sendError(res, err);
                }
            })
    }
}

function getIdeaOnly(req, res) {
    var obj;

    async.waterfall([initiateObj, getIdea], function(error, obj) {
        if (obj) {
            var url = {
                    name: 'Idea',
                    params: {
                        whereType: req.params.whereType,
                        whereId: req.params.whereType === 'class' ? obj.ideasContainer._id : req.params.whereId,
                        ideaId: req.params.ideaId
                    }
                },
                notif;
            url = JSON.stringify(url);
            for (var i = 0; i < obj.me.newNotifications.length; i++) {
                notif = obj.me.newNotifications[i];
                if (notif.url === url) {
                    obj.me.oldNotifications.unshift(notif);
                    obj.me.newNotifications.splice(i, 1);
                    obj.me.save();
                }
            }
            obj.idea = JSON.parse(JSON.stringify(obj.idea));
            if (obj.ideasContainer.id != obj.idea.who.id) {
                obj.idea.where = {
                    type: req.params.whereType,
                    name: obj.ideasContainer.name,
                    id: req.params.whereId
                }
            }
            utils.castIdea(obj.idea, obj.payload.userId);
            res.status(200).send(obj.idea);
        } else {
            utils.sendError(res, error);
        }
    })

    function initiateObj(callback) {
        obj = {
            req: req,
            res: res,
            payload: jwt.decode(req.headers['x-auth-token'], secretKey)
        }
        callback(null, obj);
    }
}

function deleteIdea(req, res) {
    var payload = jwt.decode(req.headers['x-auth-token'], secretKey),
        UserModel = mrq.model(req, 'UserSchema'),
        params = req.params;
    if (params.whereType === 'user') {
        if (params.whereId === payload.userId) {
            UserModel.findById(payload.userId).exec(function(err, user) {
                if (user) {
                    for (var i = 0; i < user.ideas.length; i++) {
                        if (user.ideas[i].id === params.ideaId) {
                            user.ideas.splice(i, 1);
                        }
                    }
                    user.save(function(err, result) {
                        if (result) {
                            res.status(200).send([]);
                        } else {
                            utils.sendError(res, err);
                        }
                    })
                } else {
                    utils.sendError(res, err);
                }
            })
        } else {
            UserModel.find({ _id: { $in: [payload.userId, req.params.whereId] } })
                .select('ideas')
                .exec(function(err, users) {
                    var ideasContainer;
                    if (!users) {
                        utils.sendError(res, err);
                    } else {
                        if (users[0] && users[0].id == payload.userId) {
                            ideasContainer = users[1];
                        } else if (users[1] && users[1].id == payload.userId) {
                            ideasContainer = users[0];
                        } else {
                            utils.sendError(res, 'User not found!');
                        }
                        if (!ideasContainer) {
                            utils.sendError(res, 'User not found!');
                        } else {
                            for (var i = 0; i < ideasContainer.ideas.length; i++) {
                                if (ideasContainer.ideas[i].id === params.ideaId) {
                                    ideasContainer.ideas.splice(i, 1);
                                }
                            }
                            ideasContainer.save(function(err, result) {
                                if (result) {
                                    res.status(200).send([]);
                                } else {
                                    utils.sendError(res, err);
                                }
                            })
                        }
                    }
                })
        }
    } else if (params.whereType === 'class') {
        UserModel.findById(payload.userId)
            .select('userType school studentDetails.class')
            .exec(function(err, user) {
                if (user) {
                    req.body.who = payload.userId;
                    user.populate('school', 'classes.ideas classes._id', function(err, user) {
                        if (user) {
                            var classId, classIndex;
                            if (user.userType === 'student') {
                                classId = user.studentDetails.class;
                            } else {
                                classId = req.params.whereId;
                            }
                            for (var i = 0; i < user.school.classes.length; i++) {
                                if (user.school.classes[i]._id == classId) {
                                    classIndex = i;
                                }
                            }
                            for (var i = 0; i < user.school.classes[classIndex].ideas.length; i++) {
                                if (user.school.classes[classIndex].ideas[i].id === params.ideaId) {
                                    user.school.classes[classIndex].ideas.splice(i, 1);
                                }
                            }
                            user.school.save(function(err3, school) {
                                if (school) {
                                    res.status(200).send([]);
                                } else {
                                    utils.sendError(res, err3);
                                }
                            })
                        } else {
                            utils.sendError(res, err);
                        }
                    });
                } else {
                    utils.sendError(res, err);
                }
            })
    }
}

function getIdea(obj, callback) {
    var UserModel = mrq.model(obj.req, 'UserSchema');
    var SchoolModel = mrq.model(obj.req, 'SchoolSchema');
    var populateSelect = obj.req.method === 'GET' && !obj.req.params.detailType ? ' oldNotifications newNotifications' : ''
    var populateSelectWho = obj.req.method === 'GET' ? ' ideas.' + obj.req.params.detailType + '.who' : ''
    obj.UserModel = UserModel;
    if (obj.req.params.whereType === 'user') {
        if (obj.payload.userId === obj.req.params.whereId) {
            UserModel.findOne({ _id: obj.payload.userId }, { ideas: { $elemMatch: { _id: obj.req.params.ideaId } } })
                .populate(obj.req.params.detailType === 'reLives' ? '' : 'ideas.who' + populateSelectWho, 'name myImage')
                .select('name myImage' + populateSelect)
                .exec(function(err, user) {
                    if (user) {
                        obj.idea = user.ideas[0];
                        obj.ideasContainer = user;
                        obj.me = user;
                        callback(null, obj);
                    } else {
                        utils.sendError(obj.res, err);
                    }
                })
        } else {
            UserModel.find({ _id: { $in: [obj.payload.userId, obj.req.params.whereId] } }, { ideas: { $elemMatch: { _id: obj.req.params.ideaId } } })
                .populate(obj.req.params.detailType === 'reLives' ? '' : 'ideas.who' + populateSelectWho, 'name myImage' + populateSelect)
                .select('name myImage' + populateSelect)
                .exec(function(err, users) {
                    if (!users) {
                        utils.sendError(obj.res, err);
                    } else {
                        if (users[0] && users[0].id == obj.payload.userId) {
                            obj.idea = users[1].ideas[0];
                            obj.ideasContainer = users[1];
                            obj.me = users[0];
                        } else if (users[1] && users[1].id == obj.payload.userId) {
                            obj.idea = users[0].ideas[0];
                            obj.ideasContainer = users[0];
                            obj.me = users[1];
                        } else {
                            utils.sendError(obj.res, 'User not found!');
                        }
                        if (!obj.ideasContainer) {
                            utils.sendError(obj.res, 'User not found!');
                        } else {
                            callback(null, obj);
                        }
                        // obj.res.send({});
                    }
                })
        }
    } else if (obj.req.params.whereType === 'class') {
        obj.SchoolModel = SchoolModel;
        UserModel.findById(obj.payload.userId)
            .select('name myImage userType school studentDetails.class' + populateSelect)
            .exec(function(err, user) {
                if (!user) {
                    utils.sendError(obj.res, err);
                } else {
                    obj.me = user;
                    obj.schoolId = user.school;
                    if (user.userType === 'student') {
                        obj.classId = user.studentDetails.class;
                    } else {
                        obj.classId = obj.req.params.whereId;
                    }
                    populateSelectWho = ' classes.ideas.' + obj.req.params.detailType + '.who';
                    SchoolModel.findOne({ _id: user.school }, { classes: { $elemMatch: { _id: obj.classId } } })
                        .populate('classes.ideas.who' + populateSelectWho, 'name myImage')
                        .select('classes.ideas classes.name classes._id')
                        .exec(function(err, school) {
                            if (school) {
                                obj.ideasContainer = school.classes[0];
                                for (var i = 0; i < obj.ideasContainer.ideas.length; i++) {
                                    if (obj.ideasContainer.ideas[i].id == obj.req.params.ideaId) {
                                        obj.idea = obj.ideasContainer.ideas[i];
                                    }
                                }
                                obj.parent = school;
                                callback(null, obj);
                            } else {
                                utils.sendError(obj.res, err);
                            }

                        })
                }
            })
    }
}