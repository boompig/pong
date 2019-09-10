/* global $ */

const Register = {};

Register.registerUsername = function (username) {
    $.ajax({
        url: "/api/register",
        data: { "username": username },
        method: "POST",
        dataType: "json",
    }).then(function () {
        // any 200 status is a success
        window.location.href = "/lounge?username=" + username;
    }).catch(function (response, textStatus, errorThrown) {
        console.log("status: " + textStatus + " with error " + errorThrown);
        console.log(response);
        if (response.responseJSON) {
            Register.setErrorMsg(response.responseJSON.msg);
        } else {
            Register.setErrorMsg("Unknown error occurred");
        }
    });
};

Register.setErrorMsg = function (msg) {
    $("#error-msg").text(msg).show();
};

Register.formSubmit = function (e) {
    e.preventDefault();
    var username = $("#username").val();
    Register.registerUsername(username);
    return false;
};

$(function() {
    const url = new URL(window.location.href);
    const username = url.searchParams.get("username");
    if(username) {
        Register.registerUsername(username);
    }
});
