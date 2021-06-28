const express = require('express') // server software
const mongoose = require('mongoose') //import mongoose ODM
const bodyParser = require('body-parser') // parser middleware
const path = require('path')
var Razorpay = require('razorpay') //Razorpay module
const url = 'mongodb://localhost/residentdb' //url for db connection
const session = require('express-session')  // session middleware
const passport = require('passport')  // authentication
const connectEnsureLogin = require('connect-ensure-login') //authorization
const logout = require('express-passport-logout')
const events = require('events') //events class to use event emitters
const port = process.env.PORT || 4001


const User =  require('./model/user') //importing the schema
const myEvent = new events.EventEmitter(); //new event
const app = express(); //create an instance for the express
mongoose.connect(url, {useNewUrlParser:true, useUnifiedTopology: true})
			.then(() => console.log("db connected..."))
			.catch((err) => console.log(err))


//set view engine
app.set('views', path.join(__dirname, 'views')) 
app.set("view engine", "ejs") //ejs template engine


// Configure More Middleware
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

//initialize passport
app.use(passport.initialize()) 
app.use(passport.session())


app.use(session({
    secret: 'secret',
    saveUninitialized: false,
    resave: false,
    cookie: { maxAge: 1000 }
}));


// To use with sessions
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

const LocalStrategy = require('passport-local').Strategy //local strategy
passport.use(new LocalStrategy(User.authenticate()))


//home page with login and register options in it
app.get('/', (req,res) => {

	res.render('home')
})

app.get('/register', (req,res) => {

	res.render('register') //register form page is rendered in here
})



//registers the user data and stores into DB, passport-local-mongoose takes cares of salting and hashing password

app.post('/register', function(req, res) {
      
    Users = new User({username : req.body.username});
  
          User.register(Users, req.body.password, function(err, user) {
            
            if (err) {
              res.json({success:false, message:"Your account could not be saved. Error: ", err}) 
            }

            else{
              res.render('trail')
              console.log({success: true, message: "Your account has been saved"})
            }

          });
});



app.get('/login', (req,res) => {

	res.render('login');   // login for registered users
})

//authentication for loggedin users

app.post("/login", passport.authenticate("local"), function(req, res){
	
	
  app.locals.username = req.user.username 
  if (req.user.pro == true)
    res.render('secretpro')
  else
    res.render('secret')

  // console.log(req.user.username) shows the username

})



//to fetch all the users
app.get('/getusers', (req,res) => {

  User.find({ }, (err, data) => {

      if (err)
        throw err

      res.send(data)

  })
})



//Handling user logout
app.get("/logout", function (req, res, next) {
    req.logout()
    req.session = null
    res.redirect("/login")
});	


// to check the authentication 
function isLoggedIn(req, res, next) {
    console.log(req.user)
    if (req.isAuthenticated()) 
    	return next()

    res.redirect("/login")
}

// for order creation when the payment is initiated
app.post('/orders', (req,res) => {
    var instance = new Razorpay({ 
        key_id: 'rzp_test_Ig2EoT8zFrxKew',
        key_secret: 'YMCkTddH6ZDkp9iyzZ0J8IXR'
    })

    var options = {
        amount: 50000,  // amount in the smallest currency unit
        currency: "INR"
        
    };

    instance.orders.create(options, function(err, order) {
      if (err)
        throw err

      console.log(order)
        
    })
    
    
})

//this function listens to the payment success event, to update the user as pro:true
myEvent.on('success', (req, res) => {
  
  var user = app.locals.username
  User.updateOne({username: user}, { $set: { pro: true } }, (err, data) => {
    if (err)
      throw err
    
    console.log(data)
    

})
})

//this is callback from the RazoPay API with a post method
app.post('/isSuccess', (req, res) => {

    res.render('secretpro')
    console.log({message: "payment sucess", id: req.body.razorpay_payment_id})
    
    myEvent.emit('success')
    // console.log(req.body)
    
})



app.listen(port, () => {
	console.log('server running at:' + port)
})