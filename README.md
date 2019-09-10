# 2-player Pong

**NOTE:** this code was written in 2015 and will not be updated.

An implementation of 2-player pong using websockets. Running on port 8080

## Flow

1. `/register` - register username
2. `/lounge` - find other users and issue challenges. Also accept/reject incoming challenges.
3. `/waitingRoom` - after issuing a challenge wait until other user has accepted the challenge
4. `/game` - play the game
