require('dotenv').config();
const compression = require('compression');
const express = require('express');
const app = express();

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
  setHeaders: function (res, path, stat) {
    res.set('x-timestamp', Date.now())
  }
};

server.listen(4000, () => console.log('Example app listening on port 4000!'));



app.set('view engine', 'pug');
app.set('views', './views');

app.use(compression());
app.use(cookieParser());

function checkJWT(req,res,next) {

  if (req.cookies.gameJWT) {
    var decoded = jwt.verify(req.cookies.gameJWT, process.env.JWT_SECRET);
    if (decoded) {
      req.jwt = decoded;
    }
    next();
  }else{
    next(new Error('No JWT cookie found'));
  }
}


app.use(express.static(path.join(__dirname,'public'),options));
app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({ extended: false,limit: '5mb' }));


app.all('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");

  next();
});

app.get('/',(req, res) =>{
  res.clearCookie('gameJWT');
  res.redirect('/login');

});

app.get('/registration',(req, res) =>{
    res.clearCookie('gameJWT');
    res.render('registration', {title: 'Registration Form', message: ''})
});

app.post('/registration', function (req, res) {

    if(req.body.username != "" && req.body.password != ""){

        
        mongo.connect(process.env.DB_CONN,function(err,client) {

            const db = client.db('game');

            let updateObj = {
                "_id" : req.body.username,
                "acctType" : "REG",
                "acctStatus" : "CURRENT",
                "acctID" : "",
                "acctCharArr" : [ ],
                "currSelectedChar" : { }
            };

            db.collection('account').insertOne(updateObj).then(function(doc){

                if(!err){
                    console.log(doc);
                    res.redirect('/login');
                }else{
                    console.log(err);
                }
                client.close();
            }).catch((err)=>{

                client.close();
                res.render('registration', {title: 'Registration Form', message: 'Unable to Register Account '+ err})
            });

        });

        
    }else{

        res.render('registration', {title: 'Registration Form', message: 'Incorrect Registration Information'});
        /* res.status(401).json({message:"passwords did not match"});*/
    }

});




app.get('/login',(req, res) =>{

    res.clearCookie('gameJWT');
    res.render('login', {title: 'Login', message: ''})

});

app.post('/login',(req,res)=>{

    if(req.body.username != "" && req.body.password != ""){


        mongo.connect(process.env.DB_CONN,function(err,client) {

            const db = client.db('game');
            let query = {"_id":req.body.username};
            let projection = {"_id":1};
            let cursor = db.collection('account').find(query);
            cursor.project(projection);

            cursor.toArray().then(function(result) {
                console.log('inside the login jwt')
                let jwtToken = jwt.sign({username:result[0]._id}, process.env.JWT_SECRET);
                res.set('Authorization','Bearer '+ jwtToken);
                res.cookie('gameJWT', jwtToken);
                res.redirect('/editor-test');

                client.close();

            }).catch((err)=> {

                client.close();

                res.render('login', {title: 'Login Form', message: 'Incorrect Login Information '+ err});
            });

        });


    }else{


        /* res.status(401).json({message:"passwords did not match"});*/
    }

});


app.param('policynumber', function (req, res, next, value) {
    req.body.policynumber = value;
    console.log(req.body.policynumber)
    next();
});

app.get('/editor-test/:policynumber', function (req, res, next) {

    mongo.connect(process.env.DB_CONN,function(err,client) {

        const db = client.db('editor');
        let policynumber = req.body.policynumber;
        console.log('policy number', policynumber)
        let query = {_id: policynumber};
        let project;

        project = {
            _id:1,
            title:1,
            content:1,
            contentversion:1
        };


        let cursor = db.collection('policies').findOne(query,{projection:project});

        // let cursor = db.collection('policies').find({});

        cursor.then(function(result) {
            let rs = result.value;
            console.log(rs);

            let pageRenderObj = {
                title: 'Editor Test',
                message: 'saved content: '+ rs.title,
                policynumber: rs._id,
                policytitle: rs.title,
                contentversionarr: rs.content
            };

            pageRenderObj.editorcontent = rs.content[rs.contentversion].bodytext;
            pageRenderObj.currentversion = rs.contentversion;
            pageRenderObj.note = rs.content[rs.contentversion].note;


            res.render('editor',pageRenderObj );
            client.close();

        }).catch((err)=> {

            client.close();

            res.render('editor', {title: 'Editor Test', message: 'editor contents not saved: '+ err,policynumber:'',policytitle:'',note:'',contentversionarr:[]})
        });

    });

});

app.get('/editor-test',checkJWT,(req, res) =>{
    res.render('editor', {title: 'Editor Test', message: 'update your content',policynumber:'',policytitle:'',note:'',contentversionarr:[]})
});


app.post('/editor-test',checkJWT,(req,res)=>{


        mongo.connect(process.env.DB_CONN,function(err,client) {

            const db = client.db('editor');
            let policynumber = req.body.policynumber;
            let contentVersionNum = (req.body.currentversion != "") ? parseInt(req.body.currentversion,10): 0;
            let query = {_id: policynumber};
            let params, project;
            if(contentVersionNum){
                params = {
                    $set:{"currentversion": contentVersionNum}
                }
            }else{
                params = {
                    $set:{"title": req.body.policytitle},
                    $push:{"content": {versiondate: new Date(),note:req.body.note,bodytext:req.body.editorcontent} }
                }
            }
            project = {
                _id:1,
                title:1,
                content:1,
                contentversion:1
            };


           let cursor = db.collection('policies').findOneAndUpdate(query,params,{returnOriginal:false,projection:project,upsert:true});

           // let cursor = db.collection('policies').find({});

            cursor.then(function(result) {
                let rs = result.value;
                let contentVersion;
                console.log(result);

                let pageRenderObj = {
                    title: 'Editor Test',
                    message: 'saved content: '+ rs.title,
                    policynumber: rs._id,
                    policytitle: rs.title,
                    contentversionarr: rs.content
                };

                if(contentVersionNum){
                    contentVersion = rs.content[contentVersionNum].bodytext;
                }else{
                    contentVersion = rs.content[rs.content.length - 1].bodytext;
                }

                pageRenderObj.editorcontent = contentVersion.bodytext;
                pageRenderObj.note = contentVersion.note;
                pageRenderObj.currentversion = rs.contentversion;

                res.render('editor',pageRenderObj);
                client.close();

            }).catch((err)=> {

                client.close();
                res.render('editor', {title: 'Editor Test', message: 'editor contents not saved: '+ err,policynumber:'',policytitle:'',note:'',contentversionarr:[]})
            });

        });

});








