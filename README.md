# USAUCE
USAUCE is a open-source SDK for USOS (Uniwersytecki System Obsługi Studiów) at Jagiellonian University. Based primarily on web-scraping, since the official USOS API at Jagiellonian University is, frankly, locked for third-party, preventing everyone from writing their own software.

This toolset allows you to run USAUCE and easily access and manage user's information using Node.js.

## Available resources

`/auth/login`

Call this method with `username` and `password` POST-sent data, the same as used to login to USOS system. If login is successful, you will be granted priviledge to use other USOS resources.

`/grades`

No required parameters. Call to get JSON response with all scores (exams/final scores).

`/groups`

Parameters: No required. Optional: `year` param (POST), used to change academic year to retrieve groups, ex. "2015". Response is JSON with all the subjects, their groups (name, code, group number).