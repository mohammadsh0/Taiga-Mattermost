const express = require('express');
const MatterMost = require('./matter');
const Taiga = require('./taiga');
const TaigaMatter = require('./taigamatter');
require('dotenv').config();


const taigaUrl = process.env.taigaUrl;
const taigaUsername = process.env.taigaUsername;
const taigaPassword = process.env.taigaPassword;
const mattermostUrl = process.env.mattermostUrl;
const mattermostUsername = process.env.mattermostUserName;
const mattermostPassword= process.env.mattermostPassword;

const taiga = new Taiga(`${taigaUrl}/api/v1`, taigaUsername, taigaPassword);
const matter = new MatterMost(`${mattermostUrl}/api/v4`, mattermostUsername, mattermostPassword);
const hookUrl = "http://localhost:3000/api/webhooks";

const tm = new TaigaMatter(hookUrl, taiga, matter);

async function main() {
    await tm.getAuthorized();
    tm.refreshAuth(300);
    const accessToken = await tm.checkAdminAccessToken();
    const botAccessToken = await tm.checkBot(accessToken);
    tm.execInInterval(accessToken, 10);
    createApp(botAccessToken);
}

main();

const app = express();

function simpleFormat(jsonObj) {
    let fullSentence = `${jsonObj['type']} "${jsonObj['data']['subject']}" ${jsonObj['action']}ed by ${jsonObj['by']['full_name']} in ${jsonObj['date']}`;
    return fullSentence;
}

function createApp(tBAT) {
    console.log('Listening on port 3000')
    app.post('/api/webhooks', (req, res) => {
        let data = '';
        req.on("data", (chunk) => {
            data += chunk
        });

        req.on("end", () => {
            data = JSON.parse(data);
            let projectName = data['data']['project']['name'];
            let channelId = tm.mapprojectNameToChannelId(projectName);
            let message = simpleFormat(data);
            console.log(channelId);
            console.log(message);
            tm.createPost(tBAT, channelId, message);
            res.status(200).end();
        });
    });
    app.listen(3000);
}
