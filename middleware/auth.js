const User = require('../models/user');
const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => { 
  if (!(req.params.id))
    return res.status(400).json({message: 'Please pass a valid id in the URL'});

  // retrieve the user from the database 
  let user;
  try {
    user = await User.findOne({_id: req.params.id});
  } catch(error) {
    return res.status(500).json(error);
  }

  // check if there's a valid user with the provided email was not returned from the database
  if (!user) {
    // if so return message that user with specified email was not found
    return res.status(400).json({message: `User with _id: ${req.params.id}, not found!`});
  } else { 
    // if there's a user, check the authorization for token matching
    try {
      // get the token from request headers
      const token = req.headers.authorization.split(' ')[1];
      const decodedToken = jwt.verify(token, 'RandoM_SECreT');
      if (decodedToken.email === user.email) { 
        // assign the user to res.locals for access in next functions
        res.locals.user = user;
        // pass execution to next action
        next();
      } else {
        throw new Error('Invalid Request');
      }
    } catch(error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(400).json({
          message: 'Session expired, please login again'
        });
      } else {
        return res.status(400).json({message: 'Invalid Request'});
      }
    }
  }
};