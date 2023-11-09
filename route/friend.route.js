var express = require('express');

module.exports = function(controller) {

    var router = express.Router();

    router.route('/:id')
        .post(controller.request)
        .put(controller.acceptReq)
        .delete(controller.remove)

    return router;

};