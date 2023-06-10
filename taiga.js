const utils = require('./utils');


const _authPost = new WeakMap();
const _auth_key = new WeakMap();
const _refresh = new WeakMap();
const _url = new WeakMap();
const _projects = new WeakMap();
const _hooks = new WeakMap();
const _users = new WeakMap();
const _tempData = new WeakMap(); // Used to return data from async functions. Not sure if it's safe!


class Taiga {
    /**
     * For connecting to Taiga API and interacting with it.
     * @param {String} url Address where taiga is installed
     * @param {String} userName Admin's userName
     * @param {String} password Admin's password
     */
    constructor(url, userName, password) {
        _authPost.set(this, JSON.stringify({
            'password': userName,
            'type': 'normal',
            'username': password
        }));
        _url.set(this, url);
    }

    /**Gets authorization & refresh tokens using userName and password
     * that were provided during initialization.
     */
    async getAuthToken() {
        const options = utils.options('POST');

        await utils.httpRequester(`${_url.get(this)}/auth`, options, _authPost.get(this))
            .then((data) => {
                let auth_key = JSON.parse(data)['auth_token'];
                let refresh = JSON.parse(data)['refresh'];
                _auth_key.set(this, auth_key);
                _refresh.set(this, refresh);
            })
            .catch((err) => {console.log(err.message)});
    }

    /**
     * Refreshes Authorization & refresh tokens
     * @param {String} auth_token Taiga Authorization header
     * @param {String} refresh Taiga Refresh header
     */
    async refreshToken(auth_token, refresh) {
        const options = utils.options("POST", auth_token);
        const payload = JSON.stringify({
            "refresh": `${refresh}`
        });

        await utils.httpRequester(`${_url.get(this)}/auth/refresh`, options, payload)
            .then((data) => {
                let auth_key = JSON.parse(data)['auth_token'];
                let refresh = JSON.parse(data)['refresh'];
                _auth_key.set(this, auth_key);
                _refresh.set(this, refresh);
            })
            .catch((err) => {console.log(err.message)});
    }

    /**
     * Gets all Taiga Users
     * @param {String} auth_token Taiga Authorization header
     */
    async getUsers(auth_token) {
        const options = utils.options('GET', auth_token);

        await utils.httpRequester(`${_url.get(this)}/users`, options)
            .then((data) => {
                _users.set(this, JSON.parse(data));
            })
            .catch((err) => {console.log(err.message)});
    }

    /**
     * Gets all Taiga Projects
     * @param {String} auth_token Taiga Authorization header
     */
    async getProjects(auth_token) {
        const options = utils.options('GET', auth_token);

        await utils.httpRequester(`${_url.get(this)}/projects`, options)
            .then((data) => {
                _projects.set(this, JSON.parse(data));
            })
            .catch((err) => {console.log(err.message)});
    }

    /**
     * Gets all hooks defined on Taiga for all projects
     * @param {String} auth_token Taiga Authorization header
     */
    async getHooks(auth_token) {
        const options = utils.options('GET', auth_token);

        await utils.httpRequester(`${_url.get(this)}/webhooks`, options)
            .then((data) => {
                let hookList = JSON.parse(data);
                _hooks.set(this, hookList);
            })
            .catch((err) => {console.log(err.message)});
    }

    /**
     *  Creates a hook
     * @param {String} auth_token Taiga Authorization header
     * @param {String} destHookUrl Address to which hook should send info
     * @param {String} projectId ProjectId for to create hook for
     * @param {String} hookName A name for the created hook
     * @returns Created hook object.
     */
    // Secret key is not used. It's better to be used.
    async createHook(auth_token, destHookUrl, projectId, hookName) {
        const options = utils.options('POST', auth_token);
        let payload = JSON.stringify({
            "key": "my-very-secret-key",
            "name": hookName,
            "project": projectId,
            "url": `${destHookUrl}`
        });

        await utils.httpRequester(`${_url.get(this)}/webhooks`, options, payload)
            .then((data) => {
                _tempData.set(this, data);
            })
            .catch((err) => {console.log(err.message)});
        return _tempData.get(this);
        }

    get auth_key() {
        return _auth_key.get(this);
    }

    get refresh() {
        return _refresh.get(this);
    }

    get projects() {
        return _projects.get(this);
    }

    get hooks() {
        return _hooks.get(this);
    }

    get users() {
        return _users.get(this);
    }
}


module.exports = Taiga;