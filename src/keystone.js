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
    let decoded = jwt.verify(req.cookies.gameJWT, process.env.JWT_SECRET);
    if (decoded) {
      req.jwt = decoded;
    }
    next();
  }else{
      let noJWT = new Error('No JWT cookie found')
      res.render('login', {title: 'Login', message: noJWT})

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
  res.redirect('/policy-list');

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
                res.redirect('/policy-list');

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


app.get('/policy-list',(req, res) =>{

    mongo.connect(process.env.DB_CONN,function(err,client) {

        const db = client.db('editor');

        let query = {};
        let project;

        project = {
            _id:1,
            title: 1
        };


        let cursor = db.collection('policies').find(query,{projection:project});

        // let cursor = db.collection('policies').find({});

        cursor.toArray().then(function(result) {
            let rs = result;
            console.log(rs);

            let pageRenderObj = {
                title: "Policy List",
                message: 'here is the list of policies',
                policylistarr: rs,
                policytitle:'',
                policynumber:'',
                policycontent:''
            };

            res.render('policy-list', pageRenderObj );
            client.close();

        }).catch((err)=> {

            client.close();


        });

    });

});



app.get('/view-policy/:policynumber', function (req, res, next) {


    mongo.connect(process.env.DB_CONN,function(err,client) {

        const db = client.db('editor');
        let policynumber = req.params.policynumber;
        console.log('policy number', policynumber);
        let query = {_id: policynumber};
        let project;

        project = {
            _id:1,
            title: 1,
            content: 1,
            currentversion: 1
        };


        let cursor = db.collection('policies').findOne(query,{projection:project});

        // let cursor = db.collection('policies').find({});

        cursor.then(function(result) {
            let rs = result;
            console.log(rs);

            let pageRenderObj = {
                title: 'Policy #' +rs._id,
                message: 'last modified: '+ rs.content[rs.currentversion].versiondate,
                policynumber: rs._id,
                policytitle: rs.title,
                contentversionarr: rs.content
            };

            pageRenderObj.policycontent = rs.content[rs.currentversion].bodytext;

            res.render('view-policy', pageRenderObj );
            client.close();

        }).catch((err)=> {
            console.log('policy view error ', err);
            client.close();

            res.redirect('/policy-list')
        });

    });

});



app.get(['/editor-test/:policynumber','/editor-test/:policynumber/:currentversion'],checkJWT,(req,res)=>{

    let policyNumber = req.params.policynumber ;
    let contentVersionNum;
    if(req.params.currentversion){
        contentVersionNum = parseInt(req.params.currentversion,10);
        console.log('here are the policynumbner %s and the version %s', policyNumber, contentVersionNum);
    }

    mongo.connect(process.env.DB_CONN,function(err,client) {

        const db = client.db('editor');
        let query = {_id: policyNumber},
        project = {
            _id:1,
            title:1,
            content:1,
            currentversion:1
        };

        let cursor = db.collection('policies').findOne(query,{projection:project});

        cursor.then(function (result) {
            let rs = result;
            let contentVersion;
            console.log(result);

            let pageRenderObj = {
                title: 'Editor Test',
                message: 'saved content: ' + rs.title,
                policynumber: rs._id,
                policytitle: rs.title,
                contentversionarr: rs.content,
                currentversion : rs.currentversion
            };


            if(contentVersionNum && rs.content[contentVersionNum]){
                contentVersion = rs.content[contentVersionNum];
                console.log('Content version %d shoudl be %s',contentVersionNum,rs.content[contentVersionNum]);
            } else {
                contentVersion = rs.content[rs.currentversion];
            }



            pageRenderObj.editorcontent = contentVersion.bodytext;
            pageRenderObj.note = contentVersion.note;

            res.render('editor', pageRenderObj);
        }).catch((err) => {

            client.close();
            res.render('editor', {
                title: 'Editor Test',
                message: 'Policy was not submitted' + err,
                policynumber: '',
                policytitle: '',
                note: '',
                contentversionarr: []
            })

        });

    })
});

app.get('/editor-test',checkJWT,(req, res) =>{
    res.render('editor', {title: 'Editor Test', message: 'Enter a new Policy',policynumber:'',policytitle:'',note:'',contentversionarr:[]})
});


app.post('/editor-test',checkJWT,(req,res)=>{

    let policyNumber = req.body.policynumber;
    let contentVersionNum = (isNaN(parseInt(req.body.currentversion,10))) ? 0 : parseInt(req.body.currentversion,10);

    if(policyNumber){
        mongo.connect(process.env.DB_CONN,function(err,client) {

            const db = client.db('editor');

            let query = {_id: policyNumber};
            let params = {
                    $set:{"title": req.body.policytitle,"currentversion": contentVersionNum},
                    $push:{"content": {versiondate: new Date(),note:req.body.note,bodytext:req.body.editorcontent} }
                };


            let cursor = db.collection('policies').findOneAndUpdate(query,params,{upsert:true});
            cursor.then(function (result) {
                console.log(result);
                res.redirect('/editor-test/'+policyNumber+'/'+contentVersionNum);
                client.close();

            }).catch((err)=> {
                client.close();
                res.render('editor', {
                    title: 'Editor Test',
                    message: 'editor contents not saved: ' + err,
                    policynumber: '',
                    policytitle: '',
                    note: '',
                    contentversionarr: []
                })
            })
        });


    }else{
        res.redirect('/editor-test')
    }


});








