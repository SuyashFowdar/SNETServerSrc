module.exports = {
    getSchool: getSchool,
    getSettings: getSettings,
    saveSettings: saveSettings,
    getTimetable: getTimetable,
    saveTimetable: saveTimetable
};

function getSchool(req, res) {
    var mrq = require('mongoose-rest-query');
    var jwt = require('jwt-simple');
    var UserModel = mrq.model(req, 'UserSchema');
    var SchoolModel = mrq.model(req, 'SchoolSchema');

    var payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

    UserModel.findById(payload.userId)
        .exec(function(err, user) {
            if (user) {
                getSchoolData(true);
            } else {
                getSchoolData(false);
            }
        })

    function getSchoolData(hasUser) {
        SchoolModel.findOne({ code: req.params.code })
            .exec(function(err, school) {
                if (school) {
                    var tab;
                    school = JSON.parse(JSON.stringify(school));
                    school.hasUser = hasUser;
                    if (req.query.tab) {
                        for (var i = 0; i < school.tabs.length; i++) {
                            if (school.tabs[i].title == req.query.tab) {
                                tab = school.tabs[i];
                            }
                        }
                        if (tab) {
                            res.status(200).send(tab);
                        } else {
                            res.status(500).send(err || new Error(500));
                        }
                    } else {
                        for (var i = 0; i < school.tabs.length; i++) {
                            school.tabs[i].contents = null;
                        }
                        res.status(200).send(school);
                    }
                } else {
                    res.status(500).send(err || new Error(500));
                }
            })
    }

}

function getSettings(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        UserModel = mrq.model(req, 'UserSchema'),
        payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

    UserModel.findById(payload.userId)
        .select('school')
        .populate('school', 'name code periodTimes classes._id classes.name')
        .exec(function(err, user) {
            if (user) {
                res.send(user.school);
            } else {
                res.status(500).send(err || 'User not found!');
            }
        })
}

function saveSettings(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        UserModel = mrq.model(req, 'UserSchema'),
        SchoolModel = mrq.model(req, 'SchoolSchema'),
        payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

    SchoolModel.update({ _id: req.body.id }, { $set: req.body }, function(err, result) {
        res.send({ success: true })
    })

    // UserModel.findById(payload.userId)
    //     .populate('school', 'code')
    //     .exec(function(err, user) {
    //         // console.log('result', result);
    //         console.log('user.school', user.school);
    //         for (var i = 0, keys = Object.keys(req.body); i < keys.length; i++) {
    //             user.school[keys[i]] = req.body[keys[i]];
    //         }
    //         console.log('user.school', user.school);
    //         user.school.save();
    //         res.send({ success: true });
    //     })
}

function getTimetable(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        UserModel = mrq.model(req, 'UserSchema'),
        payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

    UserModel.findById(payload.userId)
        .select('school')
        .populate({
            path: 'school',
            select: { classes: { $elemMatch: { _id: req.params.classId } }, 'classes._id': 1, 'classes.weeklyTimetable': 1 }
        })
        .exec(function(err, user) {
            if (user) {
                res.send(user.school.classes[0].weeklyTimetable);
            } else {
                res.status(500).send(err || 'User not found!');
            }
        })
}

function saveTimetable(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        UserModel = mrq.model(req, 'UserSchema'),
        SchoolModel = mrq.model(req, 'SchoolSchema'),
        payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

    UserModel.findById(payload.userId)
        .select('school')
        .exec(function(err, user) {
            SchoolModel.update({ _id: user.school, 'classes._id': req.params.classId }, { $set: { 'classes.$.weeklyTimetable': req.body } }, function(err, result) {
                res.send({ success: true })
            })
        })

}