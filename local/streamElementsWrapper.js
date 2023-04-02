const channel = "juliegolive";

function isMod(username) {
  return username.length % 3 === 0;
}

function isVip(username) {
  if (!isMod(username)) {
    return username.length % 4 === 0;
  }
  return false;
}

const twitchClient = new TwitchChatClient(
  "justinfan777",
  channel,
  undefined,
  (msg) => {
    const opts = {};
    const badges = [];
    if (isMod(msg.username)) {
      opts.mod = "1";
      badges.push({ type: "moderator" });
    } else if (isVip(msg.username)) {
      badges.push({ type: "vip" });
    }

    generateChatMessage(
      {
        username: msg.username,
        badges: badges,
      },
      msg.message,
      opts
    );
  }
);
twitchClient.connect();
