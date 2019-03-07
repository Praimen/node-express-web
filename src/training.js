require('dotenv').config();
const compression = require('compression');
const express = require('express');
const app = express();
const elasticsearch = require('elasticsearch');

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
  redirect: false,
  setHeaders: function (res, path, stat) {
    res.set({'x-timestamp': Date.now(),'cache-control': 'public, no-cache, max-age=0'})
  }
};




server.listen(2000, () => console.log('Example app listening on port 2000!'));


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
            let query = {"_id":req.body.username,"password":req.body.password};
            let projection = {"_id":1};
            let cursor = db.collection('account').find(query);
            cursor.project(projection);

            cursor.toArray().then(function(result) {
                console.log('inside the login jwt');
                let jwtToken = jwt.sign({username:result[0]._id}, process.env.JWT_SECRET);
                res.set('Authorization','Bearer '+ jwtToken);
                res.cookie('gameJWT', jwtToken);
                if(req.body.pathname != "/login" && req.body.pathname != ""){
                    res.redirect(req.body.pathname);
                }else{
                    res.redirect('/editor-test');
                }

                client.close();

            }).catch((err)=> {

                client.close();

                res.render('login', {title: 'Login Form', message: 'Incorrect Login Information '+ err});
            });

        });


    }else{

        res.render('login', {title: 'Login Form', message: 'Incorrect Login Information '});

    }

});

app.get('/profile',checkJWT,(req,res)=>{


    let contentVersionNum = parseInt(req.query.currentversion,10);


    mongo.connect(process.env.DB_CONN,function(err,client) {

        const db = client.db('training');

        let query = {_id: req.query.policynumber};

        let versionparams;

        if(req.query.draft){
            versionparams = {
                $set:{"currentdraftversion": contentVersionNum}
            };
        }else{
            versionparams = {
                $set:{"currentversion": contentVersionNum}
            };
        }

        let cursor = db.collection('versions').findOneAndUpdate(query,versionparams,{returnOriginal:false,upsert:true});

        cursor.then(function (result) {

            let rs = result.value;
            let versionparams ;
            var dynamicParams = {
                "_id":rs._id,
                "title":rs.title
            };
            let policyState = {
                status: "updated"
            }

            if(req.query.draft){
                dynamicParams.currentdraftversion = rs.currentdraftversion;
                dynamicParams.draftcontent = rs.versions[rs.currentdraftversion];


                versionparams = {
                    $set: dynamicParams
                };
                db.collection('searchdraft').findOneAndUpdate(query,versionparams,{upsert:true})
                policyState.final = 'draft'
            }else{

                dynamicParams.currentversion = rs.currentversion;
                dynamicParams.content = rs.versions[rs.currentversion];

                versionparams = {
                    $set: dynamicParams
                };
                db.collection('searchfinal').findOneAndUpdate(query,versionparams,{upsert:true})
                policyState.final = 'final'
            }

            let params = {
                $set: dynamicParams
            };
            let cursor2 =  db.collection('policies').findOneAndUpdate(query,params,{upsert:true});

            cursor2.then(function (result) {
                res.json(policyState)
                client.close();
            }).catch((err)=> {

                client.close();

            })


        }).catch((err)=> {
            client.close();
            res.json({status:err})
        })
    });


});











