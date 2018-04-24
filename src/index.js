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
                res.redirect('/character-select');

                client.close();

            }).catch((err)=> {

                client.close();

                res.render('login', {title: 'Login Form', message: 'Incorrect Login Information '+ err});
            });

        });


    }else{


        /* res.status(401).json({message:"passwords did not match"});*/
    }

})

app.get('/character-select',checkJWT, function (req, res) {

    mongo.connect(process.env.DB_CONN,function(err,client) {

        const db = client.db('game');
        var query = {"_id":req.jwt.username};
        var projection = {"_id":1,"acctCharArr":1};
        var cursor = db.collection('account').find(query);
        cursor.project(projection);

        cursor.toArray().then(function(docs) {

            console.log('inside the character-select query ', docs)
                var result = docs[0];
                res.render('character-select', {
                    title: 'Character Account Select/Build',
                    message: 'select or build your character',
                    accountname: result._id,
                    characters: result.acctCharArr
                });



            client.close();
        }).catch((err)=> {

            client.close();

            res.render('login', {title: 'Login Form', message: 'Incorrect Login Information '+ err});
        });

    });



});


app.post('/character-select',checkJWT, function (req, res) {
    mongo.connect(process.env.DB_CONN,function(err,client) {

        const db = client.db('game');
        let query = {"_id": req.body.accountname};
        let cursor = db.collection('account').find(query);

        if (req.body.character != "" && req.jwt.username) {


            let characterProj = {acctCharArr: {$elemMatch: {charName: req.body.character}}};
            cursor.project(characterProj);
            cursor.toArray(function (err, docs) {

                if (!err) {

                    console.log("here is the element match array ", docs[0]);

                    db.collection('account').update(query, {$set: {currSelectedChar: docs[0].acctCharArr[0]}}).then(function (updatedDoc) {

                        console.log('here is the update for the account ', updatedDoc.result);

                        let transformDoc = {};
                        transformDoc["_id"] = docs[0]._id;
                        transformDoc["currSelectedChar"] = docs[0].acctCharArr[0];
                        db.collection('giplayers').insertOne(transformDoc, function (err, insertDoc) {
                            if (!err) {
                                console.log('here is the doc inserted', insertDoc.result);
                                client.close();
                                res.redirect('/babylon');
                            } else {
                                console.log('here is the insert Error ', err)
                            }
                        })
                    }).catch((err) => {
                        console.log(err)
                    });

                } else {
                    client.close();
                    res.redirect('/character-select');
                }

            });

        } else if (req.body.charactername) {
            let characterName = req.body.charactername;
            let characterRace = req.body.race;
            let characterAge = req.body.age;
            let characterClass = req.body.archetype;
            let characterLocation = {x: 1, y: 1, z: 1, zone: ""};

            cursor.toArray().then(function (characterDocs) {
                console.log('here is the character document ', characterDocs)
            });
            db.collection('account').updateOne(query, {
                $push: {
                    acctCharArr: {
                        charName: characterName,
                        age: characterAge,
                        race: characterRace,
                        archetype: characterClass,
                        items: [],
                        location: characterLocation

                    }
                }
            }).then(function (updatedoc) {
                console.log('character build', updatedoc)


                res.redirect('/character-select');
                client.close();
            }).catch((err) => {
                console.log(err)
                client.close();
            });


        }else{
            res.redirect('/login');
        }

    })


});





app.use('/babylon',checkJWT, express.static(path.join(__dirname + '/public/gameproj')));
app.get('/babylon', checkJWT,
    function (req, res) {

        if(req.jwt.username){

            res.sendFile(path.join(__dirname + '/public/gameproj/index.html'));

        }else{
            res.redirect('/login');
        }
    }
);









var roomQueue = [];
var roomQueueFull = [];
var roomName;
//key:value  --> key:client , value:room's client
var usersConnected = {};




function loadRoomNPCS(socket,roomName){

    mongo.connect(process.env.DB_CONN,function(err,client){
        console.log('trying to connect to mongodb')
        const db = client.db('game');

        var query = {};

        let cursor = db.collection('ginpcs').find(query);

        cursor.forEach(
            function(doc){
                if(doc.location.zone != roomName){
                    socket.emit('render_npc',doc);
                }

            },
            function(err){
                console.log(err)
                return  client.close();
            }
        )

    });

}

function loadOtherPlayer(socket,acctID){

    mongo.connect(process.env.DB_CONN,function(err,client){
        console.log('trying to connect to mongodb')
        const db = client.db('game');

        var query = {};

        let cursor = db.collection('giplayers').find(query);

        cursor.forEach(
            function(doc){
                if(doc._id != acctID){
                    socket.emit('render_other_players',doc);
                }

            },
            function(err){
                console.log(err)
                return  client.close();
            }
        )

    });

}


io.on('connection', function(socket){

    console.log("Connected succesfully to the socket ...");
    console.log("Client " + socket.id + " connected");
    var characterBuilder = {};


    socket.on('player_move',(playerMeshData)=>{

        socket.broadcast.emit('broadcast_player_move',playerMeshData)

    })

    socket.on('saved_player_position',(player)=>{

        mongo.connect(process.env.DB_CONN,function(err,client) {

            const db = client.db('game');
            var query = {"_id":player.id};

            db.collection('giplayers').update(query,{
                $set:{
                    "currSelectedChar.location.x": player.position.x,
                    "currSelectedChar.location.y": player.position.y,
                    "currSelectedChar.location.z": player.position.z
                }
            }).then(function(updatedDoc){

                console.log('here is the update the position for a player ', updatedDoc.result);



            }).catch((err)=>{console.log(err)});



        });


    })


    socket.on('load_player_to_gi', function (gameJWT) {
        let decoded = jwt.verify(gameJWT, process.env.JWT_SECRET);
        let acctID = decoded.username;

        roomName = "gameRoom";// this will eventually be the character zone room
        usersConnected[socket.id] = acctID;

        //roomQueue.push(usersConnected[socket.id]);

        socket.join(roomName);

        mongo.connect(process.env.DB_CONN,function(err,client){
            console.log('trying to connect to mongodb')
            const db = client.db('game');
            console.log('push account to array',acctID);
            db.collection('giplayers').find({"_id":acctID}).toArray(function(err,docs) {


                if(!err ){
                    console.log('is the array push working',docs[0]);
                    io.in(roomName).emit('player_joined_gi', docs[0]);
                    loadOtherPlayer(socket,acctID)
                    loadRoomNPCS(socket,roomName)
                }else{
                    console.log('here is the error ',err)
                }
                client.close();

            })

        });


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

        var playerID = usersConnected[socket.id]

        mongo.connect(process.env.DB_CONN,function(err,client){
            console.log('trying to connect to mongodb');
            const db = client.db('game');

            db.collection('giplayers').find({"_id":playerID}).toArray(function(err,resultDoc){
                console.log('here is the gi resultDoc', resultDoc[0]);
                if(!err){
                    let character = resultDoc[0].currSelectedChar;
                    db.collection('account').updateOne({"_id": playerID, "acctCharArr.charName": character.charName },
                        {$set:{"acctCharArr.$.location":character.location}}).then(function(doc){

                            db.collection('giplayers').deleteOne({"_id":playerID}).then(function(deleteDoc){

                                socket.broadcast.emit('player_disc',playerID);
                                console.log('removed the account from the instance',deleteDoc.result);
                                delete usersConnected[socket.id];
                                client.close();

                            }).catch((err)=>{client.close();console.log(err)});

                    }).catch((err)=>{client.close();console.log(err)});

                }
            })
        });


        //roomQueue.shift();

        //socket.broadcast.to(roomClientRemoved).emit('bye', "");
    });


});






