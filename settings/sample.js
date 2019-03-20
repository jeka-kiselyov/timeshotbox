if (typeof __webpack_require__ === 'function') {
	throw new Error("You'd better not include this little piece for frontend scripts, honey");
}

module.exports = {
	dropbox: {
		accessToken: "DebXXXXXXXXXXXXDw", //// you can generate access token for your account: 
										  //// https://blogs.dropbox.com/developers/2014/05/generate-an-access-token-for-your-own-account/
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
		enableLivereload: false,      /// enable LiveReload server. Set to true for dev env
		enableWebpackWatch: false,    /// enable WebPack compiling. Set to true for dev env
		enableWebpackBuild: false,    /// build frontend sources codes each start. Set to true for dev env
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