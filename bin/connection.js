var express = require('express');
    config = require('../config');
    request = require('request'),
    cheerio = require('cheerio'),
    bodyParser = require('body-parser'),
	cjar = request.jar();

var _this = this;
var urls = require('./urls');

/**
  * Connect with USOS - this function is the heart of app, it handles all redirects
  * and makes us connect through CAS server (login.uj.edu.pl) into USOS service
  * pages.
  *
  * @param {String} username      - USOS email
  * @param {String} password
  * @param {Object} cjar          - cookie jar
  * @param callback(body, sessId) - returns body (HTML) and PHPSESSID cookie value
  */

exports.usosConnect = function(username,password,cjar,callback) {
  // Go to login.uj.edu.pl - CAS auth page
  request({url:urls.LOGIN_GATEWAY, jar:cjar}, function(err,response,body){
    var $ = cheerio.load(body);
    var usosBodyForm = $('#fm1');
    var usosBodylt = $('input[name=lt]');
    var loginToken = usosBodylt[0].attribs.value;
    var loginAction = usosBodyForm[0].attribs.action;
    // Prepare to send login form
    var postOptions = {
      url:urls.LOGIN_FORM,
      followRedirect:false,
      //followAllRedirects:true,
      jar:cjar,
      form: {
        username : username,
        password : password,
        lt : loginToken,
        _eventId : 'submit',
        submit : 'zaloguj'
      }
    };
    request.post(postOptions, function(err,response,body){
      // Go to ticket GET request
      request({
        url:response.headers.location,
        jar:cjar,
        followRedirect:false,
        headers:{'Referer':urls.LOGIN_FORM}
      },function(err,response,body){
        // Go to CAS auth confirmation page

        if (err) {
          // Error logging in
          console.log("Error: ", err); 
          callback(err, null, null);
          return;
        }

        request({
          url:response.headers.location,
          jar:cjar,
          followRedirect:false,
          headers:{'Referer':urls.LOGIN_FORM}
        },function(err,response,body){
          // Now try to go home
          request({
            url:urls.USOS_HOME,
            jar:cjar,
            followRedirect:false,
            headers:{'Referer':urls.LOGIN_FORM,
                    'connection':'keep-alive'}
          },function(err,response,body){
            // Teraz tutaj można zrobić wejścia na inne strony
            _this.usosSessId(cjar, function(sessId) {
              callback(null,body,sessId); // callback to usosLogin
            });
          });
        });
      });
    });
  });
  // TODO: rewrite into Promises / ES6 generators - above looks messy
}

/**
  * Get cookie PHPSESSID for USOS
  * Works as a callback for usosConnect function
  * @param {Object} cjar
  * @param callback
  */
exports.usosSessId = function(cjar, loginCallback) {
  var sessId = cjar._jar.store.idx[urls.HOST]['/'].PHPSESSID;
  // var sessId contains an object {key: PHPSESSID, value: (), domain: (), secure etc.}
  loginCallback(sessId.value); // to usosConnect
}
