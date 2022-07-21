const fs = require('fs');

const {randomString} = require('./utility.js');

module.exports = class Tokens {
	_tokens = {};
	_saving = false;
	_awaiting = [];

	constructor(file) {
		this._file = file;

		try {
			let tokens = fs.readFileSync(file);
			this._tokens = JSON.parse(tokens);
		} catch (err) {
			if (err.code !== 'ENOENT') {
				throw err;
			}
		}
	}

	get(id) {
		return this._tokens[id];
	}

	add(username, password, callback) {
		username = username.toLowerCase();

		let token = {
			username: username,
			password: password
		};

		for (let id in this._tokens) {
			if (this._tokens[id].username === username) {
				delete this._tokens[id];
			}
		}

		let id = randomString(16);

		this._tokens[id] = token;
		this._save(callback);

		return id;
	}

	remove(id, callback) {
		delete this._tokens[id];
		this._save(callback);
	}

	_save(callback) {
		this._awaiting.push(callback);

		if (this._saving) {
			return;
		}

		this._saving = true;
		let awaiting = this._awaiting;
		this._awaiting = [];

		fs.writeFile(this._file, JSON.stringify(this._tokens), err => {
			for (let callback of awaiting) {
				if (callback) {
					callback(err);
				}
			}

			this._saving = false;

			if (this._awaiting.length !== 0) {
				this._save();
			}
		});
	}
}