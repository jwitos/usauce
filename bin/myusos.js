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