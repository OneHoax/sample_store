// Import the bcryptjs library; it is for hashing and therefore we can use it 
// to hash the passwords of the users that register, so that these passwords are
// NOT stored in plain text in the database (for obvious reasons) but rather their
// codes generated by the hashing function are stored
const bcrypt = require('bcryptjs')
// passport-local is a sub library of the passport library
// since we are using the local strategy for logging in (others are:
// facebook strategy, google, etc) then we use the passport-local library and
// we use its Strategy class
const LocalStrategy = require('passport-local').Strategy
// import the User schema 
const User = require('../models/User')

// Export this file as a function; takes an argument which is the passport library
// inside the function we configure passport to implement the strategy that we want (local)
module.exports = (passport) => {
    // Default passport configurations

    // Tell passport how store the user inside the session whenever the user is
    // logged in or loggedout
    passport.serializeUser((user, next) => {
        next(null, user)
    })

    // tell passport to find the currently logged in user and pass it off to the next
    // function; theis allows to NOT storte the entire user inside the session which can
    // be unsafe security wise
    passport.deserializeUser((id, next) => {
        User.findById(id, (err, user) => {
            next(err, user)
        })
    })

    // Create a local strategy object
    const localLogin = new LocalStrategy({
        // by default passport uses a username and a password for logging in;
        // here we change it to email and password
        usernameField: 'email',
        passwordField: 'password',
        // This request info (email, password), which comes from the log in form and subsequently
        // our '/login' handler (in login.js), is passed to the call back function
        // (defined right after this line), if this option is set to true 
        passReqToCallback: true
    // this is the call back function
    }, (req, email, password, next) => {
        // here we put our strategy implementation; tell passport how to log
        // the user in or not log him in
        User.findOne({email: email}, (err, user) => {
            // Error from db; next passes flow control to the next function in
            // server.js (our error handling function) after the login route handler one
            if (err)
                return next(err)

            // User not found
            if (user == null)
                return next(new Error('User Not Found')) 

            // Incorrect passwrod
            // req.body.password is the same as password
            // if (user.password != req.body.password)
            //     return next (new Error('Incorrect Password'))

            // Can't compare the plain text password a user enters when logging in
            // with the password in the database bc we are now hashing the user passwords
            // when they register and that resulting hash is what we store in the db;
            // bcryp.compareSync(string, hash) compares string against hash to see if
            // if the hash corresponds to the string; here we compare the password entered by the user
            // 'password' and the hash for the password of the user that resides in our db
            // 'user.password'
            if (!bcrypt.compareSync(password, user.password))
                return next(new Error('Incorrect Password'))

            // If no errors, then return the user itself; this doesn't call
            // our error handler in server.js but rather simply returns the user
            // as a json object
            return next(null, user)

            // res.json({
            //     confirmation: 'succes',
            //     user: user
            // })
        })
    })

    // Tell passport to use our localLogin strategy (connect it localLogin to passport)
    passport.use('localLogin', localLogin)

    // This is another local strategy for but for registration this time
    // (to authenticate registration)
    const localRegister = new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    }, (req, email, password, next) => {
        User.findOne({email: email}, (err, user) => {
            if (err)  
                return next(err)

            // If the user already exists in the data base
            if (user != null)
                return next(new Error('User already exists, please log in'))

            // Hash the user password to be insrted into the db prior to inserting it
            // so that the code generated is stored in the db and not the password in plain text
            const hashedPw = bcrypt.hashSync(password, 10)
            // As an example, only those users with zenva emails are considered admins for this 
            // website; the string1.indexOf(string2) method returns the index of the first occurrence
            // of string2 in string1 or -1 if it doesn't exist
            var isAdmin = false;
            if (email.indexOf('@admin') >= 0)
                isAdmin = true;

            // IF we get to here then the user doens't exist in the database yet
            // (not registered yet), therefore create a new user entry in the db
            User.create({email: email, password: hashedPw, isAdmin: isAdmin}, (err, user) => {
                if (err)
                    return next(err)

                // If there's no error then simply show the user in json
                return next(null, user)
            })
        })
    })

    // Tell passport to use our localRegister strategy (connect it localRegister to passport)
    passport.use('localRegister', localRegister)
}