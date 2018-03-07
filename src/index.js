const compression = require('compression')
const express = require('express');
const app = express();
var path = require('path');

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
}



app.set('view engine', 'pug');

app.use(compression())
app.set('views', './views');
app.use(express.static(path.join(__dirname,'public'),options));
app.use('/', router);
app.use('/birds', birds);


app.get('/', (req, res) => res.render('index', {title: 'Hey', message: 'Hello World!'}));


app.get('/user', function (req, res, next) {
 /*res.sendFile(path.join(__dirname +'/public/special.html')) */
 res.send('back to the top')
});

app.get('/update', function (req, res) {
  res.send('Got a PUT request at /update')
})

app.get('/ab?cd', function (req, res) {
  res.json({cat:"meow"})
})




app.listen(80, () => console.log('Example app listening on port 80!'));


