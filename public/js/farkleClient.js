//farkleClient.js
(function() {
var Farkle = function(){ 
	const TOTAL_DICE = 6;
	
	var btns = ["rollBtn", "holdBtn", "startBtn"];
	
	var rolledDie = [];
	var heldDie = [];
	var frozenDie = [];
    var currentOpp;
	
	var rolledDieOpp = [];
	var heldDieOpp = [];
	var allowableMoves = [];
	var opponentIds = [];
	
    var sock;
    
	this.initialize = function(){
		hideButtons();
		
		$("#startBtn").show();
		
		clearDice();
		clearDice(true);
	}
	
	this.startNewGame = function(){
		hideButtons();
		
		clearDice();
		clearDice(true);
		
		requestGame();
	}
	
    this.requestRoll = function(){
		var actionObj = {action:"roll", hold:heldDie};		
		
		sock.send(JSON.stringify(actionObj));
	}
    
    this.endTurn = function(){
		var actionObj = {action:"endTurn" };		
		
		sock.send(JSON.stringify(actionObj));
		
        hideButtons();
	}
    
	function clearDice(opponents) {
        if (opponents) {
            var i = 1;
            while ($("#opponentBoard" + i).length) {
                $("#opponentBoard" + i + " img").hide();
                i++;
            }
        } else {
            $("#playerBoard img").hide();
        }
	}
    
    function updateOppDice() {	
       for (var d = 0; d < TOTAL_DICE; d++) {
			if (rolledDieOpp.length > d){
				$("#opponentBoard" + currentOpp + " .r" + (d + 1)).show();
				$("#opponentBoard" + currentOpp + " .r" + (d + 1)).attr("src", "images/die" + rolledDieOpp[d] + ".jpg");
			} else {
				$("#opponentBoard" + currentOpp + " .r" + (d + 1)).hide();
			}
			
			if (heldDieOpp.length > d){
				$("#opponentBoard" + currentOpp + " .f" + (d + 1)).show();
				$("#opponentBoard" + currentOpp + " .f" + (d + 1)).attr("src", "images/die" + heldDieOpp[d] + ".jpg");
			} else {
				$("#opponentBoard" + currentOpp + " .f" + (d + 1)).hide();
			}
		}
	}
	
	function updateDice(){
		rolledDie.sort();
		heldDie.sort();
       
		for (var d = 0; d < TOTAL_DICE; d++) {
			if (rolledDie.length > d){
				$("#playerBoard .r" + (d + 1)).show();
				$("#playerBoard .r" + (d + 1)).attr("src", "images/die" + rolledDie[d] + ".jpg");
				if (allowableMoves.indexOf(rolledDie[d]) >= 0) {
                    var onClickHandler = (function() {
						var currentI = rolledDie[d];
                       return function() {
                           holdDie(currentI);
						}
                    })();
                    $("#playerBoard .r" + (d + 1)).off("click");
					$("#playerBoard .r" + (d + 1)).click(onClickHandler);
				} else {
					$("#playerBoard .r" + (d + 1)).off("click");
				}
			} else {
				$("#playerBoard .r" + (d + 1)).hide();
            }
			
			if (heldDie.length > d){
				$("#playerBoard .h" + (d + 1)).show();
				$("#playerBoard .h" + (d + 1)).attr("src", "images/die" + heldDie[d] + ".jpg");
                var onClickHandler = (function() {
					var currentI = heldDie[d];
					return function() {
						cancelHoldDie(currentI);
					}
				})();
                $("#playerBoard .h" + (d + 1)).off("click");
				$("#playerBoard .h" + (d + 1)).click(onClickHandler);
			} else {
				$("#playerBoard .h" + (d + 1)).hide();
            }
			
			if (frozenDie.length > d){
				$("#playerBoard .f" + (d + 1)).show();
				$("#playerBoard .f" + (d + 1)).attr("src", "images/die" + frozenDie[d] + ".jpg");
			} else {
				$("#playerBoard .f" + (d + 1)).hide();
			}
		}
		
		if (heldDie.length > 0) $("#rollBtn").show();
		else $("#rollBtn").hide();
	}
	
	function showRollResult(res) {
		hideButtons();
        
        $("#holdBtn").show();
		
		console.log('got roll results: ' + res);
		rolledDie = [];
		
		for (var i = 0; i < res.length; i++) {
			rolledDie.push(res[i]);
		}
		
		if (rolledDie.length == TOTAL_DICE) {
			//new game
			heldDie = [];
			frozenDie = [];
		} else {
			//freeze already held dice
			while (heldDie.length > 0) {
				frozenDie.push(heldDie.pop());
			}
		}
		
		//determine which dice the player can hold
		allowableMoves = detectWinningDice(rolledDie);
		
		updateDice();
	}
	
	function detectWinningDice(dice){
		var sets = [5, 1];
		
		for (var i = 0; i < dice.length; i++){
			if (sets.indexOf(dice[i]) < 0) {
				var numberInSet = countInArray(dice, dice[i]);
				
				switch(numberInSet) {
					case 6:
					case 5:
						sets.push(dice[i]);
						break;
					case 4:
						var fullHouse = detectFullHouse(dice);
						if (fullHouse.length == 2) {
							sets.push(fullHouse[0]);
							sets.push(fullHouse[1]);
						} else {
							sets.push(dice[i]);
						}
						break;
					case 3:
						var triples = detectTwoTriples(dice);
						var fullHouse = detectFullHouse(dice);
						
						if (triples.length == 2) {
							sets.push(triples[0]);
							sets.push(triples[1]);
						} else if (fullHouse.length == 2) {
							sets.push(fullHouse[0]);
							sets.push(fullHouse[1]);
						} else {
							sets.push(dice[i]);
						}						
						break;
				} 
			}
		}
		
		if (detectThreePairs(dice)) {
			for (i = 1; i <= 6; i++){
				sets.push(i);
			}
		} else if (detectStraight(dice)) {
			for (i = 1; i <= 6; i++){
				sets.push(i);
			}
		}
        
        function detectStraight(dice){
            for (var i = 1; i <= 6; i++) {
                if (dice.indexOf(i) < 0) return false;
            }

            return true;
        }

        function detectTwoTriples(dice){
            var triplesFound = [];

            if (dice.length == 6){
                for (var i = 0; i < dice.length; i++){
                    if (countInArray(dice, dice[i]) == 3 && triplesFound.indexOf(dice[i]) < 0) {
                        triplesFound.push(dice[i]);
                    }
                }
            } 

            return triplesFound;
        }

        function detectThreePairs(dice){
            var foundThreePairs = true;

            if (dice.length == 6){
                for (var i = 0; i < dice.length; i++){
                    if (countInArray(dice, dice[i]) != 2) {
                        foundThreePairs = false;
                        break;
                    }
                }
            } else {
                foundThreePairs = false;
            }

            return foundThreePairs;
        }

        function detectFullHouse(dice) {
            var foundPair = 0;
            var foundTriple = 0;

            if (dice.length >= 5) {
                for (var i = 0; i < dice.length; i++){
                    var numberInSet = countInArray(dice, dice[i]);

                    if (numberInSet >= 3) foundTriple = dice[i];
                    else if (numberInSet == 2) foundPair = dice[i];
                }
            }

            var returnArr = [];
            if (foundTriple > 0 && foundPair > 0) returnArr = [foundTriple, foundPair];

            return returnArr;
        }

        function countInArray(array, what) {
            var count = 0;
            for (var i = 0; i < array.length; i++) {
                if (array[i] === what) {
                    count++;
                }
            }
            return count;
        }
		
		return sets;
	}
    
    function holdDie(id) {		
		heldDie.push(id);
		rolledDie.splice(rolledDie.indexOf(id), 1);
		
		updateDice();		
	}
	
	function cancelHoldDie(id) {
		rolledDie.push(id);
		heldDie.splice(heldDie.indexOf(id), 1);
		
		updateDice();		
	}
	
	function gameOver() {
		hideButtons();
		
		for (var d = 0; d < TOTAL_DICE; d++) {
			$("#playerBoard .r" + (d + 1)).off("click");
		}
		
		heldDie = [];
		rolledDie = [];
		frozenDie = [];
	}
	
	function serverResponse(resObj){
		switch(resObj.action) {
			case "roll":
				showRollResult(resObj.result);
				
				$("#rollBtn").hide();
				
				if (resObj.gameOver) gameOver();
                else $("#playerBoard .roundScore").html(resObj.roundScore);
                
				break;
			
			case "playerRegistered":
				console.log("set name: " + resObj.playerName);
				$("#playerBoard .playerName").html(resObj.playerName);
                $("#registration").hide();		
                
                for (var i = 0; i < resObj.opponentIds.length; i++) { 
				    $("#opponentBoard" + (i + 1) + " .playerName").html(resObj.opponentNames[i]); 
				    opponentIds.push(resObj.opponentIds[i]); 
                }
				break;
			
			case "startTurn":
				console.log("start turn");
				$("#playerBoard .roundScore").html("0");
                
				$("#rollBtn").show();
				$("#holdBtn").hide();
				
				heldDie = [];
				rolledDie = [];
				frozenDie = [];
				clearDice();
				break;
                
			case "oppRoll":
				rolledDieOpp = resObj.result;
				heldDieOpp = resObj.held;	
                currentOpp = opponentIds.indexOf(resObj.id) + 1;
                
                var playerIndex = opponentIds.indexOf(resObj.id);
                    
                $("#opponentBoard" + (playerIndex + 1) + " .roundScore").html(resObj.roundScore);
                                  
				updateOppDice();
				break;
                
			case "oppTurnEnded":
				heldDieOpp = heldDieOpp.concat(rolledDieOpp);
				rolledDieOpp = [];
                currentOpp = opponentIds.indexOf(resObj.id) + 1;
                
				updateOppDice();
				break;
                
			case "wonGame":
				hideButtons();				
				showGameMsg("You Won The Game!");
				
				break;
			case "lostGame":
				hideButtons();
				showGameMsg("You Lost The Game!");
				break;
                
            case "tieGame":
				hideButtons();
				showGameMsg("You Tied!");
				break;
                
			case "illegalHold":                
				showGameMsg("You must hold dice that are worth something");
				break;
                
            case "updateScore":
                for (var n = 0; n < resObj.scores.length; n++){
                    var playerIndex = opponentIds.indexOf(resObj.scores[n].id);
                    
                    if (playerIndex >= 0) {
                         $("#opponentBoard" + (playerIndex + 1) + " .roundScore").html(resObj.scores[n].roundScore);
                         $("#opponentBoard" + (playerIndex + 1) + " .totalScore").html(resObj.scores[n].totalScore);
                    } else {
                         $("#playerBoard .roundScore").html(resObj.scores[n].roundScore);
                         $("#playerBoard .totalScore").html(resObj.scores[n].totalScore);
                    }
                }
                
                showGameMsg(resObj.turn + "'s turn!");
                break;
		}
	}
	
	function hideButtons(){
		for (var i in btns) {
			$("#" + btns[i]).hide();
		}
	}
    
    function showGameMsg(msg){
        $("#gameMsg").html(msg);
    }
	
	function requestGame(){
		if (sock == undefined) {
			sock = new SockJS('http://127.0.0.1:9000/gameComm');
			//sock = new SockJS('http://epsilon:9000/gameComm');
			
			sock.onopen = function() {
				console.log('open');
				
				var actionObj = {action:"registerName", playerName:$("#playerNameInput").val() };		
				sock.send(JSON.stringify(actionObj));
			};

			sock.onmessage = function(e) {
				var returnObj = JSON.parse(e.data);
				
				console.log('message', e.data);
				serverResponse(returnObj);
			};

			 sock.onclose = function() {
				console.log('close');
                showGameMsg("Game Closed");
			};
		} else {
			sock.send(JSON.stringify({ action:"playAgain" }));
		}
	}
}

window.farkle = new Farkle();
}());