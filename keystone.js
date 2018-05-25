'use strict';

require('dotenv').config();
var compression = require('compression');
var express = require('express');
var app = express();

var mongo = require('mongodb').MongoClient;
var server = require('http').Server(app);
var io = require('socket.io')(server);

var cookieParser = require('cookie-parser');

var path = require('path');
var bodyParser = require('body-parser');
var expressJWT = require('express-jwt');
var jwt = require('jsonwebtoken');
var urlEncodedForm;

var options = {
    dotfiles: 'ignore',
    etag: false,
    extensions: ['htm', 'html'],
    index: false,
    maxAge: '1d',
    redirect: false,
    setHeaders: function setHeaders(res, path, stat) {
        res.set('x-timestamp', Date.now());
    }
};

server.listen(4000, function () {
    return console.log('Example app listening on port 4000!');
});

app.set('view engine', 'pug');
app.set('views', './views');

app.use(compression());
app.use(cookieParser());

function checkJWT(req, res, next) {

    if (req.cookies.gameJWT) {
        var decoded = jwt.verify(req.cookies.gameJWT, process.env.JWT_SECRET);
        if (decoded) {
            req.jwt = decoded;
        }
        next();
    } else {
        next(new Error('No JWT cookie found'));
    }
}

app.use(express.static(path.join(__dirname, 'public'), options));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: false, limit: '5mb' }));

app.all('/', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    next();
});

app.get('/', function (req, res) {
    res.clearCookie('gameJWT');
    res.redirect('/login');
});

app.get('/registration', function (req, res) {
    res.clearCookie('gameJWT');
    res.render('registration', { title: 'Registration Form', message: '' });
});

app.post('/registration', function (req, res) {

    if (req.body.username != "" && req.body.password != "") {

        mongo.connect(process.env.DB_CONN, function (err, client) {

            var db = client.db('game');

            var updateObj = {
                "_id": req.body.username,
                "acctType": "REG",
                "acctStatus": "CURRENT",
                "acctID": "",
                "acctCharArr": [],
                "currSelectedChar": {}
            };

            db.collection('account').insertOne(updateObj).then(function (doc) {

                if (!err) {
                    console.log(doc);
                    res.redirect('/login');
                } else {
                    console.log(err);
                }
                client.close();
            }).catch(function (err) {

                client.close();
                res.render('registration', { title: 'Registration Form', message: 'Unable to Register Account ' + err });
            });
        });
    } else {

        res.render('registration', { title: 'Registration Form', message: 'Incorrect Registration Information' });
        /* res.status(401).json({message:"passwords did not match"});*/
    }
});

app.get('/login', function (req, res) {

    res.clearCookie('gameJWT');
    res.render('login', { title: 'Login', message: '' });
});

app.post('/login', function (req, res) {

    if (req.body.username != "" && req.body.password != "") {

        mongo.connect(process.env.DB_CONN, function (err, client) {

            var db = client.db('game');
            var query = { "_id": req.body.username };
            var projection = { "_id": 1 };
            var cursor = db.collection('account').find(query);
            cursor.project(projection);

            cursor.toArray().then(function (result) {
                console.log('inside the login jwt');
                var jwtToken = jwt.sign({ username: result[0]._id }, process.env.JWT_SECRET);
                res.set('Authorization', 'Bearer ' + jwtToken);
                res.cookie('gameJWT', jwtToken);
                res.redirect('/editor-test');

                client.close();
            }).catch(function (err) {

                client.close();

                res.render('login', { title: 'Login Form', message: 'Incorrect Login Information ' + err });
            });
        });
    } else {

        /* res.status(401).json({message:"passwords did not match"});*/
    }
});

app.param('policynumber', function (req, res, next, value) {

    req.policynumber = value;

    next();
});

app.get('/editor-test/:policynumber', function (req, res, next) {

    mongo.connect(process.env.DB_CONN, function (err, client) {

        var db = client.db('editor');
        var policynumber = req.policynumber;
        console.log('policy number', policynumber);
        var query = { _id: policynumber };
        var project;

        project = {
            _id: 1,
            title: 1,
            content: 1,
            contentversion: 1
        };

        var cursor = db.collection('policies').findOne(query, { projection: project });

        // let cursor = db.collection('policies').find({});

        cursor.then(function (result) {
            var rs = result;
            console.log(rs);

            var pageRenderObj = {
                title: 'Editor Test',
                message: 'saved content: ' + rs.title,
                policynumber: rs._id,
                policytitle: rs.title,
                contentversionarr: rs.content
            };

            pageRenderObj.editorcontent = rs.content[rs.contentversion];
            pageRenderObj.currentversion = rs.contentversion;

            res.render('editor', pageRenderObj);
            client.close();
        }).catch(function (err) {

            client.close();

            res.render('editor', { title: 'Editor Test', message: 'editor contents not saved: ' + err, policynumber: '', policytitle: '', contentversionarr: [] });
        });
    });
});

app.get('/editor-test', checkJWT, function (req, res) {

    res.render('editor', { title: 'Editor Test', message: 'update your content', policynumber: '', policytitle: '', contentversionarr: [] });
});

app.post('/editor-test', checkJWT, function (req, res) {

    mongo.connect(process.env.DB_CONN, function (err, client) {

        var db = client.db('editor');
        var policynumber = req.body.policynumber;
        var contentVersionNum = req.body.currentversion != "" ? parseInt(req.body.currentversion, 10) : 0;
        var query = { _id: policynumber };
        var params, project;
        if (contentVersionNum) {
            params = {
                $set: { "currentversion": contentVersionNum }
            };
        } else {
            params = {
                $set: { "title": req.body.policytitle },
                $push: { "content": req.body.editorcontent }
            };
        }
        project = {
            _id: 1,
            title: 1,
            content: 1,
            contentversion: 1
        };

        var cursor = db.collection('policies').findOneAndUpdate(query, params, { returnOriginal: false, projection: project, upsert: true });

        // let cursor = db.collection('policies').find({});

        cursor.then(function (result) {
            var rs = result.value;
            console.log(result);

            var pageRenderObj = {
                title: 'Editor Test',
                message: 'saved content: ' + rs.title,
                policynumber: rs._id,
                policytitle: rs.title,
                contentversionarr: rs.content
            };

            if (contentVersionNum) {
                pageRenderObj.editorcontent = rs.content[contentVersionNum];
            } else {
                pageRenderObj.editorcontent = rs.content[rs.content.length - 1];
            }

            pageRenderObj.currentversion = rs.contentversion;

            res.render('editor', pageRenderObj);
            client.close();
        }).catch(function (err) {

            client.close();

            res.render('editor', { title: 'Editor Test', message: 'editor contents not saved: ' + err, policynumber: '', policytitle: '', contentversionarr: [] });
        });
    });
});