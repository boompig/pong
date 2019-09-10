/* global $, parseArgs */

const waitingRoom = {};

waitingRoom.challengeID = null;
waitingRoom.pollFreq = 6;

waitingRoom.getChallengeStatus = function () {
    $.getJSON("/api/challenges/" + waitingRoom.challengeID, function (response) {
        const challenge = response.challenge;
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
        if (response.responseJSON) {
            console.log(response.responseJSON);
        }
    });
};

$(function () {
    const args = parseArgs();
    if (!args.challengeID) {
        window.location.href = "/lounge";
    }
    waitingRoom.challengeID = args.challengeID;

    waitingRoom.getChallengeStatus();
});
