from challenge import Challenge
from flask import Flask, request, jsonify, redirect, url_for
from flask_socketio import SocketIO, send, emit, join_room, leave_room
import random
import time
import threading
import logging
import coloredlogs


########### create app ####################
app = Flask(__name__, static_url_path="", static_folder="public")
app.config["SECRET_KEY"] = "secret!"
app.config["PORT"] = 8080
app.config["DEBUG"] = True
app.debug = True
socketio = SocketIO(app)

############# app state ###############
available_users = {
}

challenges = {
}

# measured in seconds
timeout_period = 10.0

def check_keepalive_users(timer=None):
    logging.info("Running username cleanup")
    now = time.time()
    deleted_users = []
    for username, obj in available_users.items():
        if now - obj["last_keepalive"] > timeout_period:
            # remove that user
            deleted_users.append(username)

    for username in deleted_users:
        logging.warning("Removing username " + username)
        del available_users[username]

    if timer is None:
        timer = threading.Timer(timeout_period, check_keepalive_users)
        timer.start()

def get_challenge_id():
    n = random.randint(100, 1000)
    while n in challenges:
        n = random.randint(100, 1000)
    return n

################################# socket stuff ############################

games = {}

@socketio.on("join")
def on_join(data):
    room = data["room"]
    username = data["username"]
    join_room(room)
    print("{username} joined room {room}".format(
        username=username,
        room=room
    ))
    if room not in games:
        games[room] = 1
    else:
        print("all players have joined in room " + room)
        emit("GAME_READY", "OK", room=room)

@socketio.on("PLAYER_ROLE")
def on_player_role(data):
    room = data["room"]
    emit("PLAYER_ROLE", data, room=room)
    print("sending random number " + str(data["randomNumber"]))

@socketio.on("PLAYER_MOVE")
def on_player_move(data):
    emit("PLAYER_MOVE", data, room=data["room"])

@socketio.on("GAME_STATE_CHANGE")
def on_game_state_change(data):
    emit("GAME_STATE_CHANGE", data, room=data["room"])

@socketio.on("leave")
def on_leave(data):
    leave_room(data["room"])

########################## app methods ##########################

@app.route("/")
def index():
    return redirect(url_for("html_register"))

@app.route("/game/<int:gameID>", methods=["GET"])
def html_game(gameID):
    return app.send_static_file("game.html")

@app.route("/register")
def html_register():
    return app.send_static_file("register.html")

@app.route("/lounge")
def html_lounge():
    return app.send_static_file("lounge.vue.html")

@app.route("/waitingRoom")
def html_waiting_room():
    return app.send_static_file("waitingRoom.html")

@app.route("/api/register", methods=["POST"])
def api_register():
    if "username" not in request.form or request.form["username"] == "":
        msg = "username is required"
        code = 400
    elif request.form["username"] in available_users:
        msg = "username not available"
        code = 400
    else:
        username = request.form["username"]
        available_users[username] = {
            "registration_time": time.time(),
            "last_keepalive": time.time()
        }
        msg = "successfully registered username %s" % username
        code = 200
    return jsonify({ "msg": msg }), code

@app.route("/api/keepalive", methods=["POST"])
def api_keepalive():
    if "username" not in request.form or request.form["username"] == "":
        msg = "username is required"
        t = "USERNAME_NOT_PROVIDED"
        code = 400
    elif request.form["username"] not in available_users:
        msg = "username %s is not registered" % request.form["username"]
        t = "USERNAME_NOT_REGISTERED"
        code = 400
    else:
        username = request.form["username"]
        available_users[username]["last_keepalive"] = time.time()
        msg = "ok"
        code = 200
    data = { "msg" : msg }
    if code != 200:
        data["errorType"] = t
    return jsonify(data), code

@app.route("/api/availableUsers", methods=["GET"])
def api_availableUsers():
    users = list(available_users.keys())
    return jsonify({ "users": users })

@app.route("/api/challenges", methods=["POST"])
def api_post_challenge():
    if "username" not in request.form or request.form["username"] == "":
        data = {"error": "USERNAME_NOT_PROVIDED"}
        code = 400
    elif request.form["username"] not in available_users:
        data = {"error": "USERNAME_NOT_REGISTERED"}
        code = 400
    elif "opponent" not in request.form or request.form["opponent"] == "":
        data = {"error": "OPPONENT_NOT_PROVIDED"}
        code = 400
    elif request.form["opponent"] not in available_users:
        data = {"error": "OPPONENT_NOT_REGISTERED"}
        code = 400
    else:
        opponent = request.form["opponent"]
        if len([ c for id, c in challenges.items() if c.receive_username == opponent]) > 0:
            data = {"error": "OPPONENT_NOT_AVAILABLE"}
            code = 400
        else:
            challenge_id = get_challenge_id()
            # remove username from available users
            del available_users[request.form["username"]]
            challenge = Challenge(request.form["username"], opponent, time.time())
            challenges[challenge_id] = challenge
            code = 200
            data = {
                "challengeID": challenge_id,
                "msg": "Successfully issued challenge to %s" % opponent
            }
    return jsonify(data), code

@app.route("/api/challenges", methods=["GET"])
def api_get_challenges():
    if "username" not in request.args or request.args["username"] == "":
        data = {"error": "USERNAME_NOT_PROVIDED"}
        code = 400
    elif request.args["username"] not in available_users:
        data = {"error": "USERNAME_NOT_REGISTERED"}
        code = 400
    else:
        l = []
        username = request.args["username"]
        for challenge_id, challenge in challenges.items():
            if challenge.receive_username == username and challenge.status == "pending":
                l.append({
                    "sent_username": challenge.sent_username,
                    "id": challenge_id,
                    "status": challenge.status
                })
        data = {"challenges": l}
        code = 200
    return jsonify(data), code

@app.route("/api/challenges/<int:challengeID>", methods=["UPDATE"])
def api_update_challenge(challengeID):
    if "accept" not in request.form or request.form["accept" ] == "":
        data = {"error": "BAD_REQUEST"}
        code = 400
    elif challengeID not in challenges:
        data = {"error": "INVALID_CHALLENGE_ID"}
        code = 400
    else:
        if request.form["accept"] == "true" or request.form["accept"] == True:
            code = 200
            data = {"msg": "OK"}
            challenges[challengeID].status = "accepted"
        elif request.form["accept"] == "false" or request.form["accept"] == False:
            code = 200
            data = {"msg": "OK"}
            challenges[challengeID].status = "declined"
        else:
            data = {"error": "BAD_REQUEST"}
            code = 400
    return jsonify(data), code

@app.route("/api/challenges/<int:challengeID>", methods=["GET"])
def api_get_challenge_status(challengeID):
    if challengeID not in challenges:
        data = {"error": "INVALID_CHALLENGE_ID"}
        code = 400
    else:
        challenge = challenges[challengeID]
        data = {"challenge": challenge.__dict__}
        code = 200
    return jsonify(data), code

if __name__ == "__main__":
    if app.config["DEBUG"]:
        logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
        coloredlogs.install(logging.INFO)
    check_keepalive_users()
    print("Running on http://localhost:%s" % app.config["PORT"])
    socketio.run(app, host="0.0.0.0", port=app.config["PORT"])
