$("#startBtn").on('click', function () {
    // Start game button listener.
    // Get user input.
    var playerName = $("#playerName").val();

    // Check if user typed something into the text box.
    if (playerName === ""){
        // Invalidate text box if left empty
        $(".d-none").removeClass("d-none");
        $("#playerName").addClass("is-invalid");
    } else{
        // Remove any previously added invalidation.
        $(".invalid-feedback").addClass("d-none");
        $(".is-invalid").removeClass("is-invalid");

        // Add player name to local storage.
        localStorage.setItem("playerName", playerName);

        // Redirect to game page.
        window.location.replace("assets/pages/game.html");
    }
});


