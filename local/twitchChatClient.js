const twitchChatUrl = "wss://irc-ws.chat.twitch.tv:443";

class ChatParser {
    static regex = new RegExp(/:(?<username>.+)!(?<fullname>.+) (?<messageType>.+) #(?<channel>.+) :(?<message>.+)/);

    static parse(rawMessage) {
        const matches = rawMessage.match(ChatParser.regex);
        if (matches?.[3] === "PRIVMSG") {
            return {
                username: matches?.[1],
                message: matches?.[5],
                timestamp: new Date(),
            };
        }
    }
}

class TwitchChatClient {
  username;
  channel;
  oauthToken;

  ws = undefined;
  connected = false;
  onMessage;
  onConnectionChange;

  constructor(username, channel, oauthToken, onMessage, onConnectionChange) {
    this.username = username;
    this.channel = channel;
    this.oauthToken = oauthToken;
    this.onMessage = onMessage;
    this.onConnectionChange = onConnectionChange;
  }

  connect() {
    console.log(`Connecting to ${twitchChatUrl}`);
    if (!this.connected) {
      this.ws = new WebSocket(twitchChatUrl);
      this.ws.onopen = this.onConnect.bind(this);
      this.ws.onclose = this.onDisconnect.bind(this);
      this.ws.onmessage = (event) => {
        this.pong(event.data);
        const msg = event.data;
        const parsedMessage = ChatParser.parse(msg);
        if (parsedMessage) {
          this.onMessage(parsedMessage);
        }
      };
    }
  }

  disconnect() {
    this.ws.close();
  }

  onConnect() {
    console.log("connected");
    console.log(
      `PASS oauth:${this.oauthToken}`.replace(this.oauthToken, "*********")
    );
    if (this.oauthToken) {
        this.ws.send(`PASS oauth:${this.oauthToken}`);
    }
    console.log(`NICK ${this.username}`);
    this.ws.send(`NICK ${this.username}`);

    this.ws.send(`JOIN #${this.channel}`);

    console.log(`CONNECTED to ${this.channel}`);
    this.connected = true;
  }

  onDisconnect() {
    console.log(`DISCONNECTED from ${this.channel}`);
    this.connected = false;
  }

  pong(message) {
    if (message.trim() === `PING :tmi.twitch.tv`) {
      console.log("PONG :tmi.twitch.tv");
      this.ws.send("PONG :tmi.twitch.tv");
    }
  }

  sendChatMessage(message) {
    this.ws.send(`PRIVMSG #${this.channel} :${message}`);
  }
}
