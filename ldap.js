const ldap = require('ldapjs');

module.exports = class LDAP {
	constructor(servers, suffix, base) {
		this._urls = servers.map(server => 'ldaps://' + server);
		this._suffix = '@' + suffix;
		this._base = base;
	}

	resetPassword(username, password, targetUsername, targetPassword, callback) {
		let client = this._connect(username, password, err => {
			function done(err) {
				client.destroy();
				callback(err);
			}

			if (err) {
				done(err);
				return;
			}

			this._search(client, targetUsername, (err, dn) => {
				if (err) {
					done(err);
					return;
				}

				client.modify(dn, new ldap.Change({
					operation: 'replace',
					modification: {
						unicodePwd: encode(targetPassword)
					}
				}), done);
			});
		});
	}

	changePassword(username, password, newPassword, callback) {
		let client = this._connect(username, password, err => {
			function done(err) {
				client.destroy();
				callback(err);
			}

			if (err) {
				done(err);
				return;
			}

			this._search(client, username, (err, dn) => {
				if (err) {
					done(err);
					return;
				}

				client.modify(dn, [
					new ldap.Change({
						operation: 'delete',
						modification: {
							unicodePwd: encode(password)
						}
					}),
					new ldap.Change({
						operation: 'add',
						modification: {
							unicodePwd: encode(newPassword)
						}
					})
				], done);
			});
		});
	}

	_connect(username, password, callback) {
		let client = ldap.createClient({url: this._urls});

		client.on('error', err => {
			callback(err);
		});

		client.on('connect', () => {
			client.bind(username + this._suffix, password, err => {
				callback(err);
			});
		});

		return client;
	}

	_search(client, username, callback) {
		username = username.replace(/[*()\\\0]/g, char => '\\' + char.charCodeAt(0).toString(16).padStart(2, '0'));

		let options = {
			filter: '(&(objectClass=user)(objectCategory=person)(sAMAccountName=' + username + '))',
			scope: 'sub',
			sizeLimit: 1
		}

		client.search(this._base, options, (err, res) => {
			if (err) {
				callback(err);
				return;
			}

			let dn = null;

			res.on('error', err => {
				callback(err);
			});

			res.on('searchEntry', entry => {
				dn = entry.objectName;
			});

			res.on('end', result => {
				if (result.status !== 0) {
					callback(new Error(result.errorMessage));
					return;
				}
				
				if (dn === null) {
					let err = new Error('User not found');
					err.name = 'UserNotFoundError';

					callback(err);
					
					return;
				}

				callback(null, dn);
			});
		});
	}
}

function encode(password) {
	return Buffer.from('"' + password + '"', 'utf16le').toString();
}