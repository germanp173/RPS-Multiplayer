// Player Global Identifiers.
var playerName = null;
var playerId = null;
var playerSlotId = null;

function verifyGameEntryPoint(){
    // Get player name from local storage.
    playerName = localStorage.getItem("playerName");
    if (playerName === null){
        // If no player name was set, redirect the player to the start of the game.
        window.location.replace("../../index.html");
    } else{
        // After the player name is transferred from local storage to memory, clear local storage.
        // This means that if the player refreshes the page, the player will be kicked out of the game by design.
        localStorage.clear();
    }
}

// Ensure player entered the game as designed.
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

    createPlayer: async function(name){
        var playerKey = null;
        await this.DB.ref(this.playersObj).push(name)
                    .then(snap => {
                        playerKey = snap.key;
                    });
        return playerKey;
    },

    getOpenSlot: async function(){
        var constrolsQuery = await this.DB.ref(this.slotsObj).once('value');

        var playerSlots = constrolsQuery.val();
        for (var slot in playerSlots){
            if (playerSlots[slot] === false){
                this.takeOpenSlot(slot);
                return slot;
            }
        }
        return null;
    },

    takeOpenSlot: function(slotId){
        this.DB.ref(this.slotsObj).child(slotId).set(true);
    },

    releaseSlot: function(slotId){
        this.DB.ref(this.slotsObj).child(slotId).set(false);
    },

    deletePlayer: function(id){
        this.DB.ref(this.playersObj).child(id).remove();
    }
}

// Trigger if game page is reloaded.
$(window).on('beforeunload', function(){
    // Remove player from the game if player is registered.
    if (playerId !== null){
        firebaseDB.deletePlayer(playerId);
    }

    // Free up the player slot to allow other players to join.
    if (playerSlotId !== null){
        firebaseDB.releaseSlot(playerSlotId);
        $(`#${playerSlotId}`).html("<h5>Waiting for Player to Join!</h5>");
        playerSlotId = null;
    }
})

async function setPlayerControls(name){

    playerId = await firebaseDB.createPlayer(name);
    playerSlotId = await firebaseDB.getOpenSlot();

    if (playerSlotId === null){
        console.log("Game full: Spectator");
        return;
    }

    var playerControlHtml = `<div class='row'><span class='badge-pill badge-primary' player-id='${playerId}'>${playerName}</span></div> 
                        <br><div class='row text-center'><div class='col-sm-6'><span class='badge badge-success' id='wins' player-id='${playerId}'>0</span>
                        </div><div class='col-sm-6'><span class='badge badge-danger' id='losses' player-id='${playerId}'>0</span></div></div> 
                        <br><div class='row hand-div'><img class='hand fluid' player-id='${playerId}' src='../images/hand-rock.png' alt='Paper Rock'></div>
                        <div class='row hand-div'><img class='hand fluid' player-id='${playerId}' src='../images/hand-paper.png' alt='Paper Paper'></div> 
                        <div class='row hand-div'><img class='hand fluid' player-id='${playerId}' src='../images/hand-scissors.png' alt='Paper Scissors'></div>`
    
    $(`#${playerSlotId}`).html(playerControlHtml);

    $(`.hand[player-id=${playerId}]`).on('click', function(){
        console.log("Fuck YES");
    })
}

setPlayerControls(playerName);

