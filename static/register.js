var Register = {};
Register.registerUsername = function (username) {
    $.ajax({
        url: "/api/register",
        data: { "username": username },
        method: "POST",
        dataType: "json",
        success: function (response, status) {
            console.log(status);
            // any 200 status is a success
            window.location.href = "/lounge?username=" + username;
        }, error: function (response, textStatus, errorThrown) {
            console.log("status: " + textStatus + " with error " + errorThrown);
            console.log(response);
            if (response.responseJSON) {
                Register.setErrorMsg(response.responseJSON.msg);
            } else {
                Register.setErrorMsg("Unknown error occurred");
            }
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
