if (typeof __webpack_require__ === 'function') {
	throw new Error("You'd better not include this little piece for frontend scripts, honey");
}

module.exports = {
	dropbox: {
		accessToken: "DebXXXXXXXXXXXXDw",
		rootPath: "/dvr/videomotion",
		longPollTimeout: 60,
		removeFolderRegex: "^\\/dvr\\/videomotion\\/[0-9]+$",
		removeFolderIfThereIsNoFileNewerThanXDays: 10,
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
		checkAuthIP: true,
		maxAuthCodeAge: 24*60*60,
		credentials: [
			{
	            username: 'admin',
	            password: 'admin'
			}
		]
	}	
};