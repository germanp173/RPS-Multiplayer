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

  var firebaseDB = {
      DB: firebase.database(),

      testing: function(){
          this.DB.ref('testing').push("what");
      }
  }

  firebaseDB.testing();

  firebase.database().ref('testing').onCreate( snap => {
      console.log("this got triggered! -> " + snap.val());
  })