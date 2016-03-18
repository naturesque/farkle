var filesys = require('fs'),
bodyParser = require('body-parser'),
express = require('express'),
sockjs = require('sockjs'),
http = require('http'),
farkle = require('farkle');

const PORT = 3000;
const SOCKET_PORT = 9000;

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.listen(PORT);

var players = [];

var currentGame = farkle.createFarkleGame();

var sockComm = sockjs.createServer();

const TOTAL_PLAYERS = 3;

sockComm.on('connection', function(conn) {
	console.log('connection made');
	
	if (players.length >= TOTAL_PLAYERS) {
		conn.close();
	} else {
		conn.on('data', function(message) {
			console.log('received: ' + message + " from " + conn.connectionId);
            var incomingData = JSON.parse(message)
            
            if (incomingData.action == "registerName") {
                registerPlayer(conn, incomingData);
            } else {
			  currentGame.acceptAction(conn, incomingData);
            }			
		});
		conn.on('close', function() {
			if (players.indexOf(conn) >= 0) {
				players.splice(players.indexOf(conn), 1);
			}
			console.log('closed connection');
		});
	}
});

var server = http.createServer(app).listen(SOCKET_PORT , function(){
  console.log('Express server listening on port ' + SOCKET_PORT );
});

sockComm.installHandlers(server, {prefix:'/gameComm'});

function registerPlayer(conn, incomingData){
    conn.connectionId = players.length;
    conn.playerName = incomingData.playerName;
    
    players.push(conn); 
    
    if (players.length == TOTAL_PLAYERS) {
        //initialize game
        for (var i = 0; i < players.length; i++) {
            
            var opponentNames = [];
            var opponentIds = [];
            
            for (var n = 0; n < players.length; n++) {
                if (n != i) {
                    opponentNames.push(players[n].playerName);
                    opponentIds.push(players[n].connectionId);
                }
            }
            
            var returnObj = { action:"playerRegistered",
							  playerName:players[i].playerName,
                              opponentIds:opponentIds,
                              opponentNames:opponentNames };
            
            players[i].write(JSON.stringify(returnObj));
        }
        
        currentGame.initGame(players);
    } 
}