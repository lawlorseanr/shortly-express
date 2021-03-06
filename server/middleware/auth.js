const models = require('../models');
const Promise = require('bluebird');
const hashUtils = require('../lib/hashUtils');

module.exports.createSession = (req, res, next) => {
  if (req.cookies === undefined || Object.keys(req.cookies).length === 0) {
    models.Sessions.create()
      .then(response => models.Sessions.get({ id: response.insertId }))
      .then(session => {
        req.session = session;
        res.cookies = {};
        res.cookies['shortlyid'] = {value: session.hash};
        res.setHeader('set-cookie', `shortlyid=${session.hash}`);
      })
      .catch(err => console.error(err))
      .finally( () => next());
  } else {
    models.Sessions.get({ hash: req.cookies.shortlyid })
      .then( session => {
        if (session) {
          req.session = session;
        } else {
          // TODO clean me up
          req.cookies = {};
          models.Sessions.create()
            .then(response => models.Sessions.get({ id: response.insertId }))
            .then(session => {
              req.session = session;
              res.cookies = {};
              res.cookies['shortlyid'] = {value: session.hash};
              res.cookie('shortlyid', session.hash);
            })
            .catch(err => { throw err; })
            .finally(() => next());
        }
      })
      .catch (err => console.error(err))
      .finally(() => next());
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

module.exports.verifySession = (req, res, next) => {
  if (req.session === undefined || req.session.userId !== null) {
    return next();
  }
  res.redirect('/login');
};