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


app.get('/policy-list',(req, res) =>{

    mongo.connect(process.env.DB_CONN,function(err,client) {

        const db = client.db('editor');

        let query = {};
        let project;

        project = {
            _id:1,
            title: 1
        };

        let cursor = db.collection('policies').find(query,{projection:project, sort:{_id:1}});

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
            console.log('policy-list error: ' + err);
            client.close();


        });

    });

});


app.get('/policy-list/search',(req, res) =>{

    mongo.connect(process.env.DB_CONN,function(err,client) {

        const db = client.db('editor');
        let searchTerm = req.query.term;
        let query = {$text: { $search: '"\"'+searchTerm+'\""' }};

        let cursor =  db.collection('policies').aggregate([
            { $match:  query  },
            { $project: {id: "$_id", text:"$title"} }
        ]);


        cursor.toArray().then(function(result) {
            let rs = result;
            console.log(rs);
            let jsonObj = {
                "results": rs
            };

            res.json( jsonObj);
            client.close();

        }).catch((err)=> {
            console.log('policy-list search error: ' + err);
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
            currentversion:1,
            versions:1
        };

        let cursor = db.collection('versions').findOne(query,{projection:project});



        cursor.then(function(result) {
            let rs = result;
            console.log(rs);
            let contentVersion = rs.currentversion;

            let query = {_id: policynumber};

            project = {
                _id:1,
                title:1,
                content:1,

            };

            let cursor2 = db.collection('policies').findOne(query,{projection:project});

            cursor2.then(function (result2) {
                let rs = result2;

                let pageRenderObj = {
                    title: 'Policy #' +rs._id,
                    message: 'last modified: ',
                    policynumber: rs._id,
                    policytitle: rs.title
                };

                pageRenderObj.policycontent = rs.content.bodytext;
               // pageRenderObj.date = rs.versiondetail[contentVersion].versiondate;
                res.render('view-policy', pageRenderObj );

                client.close();
            }).catch((err)=> {
                client.close();
                let pageRenderObj = {
                    title: 'View Policy Error',
                    message: 'unable to view policy at this time: '+ err,
                    policynumber: "",
                    policytitle: ""
                };

                res.render('view-policy', pageRenderObj );
            })


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
            versions:1,
            currentversion:1,
        };

        let cursor = db.collection('versions').findOne(query,{projection:project});

        cursor.then(function (result) {
            let rs = result;

            if(!contentVersionNum){
                contentVersionNum = rs.currentversion;
            }

            let contentVersion,
                project = {
                    _id:1,
                    title:1,
                    currentversion:1
                },
                cursor2 = db.collection('policies').findOne(query,{projection:project});

            cursor2.then(function (result) {
                console.log(result);
                let rs2 = result.value;

                let pageRenderObj = {
                    title: 'Editor Test',
                    message: 'Successfully saved content for: ' + rs2.title,
                    policynumber: rs2._id,
                    policytitle: rs2.title,
                    contentversionarr: rs.versions

                };

                contentVersion = rs.versions[contentVersionNum];

                pageRenderObj.currentversion = contentVersionNum;
                pageRenderObj.editorcontent = contentVersion.bodytext;
                pageRenderObj.note = contentVersion.note;

                res.render('editor', pageRenderObj);
                client.close();

            }).catch((err)=> {
                console.log(err)
                client.close();

            })

        }).catch((err) => {
            console.log(err)
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
            //TODO aggregate maybe to find the length of the content and compare to version number being proposed by the frontend
            let versionparams = {
                $set:{"title": req.body.policytitle},
                $push:{"versions": {versiondate: new Date(),note:req.body.note,bodytext:req.body.editorcontent} }
            };
            let cursor = db.collection('versions').findOneAndUpdate(query,versionparams,{returnOriginal:false,upsert:true});

            cursor.then(function (result) {

                let rs = result.value,
                    params = {
                        $set:{"title": req.body.policytitle,"currentversion": contentVersionNum,"content":rs.versions[rs.currentversion]}
                    },
                    cursor2 =  db.collection('policies').findOneAndUpdate(query,params,{upsert:true});

                cursor2.then(function (result) {

                    res.redirect('/editor-test/'+policyNumber+'/'+contentVersionNum);
                    client.close();

                }).catch((err)=> {
                    console.log(err)
                    client.close();

                })

            }).catch((err)=> {
                console.log(err)
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




app.post('/version-update',checkJWT,(req,res)=>{

    let policyNumber = req.body.policynumber;
    let contentVersionNum = parseInt(req.body.currentversion,10);

    if(policyNumber){
        mongo.connect(process.env.DB_CONN,function(err,client) {

            const db = client.db('editor');

            let query = {_id: policyNumber},
                versionparams = {
                    $set:{"currentversion": contentVersionNum}
                },
                cursor = db.collection('versions').findOneAndUpdate(query,versionparams,{returnOriginal:false,upsert:true});

            cursor.then(function (result) {

                let rs = result.value,
                    versionparams = {
                        $set:{"currentversion": rs.currentversion, "content":rs.versions[rs.currentversion]},
                    },
                    cursor2 =  db.collection('policies').findOneAndUpdate(query,versionparams,{upsert:true});

                cursor2.then(function (result) {
                    res.json({status:"updated"})
                    client.close();
                }).catch((err)=> {
                    res.json({status:err})
                    client.close();

                })


            }).catch((err)=> {
                client.close();
                res.json({status:err})
            })
        });


    }else{
        res.redirect('/editor-test')
    }


});








