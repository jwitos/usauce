var express = require('express');
    config = require('../config');
    request = require('request'),
    cheerio = require('cheerio'),
    bodyParser = require('body-parser'),
    cjar = request.jar();

var urls = require('./urls');

/**
  * Get user's groups
  * Required API parameters: none
  * Optional API parameters: @param year (POST)
  * @param req
  * @param res
  * @param next
  */
exports.usosGetGroups = function(req,res,next) {
  var year;

  if(req.body.year != undefined) {
    year = "&rok=" + req.body.year;
  } else {
    year = "";
  }

  request({
      url: urls.GROUPS + year,
      jar: cjar
    }, function(err,response,body){
      if(err) { res.json({err: err}); }
      var $ = cheerio.load(body);
      var page = $.root();

      // Check for warning
      $warn = $('.nopaddingunder');
      if($warn.text() != "") { 
        // there are no groups for selected term
        var warnMsg = $warn.text();
        res.json({groups: 0, res: warnMsg});
      } else {
        var gr = $('.grey');
        var availableSemesters = [];
        var subjects = [];
        var subjectName, subjectGroups;

        gr.each(function(t,k) {
          if (t == 0) {
            // table with semester choice

            ts = $(this).find("a");
            ts.each(function (ti, term) {
              availableSemesters.push($(this).text());
            });

          } else {
            // actual groups - if available
            var rows = $(this).find("tr");

            rows.each(function(b, l) {
              subjectGroups = [];

              $(this).find("td").each(function(c, m) {
                if (c == 0) {
                  // left part of table
                  var subject = $(this).find("a");
                  subjectName = $(subject).text();
                } else {
                  // right part (links to groups)
                  $(this).find("a").each(function (d, n) {
                    var href = $(this).attr('href');
                    var group_name = $(this).text().trim();
                    var zaj_cyk_id = href.match(/zaj_cyk_id=\d+/g);
                    var gr_nr = href.match(/gr_nr=\d+/g);

                    tempGroup = {group_name: group_name, zaj_cyk_id: zaj_cyk_id, gr_nr: gr_nr};
                    subjectGroups.push(tempGroup);
                  });
                }
              });
              subjects.push({name: subjectName, groups: subjectGroups});
            });
          }
        });
        res.json({availableSemesters: availableSemesters, subjects: subjects});
      }
  });
};

/**
  * Get user group's details - name, tutors, students
  * Required API parameters: @param zaj_cyk_id; @param gr_nr (POST)
  * @param req
  * @param res
  * @param next
  */
exports.usosGetGroupDetails = function(req, res, next) {
  if((req.body.zaj_cyk_id != undefined) && (req.body.gr_nr != undefined)) {
    request({
      url: (urls.GROUP_DETAILS + "&zaj_cyk_id=" + req.body.zaj_cyk_id + "&gr_nr=" + req.body.gr_nr),
      jar: cjar
    },
    function(err,response,body) {
      if(err) { res.json({err: err}); }

      var $ = cheerio.load(body);
      var grd = $('.grey').get(1);

      // group details table
      var subjectName, subjectCode, tutorsArr, groupNote;
      var rows = $(grd).find("tr").each(function(i, v){
        if (i == 0) {
          subjectName = $(this).find("a").text().trim();
          subjectCode = $(this).find(".note").text().trim();
        } else if (i == 4) {
          tutorsArr = [];
          var tutors = $(this).find("a").each(function(k, t) {
            tutorsArr.push($(this).text().trim());
          });
        } else if (i == 5) {
          groupNote = $(this).find("p").text().trim();
        }
      });

      // students in group table
      var studentsArr = [];
      var studentsRows = $('.wrnav').find("tr");
      $(studentsRows).each(function(i, v) {
        if(i>9 && i < (studentsRows.length - 2)) {
          var objLastname = $(this).find("td").get(0);
          var objFirstname = $(this).find("td").get(1);

          var tempLastname = $(objLastname).text().trim();
          var tempFirstname = $(objFirstname).text().trim();

          studentsArr.push({l: tempLastname, f: tempFirstname});
        }
      });

      res.json({
        name: subjectName, 
        code: subjectCode, 
        tutors: tutorsArr, 
        note: groupNote, 
        students: studentsArr
      });

    });
  } else {
    res.json({err: "Missing required parameters. You need to POST: `zaj_cyk_id` and `gr_nr`."});
  }
};


/**
  * Show user's completion report card
  * @param req
  * @param res
  * @param next
  */
exports.usosCompletion = function(req,res,next) {
  request({
    url: urls.COMPLETION,
    jar: cjar
  }, function(err, response, body) {
    if(err) { res.json({err: err}); }
    var $ = cheerio.load(body);

    var cycles = [];

    var rows = $(".grey").find("tr");
    $(rows).each(function(i, t) {
      var name, cycle, completionDate, status, details;

      $(this).find(".headnote").remove();
      $(this).find(".footnote").remove();

      
      $(this).find("td").each(function(a, d) {
        if (a == 0) {
          name = $(this).text().trim();
        } else if (a == 1) {
          cycle = $(this).text().trim();
        } else if (a == 2) {
          completionDate = $(this).text().trim();
        } else if (a == 3) {
          status = $(this).text().trim();
        }
      });

      cycles.push({
        name: name, 
        cycle: cycle, 
        completionDate: completionDate, 
        status: status
      });
    });

    res.json(cycles);
  });
}