var express = require('express');

module.exports = function(controller) {

    var router = express.Router();

    router.route('/')
        .post(controller.send)

    router.route('/:id')
        .get(controller.fetch)
        .delete(controller.remove)

    return router;

};