function url(name, value) {
	Object.defineProperty(exports, name, {
		value: 		value,
		enumerable: true
	});
}
url("LOGIN_GATEWAY", "https://login.uj.edu.pl/login?service=https%3A%2F%2Fwww.usosweb.uj.edu.pl%2Fkontroler.php%3F_action%3Dlogowaniecas%2Findex&gateway=true&locale=pl");
url("LOGIN_FORM", "https://login.uj.edu.pl/login?service=https%3A%2F%2Fwww.usosweb.uj.edu.pl%2Fkontroler.php%3F_action%3Dlogowaniecas%2Findex&locale=pl");
url("USOS_HOME", "https://www.usosweb.uj.edu.pl/kontroler.php?_action=home/index");
url("HOST","www.usosweb.uj.edu.pl");

url("GROUPS", "https://www.usosweb.uj.edu.pl/kontroler.php?_action=home/grupy");
url("GROUP_DETAILS", "https://www.usosweb.uj.edu.pl/kontroler.php?_action=katalog2/przedmioty/pokazZajecia&tab_offset=0&tab_limit=1000&tab_order=4a2a3a");
url("SCORES", "https://www.usosweb.uj.edu.pl/kontroler.php?_action=dla_stud/studia/oceny/index");