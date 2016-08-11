'use strict'

var express = require('express'),
    request = require('request'),
    cheerio = require('cheerio'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    app = express();

app.use(session({secret: 'keyboard cat',
                  resave: false,
                  saveUninitialized: false
                }));
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

var routes = require('./routes');

app.use('/', routes);

app.listen(3000,function(){
  console.log("Server up and running");
});
