const parseCookies = (req, res, next = () => {}) => {
  if (req.headers.cookie) {
    var parameters = req.headers.cookie.split('; ');
    req.cookies = {};
    parameters.forEach( parameter => {
      var keyValue = parameter.split('=');
      req.cookies[keyValue[0]] = keyValue[1];
    });
  }
  next();
};

module.exports = parseCookies;