# TimeShotBox

Player for motion detection shots of your security camera backup on DropBox


Built this tool for my set of security cameras in very remote location. Internet connection there is so slow that I can't use it to check and browse video remotely. But there's nice feature in my security system - upload photos to DropBox when motion is detected. So there is a way to browse this motion detection timeframes.


[![TimeShotBox](https://raw.githubusercontent.com/jeka-kiselyov/timeshotbox/gh-pages/screen.jpg)](https://jeka-kiselyov.github.io/timeshotbox/)

You can [check the demo in action](https://jeka-kiselyov.github.io/timeshotbox/). It displays key timeframes from [Early Bird Cafe - Week one V024](https://vimeo.com/193273971) video by Cornish Time Passages. You can check keyframes photos on DropBox [here](https://www.dropbox.com/sh/95si4r1nmkk0xg4/AAD7c4wj8t7JKI1lasWAQjRWa?dl=0).

### Build with:

 - node.js
 - [lovacli](https://github.com/jeka-kiselyov/lovacli)
 - Restify
 - Vue.js

### Installation

```bash
    git clone https://github.com/jeka-kiselyov/timeshotbox.git
    cd timeshotbox
    npm install
```

Create new DropBox app and [generate access token](https://blogs.dropbox.com/developers/2014/05/generate-an-access-token-for-your-own-account/) for your account.

Rename `sample.js` to `settings.js` in `settings` folder and update its contents:

```javascript
module.exports = {
	dropbox: {
		accessToken: "DebXXXXXXXXXXXXDw", //// you can generate access token for your account: 
		//// https://blogs.dropbox.com/developers/2014/05/generate-an-access-token-for-your-own-account/
		rootPath: "/dvr/videomotion",
		longPollTimeout: 60,
		removeFolderRegex: "^\\/dvr\\/videomotion\\/[0-9]+$",
		removeFolderIfThereIsNoFileNewerThanXDays: 10,
		time: 'server', /// 'server' or 'client'. Default is 'server' (dropbox time).
		channels: [
			{
				name: 'CH1',
				pathRegEx: "^[\\w+/]+\\/id_01_ch_01\\.jpg$" 
			},
			{
				name: 'CH2',
				pathRegEx: "^[\\w+/]+\\/id_01_ch_02\\.jpg$"
			},
			{
				name: 'CH3',
				pathRegEx: "^[\\w+/]+\\/id_01_ch_03\\.jpg$"
			},
			{
				name: 'CH4',
				pathRegEx: "^[\\w+/]+\\/id_01_ch_04\\.jpg$"
			}
		]
	},
	server: {
		enableLivereload: false,      /// enable LiveReload server. Set to true for dev env
		enableWebpackWatch: false,    /// enable WebPack compiling. Set to true for dev env
		enableWebpackBuild: true,    /// build frontend sources codes each start. Set to true for dev env
		port: 9090,
		checkAuthIP: true,			  /// tie auth to IP
		maxAuthCodeAge: 24*60*60,     /// limit auth time
		credentials: [
			{
	            username: 'admin',
	            password: 'admin'
			}
		]
	}	
};

```

Run `node app.js startserver` from command line. And open `http://localhost:9090` in your browser.


### License

MIT

### Author

[Jeka Kiselyov](https://github.com/jeka-kiselyov)