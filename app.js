'use strict'

var express = require('express'),
    request = require('request'),
    cheerio = require('cheerio'),
    session = require('express-session'),
    bodyParser = require('body-parser'),
    config = require('./config'),
    app = express();

app.use(session({secret: 'keyboard cat',
                  resave: false,
                  saveUninitialized: false
                }));
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
            usosSessId(cjar, function(sessId) {
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
function usosSessId(cjar, loginCallback) {
  var sessId = cjar._jar.store.idx['www.usosweb.uj.edu.pl']['/'].PHPSESSID;
  // var sessId contains an object {key: PHPSESSID, value: (), domain: (), secure etc.}
  loginCallback(sessId.value); // to usosConnect
}

/**
  * Get user's scores from USOS
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
          if (err) { console.log(err); }

          var $ = cheerio.load(body);
          var scoresTable = $('.grey'); // Scrape table with scores

          scoresTable.children('tbody').each(function(i, elem){
            if(i%2==0) {
              // Header - Semester (f.ex. winter/summer/academic year)
              console.log("Header, i:",i);
              let semesterName = elem.children[1].children[1].children[0].data; // tbody.tr.td.text.data - Semester name
              console.log(semesterName);
              res.write(semesterName);
            }
            else {
              // Here are the actual scores for the semester stated above
              // Each tr contains subject with its' scores
              console.log("Scores, i:",i);

              // BELOW: get full scores text
              //var scoresElem = $('.grey').text()
              // END

              //res.write(scoresElem);
              console.log("SUBJECT: ");
              $(this).children('tr').each(function(i, elem) {
                console.log($(this).text());
                console.log("TD: ");
                $(this).children('td').each(function(i, elem) {
                  console.log("elem: ", $(this).text());
                });
              });

              //console.log($(this).children('tr').children('td').text());

              //console.log(elem.children[1].children); // tutaj są wszystkie przedmioty, trzeba przez nie przeiterować
              for (var subject of elem.children[1].children) {
                //console.log("Subject:",subject);
                //console.log("Subject.name: ", subject.name);
                //console.log("Subject.children: ", subject.children);
                if(subject.children != undefined) {
                  //console.log("Subject.children[0].next: ", subject.children[0].next);

                  // DECYPHERED:
                  // subject.children[0].next.children[0].data <- first subject of the semester
                  // subject.children[0].next.children[1].children[0].data <- subject code (i.e. WL-LK-1-MD-12 (LK-DM-1))

                }
              }
            }
          });

          var scoresTableTbody = scoresTable.find('tbody').length;

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
  * Show USOS login form
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
  var connect = usosConnect(req.body.username, req.body.password, cjar, function(err,body,sessId){
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

/**
  * (middleware) Show home page
  * @param req
  * @param res
  * @param next
  */
function usosHomeView(req,res,next){
  if(req.query.error) {
    console.log("Jest error");
    res.status(200).send('<b>Error logging in</b>');
  } else {
    console.log(req.query);
  }
  res.status(200).send('<a href="/login">Loguj</a><br /><a href="/oceny">Oceny</a><br/><a href="/fakultet">Rejestruj na testow fakultet</a>');
};

/**
  * (middleware) Register for optional subject (pol.: fakultet)
  * !!! DEPRECATED
  * @param req
  * @param res
  * @param next
  */

function usosRegisterOptionalSubject(req,res,next){
  request.post({
    url:'https://www.usosweb.uj.edu.pl/kontroler.php',
    form: {
      _action:'actionx:dla_stud/rejestracja/brdg2/zarejestruj(rej_kod:WL-15@12f16-FAK.2-5;prz_kod:WL-L3.F06;cdyd_kod:15@12f16;odczyt:0;prgos_id:271260;callback:g_3fed313f)',
      //csrftoken: should get it...
      ajax: 1
    },
    followRedirect:false,
    jar:cjar
  }, function(err,response,body){
    if(err){console.error(err)};
    console.log(response);
  });
};

/**
  * Show list of optional subjects (pol.: fakultety)
  * !Looks like doesn't work right now 
  * @param req
  * @param res
  * @param next
  */

function usosOptionalSubjectList(req,res,next) {
  if(req.session.PHPSESSID){
    request({
        url:'https://www.usosweb.uj.edu.pl/kontroler.php?_action=dla_stud/rejestracja/brdg2/wyborPrzedmiotu&rej_kod=WL-15%2F16-FAK.2-5',
        jar:cjar,
        followRedirect:false
    }, function(err,response,body){
      if(err){console.error(err)};
      console.log("OPTIONAL SUBJS LIST:");
      var $ = cheerio.load(body);
      var subjectsTable = $('.grey'); // Scrape table with subjects
      console.log("Table loaded, children:",subjectsTable[0].children);
      subjectsTable.children('tr').each(function(i,elem){
        console.log("ELEM " + i + " :" + elem);
      });
    });
  } else {
    res.redirect('/login');
  }
}

function usosGeneRegisterGet (req,res,next) {
    if(req.session.PHPSESSID) {
      request({
        url:'https://www.usosweb.uj.edu.pl/kontroler.php?_action=dla_stud/rejestracja/brdg2/grupyPrzedmiotu&rej_kod=WL-15%2F16-FAK.2-5&prz_kod=WL-L3.F10&cdyd_kod=15%2F16&odczyt=0&prgos_id=271260&callback=g_9c72ab82',
        jar:cjar,
        followRedirect:false
      },function(err,response,body){
        if(err){console.error(err);}
        console.log("Getting GENE information");
        var $ = cheerio.load(body);
        var csrftoken = $('input[name=csrftoken]');
        console.log("TOKEN CSRF:",csrftoken[0].attribs.value);
        //res.send(body);
        request.post({
          url:'https://www.usosweb.uj.edu.pl/kontroler.php',
          form: {
            '_action': 'actionx:dla_stud/rejestracja/brdg2/zarejestruj(prgos_id:271260)',
            'csrftoken': csrftoken[0].attribs.value,
            'ajax': '1',
            'rej_kod': 'WL-15/16-FAK.2-5',
            'prz_kod': 'WL-L3.F10',
            'cdyd_kod': '15/16',
            'callback': 'g_d4a0a6c3',
            'zajecia[325631][]': '2'
          },
          followRedirect:false,
          jar:cjar
        },function(err,response,body){
          if(err){ console.error(err);}
          console.log("SENT POST");
          console.log("BODY:");
          console.log(body);
          console.log("MSG LENGTH:",body.length);
          // 170 - CLOSED

        });
      });
    } else {
      res.redirect('/login');
    }
}
function usosWf (req,res,next) {
    if(req.session.PHPSESSID) {
      request({
        url:'https://www.usosweb.uj.edu.pl/kontroler.php?_action=dla_stud/rejestracja/brdg2/grupyPrzedmiotu&rej_kod=CM-SWF-WL-FAK-15%2F16Z&prz_kod=CM-SWF-WL-FAKULTET-Z&cdyd_kod=15%2F16Z&odczyt=0&prgos_id=271260&callback=g_8053fac1',
        jar:cjar,
        followRedirect:false
      },function(err,response,body){
        if(err){console.error(err);}
        console.log("WF REJESTRACJA");
        var $ = cheerio.load(body);
        var csrftoken = $('input[name=csrftoken]');
        console.log("TOKEN CSRF:",csrftoken[0].attribs.value);
        //res.send(body);
        request.post({
          url:'https://www.usosweb.uj.edu.pl/kontroler.php',
          form: {
            '_action': 'actionx:dla_stud/rejestracja/brdg2/zarejestruj(prgos_id:271260)',
            'csrftoken': csrftoken[0].attribs.value,
            'ajax': '1',
            'rej_kod': 'CM-SWF-WL-FAK-15/16Z',
            'prz_kod': 'CM-SWF-WL-FAKULTET-Z',
            'cdyd_kod': '15/16Z',
            'callback': 'g_f8cd55b7',
            'zajecia[330950][]': '2'
          },
          followRedirect:false,
          jar:cjar
        },function(err,response,body){
          if(err){ console.error(err);}
          console.log("SENT POST");
          console.log("BODY:");
          console.log(body);
          console.log("MSG LENGTH:",body.length);
          // 170 - CLOSED
          // 235 - SUCCESS

        });
      });
    } else {
      res.redirect('/login');
    }
}

/**
  * Routes
  */

app.get('/login', usosLoginView);
app.post('/login', usosLogin);

app.get('/oceny', usosGetScores);
app.get('/fakultet', usosGeneRegisterGet);
app.get('/wf', usosWf)
app.get('/', usosHomeView);

app.listen(3000,function(){
  console.log("Server up and running");
});
