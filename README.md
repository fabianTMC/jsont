jsont [![Build Status](https://travis-ci.org/CamShaft/jsont.png?branch=master)](https://travis-ci.org/CamShaft/jsont)
=====

Simple json template language

Installation
------------

```sh
$ npm install jsont
```

```sh
$ component install CamShaft/jsont
```

Features
--------

* Simple
* Valid JSON
* Extensible
* Auto-parallelization of templated properties
* Transform streaming for improved performance and async processing
* Partial JSONt templates to allow template chaining

Example
-------

Input:

```json
{
  "name": "`user.firstName`",
  "birthday": "`user.birthday | date:'MMMM Do'`",
  "addresses": "`user.addresses | map | partial:address`"
}
```

Output:

```json
{
  "name": "Cameron",
  "birthday": "September 19th",
  "addresses": [
    {
      "street": "123 Fake Street",
      "city": "Nowhere",
      "country": "USA"
    },
    {
      "street": "Broadway Street",
      "city": "NY",
      "country": "USA"
    }
  ]
}
```

Usage
-----

```js
var jsont = require('jsont')();

var template = require('./my-template.json');

var options = {};

jsont.render(template, options, function(err, out) {
  console.log(out);
});
```

Helpers
-------

You can easily extend `jsont` by calling `use`:

```js
var jsont = require('jsont')();

jsont.use('reverse', function(input, next) {
  next(null, input.split("").reverse().join(""));
});
```

In your template you can then call the helper by piping data to it:

```json
{
  "reversed-name": "'Cameron' | reverse"
}
```

Out comes:

```json
{
  "reversed-name": "noremaC"
}
```

You can also pass arguments and chain helpers

```json
{
  "list": "'1,2,3,4,5' | split:',' | map | to-int"
}
```

```js
jsont.use('split', function(input, separator, next) {
  next(null, input.split(separator));
});

jsont.use('to-int', function(input, next) {
  next(null, parseInt(input));
});
```

And we get:

```json
{
  "list": [
    1,
    2,
    3,
    4,
    5
  ]
}
```

Parallelization
---------------

Since helpers are all asynchronous behind the scenes we get parallelization in a simple form:

```js
var api = require('./api');

jsont.use('user-likes', function(user, next) {
  if (typeof user !== 'object') user = {id: user};

  api.likes(user.id, function(err, likes) {
    if (err) return next(err);

    user.likes = likes;
    next(null, user);
  });
});

jsont.use('user-followers', function(id, next) {
  api.followers(id, next);
});

jsont.use('user', function(id, next) {
  api.get(id, function(err, user) {
    if (err) return next(err);

    user.id = id;
    next(null, user);
  });
});

jsont.use('length', function(user, property, position, next) {
  if (typeof position === 'function') return position(null, user[property].length);
  user[position] = user[property].length;
  next(null, user);
});

jsont.renderFile('user-profile.json', {id: 0}, function(err, out) {
  console.log(out);
});
```

```json
{
  "id": "`id`",
  "likes": "`id | user-likes | length:likes`",
  "followers": "`id | user-followers | map | user | user-likes | length:likes,likes`"
}
```

Everything gets put on the event loop and renders as responses come back.

```json
{
  "id": "1",
  "likes": 4,
  "followers": [
    {
      "id": "2",
      "name": "Scott",
      "likes": 3
    },
    {
      "id": "3",
      "name": "Dave",
      "likes": 2
    }
  ]
}
```

Transform Streaming
-------------------

You can tell `jsont` to use an asynchronous stream to transform an Array of JSON objects.  
Custom event-handlers are defined on the Options object and passed in to `render` 
as the `options` parameter.

```js
var jsont = require('jsont')();

function Options() {
   // JSONt looks members of the "renderstream" reference for the event-handlers
   this.renderstream = {};

   // Hold the transformed items
   this.renderstream.xFormResults = [];	
	
   // Push transformed item as it is processed into the xFormResults Array
   // This could also be used to submit the item to a database, 
   // other storage, network stream, etc.
   this.renderstream.fnStreamOnXform = function(row) {
      this.xFormResults.push(row);
   };
	
   // Do this when there is an error
   this.renderstream.fnStreamOnError = function(err) {
      console.log(err.message);		
   };
	
   // Do this after the last item is transformed
   this.renderstream.fnStreamOnFinish = function() {
		var xFormResultsJSON = JSON.stringify(this.xFormResults, null, 4);
		
      // Write to a file
		var fs = require('fs');
		var outFile = "myfilename.json";
		fs.writeFile(outFile, xFormResultsJSON, function (err) {
			if (err) { 
				return console.log(err); 
			}
			console.log('File written: "' + outFile + '"');
		});	
		
		console.log("Done! Transformed " + this.xFormResults.length + " items");
	}
};

// Instantiate the Options object
var options = new Options();

// Compile the JSONt template
var jsontTemplate = jsont.compile("templateFile.js", options);	

// Tell JSONt to start rendering		
jsontTemplate.render(input, function(err, out) {
    if (err) { 
    	return console.log(err); 
    }

console.log("Done! Transformed " + options.renderstream.xFormResults.length + " items");			    
});
```

Tests
-----

```sh
$ npm test
```

TODO
----

* Create a richer evaluator to do something like:

  ```json
  {
    "user": "`{id: id, name: name} | my-helper`"
  }
  ```
* Cache compiled templates using the `filename` option
* Expose concurrency settings
* Allow option to configure escape character 
