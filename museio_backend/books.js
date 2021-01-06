const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const crypto = require('crypto');
const node_rsa = require('node-rsa');
const https = require('https');
const str = require('@supercharge/strings');
const mysql = require('mysql');
const { json, response } = require('express');
const app = express();
const email_validator = require('email-validator');
const body_parser = require('body-parser');
const bodyParser = require('body-parser');
const { exit } = require('process');
app.use(body_parser.json());
app.use(body_parser.urlencoded({extended: true}));
const authorize_include = require('./backend_includes/authorize_include');
const common_include = require('./backend_includes/common_include');

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
        console.log('Attempting to initialize MySQL connection pool...');

        let connection_limit = (connection_limit_override) ? connection_limit_override : 1000;
        let config_query = `SELECT Public_Key, Private_Key FROM Config WHERE Config_Name = `;
        config_query += (config_name_override) ? `'config_name_override'` : `'normal'`;

        try {
            program_init.connection = mysql.createPool({
                connectionLimit: connection_limit,
                host: 'localhost',
                user: 'museio_api',
                password: 'jDKPUrdz4jtC6vwByE3lN0Y4eUQoh05T',
                database: 'museio'
            })
            console.log('Initialized the MySQL connection pool!')
        }
        catch (ex) {
            reject(`Problem while initializing the MySQL connection pool. Error: ex.`)
        }

        // Init global config variable
        console.log('Attempting to initialize configuration variable...');
        program_init.connection.query(config_query, (err, result) => {
            if (err) {
                reject(`Problem while grabbing the configuration from the DB. Error: err.`)
            }
            else {
                program_init.public_key = new node_rsa(result[0].Public_Key);
                program_init.private_key = new node_rsa(result[0].Private_Key);
    
                console.log('Configuration loaded successfully!');
                init_timer.stop();
                resolve(init_timer);
            }
        })
    })
}

app.get("/museio/api/books/get_book_details", (req, res) => {
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
        
    })
    .catch(error => {
        return res.status(error.status_code).send(
            JSON.stringify(new Response(error.status, error.message))
        )
    })
})

app.listen(4204, 'localhost', () => {
    console.log('books microservice is listening on localhost:4204!');

    init_program()
    .then(resolve => {
        console.log(`Initialization Execution Time: ${resolve.execution_time_seconds} seconds.`);
        program_ready = true;
    })
    .catch(error => {
        console.log(error);
    })
})