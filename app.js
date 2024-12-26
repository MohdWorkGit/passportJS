/*
  Include express and passport packages.
*/
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

/*
  Include the user model for saving to MongoDB VIA mongoose
*/
const User = require("./models/user");

/*
  Database connection -- We are using MongoDB for this tutorial
*/
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');


//Database
mongoose
    .connect("mongodb://localhost:27017/", {
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
        dbName: 'passportJS'
    })
    .then(() => {
        console.log('Database Connection is ready...');
    })
    .catch((err) => {
        console.log('Cannot connect to Database: ',err);
    });

const db = mongoose.connection;



const app = express();

/*
  Session configuration and utilization of the MongoStore for storing
  the session in the MongoDB database
*/
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: 'your secret key',
  resave: false,
  saveUninitialized: true,
  store: new MongoStore({ mongoUrl: db.client.s.url })
}));

/*
  Setup the local passport strategy, add the serialize and 
  deserialize functions that only saves the ID from the user
  by default.
*/
const strategy = new LocalStrategy(User.authenticate())
passport.use(strategy);

var GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    // clientID: 'clientID',
    // clientSecret: 'clientSecret',
    callbackURL: "http://localhost:8000/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, cb) {

    let user = await User.findOne({ googleId: profile.id });

    data = {
      username: profile.name.givenName + profile.name.familyName,
      googleId: profile.id
    }

    if (!user) {
        // If no user is found, create a new one
        user = await User.create(data);
        if (user) {
          return cb(null, user);
        }
        else {
          return cb("ERROR CREATING USER", null);
        }

    }

    return cb(null, user);
  }
));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(passport.initialize());
app.use(passport.session());

/*
  Beyond this point is all system specific routes.
  All routes are here for simplicity of understanding the tutorial
  /register -- Look closer at the package https://www.npmjs.com/package/passport-local-mongoose
  for understanding why we don't try to encrypt the password within our application
*/


app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/profile');
  });

app.post('/register', function (req, res) {
  User.register(
    new User({ 
      email: req.body.email, 
      username: req.body.username 
    }), req.body.password, function (err, msg) {
      if (err) {
        res.send(err);
      } else {
        res.send({ message: "Successful" });
      }
    }
  )
})

/*
  Login routes -- This is where we will use the 'local'
  passport authenciation strategy. If success, send to
  /login-success, if failure, send to /login-failure
*/
app.post('/login', passport.authenticate('local', { 
  failureRedirect: '/login-failure', 
  successRedirect: '/login-success'
}), (err, req, res, next) => {
  if (err) next(err);
});

app.get('/login-failure', (req, res, next) => {
  console.log(req.session);
  res.send('Login Attempt Failed.');
});

app.get('/login-success', (req, res, next) => {
  console.log(req.session);
  res.send('Login Attempt was successful.');
});

/*
  Protected Route -- Look in the account controller for
  how we ensure a user is logged in before proceeding.
  We call 'isAuthenticated' to check if the request is 
  authenticated or not. 
*/
app.get('/profile', function(req, res) {
  if (req.isAuthenticated()) {
    res.json({ message: 'You made it to the secured profie ' + req.user.username })
    console.log(req.user)
  } else {
    res.json({ message: 'You are not authenticated' })
  }
})

app.listen(8000, () => { console.log('Server started.') });