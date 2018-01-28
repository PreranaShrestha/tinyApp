var express = require('express');
var cookieSession = require('cookie-session');
const bodyParser = require("body-parser");
const bcrypt = require('bcrypt');
const methodOverride = require('method-override');
var app = express();
app.use(cookieSession({
  name: 'session',
  keys: ["secretkey"]
}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
require('dotenv').config()
var PORT = process.env.PORT || 8080;

var urlDatabase = {
  "userRandomID": {
    "b2xVn2": {
      "longURL": "lighthouselabs.ca",
      "count": 2
    },
    "b1xVe2": {
      "longURL": "http://www.google.ca",
      "count": 1
    }
  },
  "user2RandomID": {
    "b2zVn2": {
      "longURL": "http://www.lighthouselabs.ca",
      "count": 3
    }
  }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
}

//route to /
app.get('/', (req, res) => {
  res.redirect('/urls');
});


//route to register
app.get('/register', (req, res) => {
  const userEmail = getEmail(req.session.userId);
  res.render("url_registration", {urls: urlDatabase, email: userEmail});
});
app.post('/register', (req, res) => {
  var userRandom = generateRandomString();
  var existEmail = Object.keys(users).filter(function (id) {
    return users[id].email === req.body.email;
  });
  if(req.body.email === '' || req.body.password === '') {
    console.log("Email and Password cannot be empty");
    res.status(400);
    res.send("Empty email or password");
  } else if (existEmail.length !== 0) {
    res.status(400);
    res.send("Email already exist");
  } else {
    users[userRandom] = {
      id: userRandom,
      email: req.body.email,
      password: req.body.password
    };
    req.session.userId = userRandom;
    res.redirect('/urls');
  }
});

//route to short url /u/id
app.get('/u/:id', (req, res) => {
  var longURL = fetchLongUrl(req.params.id);
  if(!longURL) {
    res.status(403);
    res.send("Invalid shortURL");
  } else {
    if (!/https\:\\www\./.test("longURL")) {
      res.redirect("https://www." + longURL);
    } else {
      res.redirect(longURL);
    }
  }
});

//route to login
app.post('/login', (req, res) => {
  var userId;
  var existEmail;
  var existPassword;
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);
  for (var user in users) {
    if (users[user].email === req.body.email && bcrypt.compareSync(users[user].password, hashedPassword)) {
      existUserId = users[user].id;
      existEmail = users[user].email;
      existPassword = users[user].password;
    }
  }
  if(req.body.email === '' || req.body.password === '') {
    console.log("Email and Password cannot be empty");
    res.status(403);
    res.send("Empty email or password");
  } else if (existEmail && existPassword) {
    req.session.userId = existUserId;
    res.redirect('/urls');
  } else {
    res.status(403);
    res.send("Invalid email or password");
  }
});

//route to delete
app.delete("/urls/:id", (req, res) => {
  delete urlDatabase[req.session.userId][req.params.id];
  res.redirect('/urls');
});

//route to create
app.get('/urls/new', (req, res) => {
  const userEmail = getEmail(req.session.userId);
  if(!userEmail) {
    res.status(403);
    res.redirect('/register')
  } else {
    res.render('urls_new', {userId: req.session.userId, email: userEmail});
  }
});
app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  const longURL = req.body.longURL;
  const user = req.session.userId;
  if(urlDatabase[user] === undefined) {
    urlDatabase[user] = {};
    if(urlDatabase[user][shortURL] === undefined){
      urlDatabase[user][shortURL] = {};
      urlDatabase[user][shortURL].longURL = longURL;
      urlDatabase[user][shortURL].count = 0;
    }
  } else {
    if(urlDatabase[user][shortURL] === undefined){
      urlDatabase[user][shortURL] = {};
      urlDatabase[user][shortURL].longURL = longURL;
      urlDatabase[user][shortURL].count = 0;
    }
  }
  res.redirect('/urls');
});

//route to urls/:id
app.get('/urls/:id', (req, res) => {
  const userEmail = getEmail(req.session.userId);
  if(!getUser(req.params.id, req.session.userId)) {
    res.status(403);
    res.send("Invalid user");
  } else {
    res.render("urls_update", {id: req.params.id, userId: req.session.userId, email: userEmail});
  }
});
app.post('/urls/:id', (req, res) => {
  if(!getuser(id, req.session.userId)) {
    res.status(403);
    res.send("Invalid user");
  } else {
    urlDatabase[req.session.userId][req.params.id].longURL = req.body.longURL;
    res.redirect('/urls');
  }
});


//route to update
app.get('/urls/:id/update', (req, res) => {
  const userEmail = getEmail(req.session.userId);
  if(!getUser(req.params.id, req.session.userId)) {
    res.status(403);
    res.send("Invalid user");
  } else {
  res.render("urls_update", {id: req.params.id, userId: req.session.userId, email: userEmail});
}
});
app.put("/urls/:id", (req, res) => {
  urlDatabase[req.session.userId][req.params.id].longURL = req.body.longURL;
  res.redirect('/urls');
});

//route to logout
app.post("/logout", (req,res) => {
  req.session.userId = null;
  res.redirect("/register");
});

//route to urls
app.get('/urls', (req, res) => {
  const userEmail = getEmail(req.session.userId);
  if(!userEmail) {
    res.redirect('/register')
  } else {
   res.render('urls_index', {urls: urlDatabase, email: userEmail, userId: req.session.userId});
  }
});

//listen at port 8080
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});

function generateRandomString() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < 6; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

function fetchLongUrl(shortUrl) {
  for (var users in urlDatabase) {
    for(var urls in urlDatabase[users]) {
      if(urls === shortUrl) {
        urlDatabase[users][urls].count++;
        return urlDatabase[users][urls].longURL;
      }
    }
  }
  return false;
}

function getUser(id, user) {
  for (var urls in urlDatabase[user]) {
    if (urls === id) {
      return true;
    }
  }
  return false;
}

function getEmail(id) {
  if(users[id]) {
    return users[id].email;
  } else {
    return undefined;
  }
}


