const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const crypto = require('crypto');
const node_rsa = require('node-rsa');
const https = require('https');
const str = require('@supercharge/strings');
const mysql = require("mysql");
const { json, response } = require('express');
const app = express();
const email_validator = require("email-validator");
const body_parser = require('body-parser');
const bodyParser = require('body-parser');
const { exit } = require('process');
app.use(body_parser.json());
app.use(body_parser.urlencoded({extended: true}));
const authorize_include = require("./backend_includes/authorize_include");
const common_include = require("./backend_includes/common_include");

var Response = common_include.Response;

var program_init = {
    public_key: null,
    private_key: null,
    connection: null
}

// Allows us to keep track of execution time for endpoints
const NS_PER_SEC = 1e9;
const MS_PER_NS = 1e-6;

class ExecutionTimer {
    constructor() {
        this.timer = process.hrtime();
        this.execution_time_milliseconds = 0;
        this.execution_time_seconds = 0;
    }

    stop() {
        let time_diff = process.hrtime(this.timer);
        this.execution_time_milliseconds = (((time_diff[0] * NS_PER_SEC + time_diff[1])  * MS_PER_NS));
        this.execution_time_seconds = (this.execution_time_milliseconds / 1000).toFixed(3); // In seconds, round to 3 decimal spots.
    }
}

// Determines if the program is ready to run (used for endpoints due to async nature of init loading)
var program_ready = false;

function init_program(connection_limit_override = false, config_name_override = false) {
    return new Promise((resolve, reject) => {
        // Time the initialization
        let init_timer = new ExecutionTimer();
        
        // Set up MySQL connection pool
        console.log("Attempting to initialize MySQL connection pool...");

        let connection_limit = (connection_limit_override) ? connection_limit_override : 1000;
        let config_query = `SELECT Public_Key, Private_Key FROM Config WHERE Config_Name = `;
        config_query += (config_name_override) ? `'${config_name_override}'` : `'normal'`;

        try {
            program_init.connection = mysql.createPool({
                connectionLimit: connection_limit,
                host: 'localhost',
                user: 'museio_api',
                password: "jDKPUrdz4jtC6vwByE3lN0Y4eUQoh05T",
                database: "museio"
            })
            console.log("Initialized the MySQL connection pool!")
        }
        catch (ex) {
            reject(`Problem while initializing the MySQL connection pool. Error: ${ex}.`)
        }

        // Init global config variable
        console.log("Attempting to initialize configuration variable...");
        program_init.connection.query(config_query, (err, result) => {
            if (err) {
                reject(`Problem while grabbing the configuration from the DB. Error: ${err}.`)
            }
            else {
                program_init.public_key = new node_rsa(result[0].Public_Key);
                program_init.private_key = new node_rsa(result[0].Private_Key);
    
                console.log("Configuration loaded successfully!");
                init_timer.stop();
                resolve(init_timer);
            }
        })
    })
}

// TODO: This is only used for development purposes. Remove when finished.
app.post("/museio/api/tokenauthor/authorize", (req, res) => {
    // Pull the token from the auth bearer header
    if (!req.headers.authorization) {
        return res.status(400).send(
            JSON.stringify(new Response(`invalid_token`, `A bearer token was either not supplied, or was empty.`))
        )
    }
    
    // Format the token
    var given_token = req.headers.authorization.replace('Bearer ', '');
    
    // Authorize the token
    authorize_include.authorize_token(given_token, program_init)
    .then(result => {
        // If a new token was reissued, include it in the response.
        if (result.new_token) {
            return res.status(200).send(
               JSON.stringify(new Response(`success`, result))
            )
        }
        else {
            return res.status(200).send(
               JSON.stringify(new Response(`success`, 'success'))
            )
        }
    })
    .catch(error => {
        return res.status(error.status_code).send(
           JSON.stringify(new Response(error.status, error.message))
        )
    })
})

app.post("/museio/api/tokenauthor/login", (req, res) => {
    if (!program_ready) {
        return res.status(500).send(
           JSON.stringify(new Response(`service_not_ready`, `Sorry, the back-end service is not ready yet. Please try again in a few seconds.`))
        )
    }

    // Start the timer
    let execution_timer = new ExecutionTimer();

    // Check for the email and password, and make sure they are valid
    if (!req.body.email || req.body.email.length < 1) {
        return res.status(400).send(
           JSON.stringify(new Response(`invalid_email`, `An email parameter was either not sent, or was empty.`))
        )
    }
    else if (!email_validator.validate(req.body.email)) {
        return res.status(400).send(
           JSON.stringify(new Response(`invalid_email`, `The email parameter given was not a valid email address.`))
        )
    }
    else {
        var given_email_address = req.body.email.trim();
    }

    if (!req.body.password || req.body.password.length < 1) {
        return res.status(400).send(
           JSON.stringify(new Response(`invalid_password`, `A password parameter was either not sent, or was empty.`))
        )
    }
    else if (
        !/[A-Za-z]/.test(req.body.password) ||
        !/[0-9]/.test(req.body.password) ||
        !/[\-\_\@\.\!\#\$\%\^\&\*\+\=]/.test(req.body.password) ||
        req.body.password.length < 8 || req.body.password.length > 100
    ) {
        return res.status(400).send(
           JSON.stringify(new Response(`invalid_password`, `The password parameter given was invalid. Passwords must contain an uppercase and lowercase letter, a number, and a symbol, and must be between 8 and 100 characters in length.`))
        )
    }
    else {
        var given_password = req.body.password.trim();
    }

    // Check if a persistent_login param was given (This allows the user to stay logged in for up to a month)
    var persistent_login = (req.body.persistent_login) ? true : false;

    program_init.connection.query("SELECT Email_Address, First_Name, Last_Name, Jwt_Key, Salt, Hash, Profile_Image FROM Users WHERE Email_Address = ?", [given_email_address], function(err, result) {
        if (err) {
            return res.status(500).send(
               JSON.stringify(new Response(`internal_error`, `Sorry, something went wrong while logging you in.`))
            )
        }

        if (result.length < 1) {
            return res.status(200).send(
               JSON.stringify(new Response(`incorrect_username_or_password`, `Your given username or password was incorrect.`))
            )
        }
        else {
            var user_account = result[0];

            // Grab the user's salt, and form a comparator hash
            let comparator_hash = crypto.createHash("sha512").update(user_account.Salt + given_password).digest('hex');

            // Check if the comparator hash equals the user's hash
            if (comparator_hash.toLocaleLowerCase() != user_account.Hash.toLocaleLowerCase()) {
                return res.status(200).send(
                   JSON.stringify(new Response(`incorrect_username_or_password`, `Your given username or password was incorrect.`))
                )
            }

            // Generate a token with the user's jwt key
            var jwt_token_data = {
                email: user_account.Email_Address,
                first_name: user_account.First_Name,
                last_name: user_account.Last_Name,
                persistent_login: persistent_login
            };

            // The token will expire 1 day after it's signed
            var jwt_token = jwt.sign({
                nbf: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (3600 * 24),
                data: jwt_token_data
            }, user_account.Jwt_Key);

            // Update the user's token reissue total (non-blocking)
            program_init.connection.query('UPDATE Users SET Token_Reissue_Total = 0 WHERE Email_Address = ?', [user_account.Email_Address]);

            let extra_parameters = {
                user_email_address: user_account.Email_Address,
                user_first_name: user_account.First_Name,
                user_last_name: user_account.Last_Name,
                user_profile_photo: Buffer.from(user_account.Profile_Image).toString("base64")
            }

            // Load the public key file and encrypt the token
            try {
                let encrypted_token = program_init.public_key.encrypt(jwt_token);
                encrypted_token = encrypted_token.toString("base64");

                return res.status(200).send(
                   JSON.stringify(new Response(`success`, encrypted_token, 200, extra_parameters))
                )
            }
            catch (ex) {
                return res.status(500).send(
                   JSON.stringify(new Response(`internal_error`, `Sorry, something went wrong on our end while logging you in. Please try again.`))
                )
            }
        }
    })
})

app.post("/museio/api/tokenauthor/revoke_token", (req, res) => {
    return res.status(200).send(
       JSON.stringify(new Response(`success`, `revoke API`))
    )
})

app.listen(4200, "localhost", () => {
    console.log("Museio tokenauthor microservice is listening on localhost:4200!");

    init_program()
    .then(resolve => {
        console.log(`Initialization Execution Time: ${resolve.execution_time_seconds} seconds.`);
        program_ready = true;
    })
    .catch(error => {
        console.log(error);
    })
})