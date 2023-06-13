const {saveUserToken, getAdminToken, saveBot, getBot} = require('./db');


const _hookurl = new WeakMap();

class TaigaMatter {
    constructor(hookUrl, taiga, matter) {
        _hookurl.set(this, hookUrl);
        this.taiga = taiga;
        this.matter = matter;
    }
    /**
     * performs a login to Mattermost and Taiga to get their authorization headers.
     * @returns a promise that resolves when taiga and mattermost authorization headers are fethed.
     */
    getAuthorized() {
        const taigaAuthP = this.taiga.getAuthToken();
        const matterAuthP = this.matter.getAuthToken();
        return Promise.all([taigaAuthP, matterAuthP]);
    }

    /**
     * Refreshes taiga authorization headers (authorization, refresh) every 'interval' seconds.
     * @param {Number} interval in seconds
     */
    refreshAuth(interval) {
        interval = interval * 1000; // Converting Second to miliSeconds
        setInterval(() => {
            this.taiga.refreshToken(this.taiga.auth_key, this.taiga.refresh);
        }, interval);
    }

    /**
     * Check to see if Mattermost admin user has an AccessToken. If not, creates one, saves it in DB
     * and returns it. If Admin Access Token exists, just gets it from DB and returns it.
     * @returns Mattermost admin Access Token
     */
    async checkAdminAccessToken() {
        const tokens = await this.matter.getUserAccessTokens(this.matter.auth_token, this.matter.admin_token);
        let hasAccessToken = tokens[0];
        if (!hasAccessToken) {
            let description = 'Work with Mattermost API';
            const accessToken = await this.matter.createAccessToken(this.matter.auth_token, this.matter.admin_token, description);
            await saveUserToken(accessToken[0], accessToken[1], accessToken[2]);
            const token = await getAdminToken();
            return token;
        }
        const token = await getAdminToken()
        return token;
    }

    /**
     * Checks to see if taigaBot exists (first time run).
     * If not, creates taigaBot, adds it to the team
     * creates a Access Token for it, saves the token to DB and returns the token.
     * If taigaBot exists, Checks to see if it has access token. If it has, then
     * the Access Token is retreived from DB and is returned, Otherwise an Access Token
     * is created for it, saved in DB and will be returned.
     * @param {String} mAT Mattermost Admin Access Token
     * @returns botAccessToken
     */
    async checkBot(mAT) {
        await this.matter.getBots(mAT)
        // This peice requires fresh Mattermost install to test!
        if (!this.matter.hasBot) {
            const taigaBot = await this.matter.createBot(mAT);
            let taigaBotId = JSON.parse(taigaBot['user_id']);
            this.matter.addUserToTeam(mAT, this.matter.teams[0]['id'], taigaBotId);
            const tBotAccToken = await this.matter.createAccessToken(mAT, taigaBotId, 'Taiga Messenger')
            const botAccessToken = tBotAccToken[2];

            saveBot('taiga', this.matter.taigaBotId, botAccessToken);
            return botAccessToken;
        }
        // This part is written that if the the bot token gets removed for reason, it would be recreated.
        else {
            const botAccessToken = await this.matter.getUserAccessTokens(mAT, this.matter.taigaBotId);
            if (botAccessToken.length != 0) {
                const tBAT = await getBot('taiga')
                return tBAT;
            }
            else {
                const tBotAccToken = await this.matter.createAccessToken(mAT, this.matter.taigaBotId, 'Taiga Messenger');
                const botAccessToken = tBotAccToken[2];

                saveBot('taiga', this.matter.taigaBotId, botAccessToken);
                return botAccessToken;
            }
        }
    }

    /**
     * Sends a 'message' to the 'channel_id'
     * @param {String} mAT Mattermost Admin Access Token
     * @param {String} channel_id channel_id to send the message into.
     * @param {String} message The message string.
     */
    createPost(mAT, channel_id, message) {
        this.matter.createPost(mAT, channel_id, message);
    }

    /**
     * refreshes all info regarding project, hooks, channels, teams, matterUsers & taigaUsers.
     * @param {*} mAT Mattermost Admin Access Token
     * @returns A promise that resolves when project, hooks, channels, teams, matterUsers & taigaUsers are fethed.
     */
    #getNeeded(mAT) {
        const projectsPromise = this.taiga.getProjects(this.taiga.auth_key);
        const hooksPromise = this.taiga.getHooks(this.taiga.auth_key);
        const channelsPromise = this.matter.getChannels(mAT);
        const teamsPromise = this.matter.getTeams(mAT);
        const MatterUsersPromise = this.matter.getUsers(mAT);
        const taigaUsersPromise = this.taiga.getUsers(this.taiga.auth_key);

        return Promise.all([projectsPromise, hooksPromise, channelsPromise,
            teamsPromise, MatterUsersPromise, taigaUsersPromise]);
    }

    /**
     * Maps a list of taiga user's userId's to a list of the same users in mattermost
     * based on having the same username in both apps and returns mattermost userIds
     * of the taigaUsers.
     * @param {[Number]} taigaUsers userdId's of a Taiga project
     * @returns userId's of mattermost users that have the same userName as Taiga users
     */
    #mapTaigaIdToMatterId(taigaUsers) {
        let taigaUserNames = this.taiga.users
            .filter((user) => {
            if (taigaUsers.includes(user['id']))
                return user['username'];
            })
            .map((user) => {return user['username']});
        // console.log(taigaUserNames)

        let matterUserIds = this.matter.users
            .filter((user) => {
            if (taigaUserNames.includes(user['username'])) {return user;}
            })
            .map((user) => {return user['id'];});
        // console.log(matterUserIds);

        return matterUserIds;
    }

    /**
     * Adds taigaBot to mattermost channels related to Taiga projects that don't have it.
     * @param {*} mAT Mattermost Admin Access Token
     */
    #addBotToChannels(mAT) {
        // Add taigaBot to Mattermost channels of taiga projects that don't have it
        let projectSlugs = this.taiga.projects.map((project) => {
            return project['slug'];
        })

        let projectChannelsInMatter = this.matter.channels.filter((channel) => {
            if (projectSlugs.includes(channel['name'])) {
                return channel;
            }
        }).map((channel) => {
            return {
                "name": channel['name'],
                "id": channel['id']};
        })

        for (let channel of projectChannelsInMatter) {
            let memberIds = [];
            let channelId = channel['id'];
            this.matter.getChannelMembers(mAT, channelId).then((members) => {
                for (let member of members) {
                    memberIds.push(member['user_id']);
                }
                let channelHasBot = memberIds.includes(this.matter.taigaBotId);
                if (!channelHasBot) this.matter.addUserToChannel(mAT, channelId, this.matter.taigaBotId);
            });
        }
    }

    /**
     * Create channel for Taiga projects that have a channel.
     * @param {String} mAT Mattermost Admin Access Token
     * @param {JSON} project Project to check for it's channel in mattermost.
     */
    async #makeNeededChannels(mAT, project) {
        const teamId = this.matter.teams[0]['id']; // Assuming there is only '1' team!!!
        let channelNames = this.matter.channels.map((channel) => {
            return channel['name'];
        });
        // Make mattermost channel if a project doesn't have one.
        let projectHasChannel = channelNames.includes(project['slug']);

        if (!projectHasChannel) {
            await this.matter.createChannel(mAT, teamId, project['slug'], project['name'], 'P');
        }
    }

    /**
     * Adds hooks for projects that don't have it.
     * @param {JSON} project project to check that has hook or not and if not create one for it.
     */
    async #addNeededHooks(project) {
        let hookedProjects = this.taiga.hooks.map((hook) => {
            return Number(hook['project']);
        });

        // Add hooks for projects that don't have hooks.
        let projectHasHook = hookedProjects.some((hookId) => {
            return hookId == project['id'];
        })

        if (!projectHasHook) {
            await this.taiga.createHook(this.taiga.auth_key, _hookurl.get(this), project['id'], `${project['slug']}-messenger`);
        }
    }

    /**
     * Adds the userList to channel_id if they're not already part of it.
     * @param {String} mAT Mattermost Admin Access Token
     * @param {[userId]} userList List of userId's to add to the channel_id
     * @param {String} channel_id The channel to which the users must be added.
     */
    #addUsersToChannel(mAT, userList, channel_id) {
        this.matter.getChannelMembers(mAT, channel_id).then((members) => {
            for (let userId of userList) {
                let userInChannel = userId in members;
                if (!userInChannel) {
                    this.matter.addUserToChannel(mAT, channel_id, userId);
                }
            }
        })
    }

    /**
     * Adds project members that aren't in the mattermost channel of the project to that channel
     * @param {String} mAT Mattermost Admin Access Token
     * @param {JSON} project The project to check it's members in mattermost channel
     */
    #addNeededMembers(mAT, project) {
        let projectMembers = this.taiga.users
        .map((user) => {
        if (project['members'].includes(user['id'])) {
            return user['id'];
        }
        })
        .filter((id) => {
            if (id) return id;
        });

        // Gets the channel of the project
        const projectChannel = this.matter.channels
            .filter((channel) => {
                if (channel['name'] == project['slug']) return channel;
            })
            .map((channel) => {
                return channel['id'];
            })

        let taigausersInMattermost = this.#mapTaigaIdToMatterId(projectMembers);
        this.#addUsersToChannel(mAT, [...taigausersInMattermost], projectChannel);
    }

    /**
     * Checks Taiga Projects and Mattermost channels
     * to be in sync in terms of users.
     * Checks mattermost bots. adds members and bots to channels.
     * @param {String} mAT Mattermost Admin Access Token
     */
    async #syncData(mAT) {
        for (let project of this.taiga.projects) {
            await this.#addNeededHooks(project);
            await this.#makeNeededChannels(mAT, project);
            this.#addNeededMembers(mAT, project);
        }
        this.#addBotToChannels(mAT);
    }

    /**
     * Each 'interval' seconds, Checks for the following:
     * Newly created projects to create hooks for them.
     * Newly created projects to create channels for them.
     * Adds bots to newly created channels.
     * Syncing Project members and channel members.
     * @param {String} mAT Mattermost Admin Access Token
     * @param {Number} interval in seconds
     */
    execInInterval(mAT, interval) {
        interval = interval * 1000; // Converting Second to miliSeconds
        setInterval(() => {
            this.#getNeeded(mAT).then(() => {
                this.#syncData(mAT);
            })
        }, interval);
    }
}

module.exports = TaigaMatter;