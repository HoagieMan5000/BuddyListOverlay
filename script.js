let title = undefined;
let channelName = undefined;

const defaultLoginDurationMillis = 30 * 1e3;
const defaultAwayDurationMillis = 1 * 60 * 1e3;
const defaultLogoutDurationMillis = defaultAwayDurationMillis + 1 * 60 * 1e3;

const config = {
  statusCheckIntervalMillis: 1000,
  loginDurationMillis: defaultLoginDurationMillis,
  //awayDurationMillis: 10 * 60 * 1e3,
  //logoutDurationMillis: awayDurationMillis + 5 * 60 * 1e3,
  //removeDurationMillis: logoutDurationMillis + 30 * 1e3,
  awayDurationMillis: defaultAwayDurationMillis,
  logoutDurationMillis: defaultAwayDurationMillis + 1 * 60 * 1e3,
  removeDurationMillis: defaultLogoutDurationMillis + 30 * 1e3,

  ignoreBroadcaster: false,
};

const defaultImage =
  "https://hoagieman5000.github.io/BuddyListOverlay/img/BuddyListHeader.png";
const defaultIcons = {
  login: "https://hoagieman5000.github.io/BuddyListOverlay/img/login-icon.png",
  away: "https://hoagieman5000.github.io/BuddyListOverlay/img/away-icon.ico",
  logout:
    "https://hoagieman5000.github.io/BuddyListOverlay/img/logout-icon.png",
};

const defaultGroups = [
  {
    name: "Mods",
    isInGroup: (user) => user.isMod,
    order: 3,
    enabled: true,
    label: "Mods",
  },
  {
    name: "VIPs",
    isInGroup: (user) => user.isVip,
    order: 1,
    enabled: true,
    label: "VIPs",
  },
  {
    name: "Friends",
    isInGroup: (user) => true,
    order: 2,
    enabled: true,
    label: "Friends",
  },
];

const allStatuses = ["present", "login", "away", "logout"];
const users = {};

setInterval(() => updateUsers(), config.statusCheckIntervalMillis);

window.onload = (event) => {
  const logoImgSrc = $(".logo-image img").attr("src");
  if (logoImgSrc === "{{image}}") {
    console.log("Using default logo...");
    $(".logo-image img").attr("src", defaultImage);
  }

  const sortedGroups = [...defaultGroups]
    .filter((group) => group.enabled)
    .sort((g1, g2) => g1.order - g2.order);
  sortedGroups.forEach((group) => {
    $(".categories-container").append(`
      <div id="group-${group.name}"></div>
    `);
  });

  const groupElements = renderGroups();
  groupElements.forEach((groupElement) => {
    $(`#${groupElement.id}`).replaceWith(groupElement.element);
  });
};

window.addEventListener("onWidgetLoad", function (obj) {
  const detail = obj.detail;
  const fieldData = detail.fieldData;

  channelName = detail.channel.username;

  title = fieldData.title || `${channelName}'s Buddy list`;
  // TODO move this
  $(".title-bar-text").text(title);

  const modsGroup = defaultGroups.find((group) => group.name === "Mods");
  modsGroup.enabled = fieldData.useModGroup;
  modsGroup.label = fieldData.modGroupLabel || modsGroup.label;

  const vipGroup = defaultGroups.find((group) => group.name === "VIPs");
  vipGroup.enabled = fieldData.useVipGroup;
  vipGroup.label = fieldData.vipGroupLabel || vipGroup.label;

  const friendsGroup = defaultGroups.find((group) => group.name === "Friends");
  friendsGroup.label = fieldData.friendsGroupLabel || friendsGroup.label;

  config.ignoreBroadcaster = fieldData.ignoreBroadcaster;

  config.loginDurationMillis = fieldData.loginDelaySec
    ? fieldData.loginDelaySec * 1e3
    : config.loginDurationMillis;
  config.awayDurationMillis = fieldData.awayDelaySec
    ? fieldData.awayDelaySec * 1e3
    : config.awayDurationMillis;
  config.logoutDurationMillis = fieldData.logoutDelaySec
    ? config.awayDurationMillis + fieldData.logoutDelaySec * 1e3
    : config.logoutDurationMillis;
  (config.removeDurationMillis = config.logoutDurationMillis + 30 * 1e3),
    console.log({ config });
});

window.addEventListener("onEventReceived", function (obj) {
  handleEvent("onEventReceived", obj.detail);
});

function handleEvent(eventType, eventDetail) {
  if (eventType === "onEventReceived") {
    const detail = eventDetail;
    if (detail?.listener === "message") {
      const ev = detail.event.data;
      const chatMessage = {
        userId: ev.userId,
        username: ev.displayName,
        displayName: ev.displayName,
        isMod: ev.badges.some(
          (badge) => badge.type === "moderator" || badge.type === "mod"
        ),
        isVip: ev.badges.some((badge) => badge.type === "vip"),
        isBroadcaster: ev.badges.some((badge) => badge.type === "broadcaster"),
        message: ev.text,
        timestamp: new Date(ev.time).getTime(),
        status: "login",
      };

      if (config.ignoreBroadcaster && chatMessage.isBroadcaster) {
        return;
      }

      const existingUser = users[ev.userId];
      const isNew = !existingUser;
      if (isNew) {
        users[ev.userId] = {
          ...chatMessage,
          firstMessageTimeMillis: chatMessage.timestamp,
        };
      } else {
        users[ev.userId] = {
          ...chatMessage,
          firstMessageTimeMillis: existingUser.firstMessageTimeMillis,
        };
      }

      renderUser(users[ev.userId]);
    }
  }
}

function updateUsers() {
  // Update the user data
  updateUserStatuses();
}

function renderGroups() {
  const elements = defaultGroups.map((group) => ({
    element: `
      <div id="group-${group.name}" class="user-group">
        <div class="user-group-header">
          <div class="user-group-icon">
            ${groupOpenIcon}
          </div>
          <div id="group-${group.name}" class="user-group-name">${group.label} (<span class="group-number">0</span>)</div>
        </div>
      </div>
  `,
    id: `group-${group.name}`,
  }));

  return elements;
}

function renderUser(user) {
  const existingUserElement = $(`#${getUserId(user)}`);
  if (!existingUserElement.length) {
    const group = getUserGroup(user);
    if (group) {
      const groupElement = $(`#group-${group.name}`);
      if (groupElement) {
        groupElement.append(`
          <div id="${getUserId(user)}" class="user-row">
            <div class="user-status-icon">
              <img src="" />
            </div>
            <div class="user-name">${
          user.displayName
        }</div>
          </div>
        `);
        setUserStatus(user);
        updateNumberInGroup(group.name);
      }
    }
  }
}

function setUserStatus(user) {
  const statusClass = `status-${user.status}`;

  const hasStatusClass = !!$(`#${getUserId(user)} .${statusClass}`).length;
  if (!hasStatusClass) {
    allStatuses.forEach((status) =>
      $(`#${getUserId(user)}`).removeClass(`status-${status}`)
    );
    $(`#${getUserId(user)}`).addClass(statusClass);
    $(`#${getUserId(user)}`)
      .find("img")
      .attr("src", defaultIcons[user.status] ?? "");
  }
}

function removeUser(user) {
  $(`#${getUserId(user)}`).remove();
}

function getUserId(user) {
  return `user-${user.userId}`;
}

function getUserGroup(user) {
  const group = defaultGroups.find(
    (group) => group.enabled && group.isInGroup(user)
  );
  return group;
}

function updateUserStatuses() {
  const now = Date.now();

  const removeUserIds = [];
  Object.values(users).forEach((user) => {
    const firstMessageTimeMillis = user.firstMessageTimeMillis;
    const lastMessageMillis = user.timestamp;
    const timeSinceFirstMessage = now - firstMessageTimeMillis;
    const timeSinceLastMessage = now - lastMessageMillis;

    let newStatus = "present";
    if (timeSinceFirstMessage < config.loginDurationMillis) {
      newStatus = "login";
    }

    if (timeSinceLastMessage > config.awayDurationMillis) {
      newStatus = "away";
    }

    if (timeSinceLastMessage > config.logoutDurationMillis) {
      newStatus = "logout";
    }

    if (timeSinceLastMessage > config.removeDurationMillis) {
      changed = true;
      removeUserIds.push(user.userId);
    }

    const statusChanged = user.status !== newStatus;
    user.status = newStatus;

    if (statusChanged) {
      setUserStatus(user);
      const userGroup = getUserGroup(user);
      updateNumberInGroup(userGroup.name)
    }
  });

  removeUserIds.forEach((userId) => {
    const userGroup = getUserGroup(users[userId]);
    removeUser(users[userId]);
    updateNumberInGroup(userGroup?.name);
    delete users[userId];
  });
}

function updateNumberInGroup(groupName) {
  const numUsersInGroup = $(`#group-${groupName}`)
    .find(".user-row")
    .not(".status-logout").length;
  $(`#group-${groupName} .group-number`).text(numUsersInGroup);
}

const groupOpenIcon = `
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  x="0px" y="0px" height="100%" width="8px" viewBox="0 0 256 256" style="enable-background:new 0 0 256 256;"
  xml:space="preserve">
  <style type="text/css">
  .st0{stroke:#000000;stroke-miterlimit:10;}
  </style>
  <polygon class="st0" points="11,53.78 245,53.78 128,202.22 "/>
</svg>
`;
