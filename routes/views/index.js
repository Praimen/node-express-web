/**
 * Created by Praimen on 5/19/2018.
 */
var keystone = require('keystone');

exports = module.exports = function(req, res) {

    var view = new keystone.View(req, res);

    view.render('index');

}