var fs = require('fs'),
    async = require('async'),
        mongoose = require('mongoose'),
        multiparty = require('multiparty'),
        Grid = require('gridfs-stream'),
        utils = require('../app.utils');

module.exports = {
    post: post,
    get: get,
    remove: remove,
    uploadMyImage: uploadMyImage
};

function uploadMyImage(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        UserModel = mrq.model(req, 'UserSchema'),
        payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

    req.toReturn = true;
    async.waterfall([function(callback) {
            var obj = {
                req: req,
                res: res
            };
            callback(null, obj);
        }, saveFile,
        function(fileList, callback) {
            UserModel.findById(payload.userId)
                .select('myImage')
                .exec(function(err, user) {
                    if (!user) {
                        utils.sendError(res, err);
                    } else {
                        user.myImage = fileList[0].id;
                        user.save(function(err, user) {
                            if (!user) {
                                utils.sendError(res, err);
                            } else {
                                callback(null, { id: user.myImage });
                            }
                        })
                    }
                })
        }
    ], function(err, result) {
        if (result) {
            res.status(200).send(result);
        } else {
            utils.sendError(res, err);
        }
    })
}

function post(req, res) {
    var mrq = require('mongoose-rest-query'),
        jwt = require('jwt-simple'),
        UserModel = mrq.model(req, 'UserSchema'),
        payload = jwt.decode(req.headers['x-auth-token'], require('../app.config').secretKey);

    req.toReturn = true;
    async.waterfall([function(callback) {
        var obj = {
            req: req,
            res: res
        };
        callback(null, obj);
    }, saveFile], function(err, result) {
        if (result) {
            res.status(200).send(result);
        } else {
            utils.sendError(res, err);
        }
    })
}

function saveFile(obj, callbackPost) {
    var db = obj.req.client_db.db;
    var gfs = Grid(db, mongoose.mongo);
    var form = new multiparty.Form();

    form.parse(obj.req, function(err, fields, files) {
        if (files.file && (files.file.length > 0)) {
            var results = [];
            async.eachSeries(files.file, function(file, callback) {
                var fileId = mongoose.Types.ObjectId();
                var filename = file.originalFilename.split(' ').join('-');
                var writestream = gfs.createWriteStream({
                    _id: fileId,
                    filename: filename,
                    mode: 'w',
                    content_type: file.headers['content-type']
                });

                fs.createReadStream(file.path).pipe(writestream);

                writestream.on('close', function(f) {
                    results.push({ id: fileId, content_type: file.headers['content-type'] });
                    callback();
                });
            }, function() {
                callbackPost(null, results);
            });
        } else {
            obj.res.status(400).send({ url: '' });
        }
    });
}

function get(req, res) {

    var db = req.client_db.db;
    var gfs = Grid(db, mongoose.mongo);
    // gfs.collection(req.params.fileType);

    // gfs.findOne({ _id: req.params.id }, function(err, file) {
    //     if (err)
    //         res.status(500).send(err);
    //     else {
    //         console.log('file', file);
    gfs.exist({ _id: req.params.id }, function(err, found) {
        if (err) {
            res.status(500).send(err);
        } else if (found) {
            var readStream = gfs.createReadStream({ _id: req.params.id });
            readStream.pipe(res);
        } else {
            res.status(500).send({ message: 'File not found!' });
        }
    });
    //res.set('Content-Type', "application/force-download");
    // res.set('Content-Type', file.contentType);
    //     }
    // });
}

function remove(req, res) {
    var db = req.client_db.db;
    var gfs = Grid(db, mongoose.mongo);

    gfs.remove({ _id: req.params.id }, function(err, gridStore) {
        if (err) {
            res.status(500).send(err);
        } else {
            res.send({ success: true });
        }
    });
    // readStream.pipe(res);
}