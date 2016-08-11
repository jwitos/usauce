var express = require('express');
    config = require('../config');
    request = require('request'),
    cheerio = require('cheerio'),
    bodyParser = require('body-parser'),
    cjar = request.jar();

var c = require('./connection');

/**
  * Show USOS login form
  * @param req
  * @param res
  * @param next
  */

exports.usosLoginView = function(req,res,next) {
  res.write('<html><form method="post">')
  res.write('<input type="text" name="username" value="' + config.defaults.username + '" placeholder="Email usos"/>');
  res.write('<input type="password" name="password" value="'+config.defaults.password+'" placeholder="Hasło usos" />');
  res.write('<input type="submit" value="Łącz z usos" />');
  res.write('</form></html>');
  res.end();
};

/**
  * Connect with USOS and display page after logging in
  * @param req
  * @param res
  * @param next
  */

exports.usosLogin = function(req,res,next){
  var connect = c.usosConnect(req.body.username, req.body.password, cjar, function(err,body,sessId){
    if(err) {
      console.log(err);
      res.redirect('/?error');
    } else {
      req.session.PHPSESSID = sessId;
      //res.send(body) // <- shows USOS homepage
      // check whether login succedeed?
      res.redirect('/');
    }
  });
};