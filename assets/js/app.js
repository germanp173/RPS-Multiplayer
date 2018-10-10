// Player Global Identifiers.
var playerName = null;
var playerId = null;
var playerSlotId = null;
var gameON = false;
var choiceLocked = false;

var hands = {
    rock: "../images/hand-rock.png",
    paper: "../images/hand-paper.png",
    scissors: "../images/hand-scissors.png",
}

function verifyGameEntryPoint() {
    // Get player name from local storage.
    playerName = localStorage.getItem("playerName");
    if (playerName === null) {
        // If no player name was set, redirect the player to the start of the game.
        window.location.replace("../../index.html");
    } else {
        // After the player name is transferred from local storage to memory, clear local storage.
        // This means that if the player refreshes the page, the player will be kicked out of the game by design.
        localStorage.clear();
    }
}

// Ensure player entered the game as designed through the main index page.
verifyGameEntryPoint();

// Initialize Firebase
var config = {
    apiKey: "AIzaSyD2pNxLn0dCKGG8yIybkVuq0a1WVVK32ww",
    authDomain: "rpg-game-bb5ea.firebaseapp.com",
    databaseURL: "https://rpg-game-bb5ea.firebaseio.com",
    projectId: "rpg-game-bb5ea",
    storageBucket: "rpg-game-bb5ea.appspot.com",
    messagingSenderId: "911589274868"
};
firebase.initializeApp(config);

// Firebase object used to interact with the game database.
var firebaseDB = {
    DB: firebase.database(),
    playersObj: "players",
    slotsObj: "slots",
    gameObj: "game",
    scoresObj: "score",

    createPlayer: async function (playerName) {
        var playerKey = null;
        await this.DB.ref(this.playersObj).push({
                name: playerName
            })
            .then(snap => {
                playerKey = snap.key;
            });
        return playerKey;
    },

    getPlayerName: async function(slotId){
        var name = await this.DB.ref(this.slotsObj).child(slotId).child('name').once('value');
        return name.val();
    },

    updatePlayerScore: function(playerSlot, wonRound){
        this.DB.ref(this.scoresObj).child(playerSlot).once('value').then(function(snap){
            var score = snap.val();
            if (wonRound){
                score.wins = ++score.wins;
            } else {
                score.losses = ++score.losses;
            }
            snap.ref.update({
                wins: score.wins,
                losses: score.losses
            });
        });
    },

    resetPlayerScores: function(){
        this.DB.ref(this.scoresObj).once('value').then(function(snap){
            var players = snap.val();
            for (var player in players){
                players[player].wins = 0;
                players[player].losses = 0;
            }
            snap.ref.update(players);
        })
    },

    deletePlayer: function (id) {
        this.DB.ref(this.playersObj).child(id).remove();
    },

    getOpenSlot: async function () {
            // Get game slots (this game has only two open slots at a time).
            var slotsQuery = await this.DB.ref(this.slotsObj).once('value');

            // Get object of each player slot.
            var playerSlots = slotsQuery.val();

            // Iterate through each slot until the first open slot is found.
            for (var slot in playerSlots) {
                if (playerSlots[slot].open === true) {
                    return slot;
                }
            }

            // If no game slots are available, return null.
            return null;
        },

    takeOpenSlot: function (slotId) {
        this.DB.ref(this.slotsObj).child(slotId).update({
            open: false,
            playerId: playerId,
            name: playerName
        });
    },

    releaseSlot: function (slotId) {
        this.DB.ref(this.slotsObj).child(slotId).update({
            open: true,
            playerId: "",
            name: ""
        });
    },

    clearChoice: function (slotId) {
        $(`.hand[player-id=${playerId}]`).css("background", "none");
        this.DB.ref(this.gameObj).child(slotId).update({
            choice: "",
            locked: false
        });
    },

    turnOnSlotMonitors: function () {

        // ** Set the database on change event listeners for each player ** //
        // Players object
        this.DB.ref(this.playersObj).on('value', function (snap) {
            var players = snap.val();
            if (Object.keys(players).length === 2) {
                $("#centerCanvas").removeClass('d-none');
                gameON = true;
            } else {
                $("#centerCanvas").addClass('d-none');
                gameON = false;
                firebaseDB.resetPlayerScores();
            }
        });

        this.DB.ref(this.scoresObj).on('value', function(snap){
            var players = snap.val();
            
            for (var player in players){
                $(`#wins[player=${player}]`).text(players[player].wins);
                $(`#losses[player=${player}]`).text(players[player].losses);
            }
        });

        // Slots object
        this.DB.ref(this.slotsObj).child('player-1').on('value', function (snap) {
            setPlayerControls(snap.key, snap.val());
        });

        this.DB.ref(this.slotsObj).child('player-2').on('value', function (snap) {
            setPlayerControls(snap.key, snap.val());
        });

        // Game object
        this.DB.ref(this.gameObj).on('value', function (snap) {
            var playerChoices = snap.val();
            var playerReadyCount = 0;

            for (var playerSlot in playerChoices) {
                var selectionMade = playerChoices[playerSlot].locked;

                if (selectionMade) {
                    $(`#choiceState[player=${playerSlot}]`).text("Ready!");
                    playerReadyCount++;
                } else {
                    $(`#choiceState[player=${playerSlot}]`).text("Choose!");
                }

                if (playerSlot === playerSlotId) {
                    choiceLocked = selectionMade;
                }
            }

            if (playerReadyCount === 2) {
                evaluateRound(playerChoices);
            }
        });

        // Upon any change of a game slot, the UI will be updated appropiately.
        function setPlayerControls(playerSlot, slotObj) {

            // If slot has been taken, update the UI for that player.
            if (!slotObj.open) {

                // Get player.
                firebase.database().ref(firebaseDB.playersObj).child(slotObj.playerId).once('value').then(function (snap) {

                    var player = snap.val();

                    // Set player controls using their unique given ID.
                    var playerControlHtml = `<div class='row'><span class='badge-pill badge-primary' player-id='${slotObj.playerId}'>${player.name}</span></div> 
                            <br><div class='row text-center'><div class='col-sm-6'><span class='badge badge-success' id='wins' player='${playerSlot}'>0</span>
                            </div><div class='col-sm-6'><span class='badge badge-danger' id='losses' player='${playerSlot}'>0</span></div></div> 
                            <br><div class='row hand-div'><img class='hand fluid' data='rock' player-id='${slotObj.playerId}' src='../images/hand-rock.png' alt='Paper Rock'></div>
                            <div class='row hand-div'><img class='hand fluid' data='paper' player-id='${slotObj.playerId}' src='../images/hand-paper.png' alt='Paper Paper'></div> 
                            <div class='row hand-div'><img class='hand fluid' data='scissors' player-id='${slotObj.playerId}' src='../images/hand-scissors.png' alt='Paper Scissors'></div>`

                    // Set the UI.
                    $(`#${playerSlot}`).html(playerControlHtml);
                    if (playerSlot === playerSlotId) {
                        $(`#${playerSlot}`).append(`<br><div class='row'>
                        <button type="button" class="btn btn-warning mb-2" player-id='${slotObj.playerId}' id="leaveBtn" 
                        style='margin: auto'>Leave</button></div>`);
                    }

                    // Create button event listeners that enable the game to work.
                    $(`.hand[player-id=${playerId}]`).on('click', function () {
                        //
                        if (!choiceLocked && gameON) {
                            $(this).css("transform", "scale(1)");
                            $(this).css("background", "grey");

                            //
                            var playerChoice = $(this).attr('data');
                            firebase.database().ref(firebaseDB.gameObj).child(playerSlot).update({
                                choice: playerChoice,
                                locked: true
                            });
                        }
                    });

                    $(`.hand[player-id=${playerId}]`).hover(function () {
                        if (!choiceLocked && gameON) {
                            $(this).css("transform", "scale(1.3)");
                        }
                    }, function () {
                        $(this).css("transform", "scale(1)");
                    });

                    $(`#leaveBtn[player-id=${playerId}]`).click(function () {
                        clearDatabase();
                        window.location.replace("../../index.html");
                    });
                });

            } else {
                $(`#${playerSlot}`).html("<h5>Waiting for player to join!</h5>");
            }
        }
    }
}

// Trigger if game page is reloaded.
$(window).on('beforeunload', function () {
    clearDatabase();
})

async function startGame(name) {

    // Set playerId and SlotId.
    playerId = await firebaseDB.createPlayer(name);
    playerSlotId = await firebaseDB.getOpenSlot();

    if (playerSlotId === null) {
        // TODO: Spectator logic!
        console.log("Game Full!");
    } else {
        // Turn on game slot monitors.
        firebaseDB.turnOnSlotMonitors();

        // Claim the spot for the current player.
        firebaseDB.takeOpenSlot(playerSlotId);
    }
}

function clearDatabase() {
    // Remove player from the game if player is registered.
    if (playerId !== null) {
        firebaseDB.deletePlayer(playerId);
    }

    // Free up the player slot to allow other players to join.
    if (playerSlotId !== null) {
        firebaseDB.releaseSlot(playerSlotId);
        firebaseDB.clearChoice(playerSlotId);
        firebaseDB.resetPlayerScores();
        playerSlotId = null;
    }
}

// Start the game!
startGame(playerName);

async function evaluateRound(playerChoices) {

    var players = Object.keys(playerChoices);
    var player1 = players[0];
    var player1Choice = playerChoices[player1].choice;
    var player2 = players[1];
    var player2Choice = playerChoices[player2].choice;

    $(`#choiceState[player=${player1}]`).append(`<div class='row hand-div'><img class='hand fluid' src='${hands[player1Choice]}' alt='Choice'></div>`);
    $(`#choiceState[player=${player2}]`).append(`<div class='row hand-div'><img class='hand fluid' src='${hands[player2Choice]}' alt='Choice'></div>`);

    var winner = null;
    if (player1Choice === player2Choice) {
        $("#roundResult").html("<br><h5>Tie Game!</h5>");
    } else {
        switch (player1Choice) {
            case "rock":
                if (playerChoices[player2].choice == "paper") {
                    winner = player2;
                } else {
                    winner = player1;
                }
                break;
            case "paper":
                if (playerChoices[player2].choice == "scissors") {
                    winner = player2;
                } else {
                    winner = player1;
                }
                break;
            case "scissors":
                if (playerChoices[player2].choice == "rock") {
                    winner = player2;
                } else {
                    winner = player1;
                }
                break;
        }

        var winnerName = await firebaseDB.getPlayerName(winner);
        $("#roundResult").html(`<br><h5>${winnerName} WON!</h5>`);
        firebaseDB.updatePlayerScore(playerSlotId, winnerName === playerName);
    }

    await sleep(5000);
    resetRound(player1, player2);
}

async function resetRound(player1, player2){
    $(`#choiceState[player=${player1}]`).html("Choose!");
    $(`#choiceState[player=${player2}]`).html("Choose!");
    $("#roundResult").html("");
    firebaseDB.clearChoice(player1);
    firebaseDB.clearChoice(player2);
}

async function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}