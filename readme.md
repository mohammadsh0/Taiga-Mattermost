# TaigaMatter
This app uses taiga webhooks to create channels in [Mattermost](https://mattermost.com/) for each project that is defined in [Taiga](https://taiga.io/) and then send diffrent changes on the project to the related mattermost channel.

## Installation
### Install mongoDB


### Clone
1. Clone repo
2. go to project folder
3. Install npm dependencies
```
git clone https://github.com/mohammadsh0/Taiga-Mattermost.git
cd .\Taiga-Mattermost\
npm install
```
### Setting variable envlironment
To function as intended, this app needs Taiga's and Mattermost's Admin usernames and passwords. For this purpose:
1. Create a file called .env in the project root folder.
2. Add the following lines to the .env file and replace the info with your own:
```
taigaUsername=ADMIN
taigaPassword=PASSWORD
taigaUrl=http[s]://1.2.3.4:port
mattermostUserName=someone@somewhere.com
mattermostPassword=PASSWORD
mattermostUrl=http://1.2.3.4:port

```
### Running the application
```
node index.js
```