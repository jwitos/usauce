var express = require('express');
    config = require('../config');
    request = require('request'),
    cheerio = require('cheerio'),
    bodyParser = require('body-parser'),
	cjar = request.jar();

var urls = require('./urls');

/**
  * Get user's scores from USOS
  * @param req
  * @param res
  * @param next
  */

exports.usosGetScores = function(req,res,next){
  request({
      url:urls.SCORES,
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
          semesterName = (elem.children[1].children[1].children[0].data).trim(); // tbody.tr.td.text.data - Semester name
        }
        else {
          // Here are the actual scores for the semester stated above
          // Each tr contains subject with its' scores

          scoresArr = [];

          var tempSubject, tempScore, subjectName, subjectCode;
          var tempPair = {};
          var subjectsCount = $(this).children('tr').length;

          $(this).children('tr').each(function(r, elem) {

            var subjectScore = "";

            $(this).children('td').each(function(d, elem) {

              if(d==0) { // single subject
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
              } else if(d==2) { // score for subject
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
              scoresArr.push(tempPair);
          });
        }

        // Add subject-score pair (tempPair object) to others
        fullScoresArr.push(scoresArr);

      });

      // Output
      res.json(fullScoresArr);
  });
};

/**
  * Get user's grade from specific exam
  * Requires (GET): @param exam_id, @param term_id
  * @param req
  * @param res
  * @param next
  */
exports.usosGetGradeFromExam = function(req,res,next) {
	if(req.query.exam_id && req.query.term_id) {
		var exam_id = req.query.exam_id;
		var term_id = req.query.term_id;
		console.log("Checking grade from exam with exam_id: " + exam_id + " and term_id: " + term_id + "...");

		// sample correct params:
		//WL-L3.Chir.I
		//15%2F16

		request({
			url: 'https://www.usosweb.uj.edu.pl/kontroler.php?_action=dla_stud/studia/oceny/pokazOcenyPrzedmiotu&prz_kod=' + exam_id + '&cdyd_kod=' + term_id,
			jar: cjar
		}, function(err,response,body){
			if(err) { res.send(err); }
			var $ = cheerio.load(body);
			
			// TODO: handle wrong parameters - when table .uwb-decorbox-warning !

			var protocol, isCountedToMeanValue, score;

			$('.grey').children('tr').each(function(r, elem){
				$(this).children('td').each(function(d, elem) {
					if(r == 0 && d ==1) { protocol = $(this).text(); }
					if(r == 1 && d ==1) { isCountedToMeanValue = $(this).text(); }
					if(r == 2 && d ==1) { 
						score = $(this).text(); 
						// TODO: cleanup (multiline)
						// TODO: handle more than one result
					}
				});
			});

			var json = { 
				protocol: protocol.trim(), 
				isCountedToMeanValue: isCountedToMeanValue.trim(), 
				score: score.trim()
			};

			console.log(json);
			
			res.json(json);
		});
	} else {
		res.json({ err: "Missing one or more parameters (required: exam_id, term_id)" });
	}
}


/**
  * Get user's tests
  * @param req
  * @param res
  * @param next
  */
exports.usosGetTests = function(req,res,next) {
	request({
		url: urls.TESTS,
		jar: cjar
	}, function(err,response,body){
		if(err) { res.json({err: err}); }
		var $ = cheerio.load(body);

		var subjects = [];
		var tempSubject, subjectCode, subjectName, coordinator, term, testsId;
		$('.grey').find("tr").each(function(i, v) {
			var wez_id = $(this).attr("wez_id");
			if((i+1) % 2 == 0){
				$(this).find("td").each(function (k, t) {
					if(k == 0) {
						subjectCode = $(this).find(".note").text().trim();
						$(this).find(".note").remove();
						subjectName = $(this).text().trim();
					} else if (k == 1) {
						coordinator = $(this).find(".note").text().trim();
					}
				});
				tempSubject = {
					name: subjectName, 
					code: subjectCode, 
					term: term, 
					coordinator: coordinator,
					testsId: wez_id
				};
				subjects.push(tempSubject);
			} else {
				term = $(this).find(".note").text().trim();
			}
		});
		res.json(subjects);
	});
}