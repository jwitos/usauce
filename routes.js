var express = require('express'),
  	router = express.Router(),
    config = require('./config');
    request = require('request'),
    cheerio = require('cheerio'),
    bodyParser = require('body-parser'),
    cjar = request.jar();

var a = require('./bin/auth');
var c = require('./bin/connection');
var sc = require('./bin/scores');

/**
  * Show home page
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
  res.status(200).send('<a href="/login">Loguj</a><br /><a href="/oceny">Oceny</a><br/><a href="/grades/exams">egzaminy</a><br /><a href="/grades/exam">wyniki z egzaminu (1)</a>');
};


router.get('/login', a.usosLoginView);
router.post('/login', a.usosLogin);
router.post('/auth/login', a.usosApiLogin);

router.get('/oceny', a.ifLogged, sc.usosGetScores);
router.all('/grades', a.ifLogged, sc.usosGetScores);

router.all('/grades/exam', a.ifLogged, sc.usosGetGradeFromExam);


// router.get('/courses/user', cr.usosGetUserCourses); // w jakich grupach zajęciowych się jest

// router.get('/grades/tests', sc.usosGetCoursesWithTests); // sprawdziany: wybór przedmiotu

// router.get('/grades/tests/course', sc.usosGetGradesFromTestsByCourse); // sprawdziany: oceny dla danego przedmiotu


router.get('/', usosHomeView);

module.exports = router;