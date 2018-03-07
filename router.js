var express = require('express');
var router = express.Router();

function loadUser(req, res, next) {
  if (req.params.id) {
    var user =
    /*Users.findOne({ id: req.params.userId }, function(err, user) {
     if (err) {
     next(new Error("Couldn't find user: " + err));
     return;
     }*/

      req.user = req.params.id;
      next();

  } else {
    next();
  }
}



function requireAdmin(req, res, next) {
  if (req.user != 'jake') {
    next(new Error("Permission denied."));
    return;
  }else{
    console.log('REQUIRING ADMIN')
    next();
  }

}
// a middleware function with no mount path. This code is executed for every request to the router
router.use(function (req, res, next) {
  console.log('Time:', Date.now());
  next()
});

// a middleware sub-stack shows request info for any type of HTTP request to the /user/:id path
router.use('/user/:id', function (req, res, next) {
  console.log('Request URL:', req.originalUrl);
  next()
}, function (req, res, next) {
  console.log('Request Type:', req.method);
  next()
});

// a middleware sub-stack that handles GET requests to the /user/:id path
router.get('/user/:id', loadUser, requireAdmin, function (req, res, next) {
  // if the user ID is 0, skip to the next router
/*  if (req.params.id === '0') next('route');
  // otherwise pass control to the next middleware function in this stack
  else next()*/
  next()
}, function (req, res, next) {
  console.log('Running Regular HTML:');
  // render a regular page
  res.redirect('/regular.html')
});

// handler for the /user/:id path, which renders a special page
router.get('/user/:id', function (req, res, next) {
  console.log(req.params.id);
  res.redirect('/special.html')
});

module.exports = router