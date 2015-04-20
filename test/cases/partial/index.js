
var people = {
  "1": {name: "Cameron", age: 24},
  "2": {name: "Scott", age: 42},
  "3": {name: "Dave", age: 13}
};

module.exports = function(jsont) {

  jsont.use('fetch', function(id, done) {
    setTimeout(function() {
      done(null, people[id]);
    }, 2);
  });

  return jsont;
};
