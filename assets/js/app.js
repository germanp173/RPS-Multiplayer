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

    createPlayer: async function(name){
        var playerKey = null;
        await this.DB.ref(this.playersObj).push(name)
                    .then(snap => {
                        playerKey = snap.key;
                    });
        return playerKey;
    },

    deletePlayer: function(id){
        this.DB.ref(this.playersObj).child(id).remove();
    },

    getOpenSlot: async function(){
        // Get game slots (this game has only two open slots at a time).
        var slotsQuery = await this.DB.ref(this.slotsObj).once('value');

        // Get object of each player slot.
        var playerSlots = slotsQuery.val();
        
        // Iterate through each slot until the first open slot is found.
        for (var slot in playerSlots){
            if (playerSlots[slot].open === true){
                // Claim the spot for the current player.
                this.takeOpenSlot(slot);
                return slot;
            }
        }

        // If no game slots are available, return null.
        return null;
    },

    takeOpenSlot: function(slotId){
        this.DB.ref(this.slotsObj).child(slotId).update({
            open: false,
            playerId: playerId
            });
    },

    releaseSlot: function(slotId){
        this.DB.ref(this.slotsObj).child(slotId).update({
            open: true,
            playerId: ""
        });
    },

    turnOnSlotMonitors: function(){
        // Get the players root object needed to query players.
        var playersRootObj = this.playersObj;

        // Set the database on change event listeners for each game slot.
        this.DB.ref(this.slotsObj).child('player-1').on('value', function(snap){
            setPlayerControls(playersRootObj, snap.key, snap.val());
        });

        this.DB.ref(this.slotsObj).child('player-2').on('value', function(snap){
            setPlayerControls(playersRootObj, snap.key, snap.val());
        });

        // Upon any change of a game slot, the UI will be updated appropiately.
        async function setPlayerControls(playersRootObj, playerSlot, slotObj){

            // If slot has been taken, update the UI for that player.
            if (!slotObj.open){

                // Get player.
                var playerQuery = await firebase.database().ref(playersRootObj).child(slotObj.playerId).once('value');
                var player = playerQuery.val();
                
                // Set player controls using their unique given ID.
                var playerControlHtml = `<div class='row'><span class='badge-pill badge-primary' player-id='${slotObj.playerId}'>${player}</span></div> 
                <br><div class='row text-center'><div class='col-sm-6'><span class='badge badge-success' id='wins' player-id='${slotObj.playerId}'>0</span>
                </div><div class='col-sm-6'><span class='badge badge-danger' id='losses' player-id='${slotObj.playerId}'>0</span></div></div> 
                <br><div class='row hand-div'><img class='hand fluid' player-id='${slotObj.playerId}' src='../images/hand-rock.png' alt='Paper Rock'></div>
                <div class='row hand-div'><img class='hand fluid' player-id='${slotObj.playerId}' src='../images/hand-paper.png' alt='Paper Paper'></div> 
                <div class='row hand-div'><img class='hand fluid' player-id='${slotObj.playerId}' src='../images/hand-scissors.png' alt='Paper Scissors'></div>`
                
                // Set the UI.
                $(`#${playerSlot}`).html(playerControlHtml);
            
                // Create button event listeners that enable the game to work.
                $(`.hand[player-id=${playerId}]`).on('click', function(){
                    // TODO: Game Logic and styling.
                    console.log("This is working!");
                });
            } else{
                $(`#${playerSlot}`).html("<h5>Waiting for Player to Join!</h5>");
            }
        }
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
        playerSlotId = null;
    }
})

async function startGame(name){
    // Turn on game slot monitors.
    firebaseDB.turnOnSlotMonitors();

    // Set playerId and SlotId.
    playerId = await firebaseDB.createPlayer(name);
    playerSlotId = await firebaseDB.getOpenSlot();

    // TODO: Spectator logic!
    if (playerSlotId === null){
        console.log("Game Full!");
    }
}

// Start the game!
startGame(playerName);
