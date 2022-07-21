module.exports.randomString = (length) => {
	const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let string = '';

	for (let i = 0; i < length; i++) {
		string += characters.charAt(Math.floor(Math.random() * characters.length));
	}

	return string;
}