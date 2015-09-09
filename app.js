'use strict'

var express = require('express'),
    request = require('request'),
    cheerio = require('cheerio'),
    session = require('express-session'),
    bodyParser = require('body-parser'),
    config = require('./config'),
    app = express();

app.use(session({secret: 'keyboard cat'}));
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

var cjar = request.jar();


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

function usosConnect(username,password,cjar,callback) {
  // Go to login.uj.edu.pl - CAS auth page
  request({url:'https://login.uj.edu.pl/login?service=https%3A%2F%2Fwww.usosweb.uj.edu.pl%2Fkontroler.php%3F_action%3Dlogowaniecas%2Findex&gateway=true&locale=pl', jar:cjar}, function(err,response,body){
    var $ = cheerio.load(body);
    var usosBodyForm = $('#fm1');
    var usosBodylt = $('input[name=lt]');
    var loginToken = usosBodylt[0].attribs.value;
    var loginAction = usosBodyForm[0].attribs.action;
    // Prepare to send login form
    var postOptions = {
      url:('https://login.uj.edu.pl/login?service=https%3A%2F%2Fwww.usosweb.uj.edu.pl%2Fkontroler.php%3F_action%3Dlogowaniecas%2Findex&locale=pl'),
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
        headers:{'Referer':'https://login.uj.edu.pl/login?service=https%3A%2F%2Fwww.usosweb.uj.edu.pl%2Fkontroler.php%3F_action%3Dlogowaniecas%2Findex&locale=pl'}
      },function(err,response,body){
        // Go to CAS auth confirmation page
        request({
          url:response.headers.location,
          jar:cjar,
          followRedirect:false,
          headers:{'Referer':'https://login.uj.edu.pl/login?service=https%3A%2F%2Fwww.usosweb.uj.edu.pl%2Fkontroler.php%3F_action%3Dlogowaniecas%2Findex&locale=pl'}
        },function(err,response,body){
          // Now try to go home
          request({
            url:'https://www.usosweb.uj.edu.pl/kontroler.php?_action=home/index',
            jar:cjar,
            followRedirect:false,
            headers:{'Referer':'https://login.uj.edu.pl/login?service=https%3A%2F%2Fwww.usosweb.uj.edu.pl%2Fkontroler.php%3F_action%3Dlogowaniecas%2Findex&locale=pl',
                    'connection':'keep-alive'}
          },function(err,response,body){
            // Teraz tutaj można zrobić wejścia na inne strony
            usosSessId(cjar, function(sessId){
              callback(body,sessId);
            });
          });
        });
      });
    });
  });
  // TODO: rewrite into Promises (npm request-promise?)
}

/**
  * Get cookie PHPSESSID for USOS
  * @param {Object} cjar
  * @param callback
  */
function usosSessId(cjar, callback) {
  var sessId = cjar._jar.store.idx['www.usosweb.uj.edu.pl']['/'].PHPSESSID;
  // var sessId contains an object {key: PHPSESSID, value: (), domain: (), secure etc.}
  callback(sessId.value);
}

/**
  * (middleware) Get user's scores from USOS
  * @param req
  * @param res
  * @param next
  */

function usosGetScores(req,res,next){
    if(req.session.PHPSESSID){
      request({
          url:'https://www.usosweb.uj.edu.pl/kontroler.php?_action=dla_stud/studia/oceny/index',
          jar:cjar
        }, function(err,response,body){
          var $ = cheerio.load(body);
          var scoresTable = $('.grey'); // Scrape table with scores
          scoresTable.children('tbody').each(function(i, elem){
            if(i%2==0) {
              // Header - Semester (f.ex. winter/summer/academic year)
              console.log("Header, i:",i);
              let semesterName = elem.children[1].children[1].children[0].data; // tbody.tr.td.text.data - Semester name
              console.log(semesterName);
            }
            else {
              // Here are the actual scores for the semester stated above
              // Each tr contains subject with its' scores
              console.log("Scores, i:",i);
              //console.log(elem.children[1].children); // tutaj są wszystkie przedmioty, trzeba przez nie przeiterować
              for (var subject of elem.children[1].children) {
                console.log("Subject:",subject);
              }
            }
          });

          var scoresTableTbody = scoresTable.find('tbody').length;
          res.send(scoresTableTbody);
          /*$scoresTable('tbody').each(function(i, elem){
            console.log("ANOTHER TBODY>>>");
            console.log($scoresTable(this).text());
          });*/
          //res.send(scoresTable);
      });
    }
    else {
      res.redirect('/login');
    }
};

/**
  * (middleware) Show USOS login form
  * @param req
  * @param res
  * @param next
  */

function usosLoginView(req,res,next) {
  res.write('<html><form method="post">')
  res.write('<input type="text" name="username" value="' + config.defaults.username + '" placeholder="Email usos"/>');
  res.write('<input type="password" name="password" value="'+config.defaults.password+'" placeholder="Hasło usos" />');
  res.write('<input type="submit" value="Łącz z usos" />');
  res.write('</form></html>');
  res.end();
};

/**
  * (middleware) Connect with USOS and display page after logging in
  * @param req
  * @param res
  * @param next
  */

function usosLogin(req,res,next){
  var connect = usosConnect(req.body.username, req.body.password, cjar, function(body,sessId){
    req.session.PHPSESSID = sessId;
    res.send(body)
  });
};

/**
  * (middleware) Show home page
  * @param req
  * @param res
  * @param next
  */
function usosHomeView(req,res,next){
  res.status(200).send('<a href="/login">Loguj</a><br /><a href="/oceny">Oceny</a>');
};


/**
  * Routes
  */

app.get('/login', usosLoginView);
app.post('/login', usosLogin);

app.get('/oceny', usosGetScores);
app.get('/', usosHomeView);

app.listen(3000,function(){
  console.log("Server up and running");
});
