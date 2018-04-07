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


var router = require('./router');
var birds = require('./birds');
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

server.listen(3000, () => console.log('Example app listening on port 3000!'));



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
/*app.use('/', router);*/
/*app.use('/birds', birds);*/


app.all('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");

  next();
});

app.get('/',(req, res) =>{
  res.clearCookie('gameJWT');
  res.redirect('/game.html');

});





app.post('/special.html', function (req, res) {

  if(req.body.username == "jake" && req.body.password == "tester"){
    var jwtToken = jwt.sign({username:req.body.username}, process.env.JWT_SECRET);

    res.set('Authorization','Bearer '+ jwtToken);
    res.cookie('gameJWT', jwtToken);
    res.redirect('/babylon')
  }else{
    res.render('index', {title: 'Login Error', message: 'Incorrect Login Information'})

   /* res.status(401).json({message:"passwords did not match"});*/


  }

});

app.use('/babylon',checkJWT, express.static(path.join(__dirname + '/public/gameproj')));
app.get('/babylon', checkJWT,
    function (req, res) {

      if(req.jwt.username == "jake"){

        res.sendFile(path.join(__dirname + '/public/gameproj/index.html'));

      }else{
        res.status(401).json({message:"page didn't work"});

      }

    }
);




app.get('/update', function (req, res) {
  res.send('Got a PUT request at /update')
});

app.get('/jsontest', function (req, res) {
  res.json({cat:"meow"})
});


var roomQueue = [];
var roomQueueFull = [];
var roomName;
//key:value  --> key:client , value:room's client
var usersConnected = {};


io.on('connection', function(socket){

    console.log("Connected succesfully to the socket ...");
    var connection = "...cause we're connected";
    var characterBuilder = {};


    mongo.connect(process.env.DB_CONN,function(err,client){
        console.log('trying to connect to mongodb')
        const db = client.db('game');

        var query = {};
        var projection = {"playerAccountList":1,"_id":0};

        var cursor = db.collection('gistate').find(query);
        cursor.project(projection);

        cursor.forEach(
            function(doc){
                socket.emit('connected',doc);
            },
            function(err){
                console.log(err)
                return  client.close();
            }
        )

    });

    socket.on('push_player',(playerCharObj)=>{
        console.log('push account to array');
        mongo.connect(process.env.DB_CONN,function(err,client){
            console.log('trying to connect to mongodb')
            const db = client.db('game');
            /*var playerAccount = playerCharObj._id;*/
            console.log('push account to array',playerCharObj._id);

            db.collection('gistate').find({"playerAccountList._id":playerCharObj._id}).toArray(function(err,docs) {

                if(docs.length == 0 && playerCharObj._id != undefined ){

                    db.collection('gistate').update({},{$push:{"playerAccountList":playerCharObj}});


                }else{
                    console.log('There is already a character that exists: ',docs);
                    client.close();
                }

            })

        });

    });


    socket.on('player_move',(playerMeshData)=>{

        socket.broadcast.emit('broadcast_player_move',playerMeshData)

    })





    console.log("Client " + socket.id + " connected");
    socket.on('player_join_gi', function () {

        roomName = "gameRoom";// this will eventually be the player location room
        usersConnected[socket.id] = roomName;

        roomQueue.push(usersConnected[socket.id]);

        socket.join(roomName);

       // socket.emit('player_joined_gi');

       // var clientsInRoom = io.sockets.adapter.rooms[room];

    });




    socket.on('player select', (msg)=>{
        console.log('player select', msg);
        socket.emit('build character');
    });

    socket.on('player character',function(msg){
        console.log('player character: ' + msg);
        if(msg){
          characterBuilder["_character"] = msg;

          socket.emit('need stats');
        }
    });

    socket.on('player stats',function(msg){
        console.log('player stats: ' + msg);
        if(msg){
            characterBuilder["_stats"] = msg;
        }

        socket.emit('character built', characterBuilder);
    });

    socket.on('need account',(acctID)=>{
        console.log('I need an account');
        mongo.connect(process.env.DB_CONN,function(err,client){
            console.log('trying to connect to mongodb')
            const db = client.db('game');

            db.collection('account').find({"_id":acctID}).toArray(function(err,docs){
                if(!err){
                    io.in(roomName).emit('got account',docs);
                  console.log('should have documents')
                }

                client.close();
            });

        });

    });

    socket.on('query_char_items',(itemArr)=>{
        console.log('I need character items')

        mongo.connect(process.env.DB_CONN,function(err,client){
            console.log('trying to connect to mongodb');
            const db = client.db('game');
            console.log('here is the items to string:' ,itemArr.toString());
            db.collection('items').find({"_id":{$in: itemArr}}).toArray(function(err,docs){
                if(!err){
                   socket.emit('return_char_items',docs);
                    console.log('should have some items')
                }

                client.close();
            })

        });

    })







    socket.on('disconnect', function () {
        console.log("Client " + socket.id + " disconnected");


        delete usersConnected[socket.id];
        roomQueue.shift();

        //socket.broadcast.to(roomClientRemoved).emit('bye', "");
    });


});






