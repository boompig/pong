var Game = {};

Game.id = null;
Game.socket = null;
Game.myRandomNumber = null;
Game.role = null;
Game.borderWidth = 4;
Game.borderColor = "#F7C76D";
Game.counter = 0;
Game.started = false;

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
};

/**
 * Going to be a rough approximation, assuming ball is square
 */
Ball.prototype.intersectsPaddle = function (paddle) {
    return (!(this.pos.y + this.radius < paddle.pos.y || 
        this.pos.y - this.radius > paddle.pos.y + paddle.height ||
        this.pos.x + this.radius < paddle.pos.x ||
        this.pos.x - this.radius > paddle.pos.x + paddle.width))
};

Game.paddleWidth = 10;
Game.paddleHeight = 60;
Game.paddles = {
    left: new Paddle(Game.paddleWidth, Game.paddleHeight),
    right: new Paddle(Game.paddleWidth, Game.paddleHeight)
};

Game.ballRadius = 10;
Game.ball = new Ball(Game.ballRadius);

Game.paddleOffset = 10;
Game.initBallSpeed = { x: 3.5, y: 1.0 };
Game.canvas = null;
Game.context = null;
Game.paddleSpeed = 3.5;
Game.fps = 40;
Game.scores = {
    left: 0,
    right: 0
};

Game.checkHorizontalBoundaries = function () {
    if (Game.ball.pos.x + Game.ballRadius <= 0) {
        Game.scores.right++;
        Game.drawScores();
        Game.reset();
    } else if (Game.ball.pos.x - Game.ballRadius >= Game.canvas.width) {
        Game.scores.left++;
        Game.drawScores();
        Game.reset();
    }
};

Game.checkVerticalBoundaries = function (ball) {
    if (ball.pos.y - ball.radius <= 0 || ball.pos.y + ball.radius >= Game.canvas.height) {
        ball.speed.y *= -1;
    }
};

//Game.receiveStateChange = function (data) {
    //if (data.role !== Game.role && data.state === "reset") {
        //Game.reset();
    //}
//};

//Game.sendStateChange = function (stateChange) {
    //var data = {
        //room: String(Game.id),
        //role: Game.role,
        //state: stateChange
    //};
    //Game.socket.emit("GAME_STATE_CHANGE", data);
//};

Game.receiveMove = function (data) {
    if (data.role !== Game.role) {
        //console.log("Received move");
        //console.log(data);
        Game.movePaddle(data.role, data.direction);
    }
};

Game.sendMove = function (paddleRole, direction) {
    var data = {
        room: String(Game.id),
        role: paddleRole,
        direction: direction
    };
    //console.log("Sending move");
    //console.log(data);
    Game.socket.emit("PLAYER_MOVE", data)
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

//Game.drawGameCounter = function () {
    //$("#game-counter").text(Game.counter);
//};

//Game.drawBallPos = function () {
    //$("#ball-pos .x").text(Game.ball.pos.x);
    //$("#ball-pos .y").text(Game.ball.pos.y);
//};

Game.drawFrame = function () {
    Game.drawBackground();
    //Game.drawBallPos();
    //Game.drawGameCounter();
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
        context.fillStyle = "white";
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

Game.animateBall = function () {
    Game.ball.pos.x += Game.ball.speed.x;
    Game.ball.pos.y += Game.ball.speed.y;
};

Game.animatePaddles = function () {
    var roles = ["left", "right"];
    for (var i = 0; i < roles.length; i++) {
        var role = roles[i];
        var paddle = Game.paddles[role];
        paddle.pos.y += paddle.speed.y;
    }
};

Game.animateFrames = function () {
    Game.started = true;
    // first, set the next time to execute, then actually do execution
    window.setTimeout(Game.animateFrames, 1000 / Game.fps);

    Game.checkHorizontalBoundaries();
    Game.checkVerticalBoundaries(Game.ball);
    if (Game.ball.intersectsPaddle(Game.paddles.left) ||
        Game.ball.intersectsPaddle(Game.paddles.right)) {
        Game.ball.speed.x *= -1;
    }

    Game.animateBall();
    Game.animatePaddles();
    Game.drawFrame();
    Game.counter++;
};

Game.showMessage = function (data) {
    var msg = data["msg"];
    var parent = $("#messages");
    $("<div></div>").text(msg).appendTo(parent);
};

Game.init = function () {
    Game.paddles.left.pos.x = Game.paddleOffset;
    Game.paddles.left.pos.y = Game.canvas.height / 2 - Game.paddleHeight / 2;
    Game.paddles.right.pos.x = Game.canvas.width - Game.paddleOffset - Game.paddleWidth;
    Game.paddles.right.pos.y = Game.canvas.height / 2 - Game.paddleHeight / 2;
    Game.reset();
};

Game.reset = function () {
    Game.ball.pos.x = Game.canvas.width / 2;
    Game.ball.pos.y = Game.canvas.height / 2;

    Game.ball.speed.x = Game.initBallSpeed.x;
    Game.ball.speed.y = Game.initBallSpeed.y;

    Game.counter = 0;
};

$(function () {
    Game.socket = io.connect(window.location.origin);
    Game.socket.on("connect", function () {
        console.log("Connection established");
        Game.socket.emit("join", { "room": String(Game.id) })
    });

    Game.socket.on("GAME_READY", function (data) {
        Game.myRandomNumber = Math.random() * 1000;
        var data = {
            room: String(Game.id),
            player: Game.playerID,
            randomNumber: Game.myRandomNumber,
        };
        Game.socket.emit("PLAYER_ROLE", data);
        console.log("Sent random number " + Game.myRandomNumber);
    });

    Game.socket.on("PLAYER_ROLE", function (data) {
        if (data.player === Game.playerID) {
            return;
        }
        var rn = data.randomNumber;
        if (rn > Game.myRandomNumber) {
            Game.role = "left";
        } else if (rn < Game.myRandomNumber) {
            Game.role = "right";
        } else {
            console.log("Conflict!");
        }

        //alert("You are playing as player " + Game.role);
        Game.highlightRole();
        console.log("Restarting game");
        Game.reset();
        if (! Game.started) {
            Game.animateFrames();
        }
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

    Game.playerID = Math.random() * 1000;

    var canvas = $("#canvas")[0];
    Game.canvas = canvas;
    Game.context = canvas.getContext("2d");

    $(document).keydown(function (e) {
        var charCode = e.which;
        if (charCode === 38) {
            // up
            Game.movePaddle(Game.role, -1);
        } else if (charCode === 40) {
            // down
            Game.movePaddle(Game.role, +1);
        }
    });

    $(document).keyup(function (e) {
        var charCode = e.which;
        if (charCode === 38 && Game.paddles[Game.role].speed.y < 0) {
            // up
            Game.movePaddle(Game.role, 0);
        } else if (charCode === 40 && Game.paddles[Game.role].speed.y > 0) {
            // down
            Game.movePaddle(Game.role, 0);
        }
    });

    Game.init();
});
