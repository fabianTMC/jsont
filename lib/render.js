/**
 * Module dependencies
 */

var Batch = require('batch');
var each = require('./each');
var stack = require('./stack');
var set = require('./utils').set;
var transform = require('stream-transform');
var deepcopy = require('deepcopy');

module.exports = Render;

/**
 * Renders a template
 *
 */

function Render(helpers, properties, value, options, data, fn) {
  this.helpers = helpers;
  this.properties = properties;
  this.value = value;
  this.options = options;
  this.data = data;
  
  if (options && options.renderstream) {
	  this.renderstream(fn);
  } else {
	  this.render(fn);
  }
};

Render.prototype.render = function(fn) {
  var self = this;
  var batch = new Batch;

  each(self.properties, function(property) {
    batch.push(function(next) {
      // Setup the property context
      var context = {
        exit: next,
        path: property.path,
        stack: property.fns.slice(0)
      };
      context.__proto__ = self;

      stack.call(context, context.stack, self.data, function(err, value) {
        if (err) return next(err);
        self.set(context.path, value);
        next();
      });
    });
  });

  batch.end(function(err) {
    if (err) return fn(err);
    fn(null, self.value);
  });
};

Render.prototype.renderstream = function(fn) {
	var self = this;
	self.streamData = self.data;
	self.data = null;
	
	// Check that self.data is an array
	if (! Array.isArray(self.streamData)) {
		var err = new Error('data is not an Array');
		if (err) return fn(err);		
	}
	
	// Check that the required event handler callbacks are passed in
	if (! self.options.renderstream.fnStreamOnXform || 
			(! typeof(self.options.renderstream.fnStreamOnXform) === 'function')) {
		var err = new Error('options.renderstream.fnStreamOnXform is not a callback function');
		if (err) return fn(err);
	}
	
	if (! self.options.renderstream.fnStreamOnError || 
			(! typeof(self.options.renderstream.fnStreamOnError) === 'function')) {
		var err = new Error('options.renderstream.fnStreamOnError is not a callback function');
		if (err) return fn(err);
	}
	
	if (! self.options.renderstream.fnStreamOnFinish || 
			(! typeof(self.options.renderstream.fnStreamOnFinish) === 'function')) {
		var err = new Error('options.renderstream.fnStreamOnFinish is not a callback function');
		if (err) return fn(err);
	}	
	
	var fnStreamOnXform = self.options.renderstream.fnStreamOnXform.bind(self.options.renderstream);
	var fnStreamOnError = self.options.renderstream.fnStreamOnError.bind(self.options.renderstream); 
	var fnStreamOnFinish = self.options.renderstream.fnStreamOnFinish.bind(self.options.renderstream);

	// Create the transformer stream object
	var transformer = transform(function(data) {
		// transformed item
		var xFormItem;
		
		// render the item from the transformer stream
		self.data = data;
		self.render(function(err, out) {
		    if (err) { 
		    	return fnStreamOnError(err); 
		    }
			
			xFormItem = out;
		});	
		
		return xFormItem;
	});
	
	// Set the handler for after the data item is transformed from the stream
	transformer.on('readable', function() {
		var row;
		while(row = transformer.read()){ 
			// TODO: see why row, when passed by reference is the same pointer every time.  
			// When the row pointer is stored in an array, all array members update at the same time to the last value
			// Deep copy as a temporary fix to pass by value.
			fnStreamOnXform(deepcopy(row));
		}
	});
	
	// Set the handler for when an error occurs when transforming an item from the stream
	transformer.on('error', fnStreamOnError);
	
	// Set the handler for when the stream is finished transforming	
	transformer.on('finish', function() {
		fnStreamOnFinish();
		fn(null, null);
	});
	
	// Loop here
	// Write data into transformer stream
	self.streamData.forEach(function(curItem) {
		transformer.write(curItem);
	});		
	
	// End transformer stream
	transformer.end();
	
	// Clean up
	self.data = self.streamdata;
	delete self.streamdata;
	
};


Render.prototype.set = function(path, value) {
  set(path, value, this.value);
  return this;
};
