const path = require('path');
const fs = require('fs');
const https = require('https');

const {randomString} = require('./utility.js');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));

if (!config.debug) {
	process.env.NODE_ENV = 'production';
}

const tokens = new (require('./tokens.js'))(path.join(__dirname, 'tokens.json'));
const ldap = new (require('./ldap.js'))(config.servers, config.suffix, config.base);

const express = require('express');

const redirect = express();

redirect.use((req, res) => {
	res.redirect(formatUrl(req.hostname, req.url));
});

const app = express();

app.use(express.static('static'));
app.use(express.urlencoded({extended: true}));

app.set('view engine', 'pug');

app.get('/reset', (req, res) => {
	res.render('reset', {form: {}});
});

app.post('/reset', (req, res, next) => {
	let username = req.body.username;
	let password = req.body.password;
	let targetUsername = req.body['target-username'];

	let showError = renderError.bind(null, res, 'reset', {form: req.body}, next);

	if (username.length === 0 || password.length === 0 || targetUsername.length === 0) {
		showError('emptyField');
		return;
	}

	let targetPassword = config.passwordPrefix + randomString(config.passwordLength);

	ldap.resetPassword(username, password, targetUsername, targetPassword, err => {
		if (err) {
			showError(err);
			return;
		}

		let token = tokens.add(targetUsername, targetPassword, err => {
			if (err) {
				showError(err);
				return;
			}

			token = formatUrl(req.hostname, '/' + token);

			res.render('success', {username: targetUsername, token: token});
		});
	});
});

app.get('/:tokenId?', (req, res, next) => {
	let tokenId = req.params.tokenId;

	if (tokenId && !tokens.get(tokenId)) {
		next();
		return;
	}

	res.render('change', {token: tokenId, form: {}});
});

app.post('/:tokenId?', (req, res, next) => {
	let tokenId = req.params.tokenId;
	let username = req.body.username;
	let password = req.body.password;

	if (tokenId) {
		token = tokens.get(tokenId);

		if (!token) {
			next();
			return;
		}

		username = token.username;
		password = token.password;
	}

	let newPassword = req.body['new-password'];
	let newPasswordConfirm = req.body['new-password-confirm'];

	let showError = renderError.bind(null, res, 'change', {token: tokenId, form: req.body}, next);

	if (username.length === 0 || password.length === 0 || newPassword.length === 0 || newPasswordConfirm.length === 0) {
		showError('emptyField');
		return;
	}

	if (newPassword !== newPasswordConfirm) {
		showError('passwordMismatch');
		return;
	}

	ldap.changePassword(username, password, newPassword, err => {
		if (err) {
			showError(err);
			return;
		}

		tokens.remove(tokenId, err => {
			if (err) {
				showError(err);
				return;
			}

			res.render('success');
		});
	});
});

app.use((req, res) => {
	res.status(404);
	res.render('error', {code: 404});
});

app.use((err, req, res, next) => {
	res.status(500);
	res.render('error', {code: 500});
	console.log(err);
});

if (config.httpsPort) {
	redirect.listen(config.port, () => {
		let options = {
			key: fs.readFileSync(path.join(__dirname, 'key.pem')),
			cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
		};
	
		https.createServer(options, app).listen(config.httpsPort);
	});
} else {
	app.listen(config.port);
}

function formatUrl(hostname, suffix) {
	let protocol = 'http';
	let port = '';

	if (config.httpsPort) {
		protocol = 'https';

		if (config.httpsPort !== 443) {
			port = ':' + config.httpsPort;
		}
	} else if (config.port !== 80) {
		port = ':' + config.port;
	}

	let url = protocol + '://' + hostname + port

	if (config.baseUrl) {
		url = config.baseUrl;
	}

	return url + suffix;
}

function renderError(res, view, locals, next, err) {
	const messages = {
		emptyField: 'All fields must be completed',
		passwordMismatch: 'Confirmation password must match new password',
		InvalidCredentialsError: 'Incorrect username or password',
		UserNotFoundError: 'The user was not found',
		InsufficientAccessRightsError: 'You do not have permission',
		ConstraintViolationError: 'Password must meet complexity requirements'
	};

	let message = (typeof err === 'string') ? messages[err] : messages[err.name];

	if (message) {
		locals.error = message;
		res.render(view, locals);
		return;
	}

	next(err);
}