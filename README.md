# USAUCE
USAUCE is a open-source SDK for USOS (Uniwersytecki System Obsługi Studiów) at Jagiellonian University. Based primarily on web-scraping, since the official USOS API at Jagiellonian University is, frankly, locked for third-party, preventing everyone from writing their own software.

This toolset allows you to run USAUCE and easily access and manage user's information using Node.js.

## Available resources

`/auth/login`

Call this method with `username` and `password` POST-sent data, the same as used to login to USOS system. If login is successful, you will be granted priviledge to use other USOS resources.

`/grades`

No required parameters.
Call to get JSON response with all scores (exams/final scores).

`/tests`

No required parameters.
Returns JSON table of objects with user's tests (subject, its code, term, coordinator and unique ID).

`/tests/scores`

Requires (POST): `wez_id` (unique subject's tests ID).
Returns JSON with all tests groups, notes and full scores for each test.

`/groups`

Parameters: No required. Optional: `year` param (POST), used to change academic year to retrieve groups, ex. "2015".
Response is JSON with all the subjects, their groups (name, code, group number).

`/groups/details/`

Required parameters (POST): `zaj_cyk_id` (unique group ID), `gr_nr` (group number; not unique).
JSON response provides information about subject name, tutors, coordinator, other students.