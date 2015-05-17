
class Challenge(object):
    def __init__(self, sent_username, receive_username, time_issued):
        self.sent_username = sent_username
        self.receive_username = receive_username
        self.time_issued = time_issued

        self.status = "pending"

