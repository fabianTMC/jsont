function Options() {
	this.renderstream = {};
	
	this.renderstream.xFormResults = [];	
	
	this.renderstream.fnStreamOnXform = function(row) {
		this.xFormResults.push(row);
	};
	
	this.renderstream.fnStreamOnError = function(err) {
		console.log(err.message);		
	};
	
	this.renderstream.fnStreamOnFinish = function() {
		var xFormResultsJSON = JSON.stringify(this.xFormResults, null, 4);
		
		// Write to a file
		var fs = require('fs');
		var outFile = "C:\\Users\\Jason\\Documents\\Temp\\out.json";
		fs.writeFile(outFile, xFormResultsJSON, function (err) {
			if (err) { 
				return console.log(err); 
			}
			console.log('File written: "' + outFile + '"');
		});	
		
		console.log("Done! Transformed " + this.xFormResults.length + " items");
	}
};

module.exports = new Options();
