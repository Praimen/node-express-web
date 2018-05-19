require('dotenv').config();
const compression = require('compression');
const express = require('express');
const app = express();
var path = require('path');
var mongo = require('mongodb').MongoClient;
var server = require('http').Server(app);
var bodyParser = require('body-parser');
var routes = require('./routes/index');

var keystone = require('keystone');
var dbConnection = process.env.DB_CONN;
keystone.init({

    'name': 'My Project',

    'favicon': 'public/favicon.ico',
    'port':4000,
    'less': 'public',
    'static': ['public'],

    'views': 'templates/views',
    'view engine': 'pug',

    'auto update': true,
    'mongo': dbConnection,

    'session': false,
    'auth': true,
    'user model': 'User',
    'cookie secret': 'cookieSecret'

});



keystone.import('./models');

/*keystone.set('routes', require('./routes'));*/
keystone.set('app', app);

app.use('/', routes(keystone));

app.use('/keystone', require('keystone/admin/server/app/createStaticRouter.js')(keystone));
app.use('/keystone', require('keystone/admin/server/app/createDynamicRouter.js')(keystone));

keystone.start();


/*var router = require('./router');

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
};*/

/*server.listen(4000, () => console.log('Example app listening on port 4000!'));*/

/*


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
app.use(bodyParser.urlencoded({ extended: false }));


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
        /!* res.status(401).json({message:"passwords did not match"});*!/
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
                res.redirect('/character-select');

                client.close();

            }).catch((err)=> {

                client.close();

                res.render('login', {title: 'Login Form', message: 'Incorrect Login Information '+ err});
            });

        });


    }else{


        /!* res.status(401).json({message:"passwords did not match"});*!/
    }

})
*/







