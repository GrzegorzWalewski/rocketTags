/**
* admin role name - probably You should leave it as it is ;)
* */
const adminRole = 'admin';
/**
 * channel on which configuration will be sent
 * If it does not exist we'll create it for You, no worries
 * */
const configurationChannelName = 'grzojdaRocketTags';
/**
 * Time after which we will be checking for new configuration.
 * Set to 0 to check for updates every time user refreshes the page (not recommended)
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
    userNotInGroupMention = '<a class="mention-link mention-link--user" data-username="groupName" data-title="groupName" data-tooltip="userList">groupName</a>';
    userInGroupMention = '<a class="mention-link mention-link--all mention-link--group" data-group="groupName" data-tooltip="userList">groupName</a>';
    isAdmin = false;

    constructor(apiCaller, rocketTagsConfigurator, adminRole, configurationSyncIntervalInSec) {
        this.rocketTagsConfigurator = rocketTagsConfigurator;
        this.apiCaller = apiCaller;
        this.adminRole = adminRole;
        this.configurationSyncIntervalInSec = configurationSyncIntervalInSec;
    }

    async run() {
        console.log('Grzojda RocketTags: Start');
        await this.loadUsername();
        await this.loadTags();
        await this.loadRoomMembers();
        this.addEventListeners();
        if (this.isAdmin) {
            this.rocketTagsConfigurator.createButton(this.tags);
        }
    }

    addEventListeners() {
        let that = this;

        window.addEventListener('new-message', function (e) {
            if (document.getElementById(e.detail._id) {
                document.getElementById(e.detail._id).getElementsByClassName('message-body-wrapper')[0].innerHTML = that.reverseReplaceTags(document.getElementById(e.detail._id).getElementsByClassName('message-body-wrapper')[0].innerHTML);
        }
            });
    }

    replaceTags(text) {
        for (var inRoomTag in this.inRoomTags) {
            if (this.inRoomTags[inRoomTag].length > 1) {
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

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    async loadUsername() {
        var path = '/users.info?userId=' + CookieManager.getCookie('rc_uid');
        let response = await this.apiCaller.sendApiCall(path);
        let data = await response.json();
        this.myUsername = data.user.username;
        if (!data.user.roles.includes(this.adminRole)) {
            this.isAdmin = true;
        }
    }

    async loadRoomMembers() {
        this.roomMembers = [];
        let names = [];

        var pathName = window.location.pathname;
        this.roomType = pathName.substring(pathName.indexOf('/') + 1, pathName.indexOf('/', 1));
        var activeRoom = pathName.substring(
            pathName.indexOf(this.roomType) + this.roomType.length + 1
        );

        if (activeRoom.includes('/')) {
            activeRoom = activeRoom.substring(0, activeRoom.indexOf('/'));
        }

        this.activeRoom = activeRoom;
        if (this.roomType === 'direct') {
                return;
        }

        this.roomType += 's';

        while (true) {
            let offset = names.length;
            let path = "/" + this.roomType + ".members?roomName=" + this.activeRoom + "&offset=" + offset + "&count=100";
            let response = await this.apiCaller.sendApiCall(path);
            let data = await response.json();
            names.push(...data.members);

            if (names.length >= data.total) {
                this.roomMembers = names.map(a => a.username);
                break;
            }
        }
        console.log(this.roomMembers);
    }

    async generateInRoomTags() {
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

    async searchForTags(searchQuery = '') {
        let that = this;
        searchQuery = searchQuery.toLowerCase();
        var result = [];
        var inRoomTags = await this.generateInRoomTags();
        for (var inRoomTag in inRoomTags) {
            var lowerCaseInRoomTag = inRoomTag.toLowerCase();
            if (inRoomTags[inRoomTag].length > 1 && (lowerCaseInRoomTag.includes(searchQuery) || searchQuery.length === 0)) {
                result.push(this.getTagUserObject(inRoomTag, inRoomTags[inRoomTag]));
            }
        }
        return result;
    }

    async reverseSearchForTags(mentions, mdIndex) {
        var inRoomTags = await this.generateInRoomTags();
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
                console.log(mds);
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
                    username: inRoomTags[index].join("_-_")
                }
                var mentionString = "@" + mentions.filter(Boolean).join(' @');
                msg = msg.replaceAll(mentionString, "@" + inRoomTags[index].join("_-_"));
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

    reverseReplaceTags(text) {
        if (text === undefined) {
            return text;
        }
        for (var inRoomTag in this.inRoomTags) {
            var tagUsersString = '@' + this.inRoomTags[inRoomTag].join(' @');
            if (text.includes(tagUsersString) && this.inRoomTags[inRoomTag].length > 1) {
                if (!this.inRoomTags[inRoomTag].includes(this.myUsername)) {
                    text = text.replaceAll(tagUsersString, this.userNotInGroupMention.replaceAll('groupName', inRoomTag));
                } else {
                    text = text.replaceAll(tagUsersString, this.userInGroupMention.replaceAll('groupName', inRoomTag));
                }
                text = text.replaceAll('userList', text);
            }
        }

        return text;
    }

    getTagUserObject(tag, users) {
        return {
            _id: tag,
            avatarTag: tag,
            name: users.toString(),
            nickname: "GrzojdaRocketTags",
            status: "online",
            statusText: "Doing the hard work",
            username: tag
        };
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
     <button id="exportButton" class="button">Export config file</button>
     <button id="exitButton" type="button" class="rcx-box rcx-box--full rcx-box--animated rcx-button--tiny-square rcx-button--square rcx-button--ghost rcx-button  rcx-button-group__item rcx-css-ue04py" data-title="Close" data-tooltip="Close"><i aria-hidden="true" class="rcx-box rcx-box--full rcx-icon--name-cross rcx-icon rcx-css-4pvxx3"></i></button>
 </div>
   <div class="container">
     <div class="users">
     <div style="text-align: center;margin-bottom: 2rem;border-bottom: 3px dashed;padding-bottom: 2rem;"><label for="userSearch" style="padding: 0.375rem 0.75rem;">Search: </label><input id="userSearch" type="text" class="" style="padding: 0.375rem 0.75rem;"></div>
       <div id="usersContainer" class="usersContainer">
         FIGURES
       </div>
     </div>
     <div>
       <div id="newTagContainer" style="margin-bottom: 2rem;margin-bottom: 2rem;border-bottom: 3px dashed;padding-bottom: 2rem;">
         <div>
         <label for="newTagInput">Create New Tag: </label>
           <input id="newTagInput" placeholder="New tag's name">
           <a class="button" id="addNewTagButton">Create</a>
         </div>
       </div>
       <div class="tags">
       <div style="border: 3px solid lightblue;margin: 10px;padding: 2rem;max-width: 100%;overflow: auto;min-height: 100px;display: flex;flex-wrap: wrap;position: relative;"><h4 style="position: absolute;top: 0;left: 50%;transform: translateX(-50%);z-index: 9999;padding-left: 1rem;padding-right: 1rem;color: black;background-color: lightblue;">
 info box
 </h4>
 <ul style="list-style: disclosure-closed;">
 <li>You can remove user from group, by click on his/her username.</li>
 <li>To remove group use red X button at the right of group-box</li>
 <li>After You finish grouping, don't forget to use Export config file button, if You don't do it Your configuration will be overwritten after ~ 6h</li>
 <li>To exit use red button at the top right of page</li>
 <li>To add user to group drag user-box inside of group-box</li>
   </ul></div>
         TAGS
       </div>
     </div>
   </div>
   <style>
     .button {
       display: inline-block;
       color: #212529;
       text-align: center;
       cursor: pointer;
       user-select: none;
       background-color: #588de8;
       border: 1px solid transparent;
       border-radius: 0.25rem;
       padding: 0.375rem 0.75rem;
     }

     .alert {
       position: fixed;
       top: 0;
       left: 50%;
       transform: translateX(-50%);
       z-index: 9999;
       padding: 2rem;
       padding-left: 13rem;
       padding-right: 13rem;
       color: #4F8A10;
       background-color: #DFF2BF;
     }
     .error{
       color: #D8000C;
       background-color: #FFBABA;
     }

     #exportButton {
       background-color: lightgreen;
     }
      input::placeholder {
       color: currentColor;
      }
     input {
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
       max-height: 75vh;
       overflow-y: scroll;
       justify-content: space-between;
     }

     .tags {
       overflow-y: scroll;
       max-height: 75vh;
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
       height: unset;
     }

     i {
       font-style: normal;
       font-family: RocketChat;
       border: 1px solid red;
       margin: 2rem;
       padding: 1rem;
       color: red;
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
       border: 5px dashed;
       padding: 1.5rem;
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
       position: relative;
     }

     .tagContainer>p {
       padding: 0.5rem;
       cursor: context-menu;
     }

     .tagContainer>h3 {
       margin: 1.5rem;
     }

     .tagContainer>button {
       margin-left: auto;
       top: 2rem;
       position: absolute;
       right: 0;
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

     h1 {
       font-size: xxx-large;
     }
   </style>
 </body>`;
    configuratorUserTemplate = `<figure aria-label="USERNAME" draggable="true" data-username="USERNAME"><img src="/avatar/USERNAME"><span>USERNAME</span></figure>`;
    configuratorTagTemplate = `<div id="TAGNAME" class="tagContainer"><h3 style="">TAGNAME</h3>ENTRIES<button type="button" class="rcx-box rcx-box--full rcx-box--animated rcx-button--tiny-square rcx-button--square rcx-button--ghost rcx-button  rcx-button-group__item rcx-css-ue04py" data-title="Close" data-tooltip="Close" style=""><i aria-hidden="true" class="rcx-box rcx-box--full rcx-icon--name-cross rcx-icon rcx-css-4pvxx3"></i></button></div>`;
    allUsers;
    tags;
    newTagInput;
    addNewTagButton;
    apiCaller;
    configurationChannelName;
    searchQuery = '';

    constructor(apiCaller, configurationChannelName) {
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

    createButton(tags) {
        let that = this;
        // Create a new button element
        var button = document.createElement("button");
        button.innerHTML = `<i aria-hidden="true" class="rcx-box rcx-box--full rcx-icon--name-members rcx-icon rcx-css-4pvxx3"></i> GRC <i aria-hidden="true" class="rcx-box rcx-box--full rcx-icon--name-members rcx-icon rcx-css-4pvxx3"></i>`;

        // Set the button's ID so we can style it with CSS
        button.id = "myButton";

        // Add the specified classes to the button
        button.classList.add("rcx-box", "rcx-box--full", "rcx-box--animated", "rcx-button--primary", "rcx-button", "rcx-button-group__item");

        // Append the button to the beginning of the body
        document.body.insertBefore(button, document.body.firstChild);

        // Add CSS styles to position and center the button
        var style = document.createElement('style');
        style.innerHTML = `
             #myButton {
                 position: fixed;
                 top: 0;
                 left: 50%;
                 transform: translateX(-50%);
                                       z-index: 9999;
                                       }
         `;
        document.head.appendChild(style);

        // Add an event listener to the button that listens for the click event
        button.addEventListener("click", function () {
            that.run(tags);
        });
    }

    createAlert(message, type) {
        let that = this;
        var alert = document.createElement('div');
        var alertId = document.timeline.currentTime.toFixed() + 'alert';
        alert.innerText = message;
        alert.classList.add("alert", type);
        alert.id = alertId;
        document.body.insertBefore(alert, document.body.firstChild);
        setTimeout(() => {
            $('#' + alertId).hide("slow");
        }, 3500)
    }

    async getLatestConfiguration(channelId) {
        let path = "/channels.messages?roomId=" + channelId + "&count=1";
        let response = await this.apiCaller.sendApiCall(path);
        let data = await response.json();

        if (data.success && data.messages.length > 0 && data.messages[0].blocks.length > 0) {
            return JSON.parse(data.messages[0].blocks[0].text);
        }

        return {};
    }

    async exportConfiguration() {
        let channelId = await this.getConfigurationChannel();
        if (channelId === false) {
            channelId = await this.createConfigurationChannel();
        }
        let sendStatus = await this.sendConfiguration(channelId);

        if (sendStatus) {
            this.createAlert('✅ Configuration exported successfully, You may now close configurator ✅', 'success');
        } else {
            this.createAlert('❌ There was an error while trying to export configuration, check console, or ask developer for help ❌', 'error');
        }
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

        return response.ok;
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
        const userFigures = this.prepareUserFigures(this.allUsers);
        let html = this.configuratorHtmlCode.replace('FIGURES', userFigures);
        return html.replace('TAGS', tagsContainers);
    }

    prepareUserFigures(users) {
        var figures = '';
        for (let username of users) {
            figures += this.configuratorUserTemplate.replaceAll('USERNAME', username);
        }

        return figures;
    }

    prepareTagsContainers() {
        var tagsContainers = '';
        console.log(this.tags);
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
        $(selector + ' button').on('click', function (event) {
            that.removeTag(this.parentElement.id);
        });
    }

    addUserToTag(user, tag) {
        let that = this;
        if (!this.tags[tag].includes(user)) {
            this.tags[tag].push(user);
            LocalStorageManager.setToLocalStorage('grzojda_rocketTags', this.tags);
            $('<p class="' + user + '"> ' + user + '</p>').insertBefore($('#' + tag + ' button'));
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

    removeTag(tag) {
        if (this.tags[tag] !== undefined) {
            console.log(this.tags[tag]);
            if (this.tags[tag].length > 0) {
                console.log('ups');
                if (!confirm("Are You sure You wanna remove " + tag + " tag?\nThere are " + this.tags[tag].length + " people assigned to this tag.")) {
                    return;
                }
            }
            delete this.tags[tag];
            document.getElementById(tag).remove()
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

        $('#userSearch').on("input", function () {
            that.searchQuery = this.value;
            if (that.searchQuery.length == 0) {
                var result = that.allUsers;
            } else {
                var result = that.allUsers.filter(function (element) {
                    return that.searchCheck(element, that.searchQuery);
                });
            }

            $('#usersContainer').html(that.prepareUserFigures(result));
            //re-add eventListener as they are re-created
            $('figure').on('dragstart', function (event) {
                event.originalEvent.dataTransfer.setData('username', $(this).data('username'));
            });
        });
    }

    searchCheck(username, searchQuery) {
        let that = this;
        return (username.includes(searchQuery));
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
    async onStateChange(event) {
        if (event.target.response !== undefined) {
            var response = JSON.parse(event.target.response);
            if (response.message !== undefined) {
                //add rocketTags to popup
                var message = JSON.parse(response.message);
                if (globalSpotlightMessages[message.id] !== undefined) {
                    var searchQuery = globalSpotlightMessages[message.id];

                    var tagUsers = await rocketTags.searchForTags(searchQuery);
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
                    globalSpotlightMessages.splice(message.id, 1);
                } else if (message.result !== undefined) {
                    //change usernames to tags in downloaded messages
                    if (message.result.messages !== undefined) {
                        await rocketTags.loadRoomMembers();
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
                                console.log(mds[index]);
                                if (mds[index] === undefined) {
                                    continue;
                                }
                                var mdValue = mds[index].value;
                                for (var oindex in mdValue) {
                                    if (mdValue[oindex].type === "MENTION_USER") {
                                        mentions[oindex] = mdValue[oindex].value.value;
                                    } else if (mdValue[oindex].type !== "PLAIN_TEXT" || mdValue[oindex].value != " ") {
                                        await rocketTags.reverseSearchForTags(mentions, index)
                                        mentions = [];
                                    }
                                }
                                if (mentions.length > 1) {
                                    await rocketTags.reverseSearchForTags(mentions, index);
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
var globalSpotlightMessages = [];
const ApiCaller = new ApiHelper(CookieManager.getCookie('rc_token'), CookieManager.getCookie('rc_uid'));
const rocketTagsConfigurator = new RocketTagsConfigurator(ApiCaller, configurationChannelName);
const rocketTags = new RocketTags(ApiCaller, rocketTagsConfigurator, adminRole, configurationSyncIntervalInSec);
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
    try {
        var parsedArguments = JSON.parse(arguments[0])
    } catch (error) {
        var parsedArguments = false;
    }
    if (parsedArguments != null && parsedArguments != false) {
        if (parsedArguments.message)
        {
        var message = JSON.parse(parsedArguments.message);
        var messageMethod = message.method;
        if (messageMethod === 'spotlight') {
            var messageId = message.id;
            var queryString = message.params[0];
            globalSpotlightMessages[messageId] = queryString;
        } else if (messageMethod === 'sendMessage') {
            var queryString = message.params[0];
            queryString.msg = rocketTags.replaceTags(queryString.msg)
            message.params[0] = queryString;
            message = JSON.stringify(message);
            parsedArguments.message = message;
            arguments[0] = JSON.stringify(parsedArguments);
        }
        }
    }
    oldSend.apply(this, arguments);
}

rocketTags.run();