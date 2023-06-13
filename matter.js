const utils = require('./utils')

const _url = new WeakMap();
const _authPost = new WeakMap();
const _auth_token = new WeakMap();
const _bots = new WeakMap();
const _channels = new WeakMap();
const _teams = new WeakMap();
const _admin_token = new WeakMap();
const _users = new WeakMap();
const _tempData = new WeakMap(); // Used to return data from async functions. Not sure if it's the cleanest way!


class MatterMost {
    /**
     * For connecting to Mattermost API and interacting with it.
     * @param {String} url Address where mattermost is installed
     * @param {String} login_id Admin's userName
     * @param {String} password Admin's password
     */
    constructor(url, login_id, password) {
        _url.set(this, url);
        _authPost.set(this, JSON.stringify({
            'login_id': login_id,
            'password': password
        }))
    }

    /**
     * Gets authorization token using login_id and password
     * that were provided during initialization.
     */
    async getAuthToken() {
        const options = utils.options('POST');

        await utils.httpRequester(`${_url.get(this)}/users/login`, options, _authPost.get(this), true)
            .then((data) => {
                let admin_token = JSON.parse(data[0])['id'];
                let token = data[1]['token'];
                _auth_token.set(this, token);
                _admin_token.set(this, admin_token);
            });
    }

    /**
     * Gets all users
     * @param {String} auth_token Mattermost Authorization header
     */
    async getUsers(auth_token) {
        const options = utils.options('GET', auth_token);

        await utils.httpRequester(`${_url.get(this)}/users`, options)
            .then((data) => {
                _users.set(this, data);
            });
    }

    // Gets all bots
    /**
     * Gets all bots
     * @param {String} auth_token Mattermost Authorization header
     */
    async getBots(auth_token) {
        let options = utils.options('GET', auth_token);

        await utils.httpRequester(`${_url.get(this)}/bots`, options)
            .then((data) => {
                _bots.set(this, data);
            });
    }

    /**
     * Creates a Mattermost bot
     * @param {String} auth_token Mattermost Authorization header
     * @returns Created Bot info
     */
    async createBot(auth_token) {
        let options = utils.options('POST', auth_token);
        let payload = JSON.stringify({
            "username": "taiga",
            "display_name": "Taiga",
            "description": "Taiga Bot"
        });

        await utils.httpRequester(`${_url.get(this)}/bots`, options, payload)
            .then((data) => {
                _tempData.set(this, data);
            });
        return _tempData.get(this)
    }

    /**
     * Creates a Mattermost channel
     * @param {String} auth_token Mattermost Authorization header
     * @param {String} teamId The teamId which channel should be created on
     * @param {String} channelName Name of the channel
     * @param {String} display_name The name channel must be displayed as
     * @param {String} type 'P'= Private, 'O'=Public
     * @returns Created channel obj
     */
    async createChannel(auth_token, teamId, channelName, display_name, type = 'P') {
        let options = utils.options('POST', auth_token);
        let payload = JSON.stringify({
            'team_id': `${teamId}`,
            'name': `${channelName}`,
            'display_name': `${display_name}`,
            'type': `${type}`
        });

        await utils.httpRequester(`${_url.get(this)}/channels`, options, payload)
            .then((data) => {
                _tempData.set(this, data);
            });
        return _tempData.get(this)
    }

    /**
     * Sends a message to a channel
     * @param {String} auth_token Mattermost Authorization header
     * @param {String} channel_id The channel_id to send the message to
     * @param {String} message The message to send
     * @returns The created post object.
     */
    createPost(auth_token, channel_id, message) {
        let options = utils.options('POST', auth_token);
        let payload = JSON.stringify({
            "channel_id": channel_id,
            "message": message,
            "description": "Taiga Bot"
        });

        utils.httpRequester(`${_url.get(this)}/posts`, options, payload)
            .then((data) => {
                _tempData.set(this, data);
            });
        return _tempData.get(this)
    }

    /**
     * Gets user_id's access token
     * @param {String} auth_token Mattermost Authorization header
     * @param {String} user_id The user_id to get it's Access Token
     * @returns user_id's access token
     */
    async getUserAccessTokens(auth_token, user_id) {
        const options = utils.options('GET', auth_token);

        await utils.httpRequester(`${_url.get(this)}/users/${user_id}/tokens`, options)
            .then((data) => {
                _tempData.set(this, JSON.parse(data));
            })
        return _tempData.get(this)
    }

    /**
     * Creates access token for user_id
     * @param {String} auth_token Mattermost Authorization header
     * @param {String} user_id The user_id to create Access Token for
     * @param {String} description Description for the Access Token
    * @returns [user_id, token_id, access_token]
     */
    async createAccessToken(auth_token, user_id, description) {
        const options = utils.options('POST', auth_token);
        const payload = JSON.stringify({
            'user_id': `${user_id}`,
            'description': `${description}`
        });

        await utils.httpRequester(`${_url.get(this)}/users/${user_id}/tokens`, options, payload)
            .then((data) => {
                let token_id = JSON.parse(data)['id'];
                let access_token = JSON.parse(data)['token'];
                let user_id = JSON.parse(data)['user_id'];
                _tempData.set(this, [user_id, token_id, access_token]);
            });
        return _tempData.get(this)
    }

    /**
     * Gets Mattermost teams.
     * @param {String} auth_token Mattermost Authorization header
     */
    async getTeams(auth_token) {
        const options = utils.options('GET', auth_token);

        await utils.httpRequester(`${_url.get(this)}/teams`, options)
            .then((data) => {
                _teams.set(this, data);
            });
    }

    /**
     * Adds a user (user_id) to the team(team_id).
     * @param {String} auth_token Mattermost Authorization header
     * @param {String} team_id The team user should be added to
     * @param {String} user_id The user to add to the team.
     * @returns Added user to the team
     */
    async addUserToTeam(auth_token, team_id, user_id) {
        const options = utils.options('POST', auth_token);
        const payload = JSON.stringify({
            'team_id': `${team_id}`,
            'user_id': `${user_id}`
        });

        await utils.httpRequester(`${_url.get(this)}/teams/${team_id}/members`, options, payload)
            .then((data) => {
                _tempData.set(this, data);
            });
        return _tempData.get(this)
    }

    /**
     * Gets all Mattermost channels.
     * @param {String} auth_token Mattermost Authorization header
     */
    async getChannels(auth_token) {
        let options = utils.options('GET', auth_token);

        await utils.httpRequester(`${_url.get(this)}/channels`, options)
            .then((data) => {
                _channels.set(this, data);
            });
    }

    /**
     * Gets members of channel(channel_id).
     * @param {String} auth_token Mattermost Authorization header
     * @param {String} channel_id The channel_id to get it's members
     * @returns Members of channel_id
     */
    async getChannelMembers(auth_token, channel_id) {
        const options = utils.options("GET", auth_token);

        await utils.httpRequester(`${_url.get(this)}/channels/${channel_id}/members`, options)
            .then((data) => {
                let members = JSON.parse(data);
                _tempData.set(this, members);
            });
        return _tempData.get(this)
    }

    /**
     * Adds user_id to channel_id.
     * @param {String} auth_token Mattermost Authorization header
     * @param {String} channel_id The channel_id to add user to it
     * @param {String} user_id The user_id to add to the channel
     * @returns Added user to channel object.
     */
    async addUserToChannel(auth_token, channel_id, user_id) {
        const options = utils.options('POST', auth_token);
        const payload = JSON.stringify({
            'channel_id': `${channel_id}`,
            'user_id': `${user_id}`
        });

        await utils.httpRequester(`${_url.get(this)}/channels/${channel_id}/members`, options, payload)
            .then((data) => {
                _tempData.set(this, data);
            });
        return _tempData.get(this)
    }

    get auth_token() {
        return _auth_token.get(this);
    }

    get admin_token() {
        return _admin_token.get(this);
    }

    get hasBot() {
        let botsObj = JSON.parse(_bots.get(this));
        for (let bot of botsObj) {
            if (bot['username'] == 'taiga') return true;
        }
    }

    get taigaBotId() {
        let botsObj = JSON.parse(_bots.get(this));
        for (let bot of botsObj) {
            if (bot['username'] == 'taiga') {
                return botsObj[botsObj.indexOf(bot)]['user_id'];
            }
        }
    }

    get channels() {
        return JSON.parse(_channels.get(this));
    }

    get teams() {
        // console.log(JSON.parse(_teams.get(this)))
        return JSON.parse(_teams.get(this));
    }

    get users() {
        return JSON.parse(_users.get(this));
    }
}

module.exports = MatterMost;