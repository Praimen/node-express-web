const compression = require('compression')
const express = require('express');
const app = express();
var subdomain = require('express-subdomain');
var dropletRoute = express.Router();
var keyStoneRoute = express.Router();
var trainingRoute = express.Router();
var path = require('path');
var httpProxy = require('http-proxy');
var birds = require('./birds');

/*var router = require('./router');*/

var apiProxy = httpProxy.createProxyServer();
var serverOne = 'http://165.227.109.107:3000';
var serverTwo = 'http://165.227.109.107:4000';
var serverThree = 'http://165.227.109.107:2000';

var options = {
  dotfiles: 'ignore',
  etag: false,
  extensions: ['htm', 'html'],
  index: false,
  redirect: false,
  setHeaders: function (res, path, stat) {
    res.set('x-timestamp', Date.now())
  }
}

app.set('view engine', 'pug');
app.set('views', './views');
app.use(compression());
app.use(express.static(path.join(__dirname,'public'),options));


dropletRoute.all('/*',function(req, res){
        apiProxy.web(req, res, {target: serverOne});
    }
);

keyStoneRoute.all('/*',function(req, res){
        apiProxy.web(req, res, {target: serverTwo});
    }
);

trainingRoute.all('/*',function(req, res){
        apiProxy.web(req, res, {target: serverThree});
    }
);

/*app.use('/', router);*/
app.use(subdomain('droplet',  dropletRoute));
app.use(subdomain('keystone', keyStoneRoute));
app.use(subdomain('training', trainingRoute));
app.use('/birds', birds);
app.get('/', (req, res) => res.render('index', {title: 'Hey', message: 'Hello World!'}));




app.listen(80, () => console.log('Example app listening on port 80!'));


