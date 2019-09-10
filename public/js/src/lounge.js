/* global $, Vue, parseArgs */
/* exported Lounge */

// JQuery used only for requests

const Lounge = new Vue({
    el: "#root",
    data: {
        /**
         * Read from URL parameters
         */
        username: null,

        errorMsg: null,

        // in seconds
        keepaliveFreq: 5.0,
        loggedInUsers: [],
        challenges: [],
    },
    methods: {
        fetchUsers: function () {
            $.getJSON("/api/availableUsers")
                .then((response) => {
                    this.loggedInUsers = response.users;
                }).catch((response) => {
                    console.error(response);
                });
            window.setTimeout(() => {
                this.fetchUsers();
            }, this.keepaliveFreq * 1000);
        },

        fetchChallenges: function () {
            $.getJSON("/api/challenges", {"username": this.username})
                .then((response) => {
                    this.challenges = response.challenges;
                    this.displayChallenges();
                }).catch((response, textStatus, errorThrown) => {
                    if(response.responseJSON && response.responseJSON.error === "USERNAME_NOT_REGISTERED") {
                        window.location.href = "/register?username=" + this.username;
                    }
                    console.error("Failed to fetch challenges");
                    console.error(response);
                    console.error(textStatus);
                    console.error(errorThrown);
                    console.error(response.responseJSON);
                });
        },


        issueChallenge: function (opponent) {
            console.log("Issuing challenge to opponent " + opponent);
            this.errorMsg = null;
            $.ajax({
                url: "/api/challenges",
                data: { "username": this.username, "opponent": opponent },
                method: "POST",
                dataType: "json",
            }).then((response) => {
                console.log(response);
                const url = new URL(`/api/challenges/${response.id}`, window.location.origin);
                url.searchParams.set("username", this.username);
                console.log(url);
                // window.location.href = url.toString();
            }).catch((response, textStatus, errorThrown) => {
                console.error(response);
                console.error("status " + textStatus + " with error " + errorThrown);
                console.error(response.responseJSON);
                if(response.responseJSON && response.responseJSON.error) {
                    this.errorMsg = response.responseJSON.error;
                }
            });
        },

        answerChallenge: function (challenge, accept) {
            console.log("Responding to challenge from opponent " + challenge.username + " with response " + accept);
            console.log(challenge);
            $.ajax({
                url: "/api/challenges/" + challenge.id,
                data: { "username": this.username, "opponent": this.username, "accept": accept },
                method: "UPDATE",
                dataType: "json",
            }).then((response) => {
                console.log(response);
                if(accept) {
                    const url = new URL(`/game/${challenge.id}`, window.location.origin);
                    url.searchParams.set("username", this.username);
                    window.location.href = url.toString();
                }
            }).catch((response, textStatus, errorThrown) => {
                console.log(response);
                console.log("status " + textStatus + " with error " + errorThrown);
            });
        },

        displayChallenges: function () {
            while (this.challenges.length > 0) {
                const challenge = this.challenges.pop();
                const response = confirm("Challenge has been issued by " + challenge.username + "." +
                        "Do you accept?");
                if (response) {
                    this.answerChallenge(challenge, true);
                    break;
                } else {
                    this.answerChallenge(challenge, false);
                }
            }
            window.setTimeout(this.fetchChallenges, this.keepaliveFreq * 1000);
        },

        sendKeepalive: function () {
            console.log("Sending keepalive");
            // there is no need for a success/error handler
            $.ajax({
                url: "/api/keepalive",
                data: { username: this.username },
                method: "POST",
                dataType: "json",
            }).then(() => {
                // console.log(response);
                window.setTimeout(this.sendKeepalive, this.keepaliveFreq * 1000);
            }).catch((response) => {
                console.error(response);
                console.error(response.responseJSON);
                if (response.responseJSON) {
                    const errorType = response.responseJSON.errorType;
                    if (errorType === "USERNAME_NOT_REGISTERED") {
                        window.location.href = `/register?username=${this.username}`;
                        // console.error("username no longer registered");
                        // this.errorMsg = "keepalive: username no longer registered";
                    }
                }
            });
        }
    },
    created: function() {
        const args = parseArgs();
        if (!args.username) {
            window.location.href = "/";
        }
        this.username = args.username;

        this.fetchUsers();
        this.fetchChallenges();
        this.sendKeepalive();
    }
});
