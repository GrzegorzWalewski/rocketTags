/**
 * array of usernames, of people that should have access to configurator
 * */
const configurationEditors = ['admin'];
/**
 * configurator start command
 * (just type it in message box and click enter)
 * */
const rocketTagsConfiguratorCommand = 'grzojda_rocketTags_configurator';
/**
 * channel on which configuration will be sent
 * If it does not exist we'll create it for You, no worries
 * */
const configurationChannelName = 'grzojdaRocketTags';
/**
 * Time after which we will be checking for new configuration.
 * Set to 0 to check for updates every time user changes room (not recommended)
 * */
const configurationSyncIntervalInSec = 21600;

/******************************
 * DO NOT TOUCH WHAT IS BELOW *
 ******************************/

class RocketTags {
    messageInputNodes;
    tags = {};
    roomMembers;
    inRoomTags;
    myUsername;
    userNotInGroupMention = '<a class="mention-link mention-link--user" data-username="groupName" data-title="groupName" data-tooltip="groupName">groupName</a>';
    userInGroupMention = '<a class="mention-link mention-link--all mention-link--group" data-group="groupName">groupName</a>';

    constructor(apiCaller, rocketTagsConfigurator, configurationEditors, configurationSyncIntervalInSec) {
        this.rocketTagsConfigurator = rocketTagsConfigurator;
        this.apiCaller = apiCaller;
        this.admins = configurationEditors;
        this.configurationSyncIntervalInSec = configurationSyncIntervalInSec;
    }

    async run() {
        console.log('Grzojda RocketTags: Start');
        await this.waitForMainNode();
        this.getDOMVariables();
        await this.loadTags();
        await this.loadRoomMembers();
        this.generateInRoomTags();
        this.updateLoadedMessages();
        this.addEventListeners();
        if (this.admins.includes(this.myUsername)) {
            this.rocketTagsConfigurator.waitForCommand(this.messageInputNodes, this.tags);
        }
    }

    async waitForMainNode() {
        return await new Promise(resolve => {
            const waitForMainNode = setInterval(() => {
                console.log('Grzojda RocketTags: waiting...');
                if ($('.message-popup-results').length > 0) {
                    console.log('Grzojda RocketTags: rendered; running script');
                    resolve(true);
                    clearInterval(waitForMainNode);
                }
            }, 1000);
        });
    }

    addEventListeners() {
        let that = this;

        $('aside').click(function () {
            that.run();
        });

        $(this.messageInputNodes).each((key, element) => {
            $(element).keydown(function (e) {
                if (!e.shiftKey && e.keyCode === 13 && $('.message-popup-items').get(0) === undefined) {
                    this.value = that.replaceTags(this.value);
                }
            });
        });

        MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

        var observer = new MutationObserver((mutations, observer) => {
            for (var mutation of mutations) {
                for (var addedNode of mutation.addedNodes) {
                    var messageNode = $(addedNode).find('[data-qa-type="message-body"]').get(0);
                    var rawMessage = $(messageNode).html();
                    $(messageNode).find('.mention-link').each(function () {
                        if (that.inRoomTags[$(this).text()] === undefined) {
                            rawMessage = rawMessage.replace(this.outerHTML, '@' + $(this).prop('title'));
                        }
                    })
                    var originalRaw = rawMessage;
                    rawMessage = this.reverseReplaceTags(rawMessage);

                    if (originalRaw !== rawMessage) {
                        $(messageNode).html(rawMessage);
                    }
                }
            }
        });

        observer.observe($('ul').get(0), {
            childList: true,
            childTree: true
        });
    }

    replaceTags(text) {
        for (var inRoomTag in this.inRoomTags) {
            if (this.inRoomTags[inRoomTag].length !== 0) {
                text = text.replaceAll('@' + inRoomTag, '@' + this.inRoomTags[inRoomTag].join(' @') + ' ');
            }
        }

        return text;
    }

    async loadTags() {
        let isTimeForSync = LocalStorageManager.getFromLocalStorage('grzojda_rocketTags_lastUpdate') < ((Date.now() / 1000) - this.configurationSyncIntervalInSec);

        if (LocalStorageManager.getFromLocalStorage('grzojda_rocketTags') === null || isTimeForSync) {
            let channelId = await this.rocketTagsConfigurator.getConfigurationChannel();
            if (channelId) {
                this.tags = await this.rocketTagsConfigurator.getLatestConfiguration(channelId);
                LocalStorageManager.setToLocalStorage('grzojda_rocketTags', this.tags);
                LocalStorageManager.setToLocalStorage('grzojda_rocketTags_lastUpdate', Date.now() / 1000);
            }
        } else {
            this.tags = LocalStorageManager.getFromLocalStorage('grzojda_rocketTags');
        }

    }

    getDOMVariables() {
        this.messageInputNodes = $('.js-input-message');
        this.activeRoom = $('main').attr('data-qa-rc-room');
        this.myUsername = $($('figure[data-username]')[0]).data('username');
        this.roomType = 'channels';
        if (window.location.pathname.includes('group')) {
            this.roomType = 'groups';
        } else if (window.location.pathname.includes('direct')) {
            this.roomType = 'direct';
        }
    }

    async loadRoomMembers() {
        this.roomMembers = [];
        let names = [];
        while (true) {
            if (this.roomType === 'direct') {
                return;
            }

            let offset = this.roomMembers.length;
            let path = "/" + this.roomType + ".members?roomId=" + this.activeRoom + "&offset=" + offset + "&count=100";
            let response = await this.apiCaller.sendApiCall(path);
            let data = await response.json();
            names.push(...data.members);

            if (names.length >= data.total) {
                this.roomMembers = names.map(a => a.username);
                break;
            }
        }
    }

    generateInRoomTags() {
        this.inRoomTags = {};
        if (this.tags == null) {
            return;
        }

        for (let key in this.tags) {
            this.inRoomTags[key] = [];
            for (let username of this.tags[key]) {
                if (this.roomMembers.includes(username)) {
                    this.inRoomTags[key].push(username);
                }
            }
        }

        return this.inRoomTags;
    }

    searchForTags(searchQuery = '') {
        let that = this;
        searchQuery = searchQuery.toLowerCase();
        var result = [];
        var inRoomTags = this.generateInRoomTags();
        for (var inRoomTag in inRoomTags) {
            var lowerCaseInRoomTag = inRoomTag.toLowerCase();
            console.log(lowerCaseInRoomTag);
            if (inRoomTags[inRoomTag].length !== 0 && (lowerCaseInRoomTag.includes(searchQuery) || searchQuery.length === 0)) {
                result.push(this.getTagUserObject(inRoomTag));
            }
        }
        return result;
    }

    reverseSearchForTags(mentions, mdIndex) {
        var inRoomTags = this.generateInRoomTags();
        for (var index in inRoomTags) {
            var rocketTagUsers = inRoomTags[index].filter(Boolean).join();
            var mentionsUsers = mentions.filter(Boolean).join();
            if (inRoomTags[index].length > 1 && rocketTagUsers != "" && mentionsUsers.includes(rocketTagUsers)) {
                if (rocketTagUsers != mentionsUsers) {
                    for (var key in mentions) {
                        if (!rocketTagUsers.includes(mentions[key])) {
                            mentions.splice(key, 1);
                        }
                    }
                }
                for (var key in mentions) {
                    mds[mdIndex].value[key] = undefined;
                }

                mds[mdIndex].value[key] = {
                    type: "MENTION_USER",
                    value: {
                        type: "PLAIN_TEXT",
                        value: index
                    }
                }
                for (var mentionIndex in mentionElem) {
                    if (mentionElem[mentionIndex] != undefined && mentions.includes(mentionElem[mentionIndex].username)) {
                        mentionElem[mentionIndex] = undefined;
                        var lastMentionIndex = mentionIndex;
                    }
                }
                mentionElem[lastMentionIndex] = {
                    _id: index,
                    name: index,
                    type: 'user',
                    username: index
                }
                var mentionString = "@" + mentions.filter(Boolean).join(' @');
                msg = msg.replaceAll(mentionString, "@" + index);
            }
        }

        for (var key in mds[mdIndex].value) {
            if (mds[mdIndex].value[key] === undefined) {
                mds[mdIndex].value.splice(key, 1);
            }
        }

        for (var key in mentionElem) {
            if (mentionElem[key] === undefined) {
                mentionElem.splice(key, 1);
            }
        }
    }

    /**
     * @deprecated
     */
    reverseReplaceTags(text) {
        if (text === undefined) {
            return text;
        }
        for (var inRoomTag in this.inRoomTags) {
            var tagUsersString = '@' + this.inRoomTags[inRoomTag].join(' @');
            if (text.includes(tagUsersString) && this.inRoomTags[inRoomTag].length !== 0) {
                if (!this.inRoomTags[inRoomTag].includes(this.myUsername)) {
                    text = text.replaceAll(tagUsersString, this.userNotInGroupMention.replaceAll('groupName', inRoomTag));
                } else {
                    text = text.replaceAll(tagUsersString, this.userInGroupMention.replaceAll('groupName', inRoomTag));
                }
            }
        }

        return text;
    }

    getTagUserObject(tag) {
        return {
            _id: tag,
            avatarTag: tag,
            name: tag,
            nickname: tag,
            status: "online",
            statusText: "Doing the hard work",
            username: tag
        };
    }

    addMentionClickListener(tagname) {
        $('#mention' + tagname).click(() => {
            $('.js-input-message').each(function () {
                var curPos = this.selectionStart;
                let inputVal = $(this).val();
                $(this).val(inputVal.slice(0, curPos) + tagname + inputVal.slice(curPos));
            });
        });
    }

    updateLoadedMessages() {
        let that = this;
        $('[data-qa-type="message-body"]').each(function () {
            var rawMessage = $(this).html();
            $(this).find('.mention-link').each(function (index) {
                if (that.inRoomTags[$(this).text()] === undefined) {
                    rawMessage = rawMessage.replace(this.outerHTML, '@' + $(this).prop('title'));
                }
            });
            var originalRaw = rawMessage;
            rawMessage = that.reverseReplaceTags(rawMessage);

            if (originalRaw !== rawMessage) {
                $(this).html(rawMessage);
            }
        });
    }
}

class LocalStorageManager {

    static getRawFromLocalStorage(name) {
        return window.localStorage.getItem(name);
    }
    static getFromLocalStorage(name) {
        return JSON.parse(window.localStorage.getItem(name))
    }

    static setToLocalStorage(name, value) {
        window.localStorage.setItem(name, JSON.stringify(value));
    }
}

class CookieManager {
    static getCookie(cookieName) {
        let name = cookieName + "=";
        let ca = document.cookie.split(';');

        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if ((c.indexOf(name)) === 0) {
                return c.substring(name.length);
            }
        }

        return null;
    }
}

class ApiHelper {
    rocketChatApiUrl = window.location.origin + '/api/v1';
    userToken;
    userId;
    constructor(userToken, userId) {
        this.userToken = userToken;
        this.userId = userId;
    }

    async sendApiCallToRawUrl(url) {
        return await fetch(url, {
            "credentials": "include",
            "headers": {
                "X-User-Id": this.userId,
                "X-Auth-Token": this.userToken,
            }
        });
    }

    async sendApiCall(path) {
        const url = this.rocketChatApiUrl + path;

        return await fetch(url, {
            "credentials": "include",
            "headers": {
                "X-User-Id": this.userId,
                "X-Auth-Token": this.userToken,
            }
        });
    }

    async sendPostApiCall(path, body) {
        const url = this.rocketChatApiUrl + path;

        return await fetch(url, {
            "credentials": "include",
            "headers": {
                "X-User-Id": this.userId,
                "X-Auth-Token": this.userToken,
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify(body)
        });
    }
}

class RocketTagsConfigurator {
    configuratorHtmlCode = `<body>
  <h1>Grzojda RocketTags Configurator</h1>
  <div>
    <button id="exportButton">Export config file</button>
    <button id="exitButton">X</button>
</div>
  <div class="container">
    <div class="users">
      <h2>Drag users...</h2>
      <div class="usersContainer">
        FIGURES
      </div>
    </div>
    <div>
      <div id='newTagContainer'>
        <span></span>
        <div>
          <h2>...to tag's containers</h2>
        </div>
        <div>
          <input id="newTagInput" placeholder="New tag's name">
          <a class="button" id="addNewTagButton">Create</a>
        </div>
      </div>
      <div class="tags">
        TAGS
      </div>
    </div>
  </div>
  <style>
    #addNewTagButton {
      display: inline-block;
      color: #212529;
      text-align: center;
      cursor: pointer;
      user-select: none;
      background-color: #588de8;
      border: 1px solid transparent;
      border-radius: 0.25rem;
    }
     #newTagInput::placeholder {
      color: #588de8;
     }
    #newTagInput {
      background-color: white;
      color: black;
     }

    #newTagContainer {
      display: flex;
      justify-content: space-between;
    }

    #newTagContainer>div>* {
      padding: 0.375rem 0.75rem;
    }

    #newTagContainer>* {
      flex: 1;
      text-align: center;
      margin: auto;
    }

    .usersContainer {
      display: flex;
      flex-wrap: wrap;
      max-height: 95vh;
      overflow-y: scroll;
      justify-content: space-between;
    }

    .tags {
      overflow-y: scroll;
      max-height: 95vh;
    }

    body {
      overflow-y: auto;
      max-width: 2200px;
      margin: auto;
      padding: 3rem;
      background: rgb(16, 30, 42);
      /* Make it white if you need */
      color: #fcbe24 !important;
      display: flex;
      flex-wrap: wrap;
      flex-direction: row;
      display: flex;
      justify-content: space-between;
    }

    .container {
      display: flex;
      width: 100%;
      flex-wrap: wrap;
      padding: 2rem;
    }

    .container>div {
      display: flex;
      flex-direction: column;
      width: 50%;
    }

    .tagContainer {
      border: 3px solid lightpink;
      margin: 10px;
      padding: 2rem;
      max-width: 100%;
      overflow: auto;
      min-height: 100px;
      display: flex;
      flex-wrap: wrap;
    }

    .tagContainer>p {
      padding: 0.5rem;
      cursor: context-menu;
    }

    .tagContainer>h3 {
      margin: 1.5rem;
    }

    figure {
      border: lightblue 3px solid;
      padding: 0.5rem;
      min-height: 60px;
      display: flex;
      flex-direction: column;
      align-content: center;
      margin: 0.5rem;
    }

    figure:hover {
      cursor: grab;
    }

    figure img {
      max-width: 40px;
      margin: auto;
      max-height: 40px;
      margin-bottom: 1rem;
    }
  </style>
</body>`;
    configuratorUserTemplate = `<figure aria-label="USERNAME" draggable="true" data-username="USERNAME"><img src="/avatar/USERNAME"><span>USERNAME</span></figure>`;
    configuratorTagTemplate = `<div id="TAGNAME" class="tagContainer"><h3 style="">TAGNAME</h3>ENTRIES</div>`;
    allUsers;
    tags;
    newTagInput;
    addNewTagButton;
    apiCaller;
    command;
    configurationChannelName;

    constructor(command, apiCaller, configurationChannelName) {
        this.command = command;
        this.apiCaller = apiCaller;
        this.configurationChannelName = configurationChannelName;
    }

    async run(tags) {
        await this.loadUsers();
        this.tags = tags;
        $('body').html(this.prepareHtml());
        this.addTagContainerListeners('.tagContainer');
        this.getDOMElements();
        this.addEventListeners();
    }

    waitForCommand(inputNodes, tags) {
        let that = this;
        $(inputNodes).each((key, element) => {
            $(element).keydown(function (event) {
                if (!event.shiftKey && event.keyCode === 13 && event.target.value === that.command) {
                    that.run(tags);
                }
            });
        });
    }

    async getLatestConfiguration(channelId) {
        let path = "/channels.messages?roomId=" + channelId + "&count=1";
        let response = await this.apiCaller.sendApiCall(path);
        let data = await response.json();

        if (data.success) {
            return JSON.parse(data.messages[0].blocks[0].text);
            // data.messages[0].blocks[1].text Gives version string
        }

        return {};
    }

    async exportConfiguration() {
        let channelId = await this.getConfigurationChannel();
        if (channelId === false) {
            channelId = await this.createConfigurationChannel();
        }
        let sendStatus = await this.sendConfiguration(channelId);
    }

    async sendConfiguration(channelId) {
        let path = '/method.call/sendMessage';
        let body = {
            "message": JSON.stringify({
                "method": "sendMessage",
                "params": [
                    {
                        "rid": channelId,
                        "blocks": [
                            {
                                "type": "section",
                                "text": LocalStorageManager.getRawFromLocalStorage('grzojda_rocketTags')
                            },
                            {
                                "type": "section",
                                "text": "Version X" //to be implemented
                            }
                        ]
                    }
                ]
            })
        }

        let response = await this.apiCaller.sendPostApiCall(path, body);
        let data = await response.json();

        return data.success;
    }

    async createConfigurationChannel() {
        let path = '/channels.create';
        let body = { "name": this.configurationChannelName };

        let response = await this.apiCaller.sendPostApiCall(path, body);
        let data = await response.json();

        if (data.success) {
            return data.channel._id;
        }

        return false;
    }

    async getConfigurationChannel() {
        let path = '/rooms.info?roomName=' + this.configurationChannelName;

        let response = await this.apiCaller.sendApiCall(path);
        let data = await response.json();
        if (data.success) {
            return data.room._id;
        }

        return false;
    }

    async loadUsers() {
        let names = [];
        while (true) {
            let offset = names.length;
            let path = '/directory?query={"type":"users","workspace":"local", "limit": "100"}&offset=' + offset;
            let response = await this.apiCaller.sendApiCall(path);
            let data = await response.json();
            names.push(...data.result)
            if (names.length >= data.total) {
                this.allUsers = names.map(a => a.username);
                break;
            }
        }
    }

    prepareHtml() {
        const tagsContainers = this.prepareTagsContainers();
        const userFigures = this.prepareUserFigures();
        let html = this.configuratorHtmlCode.replace('FIGURES', userFigures);
        return html.replace('TAGS', tagsContainers);
    }

    prepareUserFigures() {
        var figures = '';
        for (let username of this.allUsers) {
            figures += this.configuratorUserTemplate.replaceAll('USERNAME', username);
        }

        return figures;
    }

    prepareTagsContainers() {
        var tagsContainers = '';
        if (this.tags == null) {
            return {};
        }
        for (let tag in this.tags) {
            var tagContainer = this.configuratorTagTemplate.replaceAll('TAGNAME', tag);
            var usernames = '';
            for (let username of this.tags[tag]) {
                usernames += '<p class="' + username + '"> ' + username + '</p>';
            }
            tagsContainers += tagContainer.replace('ENTRIES', usernames);
        }

        return tagsContainers;
    }

    addTagContainerListeners(selector) {
        let that = this;
        $(selector).on("drop", function (event) {
            event.preventDefault();
            const username = event.originalEvent.dataTransfer.getData('username');
            that.addUserToTag(username, this.id);
        });
        $(selector).on("dragover", event => {
            event.preventDefault();
        });
    }

    addUserToTag(user, tag) {
        let that = this;
        if (!this.tags[tag].includes(user)) {
            this.tags[tag].push(user);
            LocalStorageManager.setToLocalStorage('grzojda_rocketTags', this.tags);
            $('#' + tag).append('<p class="' + user + '"> ' + user + '</p>');
            $('#' + tag + ' ' + this.jqSelector(user)).on('click', function () {
                that.configuratorRemoveUserFromTag(this.className, this.parentNode.id);
            })
        }
    }

    addTag(tag) {
        if (this.tags[tag] === undefined) {
            var tagContainer = this.configuratorTagTemplate.replaceAll('TAGNAME', tag);
            tagContainer = tagContainer.replace('ENTRIES', '');
            $('.tags').append(tagContainer);
            this.addTagContainerListeners('#' + tag);
            this.tags[tag] = [];
            LocalStorageManager.setToLocalStorage('grzojda_rocketTags', this.tags);
        }
    }

    addEventListeners() {
        let that = this;
        this.addNewTagButton.on('click', () => {
            if (this.newTagInput.val() !== '') {
                this.addTag(this.newTagInput.val());
                this.newTagInput.val('');
            }
        });

        $('#exportButton').on('click', () => {
            that.exportConfiguration();
        });

        $('#exitButton').on('click', () => {
            location.reload();
        })

        $('figure').on('dragstart', function (event) {
            event.originalEvent.dataTransfer.setData('username', $(this).data('username'));
        });

        $('.tags p').on('click', function () {
            that.configuratorRemoveUserFromTag(this.className, this.parentNode.id);
        });
    }

    configuratorRemoveUserFromTag(user, tag) {
        var index = this.tags[tag].indexOf(user);
        this.tags[tag].splice(index, 1);
        LocalStorageManager.setToLocalStorage('grzojda_rocketTags', this.tags);
        $('#' + tag + ' ' + this.jqSelector(user)).remove();
    }

    getDOMElements() {
        this.newTagInput = $('#newTagInput');
        this.addNewTagButton = $('#addNewTagButton');
    }

    jqSelector(user) {
        return "." + user.replace(/(:|\.|\[|\]|,)/g, "\\$1");
    }
}

class XMLHelper {
    onStateChange(event) {
        if (event.target.response !== undefined) {
            var response = JSON.parse(event.target.response);
            if (response.message !== undefined) {
                //add rocketTags to popup
                var message = JSON.parse(response.message);
                if (globalSendMessages[message.id] !== undefined) {
                    var searchQuery = globalSendMessages[message.id];

                    var tagUsers = rocketTags.searchForTags(searchQuery);
                    var originalResult = message.result.users;
                    if (originalResult !== undefined) {
                        message.result.users.push(...tagUsers)
                    } else {
                        message.result = {
                            users: tagUsers
                        }
                    }

                    message = JSON.stringify(message);
                    response.message = message;

                    Object.defineProperty(event.target, 'response', {
                        writable: true
                    });
                    Object.defineProperty(event.target, 'responseText', {
                        writable: true
                    });
                    event.target.response = JSON.stringify(response);
                    event.target.responseText = JSON.stringify(response);
                    globalSendMessages.splice(message.id, 1);
                } else if (message.result !== undefined) {
                    //change usernames to tags in downloaded messages
                    if (message.result.messages !== undefined) {
                        var messages = message.result.messages;
                        for (var key in messages) {
                            var originalResult = messages[key];
                            var mentions = [];
                            mds = originalResult.md;
                            mentionElem = originalResult.mentions;
                            msg = originalResult.msg;

                            //foreach paragraph
                            for (var index in mds) {
                                //foreach object in paragraph
                                var mdValue = mds[index].value;
                                for (var oindex in mdValue) {
                                    if (mdValue[oindex].type === "MENTION_USER") {
                                        mentions[oindex] = mdValue[oindex].value.value;
                                    } else if (mdValue[oindex].type !== "PLAIN_TEXT" || mdValue[oindex].value != " ") {
                                        rocketTags.reverseSearchForTags(mentions, index)
                                        mentions = [];
                                    }
                                }
                                if (mentions.length != 0) {
                                    rocketTags.reverseSearchForTags(mentions, index);
                                    mentions = [];
                                }
                            }
                            originalResult.md = mds;
                            originalResult.mentions = mentionElem;
                            originalResult.msg = msg;
                            message.result.messages[key] = originalResult;
                        }
                        message = JSON.stringify(message);
                        response.message = message;

                        Object.defineProperty(event.target, 'response', {
                            writable: true
                        });
                        Object.defineProperty(event.target, 'responseText', {
                            writable: true
                        });
                        event.target.response = JSON.stringify(response);
                        event.target.responseText = JSON.stringify(response);
                    }
                }
            }
        }
    }
}

var mds = '';
var mentionElem = '';
var msg = '';
var globalSendMessages = [];
const ApiCaller = new ApiHelper(CookieManager.getCookie('rc_token'), CookieManager.getCookie('rc_uid'));
const rocketTagsConfigurator = new RocketTagsConfigurator(rocketTagsConfiguratorCommand, ApiCaller, configurationChannelName);
const rocketTags = new RocketTags(ApiCaller, rocketTagsConfigurator, configurationEditors, configurationSyncIntervalInSec);
const xmlHelper = new XMLHelper();
var oldOpen = XMLHttpRequest.prototype.open;
var oldSend = XMLHttpRequest.prototype.send;

// XHR open and send methods are overwritten so we can "inject" our "users"
XMLHttpRequest.prototype.open = function () {
    // when an XHR object is opened, add a listener for its load events
    this.addEventListener("load", xmlHelper.onStateChange);
    // run the real `open`
    oldOpen.apply(this, arguments);
}

XMLHttpRequest.prototype.send = function () {
    var parsedArguments = JSON.parse(arguments[0])
    if (parsedArguments) {
      var message = JSON.parse(parsedArguments.message);
    var messageMethod = message.method;
    if (messageMethod === 'spotlight') {
        var messageId = message.id;
        var queryString = message.params[0];
        globalSendMessages[messageId] = queryString;
    }
    }
    
    oldSend.apply(this, arguments);
}

rocketTags.run();