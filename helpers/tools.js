var express = require('express');

exports.trimMultiline = function(str) {
	var splittedStr = str.split("\n");
	var trimmedStr = "";
	for (i=0; i<splittedStr.length; i++){
		trimmedStr = trimmedStr + splittedStr[i].trim();
		if (i < (splittedStr.length - 1)) {
			trimmedStr = trimmedStr + " ";
		}
	}
	console.log("trimMultiline output: ", trimmedStr);
	return trimmedStr;
}