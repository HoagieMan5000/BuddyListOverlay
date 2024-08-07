let title = undefined;
let channelName = undefined;

const defaultLoginDurationMillis = 30 * 1e3;
const defaultAwayDurationMillis = defaultLoginDurationMillis + 5 * 60 * 1e3;
const defaultLogoutDurationMillis = defaultAwayDurationMillis + 5 * 60 * 1e3;

const config = {
  statusCheckIntervalMillis: 500,
  loginDurationMillis: defaultLoginDurationMillis,
  awayDurationMillis: defaultAwayDurationMillis,
  logoutDurationMillis: defaultLogoutDurationMillis,
  removeDurationMillis: defaultLogoutDurationMillis + 30 * 1e3,

  ignoreBroadcaster: false,
  usersToIgnore: [],
  playSounds: true,
  alertVolume: 0.6,
};

const defaultSounds = {
  login: "https://hoagieman5000.github.io/BuddyListOverlay/audio/dooropen.wav",
  logout: "https://hoagieman5000.github.io/BuddyListOverlay/audio/doorslam.wav",
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

const userData = {
  users: {}
};

setInterval(() => updateUsers(userData.users), config.statusCheckIntervalMillis);
setInterval(() => SE_API.store.set("userData", userData.users), 10000)

window.onload = (event) => {
  SE_API.store.get("userData").then((userData) => {
    if (userData) {
      userData.users = {
        ...userData,
      };
      updateUsers(userData.users)
    }
    initialRender();
  });
};

window.addEventListener("onWidgetLoad", function (obj) {
  const detail = obj.detail;
  const fieldData = detail.fieldData;
  const channelName = detail.channel.username;

  setTitle(channelName, fieldData);
  setLogo(fieldData);
  configureGroups(fieldData);
  setConfiguration(fieldData);
});

window.addEventListener("onEventReceived", function (obj) {
  handleEvent("onEventReceived", obj.detail);
});

function handleEvent(eventType, eventDetail) {
  if (eventType === "onEventReceived") {
    const detail = eventDetail;
    if (detail?.listener === "message") {
      const eventData = detail.event.data;
      handleMessage(eventData);
    }
  }
}

function handleMessage(eventData) {
  const chatMessage = {
    userId: eventData.userId,
    username: eventData.displayName,
    displayName: eventData.displayName,
    isMod: eventData.badges.some(
      (badge) => badge.type === "moderator" || badge.type === "mod"
    ),
    isVip: eventData.badges.some((badge) => badge.type === "vip"),
    isBroadcaster: eventData.badges.some(
      (badge) => badge.type === "broadcaster"
    ),
    message: eventData.text,
    timestamp: new Date(eventData.time).getTime(),
    status: "",
  };

  if (config.ignoreBroadcaster && chatMessage.isBroadcaster) {
    return;
  }

  if (
    config.usersToIgnore &&
    config.usersToIgnore.includes(chatMessage.username?.toLowerCase())
  ) {
    return;
  }

  const existingUser = userData.users[eventData.userId];
  const isNew = !existingUser || existingUser.status === "logout";
  if (isNew) {
    userData.users[eventData.userId] = {
      ...chatMessage,
      firstMessageTimeMillis: chatMessage.timestamp,
    };
  } else {
    userData.users[eventData.userId] = {
      ...chatMessage,
      firstMessageTimeMillis: existingUser.firstMessageTimeMillis,
      status: existingUser.status,
    };
  }
}

function updateUsers(users) {
  // Update the user data
  updateUserStatuses(users);
}

function updateUserStatuses(users) {
  const now = Date.now();

  const removeUserIds = [];
  const audioToPlay = new Set();
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
      removeUserIds.push(user.userId);
    }

    const statusChanged = user.status !== newStatus;
    user.status = newStatus;

    renderUser(user);
    if (statusChanged) {
      setUserStatus(user);
      const userGroup = getUserGroup(user);
      updateNumberInGroup(userGroup.name);
      if (statusChanged) {
        audioToPlay.add(user.status);
      }
    }
  });

  [...audioToPlay.values()].forEach((type) => playSound(type));

  removeUserIds.forEach((userId) => {
    const userGroup = getUserGroup(userData.users[userId]);
    removeUser(userData.users[userId]);
    updateNumberInGroup(userGroup?.name);
    delete userData.users[userId];
  });
}

function setConfiguration(fieldData) {
  config.ignoreBroadcaster = fieldData.ignoreBroadcaster;

  config.loginDurationMillis = fieldData.loginDelaySec
    ? fieldData.loginDelaySec * 1e3
    : config.loginDurationMillis;

  config.awayDurationMillis =
    config.loginDurationMillis +
    (fieldData.awayDelaySec
      ? fieldData.awayDelaySec * 1e3
      : config.awayDurationMillis);

  config.logoutDurationMillis =
    config.awayDurationMillis +
    (fieldData.logoutDelaySec
      ? fieldData.logoutDelaySec * 1e3
      : config.logoutDurationMillis);

  config.removeDurationMillis = config.logoutDurationMillis + 30 * 1e3;
  config.playSounds = fieldData.useAudioAlerts ?? config.playSounds;
  config.alertVolume = fieldData.audioVolume / 100 ?? config.alertVolume;
  config.usersToIgnore =
    fieldData.ignoreUsers?.split(",")?.map((s) => s.toLowerCase().trim()) ?? [];
}

function configureGroups(fieldData) {
  const modsGroup = defaultGroups.find((group) => group.name === "Mods");
  modsGroup.enabled = fieldData.useModGroup;
  modsGroup.label = fieldData.modGroupLabel || modsGroup.label;

  const vipGroup = defaultGroups.find((group) => group.name === "VIPs");
  vipGroup.enabled = fieldData.useVipGroup;
  vipGroup.label = fieldData.vipGroupLabel || vipGroup.label;

  const friendsGroup = defaultGroups.find((group) => group.name === "Friends");
  friendsGroup.label = fieldData.friendsGroupLabel || friendsGroup.label;
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

/* Rendering */

function initialRender() {
  renderGroupContainers();
  renderGroups();
}

function renderGroupContainers() {
  const sortedGroups = [...defaultGroups]
    .filter((group) => group.enabled)
    .sort((g1, g2) => g1.order - g2.order);
  sortedGroups.forEach((group) => {
    $(".categories-container").append(`
    <div id="group-${group.name}"></div>
  `);
  });
}

function renderGroups() {
  const groupElements = renderGroupElements();
  groupElements.forEach((groupElement) => {
    $(`#${groupElement.id}`).replaceWith(groupElement.element);
  });
}

function renderGroupElements() {
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
            <div class="user-name">${user.displayName}</div>
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

function setLogo(fieldData) {
  if (fieldData.showImage === false) {
    $(".logo-image").addClass("hidden");
    return;
  }

  if (!fieldData?.image) {
    $(".logo-image img").attr("src", defaultImage);
  }
}

function updateNumberInGroup(groupName) {
  const numUsersInGroup = $(`#group-${groupName}`)
    .find(".user-row")
    .not(".status-logout").length;
  $(`#group-${groupName} .group-number`).text(numUsersInGroup);
}

function setTitle(channelName, fieldData) {
  title =
    fieldData.title ||
    (channelName ? `${channelName}'s Buddy list` : "Buddy List");
  $(".title-bar-text").text(title);
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

function playSound(type) {
  const vol = config.alertVolume ?? 1;
  if (config.playSounds) {
    const file = defaultSounds[type];
    if (file) {
      const audio = new Audio(file);
      audio.loop = false;
      audio.volume = vol;
      audio.play();
    }
  }
}
