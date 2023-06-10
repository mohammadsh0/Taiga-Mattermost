const mongoose = require('mongoose');

// No idea how this line is working in taigamatter module
// Because it's not imported. I taught that only exported functions and classes
// get executed when imported!
mongoose.connect('mongodb://localhost/Taiga-Mattermost')
  .then(() => {console.log('Connected to DB...')})
  .catch((err) => {console.log(`Error: ${err.message}`)});

const botSchema = new mongoose.Schema({
  botName: String,
  tokenId: String,
  accessToken: String
});

const adminTokenSchema = new mongoose.Schema({
    userId: String,
    tokenId: String,
    accessToken: String
});

const MatterBot = mongoose.model('MatterBot', botSchema);
const AdminToken = mongoose.model('AdminToken', adminTokenSchema);

/**
 * Saves a user's userId, tokenId & accessToken to database
 * @param {String} userId
 * @param {String} tokenId
 * @param {String} accessToken
 */
async function saveUserToken(userId, tokenId, accessToken) {
    const token = new AdminToken({
        userId: userId,
        tokenId: tokenId,
        accessToken: accessToken
    });

    await token.save();
}

/**
 * Gets admin accessToken from database
 * @returns admin's Access Token
 */
async function getAdminToken() {
    const token = await AdminToken
        .find()
        .select({accessToken: 1});

    return token[0]['accessToken'];
}

/**
 * Saves a bot's name, tokenId & accessToken to database
 * @param {String} botName
 * @param {String} tokenId
 * @param {String} accessToken
 */
async function saveBot(botName, tokenId, accessToken) {
  const bot = new MatterBot({
    botName: botName,
    tokenId: tokenId,
    accessToken: accessToken
  });

  await bot.save();
}

/**
 * Gets a bot's accessToken
 * @returns taigaBot's Access Token
 */
async function getBot(botName) {
  const bot = await MatterBot
    .find({botName: botName})
    .select({accessToken: 1});

  return bot[0]['accessToken'];
}

module.exports.saveUserToken = saveUserToken;
module.exports.getAdminToken = getAdminToken;
module.exports.saveBot = saveBot;
module.exports.getBot = getBot;
