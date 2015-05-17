var waitingRoom = {};

waitingRoom.challengeID = null;
waitingRoom.pollFreq = 6;

waitingRoom.parseArgs = function () {
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

waitingRoom.getChallengeStatus = function () {
    $.getJSON("/api/challenges/" + waitingRoom.challengeID, function (response) {
        var challenge = response.challenge;
        if (challenge.status === "accepted") {
            window.location.href = "/game/" + waitingRoom.challengeID;
        } else if (challenge.status === "declined") {
            window.location.href = "/lounge";
        } else {
            window.setTimeout(waitingRoom.getChallengeStatus, waitingRoom.pollFreq * 1000);
        }
    }).fail(function (response, textStatus, errorThrown) {
        console.log(response);
        console.log("status: " + textStatus + ", error: " + errorThrown);
        if (response.hasOwnProperty("responseJSON")) {
            console.log(response.responseJSON);
        }
    });
};

$(function () {
    var args = waitingRoom.parseArgs();
    if (! args.hasOwnProperty("challengeID")) {
        window.location.href = "/lounge";
    }
    waitingRoom.challengeID = args.challengeID;

    waitingRoom.getChallengeStatus();
});
