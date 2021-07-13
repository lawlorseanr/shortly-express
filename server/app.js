const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const cookieParser = require('./middleware/cookieParser');
const models = require('./models');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use(cookieParser);
app.use(Auth.createSession);
/************************************************************/
// Basic routing
/************************************************************/

app.get('/', Auth.verifySession, (req, res) => {
  res.render('index');
});

app.get('/create', Auth.verifySession, (req, res) => {
  res.render('index');
});

app.get('/links', Auth.verifySession, (req, res, next) => {
  models.Links.getAll()
    .then(links => {
      res.status(200).send(links);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .finally(() => next());
});

app.post('/links', (req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/signup', (req, res) => {
  res.render('signup');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/signup', (req, res) => {
  var body = req.body;
  var userdb = models.Users.get({username: body.username})
    .then(userInfo => {
      if (userInfo) {
        // user exists, redirect to login page
        throw 'Username is not available.';
      }
      return models.Users.create({username: body.username, password: body.password});
    })
    .then(createUserResult => {
      // created user, redirect to index
      return models.Sessions.update(
        {hash: res.cookies.shortlyid.value},
        {userId: createUserResult.insertId}
      );
    })
    .then(() => {
      res.redirect('/');
    })
    .catch(err => {
      // console.error(err);
      res.redirect('/signup');
    });
});

app.post('/login', (req, res) => {
  var body = req.body;
  var userdb = models.Users.get({username: body.username})
    .then( result => {
      // if specified username exists, in db, compare
      if (result) {
        // return boolean promise for valid credentials
        return [models.Users.compare(
          body.password,
          result.password,
          result.salt
        ), result];

      // if user doresn't exist, stay on login page
      } else {
        throw 'Invalid login credentials (user does not exist).';
      }
    })
    .then( array => {
      // if credentials passed, redirect to index
      let [userExists, userInfo] = array;

      if (userExists) {
        return res.redirect('/');
      }
      // if credentials failed, stay on login
      throw 'Invalid login credentials (user exists).';
    })
    .catch( err => {
      console.error(err);
      res.redirect('/login');
    });
});

app.get('/logout', (req, res) => {
  models.Sessions.delete({ hash: req.cookies.shortlyid })
    .then(() => {
      res.cookie('shortlyid', '');
      res.render('login');
    })
    .catch(err => {
      console.error(err);
      res.redirect('/');
    });
});

/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
