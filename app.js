var express = require('express'),
    bodyparser = require('body-parser'),
    mongoose = require('mongoose'),
    mrq = require('mongoose-rest-query'),
    jwt = require('jsonwebtoken'),
    app = express(),
    http = require('http').Server(app);

var middleware = require('./middleware');
var config = require('./app.config');

mongoose.Promise = global.Promise;

app.use(require('morgan')('tiny'));

app.use(mrq.db);
app.use(middleware.cors);
mrq.config.modelSchemas = require('./model');
// app.use(middleware.clientValidate);

app.use(bodyparser.json({
    limit: '100mb'
}));
app.use(bodyparser.raw({
    type: 'binary/octet-stream',
    limit: '10mb'
}));
app.use(express.static('public'));

var restify = mrq.restify;

//router require
var ideaRouter = require('./route/idea.route'),
    listRouter = require('./route/list.route'),
    homeworkRouter = require('./route/homework.route'),
    userRouter = require('./route/user.route'),
    powerRouter = require('./route/power.route'),
    messageRouter = require('./route/message.route'),
    classRouter = require('./route/class.route'),
    schoolRouter = require('./route/school.route'),
    subjectRouter = require('./route/subject.route'),
    loginRouter = require('./route/login.route'),
    friendRouter = require('./route/friend.route');

//API list
app.use('/schema/users', restify('UserSchema'));
app.use('/schema/subjects', restify('SubjectSchema'));
app.use('/schema/logins', restify('LoginSchema'));
app.use('/schema/schools', restify('SchoolSchema'));
app.use('/schema/schoolvar', restify('SchoolVarSchema'));

app.post('/ctrl/file', require('./controller/file.controller').post);
app.post('/ctrl/uploadMyImage', require('./controller/file.controller').uploadMyImage);

app.get('/ctrl/mypage/:pageId', require('./controller/mypage.controller'));
app.get('/ctrl/search/:type/:search', require('./controller/search.controller'));
app.get('/ctrl/file/:id', require('./controller/file.controller').get);
app.get('/ctrl/board/:count', require('./controller/board.controller'));
app.get('/ctrl/chips/:type/:value', require('./controller/chips.controller'));
app.get('/ctrl/dummy', require('./controller/dummy.controller'));

app.delete('/ctrl/file/:id', require('./controller/file.controller').remove);

app.use('/power', powerRouter(require('./controller/power.controller')));
app.use('/ctrl/me', userRouter(require('./controller/user.controller')));
app.use('/ctrl/homework', homeworkRouter(require('./controller/homework.controller')));
app.use('/ctrl/ideas', ideaRouter(require('./controller/idea.controller')));
app.use('/ctrl/friend', friendRouter(require('./controller/friend.controller')));
app.use('/ctrl/list', listRouter(require('./controller/list.controller')));
app.use('/ctrl/message', messageRouter(require('./controller/message.controller')));
app.use('/ctrl/class', classRouter(require('./controller/class.controller')));
app.use('/ctrl/school', schoolRouter(require('./controller/school.controller')));
app.use('/ctrl/subject', subjectRouter(require('./controller/subject.controller')));
app.use('/ctrl/login', loginRouter(require('./controller/login.controller')));

var server = app.listen(config.port, function() {
        console.log('Port:', config.port);
    }),
    io = require('socket.io').listen(server),
    socketCtrl = require('./controller/socket.controller');

io.on('connection', function(socket) {

    socket.on('start', function(data) {
        var payload = jwt.decode(data, config.secretKey);
        socketCtrl.startSession(payload.userId, this);
        // socket.emit('updatesCount', { Notifications: 1 })
    })

    socket.on('disconnect', function() {
        socketCtrl.stopSession(this.id);
    })

});