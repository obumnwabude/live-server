const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const morgan = require('morgan');
const User = require('./models/user');
const Logger = require('./models/logger');
const auth = require('./middleware/auth');
const dateTime = require('./date-time');
const port = process.env.PORT || 3000;

// connect to mongodb
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecxbackend', 
  {useNewUrlParser: true, useUnifiedTopology: true})
  .then(() => {
    console.log('Successfully connected to MongoDB!');
  })
  .catch((error) => {
    console.log('Unable to connect to MongoDB!');
    console.error(error);
  });

// for receiving post data
app.use(express.json());
app.use(express.urlencoded({extended:true}));

// the logger
const logStream = { 
  write: line => {
    const logger = new Logger({log: line});
    logger.save().catch(err => console.log(err));
  }
};

// morgan middleware for logging
app.use(morgan(':method :url :status :response-time ms', {stream: logStream}));

// handle logs 
app.get('/logs', (req, res) => {
  Logger.find({}).then(logs => {
    res.format({
      'text/plain': () => res.status(200).send(logs.map(log => log.log).join(''))
    });
  }).catch(err => res.status(500).json(err));
});

// handle signup
app.post('/signup', (req, res) => {
  // ensures that email, username and password are provided 
  if (!(req.body.email)) 
    return res.status(401).json({message: 'Please provide a valid email'});
  else if (!(req.body.username))
    return res.status(401).json({message: 'Please provide a valid username'});
  else if (!(req.body.password))
    return res.status(401).json({message: 'Please provide a password'});

  // hash the password from req.body 
  bcrypt.hash(req.body.password, 10)
    .then(hashed => {
      // create a new user
      const user = new User({
        email: req.body.email,
        username: req.body.username,
        password: hashed,
        names: req.body.names || [],
        occupation: req.body.occupation || '',
        lastlogin: dateTime()
      });
      // save and return the user
      user.save()
        .then(() => res.status(201).json({
          message: 'User successfully created!',
          _id: user._id,
          email: user.email,
          username: user.username 
        }))
        .catch(err => {
          // check if username or email are not unique and return proper message
          if (err.name === 'ValidationError') {
            let messages = [];
            for (let [key, value] of Object.entries(err.errors)) {
              messages.push(`User with ${key}: ${value.value} exists already`);
            }
            const returnMessage = messages.join('\n').concat('.');
            return res.status(401).json({message: returnMessage});
          }
          res.status(500).json(err);
        }); 
    }).catch(err => res.status(500).json(err));
});

// handle login
app.post('/login', async (req, res) => {
  // lookup the user with email or username provided from the database
  let user;
  if (req.body.email || req.body.username) {
    try {
      if (req.body.email) {
        user = await User.findOne({email: req.body.email});
      } else if (req.body.username) {
        user = await User.findOne({username: req.body.username});
      }
    } catch(error) {
      return res.status(401).json(error);
    }
  } else {
    // return if no email or username is passed to the body
    return res.status(401).json({message: 'Please provide a valid email or username to login.'});
  }

  // if a user was not found return the message that user was not found
  if (!user) return res.status(401).json({
    message: `User${req.body.email ? ' with email: ' + req.body.email : req.body.username ? 
      ' with username: ' + req.body.username : '' } not found, please correct your details or sign up.`
  });

  // ensures that a password was passed
  if (!(req.body.password))
    return res.status(401).json({message: 'Please provide a password'});

  // check if passwords match
  bcrypt.compare(req.body.password, user.password)
    .then(valid => {
    // if passwords match return succesful login message with token
    if (valid) { 
      // update lastlogin
      user.lastlogin = dateTime();
      user.save().then(user => { 
        // token signing
        const token = jwt.sign({email: user.email}, 'RandoM_SECreT', {expiresIn: '1h'});
        return res.status(201).json({
          message: 'Login successful!',
          _id: user._id,
          email: user.email,
          username: user.username,
          token: token
        });
      }).catch(err => res.status(500).json(err));
    } else { 
     // else return message of wrong password
      return res.status(401).json({message: 'Wrong password, please login with correct password.'});
    }
  }).catch(err => res.status(500).json(err));
});

// handle getuser 
app.get('/getuser/:id', auth, (req, res) => {
  // get user from res.locals (set in auth middleware)
  const user = res.locals.user;

  // return user info
  res.status(200).json({
    _id: user._id,
    email: user.email,
    username: user.username,
    names: user.names,
    occupation: user.occupation,
    lastlogin: user.lastlogin
  });
});

// handle update user 
app.put('/updateuser/:id', auth, async(req, res) => {
  // get user from res.locals (set in auth middleware)
  const user = res.locals.user;

  // if there's a user, check if the body has valid data to update with 
  if (!(req.body.email || req.body.username || req.body.password 
    || req.body.names || req.body.occupation)) { 
    return res.status(401).json({
      message: 'Please provide valid email, username, password, names or occupation to update in the user!'
    });
  }
    
  // update with the provided body data
  if (req.body.email) user.email = req.body.email;
  if (req.body.username) user.username = req.body.username;
  if (req.body.password) {
    try {
      user.password = await bcrypt.hash(req.body.password, 10);
    } catch(error) {
      res.status(500).json(error);
    }
  }
  if (req.body.names) user.names = req.body.names;
  if (req.body.occupation) user.occupation = req.body.occupation;
  user.save().then(updated => {
    res.status(201).json({
      message: 'Update Successful',
      _id: updated._id,
      email: updated.email,
      username: updated.username
    });
  }).catch(err => {
    // check if username or email are not unique and return proper message
    if (err.name === 'ValidationError') {
      let messages = [];
      for (let [key, value] of Object.entries(err.errors)) {
        messages.push(`User with ${key}: ${value.value} exists already. Please use a different ${key}`);
      }
      const returnMessage = messages.join('\n').concat('.');
      return res.status(401).json({message: returnMessage});
    }
    res.status(500).json(err)
  });
});

// handle delete user 
app.delete('/deleteuser/:id', auth, (req, res) => {
  // get user from res.locals (set in auth middleware)
  const user = res.locals.user;

  // delete the user  
  User.deleteOne({_id: user._id})
    // return message saying user deleted
    .then(() => res.status(200).json({
      message: `Successfully Deleted user with _id: ${user._id}`
    }))
    .catch(err => res.status(500).json(err));
});

// gets all users 
app.get('/', (req, res) => {
  // get and return all users from database
  User.find({}).then(users => {
    users = users.map(user => {
      return {
        _id: user._id,
        email: user.email,
        username: user.username,
        names: user.names,
        occupation: user.occupation,
        lastlogin: user.lastlogin
      };
    });
    res.status(200).json({users: users});
  }).catch(err => res.status(500).json(err));
});

module.exports = app.listen(port);