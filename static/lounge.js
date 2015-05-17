var Lounge = {};

Lounge.username = null;
// in seconds
Lounge.keepaliveFreq = 5.0;
Lounge.loggedInUsers = [];
Lounge.challenges = [];

Lounge.fetchUsers = function () {
    console.log("Fetching list of logged-in users");
    $.getJSON("/api/availableUsers", function (response) {
        Lounge.loggedInUsers = response.users;
        Lounge.displayUsers();
    }).fail(function (response, textStatus, errorThrown) {
        console.log(response);
    });
};

Lounge.fetchChallenges = function () {
    console.log("Fetching challenges");
    $.getJSON("/api/challenges", {"username": Lounge.username}, function (response) {
        console.log("Got challenges");
        console.log(response.challenges);
        Lounge.challenges = response.challenges;
        Lounge.displayChallenges();
    }).fail(function (response, textStatus, errorThrown) {
        console.log(response);
    });
};

Lounge.issueChallenge = function (opponent) {
    console.log("Issuing challenge to opponent " + opponent);
    $.ajax({
        url: "/api/challenges",
        data: { "username": Lounge.username, "opponent": opponent },
        method: "POST",
        dataType: "json",
        success: function (response) {
            console.log(response);
            window.location.href = "/waitingRoom?challengeID=" + response.challengeID;
        }, error: function (response, textStatus, errorThrown) {
            console.log(response);
            console.log("status " + textStatus + " with error " + errorThrown);
        }
    });
};

Lounge.answerChallenge = function (challenge, response) {
    console.log("Responding to challenge from opponent " + challenge.username + " with response " + response);
    console.log(challenge);
    $.ajax({
        url: "/api/challenges/" + challenge.id,
        data: { "username": Lounge.username, "opponent": Lounge.username, "accept": response },
        method: "UPDATE",
        dataType: "json",
        success: function (response) {
            console.log(response);
            window.location.href = "/game/" + challenge.id;
        }, error: function (response, textStatus, errorThrown) {
            console.log(response);
            console.log("status " + textStatus + " with error " + errorThrown);
        }
    });
};

Lounge.displayChallenges = function () {
    while (Lounge.challenges.length > 0) {
        var challenge = Lounge.challenges.pop();
        var response = confirm("Challenge has been issued by " + challenge.username + "." +
                "Do you accept?");
        if (response) {
            Lounge.answerChallenge(challenge, true);
            break;
        } else {
            Lounge.answerChallenge(challenge, false);
        }
    }
    window.setTimeout(Lounge.fetchChallenges, Lounge.keepaliveFreq * 1000);
};

Lounge.displayUsers = function () {
    var parent = $("#user-container");
    parent.empty();
    for (var i = 0; i < Lounge.loggedInUsers.length; i++) {
        if (Lounge.loggedInUsers[i] === Lounge.username) continue;
        $("<li></li>").addClass("opponent").text(Lounge.loggedInUsers[i]).appendTo(parent);
    }

    // have to include self
    if (Lounge.loggedInUsers.length === 1) {
        $("<p>No one else is here...</p>").appendTo(parent)
    }

    window.setTimeout(Lounge.fetchUsers, Lounge.keepaliveFreq * 1000);
};

Lounge.sendKeepalive = function () {
    console.log("Sending keepalive");
    // there is no need for a success/error handler
    $.ajax({
        url: "/api/keepalive",
        data: { username: Lounge.username },
        method: "POST",
        dataType: "json",
        success: function (response) {
            console.log(response);
        }, error: function (response, textStatus, errorThrown) {
            if (response.responseJSON) {
                var errorType = response.responseJSON.errorType;
                if (errorType === "USERNAME_NOT_REGISTERED") {
                    window.location.href = "/register";
                }
            }
            console.log(response.responseJSON);
        }
    });
    window.setTimeout(Lounge.sendKeepalive, Lounge.keepaliveFreq * 1000);
};

Lounge.parseArgs = function () {
    var args = {};
    if (window.location.href.indexOf("?") < 0) {
        return args;
    }
    var paramList = window.location.href.split("?")[1].split("&");
    for (var i = 0; i < paramList.length; i++) {
        var key = paramList[i].split("=")[0];
        var value = paramList[i].split("=")[1];
        args[key] = value;
    }
    return args;
};

$(function() {
    var args = Lounge.parseArgs();
    if (! args.hasOwnProperty("username")) {
        window.location.href = "/";
    }
    Lounge.username = args.username;
    $(".username").text(Lounge.username);

    Lounge.fetchUsers();
    Lounge.fetchChallenges();
    //Lounge.sendKeepalive();
    //
    $(document).on("click", "li.opponent", function() {
        var username = $(this).text();
        Lounge.issueChallenge(username);
    });
});
