var express = require('express')
  , exphbs = require('express-handlebars')
  , everyauth = require('everyauth')
  , bodyParser = require('body-parser')
  , cookieParser = require('cookie-parser')
  , cookieSession = require('cookie-session')
  , Datastore = require('nedb')
  , PostRepository = require('./postrepository.js').PostRepository
  , everyauthRoot = __dirname + '/..';

// Reference to the data file. Delete to start over. Call without parameters to have a non-persistent test db (data wiped on server restart)
var db = new Datastore({ filename: './data', autoload: true });		  
  
var postRepo = new PostRepository(db);  
  
// Toggle debug output for the authentication library here  
//everyauth.debug = true;

var usersById = {};
var nextUserId = 0;

function addUser (user) {
	user.id = ++nextUserId;
	return usersById[nextUserId] = user;
}

// Simple user configuration
var usersByLogin = {
  'bruno.bonte@gmail.com': addUser({ login: 'bruno.bonte@gmail.com', password: 'test123'})
};

everyauth.everymodule
  .findUserById( function (id, callback) {
    callback(null, usersById[id]);
  });
  
everyauth
  .password
    .loginWith('email')
    .getLoginPath('/login')
    .postLoginPath('/login')
    .loginView('login.handlebars')
    .loginLocals( function (req, res, done) {
      setTimeout( function () {
        done(null, {
          title: 'Async login'
        });
      }, 200);
    })
    .authenticate( function (login, password) {
      var errors = [];
      if (!login) errors.push('Missing login');
      if (!password) errors.push('Missing password');
      if (errors.length) return errors;
      var user = usersByLogin[login];
      if (!user) return ['Login failed'];
      if (user.password !== password) return ['Login failed'];
      return user;
    })

   .getRegisterPath('/register')
    .postRegisterPath('/register')
    .registerUser( function (newUserAttrs) {
      var login = newUserAttrs[this.loginKey()];
      return usersByLogin[login] = addUser(newUserAttrs);
    })

    .loginSuccessRedirect('/')

// Basic express configuration
var app = express();
app.use(express.static(__dirname + '/public'))
  .use(bodyParser())
  .use(cookieParser('htuayreve'))
  .use(cookieSession({keys: ['key1', 'key2']}))
  .use(everyauth.middleware(app));

// Configure express to use handlebars templates
var hbs = exphbs.create({
    defaultLayout: 'main' // Use the main layout for all views
});
app.engine('handlebars', hbs.engine); // engine = view engine
app.set('view engine', 'handlebars');

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

//===============ROUTES=================

// Display homepage 
app.get('/', function(req, res){
	postRepo.getPublishedPosts(function(publishedPosts) {
		res.render('home', {user: req.user, posts: publishedPosts});
	});
});

// Display 'create post' page
app.get('/post', function(req, res){
	if (!req.user) return res.sendStatus(401);	// Require logged in user
	res.render('createpost', {user: req.user});
});

// Route for creating the post
app.post('/post', urlencodedParser, function(req, res){
	if (!req.user) return res.sendStatus(401);	// Require logged in user
	if (!req.body) return res.sendStatus(400);	// Require content in body
  
	postRepo.createPost(req.body.title, req.body.content, req.body.publishdate, function() {
		res.redirect('/');						// Redirect to homepage
	});
});

// Route for creating the comment
app.post('/comment', urlencodedParser, function(req, res) {
	if (!req.body) return res.sendStatus(400);	// Require content in body
  
	postRepo.createComment(req.body.postid, req.body.name, req.body.content, function() {
		res.redirect('/');						// Redirect to homepage
	})	
});

//===============PORT=================
var port = process.env.PORT || 5000; //select your port or let it pull from your .env file
app.listen(port);
console.log("listening on " + port + "!");

module.exports = app;	