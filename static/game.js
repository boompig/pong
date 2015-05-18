var Game = {};

Game.id = null;
Game.socket = null;
Game.myRandomNumber = null;
Game.role = null;

Game.paddles = {
    left: {
        pos: {
            x: 0,
            y: 0
        },
        speed: {
            x: 0,
            y: 0
        }
    },
    right: {
        pos: {
            x: 0,
            y: 0
        },
        speed: {
            x: 0,
            y: 0
        }
    }
};

Game.ball = { x: 0, y: 0 };
Game.ballRadius = 10;
Game.paddleOffset = 10;
Game.paddleWidth = 10;
Game.paddleHeight = 60;
Game.ballSpeed = { x: 0, y: 0 };
Game.initBallSpeed = { x: 3.5, y: 1.0 };
Game.canvas = null;
Game.context = null;
Game.paddleSpeed = 3.5;
Game.fps = 60;
Game.scores = {
    left: 0,
    right: 0
};

Game.checkHorizontalBoundaries = function () {
    if (Game.ball.x + Game.ballRadius <= 0) {
        Game.scores.right++;
        Game.reset();
    } else if (Game.ball.x - Game.ballRadius >= Game.canvas.width) {
        Game.scores.left++;
        Game.reset();
    }
};

Game.movePaddle = function (role, dy) {
    if (dy === +1) {
        Game.paddles[role].speed.y = Game.paddleSpeed;
    } else if (dy === -1) {
        Game.paddles[role].speed.y = -1 * Game.paddleSpeed;
    } else {
        Game.paddles[role].speed.y = 0;
    }
};

Game.drawScores = function () {
    $("#left").text(Game.scores.left);
    $("#right").text(Game.scores.right);
};

Game.drawFrame = function () {
    Game.drawBackground();
    Game.drawScores();
    Game.drawPaddles();
    Game.drawBall();
};

Game.drawBall = function () {
    var context = Game.context;
    context.beginPath();
    context.fillStyle = "white";
    context.arc(Game.ball.x, Game.ball.y, Game.ballRadius, 0, 2 * Math.PI, false);
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
    var context = Game.context;
    context.fillStyle = "black";
    context.fillRect(0, 0, Game.canvas.width, Game.canvas.height);
};

Game.animateBall = function () {
    Game.ball.x += Game.ballSpeed.x;
    Game.ball.y += Game.ballSpeed.y;
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
    Game.checkHorizontalBoundaries();

    Game.animateBall();
    Game.animatePaddles();
    Game.drawFrame();
    window.setTimeout(Game.animateFrames, 1000 / Game.fps);
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
    Game.ball.x = Game.canvas.width / 2;
    Game.ball.y = Game.canvas.height / 2;
    Game.ballSpeed = {
        x: Game.initBallSpeed.x,
        y: Game.initBallSpeed.y
    };
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
            randomNumber: Game.myRandomNumber
        };
        Game.socket.emit("PLAYER_ROLE", data);
        console.log("Sent random number " + Game.myRandomNumber);
    });

    Game.socket.on("PLAYER_ROLE", function (data) {
        if (data.player === Game.playerID) {
            return;
        }
        var rn = data["randomNumber"];
        if (rn > Game.myRandomNumber) {
            Game.role = "left";
        } else if (rn < Game.myRandomNumber) {
            Game.role = "right";
        } else {
            console.log("Conflict!");
        }
        alert("You are playing as player " + Game.role);
        Game.animateFrames();
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
