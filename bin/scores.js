var express = require('express');
    config = require('../config');
    request = require('request'),
    cheerio = require('cheerio'),
    bodyParser = require('body-parser'),
	cjar = request.jar();

/**
  * Get user's scores from USOS
  * @param req
  * @param res
  * @param next
  */

exports.usosGetScores = function(req,res,next){
    if(req.session.PHPSESSID){
      request({
          url:'https://www.usosweb.uj.edu.pl/kontroler.php?_action=dla_stud/studia/oceny/index',
          jar:cjar
        }, function(err,response,body){
          if (err) { console.log(err); }

          var $ = cheerio.load(body);
          var scoresTable = $('.grey'); // Scrape table with scores
          var semesterName;
          var scoresArr;
          var fullScoresArr = [];

          scoresTable.children('tbody').each(function(i, elem){
            if(i%2==0) {
              // Header - Semester (f.ex. winter/summer/academic year)
              //console.log("Header, i:",i);
              semesterName = (elem.children[1].children[1].children[0].data).trim(); // tbody.tr.td.text.data - Semester name
              //console.log(semesterName);
              //res.write(semesterName);
            }
            else {
              // Here are the actual scores for the semester stated above
              // Each tr contains subject with its' scores

              //console.log("Scores, i:",i);

              scoresArr = [];

              // BELOW: get full scores text
              //var scoresElem = $('.grey').text()
              // END

              //res.write(scoresElem);

              var tempSubject, tempScore, subjectName, subjectCode;
              var tempPair = {};
              var subjectsCount = $(this).children('tr').length;

              $(this).children('tr').each(function(r, elem) {
                var subjectScore = "";
                //console.log("TR: ", $(this).text());
                $(this).children('td').each(function(d, elem) {

                  if(d==0) { // subject
                    tempSubject = $(this).text();
                    var tempSubjectSplitArray = tempSubject.split("\n");
                    var _s = 0;
                    tempSubjectSplitArray.forEach(function(s) {
                      if(_s==1) {
                        subjectName = s.trim();
                      } else if (_s==2) {
                        subjectCode = s.trim();
                      }
                      _s++;
                    });
                  } else if(d==2) { // score
                    tempScore = $(this).text();
                    var tempScoreSplitArray = tempScore.split("\n");
                    if(tempScoreSplitArray.length > 1) {
                      tempScoreSplitArray.forEach(function(s) {
                        if(s.trim().length > 0) {
                          subjectScore = subjectScore + " " + s.trim();
                        }
                      });
                    }
                  }
                });
                  var tempPair = { name: subjectName, code: subjectCode, score: subjectScore };
                  //console.log(tempPair);
                  scoresArr.push(tempPair);

                  if(r+1 == subjectsCount) {
                    //console.log("KONIEC SPRAWDZANIA PRZEDMIOTOW");
                    //console.log({ semester: semesterName, scores: scoresArr });
                  }
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
            fullScoresArr.push(scoresArr);
          });

          console.log(fullScoresArr);
          res.send(fullScoresArr);

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