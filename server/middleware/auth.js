const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {

  if (req.cookies === undefined || Object.keys(req.cookies).length === 0) {
    models.Sessions.create()
      .then(result => models.Sessions.get({ id: result.insertId }))
      .then(session => req.session = session)
      .catch(err => console.error(err))
      .finally( () => next());
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

