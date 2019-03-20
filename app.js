#!/usr/bin/env node

const {Program,Command,LovaClass} = require('lovacli');
const path = require('path');
const pjson = require(path.join(__dirname, 'package.json'));

let program = new Program({
		"name": pjson.description || pjson.name,
		"version": pjson.version,
		"debug": true,
		"paths": {
			"commands": path.join(__dirname, "commands")
		}
	});

program.init(false).then(()=>{
	program.handle();
});