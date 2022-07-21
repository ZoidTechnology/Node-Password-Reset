# Node Password Reset
A modern password change and reset interface for Active Directory using [Node.js](https://nodejs.org/).
## Installation
1. Ensure [Node.js](https://nodejs.org/) and [NPM](https://www.npmjs.com/) are installed.
2. Download or clone this repository.
3. Run `npm install` from the project's root directory to install required modules.
4. Create a file called "config.json" in the project's root directory and specify the required configuration fields.
5. Start the server with `node index.js` from the project's root directory. A process manager such as [PM2](https://pm2.keymetrics.io/) can be used to run the server as a background process.
## Security
If HTTPS is used then a PEM formatted certificate and private key should be placed in the root directory as "cert.pem" and "key.pem". If LDAP requires additional certificates they should be passed in the environment variable "NODE_EXTRA_CA_CERTS".
## Configuration
Configuration options are stored in the JSON file "config.json" in the root directory. All fields are required unless marked as optional. Possible fields are listed below:
### `port`
Port to use for the HTTP web interface. If `httpsPort` is specified then this will be used for redirection to HTTPS.
### `httpsPort` (optional)
Port to use for the HTTPS web interface. If not specified, the web interface will be run over HTTP.
### `baseUrl` (optional)
Used if running behind a reverse proxy or other situations where the ports are not directly accessible to the user.
### `servers`
Array of LDAP server hostnames such as "dc.example.com:636". The port can be omitted if the default is used. Always uses LDAPS to connect regardless of port.
### `suffix`
Appended to the end of usernames for authentication. An "@" symbol is inserted between the username and suffix. For example: "username" becomes "username@suffix". Usually set to the UPN suffix or NetBIOS name.
### `base`
Base DN to use for LDAP searches such as "DC=ad,DC=example,DC=com".
### `passwordPrefix`
When a password is reset, the user's password is set to a random string of alphanumeric characters. If this does not match the password complexity requirements then a prefix can be used, otherwise use an empty string.
### `passwordLength`
Sets the length of the random string of characters to use as a temporary password when the user's password is reset.
### `debug` (optional)
When true view templates will not be cached and verbose error messages will be shown.
## Customisation
### Logo
The logo can be customised by replacing "static/logo.svg" with the desired logo. If this isn't available in SVG format then "views/layout.pug" can be modified to change the file extension.
### Icon
The icon can be customised by replacing "static/icon.png" with the desired icon. If another format is required then the file extension can be changed in "views/layout.pug".
### Title
The file "views/layout.pug" can be modified to change the title.
### Colours
Colours are specified within the ":root" element of "static/style.css" which can be modified if required.
## Usage
### Password Change
A user's password can be changed from the main page. The user must have permission in Active Directory to change their password.
### Password Reset
A password reset token can be generated from the "/reset" page. The user generating the reset token must have permission within Active Directory to reset the target user's password. The user is assigned a temporary password which is stored with the token in the "tokens.json" file.