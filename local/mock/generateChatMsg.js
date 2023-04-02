const defaultMessageEvent = {
  listener: "message",
  event: {
    service: "twitch",
    data: {
      time: 1679099214348,
      tags: {
        "badge-info": "subscriber/14",
        badges: "broadcaster/1,subscriber/0",
        "client-nonce": "f11b84495b6c0c61ce797e1965a38d4c",
        color: "#FF862F",
        "display-name": "HoagieMan5000",
        emotes: "",
        "first-msg": "0",
        flags: "",
        id: "98dc0903-101d-4d25-9347-bf4476900a47",
        mod: "0",
        "returning-chatter": "0",
        "room-id": "408982109",
        subscriber: "1",
        "tmi-sent-ts": "1679099215017",
        turbo: "0",
        "user-id": "408982109",
        "user-type": "",
      },
      nick: "hoagieman5000",
      userId: "408982109",
      displayName: "HoagieMan5000",
      displayColor: "#FF862F",
      badges: [
        {
          type: "broadcaster",
          version: "1",
          url: "https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/3",
        },
        {
          type: "subscriber",
          version: "0",
          url: "https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/3",
        },
      ],
      channel: "hoagieman5000",
      text: "asdfasdfasdf",
      isAction: false,
      emotes: [],
      msgId: "98dc0903-101d-4d25-9347-bf4476900a47",
    },
    renderedText: "asdfasdfasdf",
  },
};

function generateChatMessage(user, message, opts = {}) {
  const eventData = {
    ...defaultMessageEvent,
    event: {
      ...defaultMessageEvent.event,
      data: {
        ...defaultMessageEvent.event.data,
        ...opts,
      },
    },
  };
  const username = user.username;

  eventData.event.renderedText = message;
  eventData.event.data.tags["display-name"] = username;
  eventData.event.data.badges = user.badges ?? [];
  eventData.event.data.nick = username;
  eventData.event.data.userId = username;
  eventData.event.data.displayName = username;
  eventData.event.data.channel = "hoagieman5000";
  eventData.event.data.time = Date.now();

  handleEvent("onEventReceived", eventData);
}
