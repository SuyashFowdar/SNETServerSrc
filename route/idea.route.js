var express = require('express');

module.exports = function(controller) {

    var router = express.Router();

    router.route('/details/:whereType/:whereId/:ideaId/:detailType')
        .get(controller.getIdeaDetails)
        .post(controller.postIdeaDetail)

    router.route('/details/:whereType/:whereId/:ideaId/:detailType/:detailId')
        .delete(controller.deleteIdeaDetail)

    router.route('/:whereType/:whereId')
        .post(controller.postIdea)

    router.route('/:whereType/:whereId/:ideaId')
        .get(controller.getIdeaOnly)
        .delete(controller.deleteIdea)

    return router;

};