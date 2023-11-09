module.exports = {
    getClass: getClass,
    getStudents: getStudents,
    saveStudents: saveStudents
};

function getClass(req, res) {
    var mrq = require('mongoose-rest-query'),
        utils = require('../app.utils'),
        obj = {},
        async = require('async');

    async.waterfall([getUser, getSchool, castClass], function(error, userClass) {
        if (userClass) {
            res.status(200).send(userClass);
        } else {
            utils.sendError(res, error);
        }

    })

    function getUser(callback) {
        var jwt = require('jwt-simple'),
            UserModel = mrq.model(req, 'UserSchema'),
            select;

        obj.payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

        if (req.query.id) {
            select = 'userType school teacherDetails.subjects teacherDetails.classes'
        } else {
            select = 'userType school studentDetails.class studentDetails.subjects'
        }

        UserModel.findById(obj.payload.userId)
            .select(select)
            .populate('teacherDetails.subjects', 'name')
            .exec(function(err, user) {
                if (user) {
                    obj.user = JSON.parse(JSON.stringify(user));
                    callback(null, obj);
                } else {
                    utils.sendError(res, err)
                }
            })
    }

    function getSchool(obj, callback) {
        var SchoolModel = mrq.model(req, 'SchoolSchema'),
            classId;

        if (obj.user.userType === 'student') {
            classId = obj.user.studentDetails.class;
        } else {
            classId = req.query.id;
        }
        SchoolModel.findOne({ _id: obj.user.school }, { classes: { $elemMatch: { _id: classId } } })
            .populate('classes.ideas.who classes.weeklyTimetable.periods.subjects.details', 'name myImage')
            .exec(function(err, school) {
                if (!school) {
                    utils.sendError(res, err);
                } else {
                    console.log('school.classes', school.classes);
                    res.send({});
                    // obj.class = JSON.parse(JSON.stringify(school.classes[0]));
                    // callback(null, obj);
                }
            })
    }

    function castClass(obj, callback) {
        obj.class.ideaList = [];
        for (var i = 0; i < obj.class.ideas.length; i++) {
            utils.castIdea(obj.class.ideas[i], obj.payload.userId);
            obj.class.ideaList.unshift(obj.class.ideas[i]);
        }
        delete obj.class.ideas;
        if (obj.user.userType === 'student') {
            generateStudentClassTimetable();
            delete obj.class.subjects;
        } else {
            for (var i = 0; i < obj.class.coordinators.length; i++) {
                if (obj.payload.userId == obj.class.coordinators[i]) {
                    obj.class.coordinated = true;
                    break;
                }
            }
            for (var i = 0; i < obj.user.teacherDetails.classes.length; i++) {
                if (req.query.id == obj.user.teacherDetails.classes[i]) {
                    obj.class.taught = true;
                    break;
                }
            }
            if (obj.class.taught) {
                generateTeacherClassTimetable();
            }
            delete obj.class.weeklyTimetable;
            delete obj.class.subjects;
        }
        callback(null, obj.class);

        function generateStudentClassTimetable() {
            for (var i = 0; i < obj.class.weeklyTimetable.length; i++) {
                day = obj.class.weeklyTimetable[i];
                for (var j = 0; j < day.periods.length; j++) {
                    day.periods[j].subject = checkSubject(obj.user.studentDetails.subjects, day.periods[j].subjects);
                    day.periods[j].subjects = null;
                }
            }
        }

        function generateTeacherClassTimetable() {
            if (obj.user.teacherDetails.subjects.length === 1) {
                obj.class.teacherSubjects = [obj.user.teacherDetails.subjects[0]];
            }
            obj.class.teacherTimetable = {};
            for (var i = 0; i < obj.class.weeklyTimetable.length; i++) {
                day = obj.class.weeklyTimetable[i];
                for (var j = 0; j < day.periods.length; j++) {
                    for (var k = 0; k < day.periods[j].subjects.length; k++) {
                        subject = day.periods[j].subjects[k];
                        if (subject.by == obj.payload.userId) {
                            if (obj.class.teacherSubjects.length > 1) {
                                addSubject(subject.details, user.teacherDetails.subjects);
                            } else {
                                addHomework(obj.class.teacherSubjects[0]);
                            }
                            if (obj.class.teacherTimetable[day.day]) {
                                obj.class.teacherTimetable[day.day].push({ which: day.periods[j].which });
                            } else {
                                obj.class.teacherTimetable[day.day] = [{ which: day.periods[j].which }];
                            }
                        }
                    }
                }
            }
        }

        function addSubject(periodSubject, teacherSubjects) {
            for (var j = 0; j < teacherSubjects.length; j++) {
                if (periodSubject.id == teacherSubjects[j].id) {
                    for (var k = 0; k < obj.class.teacherSubjects.length; k++) {
                        if (obj.class.teacherSubjects[k].id == teacherSubjects[j].id) {
                            subjectPresent = true;
                            break;
                        }
                    }
                    if (!subjectPresent) {
                        addHomework(periodSubject);
                        obj.class.teacherSubjects.push(periodSubject);
                    } else {
                        subjectPresent = false;
                    }
                }
            }
        }

        function addHomework(subject) {
            if (!subject.hasOwnProperty('homeworks')) {
                for (var i = 0; i < obj.class.subjects.length; i++) {
                    if (obj.class.subjects[i].subject == subject.id) {
                        subject.homeworks = obj.class.subjects[i].homeworks;
                        break;
                    }
                }
            }
        }

        function checkSubject(studentSubjects, periodSubjects) {
            for (var i = 0; i < periodSubjects.length; i++) {
                for (var j = 0; j < studentSubjects.length; j++) {
                    if (studentSubjects[j] == periodSubjects[i].details.id) {
                        return periodSubjects[i].details;
                    }
                }
            }
        }
    }

}

function getStudents(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        UserModel = mrq.model(req, 'UserSchema'),
        SchoolVarModel = mrq.model(req, 'SchoolVarSchema'),
        utils = require('../app.utils'),
        payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey),
        studentSelect;

    if (req.query.year) {
        studentSelect = 'studentDetails.performances name';
    } else {
        studentSelect = 'attendances name';
    }
    UserModel.findById(payload.userId)
        .select('school')
        .populate({
            path: 'school',
            select: { classes: { $elemMatch: { _id: req.params.classId } }, 'classes.students': 1 },
            populate: {
                path: 'classes.students',
                select: studentSelect
            }
        })
        .lean()
        .exec(function(err, teacher) {
            var date = new Date(),
                sclass = teacher.school.classes[0];
            if (req.query.year) {
                SchoolVarModel.findOne()
                    .exec(function(err, schoolvar) {
                        var perform;
                        for (var i = 0; i < sclass.students.length; i++) {
                            for (var j = 0; j < sclass.students[i].studentDetails.performances.length; j++) {
                                perform = sclass.students[i].studentDetails.performances[j];
                                if (perform.semester === parseInt(req.query.semester) && perform.year === parseInt(req.query.year) && perform.subject == req.query.subject) {
                                    sclass.students[i].performance = perform;
                                    break;
                                }
                            }
                            delete sclass.students[i].studentDetails;
                        }
                        res.send(sclass);
                    })
            } else {
                date = date.getDate() + '/' + date.getMonth() + '/' + date.getFullYear();
                for (var i = 0; i < sclass.students.length; i++) {
                    if (sclass.students[i].attendances) {
                        for (var j = 0; j < sclass.students[i].attendances.length; j++) {
                            if (sclass.students[i].attendances[j].date == date) {
                                sclass.students[i].attendance = true;
                                break;
                            }
                        }
                    }
                }
                res.send(sclass);
            }
        })
}

function saveStudents(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        UserModel = mrq.model(req, 'UserSchema'),
        payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey),
        perform = {
            subject: req.body.subject,
            year: req.body.year,
            semester: req.body.semester
        };

    for (var i = 0; i < req.body.users.length; i++) {
        perform.mark = req.body.users[i].mark;
        perform.remark = req.body.users[i].remark;
        if (!req.body.users[i].performId) {
            UserModel.update({ _id: req.body.users[i].id }, { $push: { 'studentDetails.performances': perform } }, function(err, result) {
                console.log('result', result);
            })
        } else {
            UserModel.update({
                _id: req.body.users[i].id,
                'studentDetails.performances._id': req.body.users[i].performId
            }, {
                $set: { 'studentDetails.performances.$.mark': perform.mark, 'studentDetails.performances.$.remark': perform.remark }
            }, function(err, result) {
                console.log('result', result);
            })
        }
        //if notExisted - $push else just the object
    }
    res.status(200).send({ success: true });
}