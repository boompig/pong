/* global $, io */

// NOTE: io is Socket.io

const Game = {};

var Paddle = function (width, height) {
    this.pos = { x: 0, y: 0 };
    this.speed = { x: 0, y: 0 };
    this.width = width;
    this.height = height;
};

var Ball = function (radius) {
    this.pos = { x: 0, y: 0 };
    this.speed = { x: 0, y: 0 };
    this.radius = radius;
    this.lastCollision = null;
};

/**
 * Going to be a rough approximation, assuming ball is square
 */
Ball.prototype.intersectsPaddle = function (paddle) {
    return (!(this.pos.y + this.radius < paddle.pos.y ||
        this.pos.y - this.radius > paddle.pos.y + paddle.height ||
        this.pos.x + this.radius < paddle.pos.x ||
        this.pos.x - this.radius > paddle.pos.x + paddle.width));
};

/*********** CONSTANTS ********/
Game.borderWidth = 4;
Game.borderColor = "#F7C76D";
Game.paddleWidth = 8;
Game.paddleHeight = 60;
Game.ballRadius = 10;
Game.paddleOffset = 10;
// speed in pixels per second
Game.initBallSpeed = { x: 140.0, y: 70.0 };
// rendered frames to screen per second
Game.fps = 100;
// speed in pixels per second
Game.paddleSpeed = 150;
// in milliseconds
Game.minCollisionInterval = 500;

/********************* TRANSPORT HELPER VARIABLES ***************/
/* ID of the game, read from the URL */
Game.id = null;
/* a random number generated to be player identifier for role determination */
Game.playerID = null;
Game.socket = null;
/* a random number generated to determine roles */
Game.myRandomNumber = null;

/********************* GRAPHICS HELPER VARIABLES ************/
Game.canvas = null;
Game.context = null;
/************** GAME STATE *************/
/* left or right */
Game.role = null;
Game.started = false;
Game.scores = {
    left: 0,
    right: 0
};
Game.lastDraw = null;
Game.paddles = {
    left: new Paddle(Game.paddleWidth, Game.paddleHeight),
    right: new Paddle(Game.paddleWidth, Game.paddleHeight)
};
Game.ball = new Ball(Game.ballRadius);

/****************** GAME METHODS *************************/

Game.checkHorizontalBoundaries = function () {
    if (Game.ball.pos.x + Game.ballRadius <= 0) {
        Game.scores.right++;
        Game.drawScores();
        Game.reset(Game.playerID);
    } else if (Game.ball.pos.x - Game.ballRadius >= Game.canvas.width) {
        Game.scores.left++;
        Game.drawScores();
        Game.reset(Game.playerID);
    }
};

Game.checkVerticalBoundaries = function (ball) {
    if (ball.pos.y - ball.radius <= 0) {
        ball.speed.y = Math.abs(ball.speed.y);
    } else if (ball.pos.y + ball.radius >= Game.canvas.height) {
        ball.speed.y = -1 * Math.abs(ball.speed.y);
    }
};

Game.receiveStateChange = function (data) {
    if (data.playerID === Game.playerID) {
        // disregard own messages
        return;
    }
    if (data.state === "PAUSE") {
        Game.pause(false);
    } else if (data.state === "RESUME") {
        Game.resume(false);
    }
};

Game.sendStateChange = function (stateChange) {
    var data = {
        playerID: Game.playerID,
        room: String(Game.id),
        role: Game.role,
        state: stateChange
    };
    Game.socket.emit("GAME_STATE_CHANGE", data);
};

Game.receiveMove = function (data) {
    if (data.role !== Game.role) {
        Game.movePaddle(data.role, data.direction);
        if (data.direction === 0) {
            // set the position as indicated
            Game.paddles[data.role].pos = data.paddlePos;
            console.log(data.paddlePos);
        }
    }
};

/**
 * Broadcast the move to opponent
 */
Game.sendMove = function (paddleRole, direction) {
    var data = {
        playerID: Game.playerID,
        room: String(Game.id),
        role: paddleRole,
        direction: direction,
        paddlePos: Game.paddles[paddleRole].pos
    };
    Game.socket.emit("PLAYER_MOVE", data);
};

Game.movePaddle = function (role, dy) {
    if (role === Game.role) {
        Game.sendMove(role, dy);
    }
    if (dy === +1) {
        Game.paddles[role].speed.y = Game.paddleSpeed;
    } else if (dy === -1) {
        Game.paddles[role].speed.y = -1 * Game.paddleSpeed;
    } else {
        Game.paddles[role].speed.y = 0;
    }
};

Game.highlightRole = function () {
    $(".role").removeClass("selected-role");
    $("#" + Game.role).addClass("selected-role");
};

Game.drawScores = function () {
    $("#left-score").text(Game.scores.left);
    $("#right-score").text(Game.scores.right);
};

Game.drawFrame = function () {
    Game.drawBackground();
    //Game.drawScores();
    Game.drawPaddles();
    Game.drawBall();
};

Game.drawBall = function () {
    var context = Game.context;
    context.beginPath();
    context.fillStyle = "white";
    context.arc(Game.ball.pos.x, Game.ball.pos.y, Game.ballRadius, 0, 2 * Math.PI, false);
    context.fill();
    context.closePath();
};

Game.drawPaddles = function () {
    var context = Game.context;
    var roles = ["left", "right"];
    for (var i = 0; i < roles.length; i++) {
        var role = roles[i];
        var paddle = Game.paddles[role];
        context.fillStyle = Game.role === role ? "#379E3E" : "white";
        context.fillRect(paddle.pos.x, paddle.pos.y, Game.paddleWidth, Game.paddleHeight);
    }
};

Game.drawBackground = function () {
    "use strict";
    var context = Game.context;
    context.fillStyle = "black";
    context.fillRect(0, 0, Game.canvas.width, Game.canvas.height);

    context.beginPath();
    context.strokeStyle = Game.borderColor;
    context.lineWidth = Game.borderWidth;
    context.moveTo(0, Game.borderWidth / 2);
    context.lineTo(Game.canvas.width, Game.borderWidth / 2);
    context.stroke();
    context.closePath();

    context.beginPath();
    context.strokeStyle = Game.borderColor;
    context.lineWidth = Game.borderWidth;
    context.moveTo(0, Game.canvas.height - Game.borderWidth / 2);
    context.lineTo(Game.canvas.width, Game.canvas.height - Game.borderWidth / 2);
    context.stroke();
    context.closePath();
};

Game.animateBall = function (now) {
    "use strict";
    var delta = now - Game.lastDraw;
    Game.ball.pos.x += Game.ball.speed.x * (delta / 1000);
    Game.ball.pos.y += Game.ball.speed.y * (delta / 1000);
};

Game.animatePaddles = function (now) {
    "use strict";
    var roles = ["left", "right"];
    var delta = now - Game.lastDraw;
    for (var i = 0; i < roles.length; i++) {
        var role = roles[i];
        var paddle = Game.paddles[role];
        paddle.pos.y += paddle.speed.y * (delta / 1000);
    }
};

Game.start = function () {
    console.log("Starting game");
    Game.init();
    Game.resume(false);
};

Game.resume = function (sendMessage) {
    if (sendMessage) {
        Game.sendStateChange("RESUME");
    }
    Game.started = true;
    Game.lastDraw = new Date();
    Game.animateFrames();
};

Game.pause = function (sendMessage) {
    if (sendMessage) {
        Game.sendStateChange("PAUSE");
    }
    Game.started = false;
};

Game.drawPause = function () {
    var context = Game.context;
    var xMiddle = Game.canvas.width / 2;
    var distanceApart = 50;
    var pauseWidth = 30;
    var yMiddle = Game.canvas.height / 2;
    var pauseHeight = 200;

    context.fillStyle = "#A19D9E";
    context.fillRect(xMiddle - pauseWidth - distanceApart / 2, yMiddle - pauseHeight / 2,
        pauseWidth, pauseHeight);
    context.fillRect(xMiddle + distanceApart / 2, yMiddle - pauseHeight / 2,
        pauseWidth, pauseHeight);
};

Game.checkBallCollisions = function (ball, now) {
    Game.checkHorizontalBoundaries();
    Game.checkVerticalBoundaries(ball);
    if ((ball.intersectsPaddle(Game.paddles.left) ||
        ball.intersectsPaddle(Game.paddles.right)) &&
        (ball.lastCollision === null ||
         now - ball.lastCollision >= Game.minCollisionInterval)) {
        Game.ball.speed.x *= -1;
        Game.ball.lastCollision = now;
    }
};

Game.animateFrames = function () {
    if (! Game.started) {
        Game.drawPause();
        return;
    }
    var interval = 1000 / Game.fps;
    var now = new Date();
    // first, set the next time to execute, then actually do execution
    window.setTimeout(Game.animateFrames, interval);

    Game.checkBallCollisions(Game.ball, now);
    Game.animateBall(now);
    Game.animatePaddles(now);
    Game.drawFrame();
    Game.lastDraw = now;
};

Game.showMessage = function (data) {
    var msg = data["msg"];
    var parent = $("#messages");
    $("<div></div>").text(msg).appendTo(parent);
};

Game.init = function () {
    Game.scores.left = 0;
    Game.scores.right = 0;
    Game.started = false;
    Game.reset(Game.playerID);
};

/**
 * playerID is the ID of the player who initiated the state change
 *
 * Reset paddle and ball speed and position
 * If this player initiated the state change, broadcast the state change
 */
Game.reset = function (playerID) {
    if (playerID !== Game.playerID) {
        console.log("Game reset initiated by player " + playerID);
    }

    // reset pad position
    Game.paddles.left.pos.x = Game.paddleOffset;
    Game.paddles.left.pos.y = Game.canvas.height / 2 - Game.paddleHeight / 2;
    Game.paddles.right.pos.x = Game.canvas.width - Game.paddleOffset - Game.paddleWidth;
    Game.paddles.right.pos.y = Game.canvas.height / 2 - Game.paddleHeight / 2;

    // reset pad speed
    Game.paddles.left.speed = { x: 0, y: 0 };
    Game.paddles.right.speed = { x: 0, y: 0 };

    // reset ball position
    Game.ball.pos.x = Game.canvas.width / 2;
    Game.ball.pos.y = Game.canvas.height / 2;

    // reset ball speed
    Game.ball.speed.x = Game.initBallSpeed.x;
    Game.ball.speed.y = Game.initBallSpeed.y;

    Game.lastDraw = new Date();
};

Game.sendPlayerRoleMessage = function () {
    Game.myRandomNumber = Math.floor(Math.random() * 1e6);
    var data = {
        room: String(Game.id),
        player: Game.playerID,
        randomNumber: Game.myRandomNumber,
    };
    Game.socket.emit("PLAYER_ROLE", data);
    console.log("Sent random number " + Game.myRandomNumber);
};

Game.receivePlayerRoleMessage = function (data) {
    if (data.player === Game.playerID) {
        return;
    }
    var rn = data.randomNumber;
    console.log("my random number is " + Game.myRandomNumber + " theirs is " + rn);
    if (rn > Game.myRandomNumber) {
        Game.role = "left";
        console.log("Left");
    } else if (rn < Game.myRandomNumber) {
        Game.role = "right";
        console.log("Right");
    } else {
        console.log("Conflict!");
    }

    //alert("You are playing as player " + Game.role);
    Game.highlightRole();
    Game.start();
};

$(function () {
    Game.socket = io.connect(window.location.origin);
    Game.socket.on("connect", function () {
        console.log("Connection established");
        Game.socket.emit("join", {
            "room": String(Game.id)
        });
    });

    Game.socket.on("GAME_READY", function () {
        Game.sendPlayerRoleMessage();
    });

    Game.socket.on("PLAYER_ROLE", function (data) {
        Game.receivePlayerRoleMessage(data);
    });

    Game.socket.on("GAME_STATE_CHANGE", function (data) {
        Game.receiveStateChange(data);
    });

    Game.socket.on("PLAYER_MOVE", function (data) {
        Game.receiveMove(data);
    });

    // get the game ID
    var pieces = window.location.href.split("/");
    Game.id = pieces[pieces.length - 1];
    $("#game-id").text(Game.id);

    Game.playerID = Math.floor(Math.random() * 1e6);

    var canvas = $("#canvas")[0];
    Game.canvas = canvas;
    Game.context = canvas.getContext("2d");

    $(document).keydown(function (e) {
        var charCode = e.which;
        if (charCode === 38 || charCode === 87) {
            // up arrow or w
            Game.movePaddle(Game.role, -1);
        } else if (charCode === 40 || charCode === 83) {
            // down arrow or s
            Game.movePaddle(Game.role, +1);
        } else {
            console.log(charCode);
        }
    });

    $(document).keyup(function (e) {
        var charCode = e.which;
        if ((charCode === 38 || charCode === 87) && Game.paddles[Game.role].speed.y < 0) {
            // up
            Game.movePaddle(Game.role, 0);
        } else if ((charCode === 40 || charCode === 83) && Game.paddles[Game.role].speed.y > 0) {
            // down
            Game.movePaddle(Game.role, 0);
        }
    });

    $(canvas).click(function () {
        if (Game.started) {
            Game.pause(true);
        } else {
            Game.resume(true);
        }
    });

    Game.init();
    // draw initial frame, but do not start game or animations
    Game.drawFrame();
});
