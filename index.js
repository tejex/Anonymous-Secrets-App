//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyparser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

// const encrypt = require("mongoose-encryption");
// const md5 = require("md5")
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
//******************************************************************************************************************//
const app = express();
//******************************************************************************************************************//
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyparser.urlencoded({extended:true}));
app.use(session({
  secret:"my little secret dont tell bro",
  resave:false,
  saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());
//******************************************************************************************************************//
const password = encodeURIComponent("Gtalebron@23")
const uri = `mongodb+srv://bamMongo23:${password}@cluster0.wvbvubq.mongodb.net/secretsUsersDB`;
mongoose.connect(uri, { useNewUrlParser: true})
//******************************************************************************************************************//
const userSchema = new mongoose.Schema({
  username:{
    type:String,
  },
  password:{
    type:String,
  },
  googleId:{
    type:String
  },
  secret:{
    type:String
  }
})
// userSchema.plugin(encrypt,{secret:process.env.SECRET, encryptedFields:['password']})
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//******************************************************************************************************************//
const User = new mongoose.model("User",userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user,done){
  done(null,user.id)
});
passport.deserializeUser(function(id,done){
  User.findById(id,function(err,user){
    done(err,user);
  });
});
//******************************************************************************************************************//
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
//******************************************************************************************************************//
app.get("/", function(req,res){
  res.render("home")
})
//******************************************************************************************************************//
app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);
//******************************************************************************************************************//
app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
});
//******************************************************************************************************************//
app.get("/login",function(req,res){
  res.render("login")
})
app.get("/register",function(req,res){
  res.render("register")
})
//******************************************************************************************************************//
app.get("/secrets",function(req,res){
 User.find({"secret":{$ne:null}},function(err,foundUsers){
   if(!err){
     res.render("secrets",{usersWithSecrets:foundUsers})
   }
   else{
     console.log(err);
   }
 })
})
//******************************************************************************************************************//
app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit")
  }
  else{
    res.redirect("/login")
  }
})
//******************************************************************************************************************//
app.get("/logout", function(req,res){
  req.logout(function(err){
    if(err){
      return next(err);
    }
    res.redirect("/")
  });
})
//************************************************* Registering the account *****************************************************************//
app.post("/register",function(req,res){
  const newUser = new User({
    username:req.body.username,
  })
  User.register(newUser,req.body.password, function(err,results){
    if(err){
      console.log(err);
      res.redirect("/register");
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets")
      })
    }
  })
//   bcrypt.hash(req.body.password,saltRounds,function(err, hash){
    // const newUser = new User({
    //   email:req.body.username,
    //   password:hash
    // })
//     newUser.save(function(err){
//       if(!err){
//         res.redirect("/login")
//       }
//       else{
//         res.send(err)
//       }
//     })
//   })
});
//************************************************** Logging in the user****************************************************************//
app.post("/login",function(req,res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  })

  req.login(user,function(err){
    if(!err){
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets")
      })
    }
    else{
      res.send(err)
    }
  })

  // const userName = req.body.username;
  // const passWord = req.body.password;
  //
  // User.findOne({email:userName},function(err, foundUser){
  //   if(!err){
  //     bcrypt.compare(passWord, foundUser.password,function(err, result){
  //       if(result){
  //         res.render("secrets")
  //       }
  //     })
  //   }
  //   else{
  //     res.send(err)
  //   }
  // })
})
//******************************************************************************************************************//
app.post("/submit",function(req,res){
  const userSecret = req.body.secret;
  User.findById(req.user.id,function(err,foundUser){
    if(!err){
      foundUser.secret = userSecret;
      foundUser.save(function(){
        res.redirect("/secrets");
      })
    }
    else{
      console.log(err);
    }
  })
})
//******************************************************************************************************************//
app.listen(3000,function(req,res){
  console.log("Server is up and running");
})
