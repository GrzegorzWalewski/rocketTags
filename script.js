(function () {
    'use strict';

    /**
     * IT IS SUPER IMPORTANT TO SET THIS
     **/
    var rocketTagsConfigurationFileUrl = 'YOUR_CONFIGURATION_URL';


    console.log('START');
    var configuratorHtmlCode = `<body>
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
    var configuratorUserTemplate = `<figure aria-label="USERNAME" draggable="true" data-username="USERNAME"><img src="/avatar/USERNAME"><span>USERNAME</span></figure>`;
    var configuratorTagTemplate = `<div id="TAGNAME" class="tagContainer"><h3 style="">TAGNAME</h3>ENTRIES</div>`;
    var userNotInGroupMention = '<a class="mention-link mention-link--user" data-username="groupName" data-title="groupName" data-tooltip="groupName">groupName</a>';
    var userInGroupMention = '<a class="mention-link mention-link--all mention-link--group" data-group="groupName">groupName</a>';
    var tagMentionTemplate = `<div id="mentionTAGNAME" onclick="" class="popup-item" data-id="TAGNAME"><div class="popup-user" title="">
<div class="popup-user-name"><strong>TAGNAME</strong> Notify TAGNAME in this room</div>
<div class="popup-user-notice">Added by Grzojda's RocketTags</div>
</div></div>`;
    var rocketChatApiUrl = window.location.origin + '/api/v1';
    // This url has to link to file shared in rocketchat (can be in direct messages)

    var tags = JSON.parse(window.localStorage.getItem('grzojda_rocketTags'));
    var users = JSON.parse(window.localStorage.getItem('grzojda_rocketTags_users'));
    if (tags === null || tags === []) {
        tags = {};
    }
    function addMentionToInput(mention) {
        var input = $('.js-input-message').get(0)
        var curPos = input.selectionStart;
        let inputVal = $(input).val();
        $(input).val(inputVal.slice(0, curPos) + mention + inputVal.slice(curPos));
    }

    function getCookie(cookieName) {
        var name = cookieName + "=";
        var ca = document.cookie.split(';');

        for (var i = 0; i < ca.length; i++) {
            var c = ca[i].trim();
            if ((c.indexOf(name)) == 0) {
                return c.substr(name.length);
            }

        }

        return null;
    }

    function replaceTags(inRoomTags, text) {
        for (var inRoomTag in inRoomTags) {
            if (inRoomTags[inRoomTag].length !== 0) {
                text = text.replaceAll('@' + inRoomTag, '@' + inRoomTags[inRoomTag].join(' @') + ' ');
            }
        }
        return text;
    }

    function reverseReplaceTags(inRoomTags, text) {
        if (text === undefined) {
            return text;
        }
        var myUsername = getMyUsername();
        for (var inRoomTag in inRoomTags) {
            var tagUsersString = '@' + inRoomTags[inRoomTag].join(' @');
            if (text.includes(tagUsersString) && inRoomTags[inRoomTag].length !== 0) {
                if (!inRoomTags[inRoomTag].includes(myUsername)) {
                    text = text.replaceAll(tagUsersString, userNotInGroupMention.replaceAll('groupName', inRoomTag));
                } else {
                    text = text.replaceAll(tagUsersString, userInGroupMention.replaceAll('groupName', inRoomTag));
                }
            }
        }

        return text;
    }

    function* entries(obj) {
        for (let key of Object.keys(obj)) {
            yield [key, obj[key]];
        }
    }

    function getMyUsername() {
        return $($('figure[data-username]')[0]).data('username');
    }

    async function loadConfiguration() {
        var userToken = getCookie('rc_token')
        var userId = getCookie('rc_uid')
        const response = await fetch(rocketTagsConfigurationFileUrl, {
            "credentials": "include",
            "headers": {
                "X-User-Id": userId,
                "X-Auth-Token": userToken,
            }
        })
        const data = await response.json();

        return data;
    }

    async function loadUsers(names) {
        var userToken = getCookie('rc_token')
        var userId = getCookie('rc_uid')
        var roomId = $('main').attr('data-qa-rc-room');
        var offset = names.length;
        const response = await fetch(rocketChatApiUrl + '/directory?query={"type":"users","workspace":"local", "limit": "100", "offset": "' + offset + '"}', {// {"type":"users", "limit":"100"}
            "credentials": "include",
            "headers": {
                "X-User-Id": userId,
                "X-Auth-Token": userToken,
            }
        })
        const data = await response.json();
        names.push(...data.result)
        if (names.length < data.total) {
            return loadUsers(names)
        } else {
            var usernames = names.map(a => a.username);
            return usernames;
        }
    }

    async function loadChannelMembers(names) {
        var userToken = getCookie('rc_token')
        var userId = getCookie('rc_uid')
        var roomId = $('main').attr('data-qa-rc-room');
        var offset = names.length;
        var type = 'channels';
        if (window.location.pathname.includes('group')) {
            type = 'groups';
        } else if (window.location.pathname.includes('direct')) {
            return [];
        }
        const response = await fetch(rocketChatApiUrl + "/" + type + ".members?roomId=" + roomId + "&offset=" + offset + "&count=100", {
            "credentials": "include",
            "headers": {
                "X-User-Id": userId,
                "X-Auth-Token": userToken,
            }
        })
        const data = await response.json();
        names.push(...data.members)
        if (names.length < data.total) {
            return loadChannelMembers(names)
        } else {
            var usernames = names.map(a => a.username);
            return usernames;
        }
    }

    function generateInRoomTags(roomMembers) {
        var inRoomTags = {};
        if (tags == null) {
            return {};
        }
        for (let [key, value] of entries(tags)) {
            inRoomTags[key] = [];
            for (let username of tags[key]) {
                if (roomMembers.includes(username)) {
                    inRoomTags[key].push(username);
                }
            }
        }
        return inRoomTags;
    }

    function downloadConfiguration() {
        var content = window.localStorage.getItem('grzojda_rocketTags');
        var mimeType = 'application/json';
        var filename = 'GrzojdaRocketTagsConfiguration.json';
        const a = document.createElement('a') // Create "a" element
        const blob = new Blob([content], {type: mimeType}) // Create a blob (file-like object)
        const url = URL.createObjectURL(blob) // Create an object URL from blob
        a.setAttribute('href', url) // Set "a" element link
        a.setAttribute('download', filename) // Set download filename
        a.click() // Start downloading
    }

    function addMentionClickListener(tagname)
    {
        $('#mention' + tagname).click(function () {
            var input = $('.js-input-message').get(0)
            var curPos = input.selectionStart;
            let inputVal = $(input).val();
            $(input).val(inputVal.slice(0, curPos) + tagname + inputVal.slice(curPos));
        })
    }

    function getTagMention(inRoomTag) {
        return tagMentionTemplate.replaceAll('TAGNAME', inRoomTag)
    }

    async function run() {
        var input = document.getElementsByClassName('js-input-message')[0];
        input.onkeydown = function (e) {
            if (!e.shiftKey && e.keyCode === 13 && $('.message-popup-items').get(0) === undefined) {
                if (input.value === 'grzojda_rocketTags_configurator') {
                    input.value = '';
                    runConfigurator();
                }
            }
        }

        if (users == null) {
            users = await loadUsers([]);
            window.localStorage.setItem('grzojda_rocketTags_users', JSON.stringify(users));
        }

        if (rocketTagsConfigurationFileUrl === 'YOUR_CONFIGURATION_URL') {
            return;
        }
        tags = await loadConfiguration();
        window.localStorage.setItem('grzojda_rocketTags', JSON.stringify(tags));

        var channelMembers = [];
        channelMembers = await loadChannelMembers(channelMembers);
        var inRoomTags = generateInRoomTags(channelMembers);
        MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

        var observer = new MutationObserver(function (mutations, observer) {
            for (var mutation of mutations) {
                for (var addedNode of mutation.addedNodes) {
                    var messageNode = $(addedNode).find('[data-qa-type="message-body"]').get(0);
                    var rawMessage = $(messageNode).html();
                    $(messageNode).find('.mention-link').each(function (index) {
                        if (inRoomTags[$(this).text()] === undefined) {
                            rawMessage = rawMessage.replace(this.outerHTML, '@' + $(this).prop('title'));
                        }
                    })
                    rawMessage = reverseReplaceTags(inRoomTags, rawMessage);

                    if ($(messageNode).html() !== rawMessage) {
                        $(messageNode).html(rawMessage);
                    }
                }
            }
        });

        observer.observe(document.getElementsByTagName('ul')[0], {
            childList: true,
        });
        var mentionOptions = new MutationObserver(function (mutations, observer) {
            for (var mutation of mutations) {
                for (var addedNode of mutation.addedNodes) {
                    var popupMessageItems = $(addedNode).find('.message-popup-items').get(0);
                    if (popupMessageItems != undefined) {
                        for (var inRoomTag in inRoomTags) {
                            if (inRoomTags[inRoomTag].length != 0) {
                                $(popupMessageItems).append(getTagMention(inRoomTag));
                                addMentionClickListener(inRoomTag);
                            }
                        }
                    }
                }
            }

        });

        mentionOptions.observe(document.getElementsByClassName('message-popup-results')[0], {
            childList: true,
        });


        $('[data-qa-type="message-body"]').each(function () {
            var rawMessage = $(this).html();
            console.log(rawMessage);
            $(this).find('.mention-link').each(function (index) {
                if (inRoomTags[$(this).text()] === undefined) {
                    rawMessage = rawMessage.replace(this.outerHTML, '@' + $(this).prop('title'));
                }
            })
            rawMessage = reverseReplaceTags(inRoomTags, rawMessage);

            if ($(this).html() !== rawMessage) {
                $(this).html(rawMessage);
            }
        });

        input.onkeydown = function (e) {
            if (!e.shiftKey && e.keyCode === 13 && $('.message-popup-items').get(0) == undefined) {
                input.value = replaceTags(inRoomTags, input.value);
            }
        }
    }

    function configuratorGenerateTagsContainers() {
        var tagsContainers = '';
        if (tags == null) {
            return {};
        }
        for (let [key, values] of entries(tags)) {
            var tagContainer = configuratorTagTemplate.replaceAll('TAGNAME', key);
            var usernames = '';
            for (var value of values) {
                usernames += '<p class="' + value + '"> ' + value + '</p>';
            }
            tagsContainers += tagContainer.replace('ENTRIES', usernames);
        }
        return tagsContainers;
    }

    function addUserToTag(user, tag) {
        if (!tags[tag].includes(user)) {
            tags[tag].push(user);
            window.localStorage.setItem('grzojda_rocketTags', JSON.stringify(tags));
            $('#' + tag).append('<p class="' + user + '"> ' + user + '</p>');
            $('#' + tag + ' ' + jqSelector(user)).on('click', function () {
                configuratorRemoveUserFromTag(this.className, this.parentNode.id);
            })
        }
    }

    function addTag(tag) {
        if (tags[tag] == undefined) {
            var tagContainer = configuratorTagTemplate.replaceAll('TAGNAME', tag);
            tagContainer = tagContainer.replace('ENTRIES', '');
            $('.tags').append(tagContainer);
            addTagContainerListeners('#' + tag);
            tags[tag] = [];
            window.localStorage.setItem('grzojda_rocketTags', JSON.stringify(tags));
        }
    }

    function configuratorRemoveUserFromTag(user, tag) {
        var index = tags[tag].indexOf(user);
        tags[tag].splice(index, 1);
        window.localStorage.setItem('grzojda_rocketTags', JSON.stringify(tags));
        $('#' + tag + ' ' + jqSelector(user)).remove();
    }

    function jqSelector(user) {
        return "." + user.replace(/(:|\.|\[|\]|,)/g, "\\$1");
    }

    function addTagContainerListeners(selector) {
        $('.tagContainer').on("drop", function (event) {
            event.preventDefault();
            const username = event.originalEvent.dataTransfer.getData('username');
            addUserToTag(username, this.id);
        });
        $('.tagContainer').on("dragover", function (event) {
            event.preventDefault();
        });
    }

    async function runConfigurator() {
        var figures = '';
        for (let [key, username] of entries(users)) {
            figures += configuratorUserTemplate.replaceAll('USERNAME', username);
        }
        var tagsContainers = configuratorGenerateTagsContainers();

        var html = configuratorHtmlCode.replace('FIGURES', figures);
        html = html.replace('TAGS', tagsContainers);

        $('body').html(html);

        addTagContainerListeners('.tagContainer')

        $('#addNewTagButton').on('click', function () {
            if ($('#newTagInput').val() != '') {
                addTag($('#newTagInput').val());
                $('newTagInput').val('');
            }
        });

        $('#exportButton').on('click', function () {
            downloadConfiguration();
        });

        $('#exitButton').on('click', function () {
            location.reload();
        })

        $('figure').on('dragstart', function (event) {
            event.originalEvent.dataTransfer.setData('username', $(this).data('username'));
        });

        $('.tags p').on('click', function () {
            configuratorRemoveUserFromTag(this.className, this.parentNode.id);
        })
    }

    var waitForMainNode = setInterval(function () {
        console.log('waiting...');
        if ($('.message-popup-results').length > 0) {
            console.log('rendered; running script');
            run();
            $('aside').on('click', function () {
                var waitForMainNode = setInterval(function () {
                    console.log('waiting...');
                    if ($('.message-popup-results').length > 0) {
                        console.log('rendered; running script');
                        clearInterval(waitForMainNode);
                        run();
                    }
                }, 1000);
            });
            clearInterval(waitForMainNode);
        }
    }, 1000)
})();