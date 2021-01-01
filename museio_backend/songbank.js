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
// const cors = require('cors');
// app.use(cors());
// app.options("*", cors());

app.use(function(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

// app.options("/museio/api/songbank/filter_performance_dates", cors());

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

app.post("/museio/api/songbank/filter_performance_dates", (req, res) => {
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
        // Check for a start and end date
        if (!req.body.start_date || req.body.start_date.length < 1){
            return res.status(400).send(
               JSON.stringify(new Response(`invalid_start_date`, `A start_date parameter was either not given, or it was empty.`))
            )
        }
        else {
            var given_start_date = req.body.start_date.trim();

            try {
                given_start_date = new Date(given_start_date);
                let month_modifier = ((given_start_date.getMonth() + 1) < 10) ? `0${given_start_date.getMonth() + 1}` : given_start_date.getMonth() + 1;
                let day_modifier = (given_start_date.getDate() < 10) ? `0${given_start_date.getDate()}` : given_start_date.getDate();
                given_start_date = `${given_start_date.getFullYear()}-${month_modifier}-${day_modifier}`;
            }
            catch (ex) {
                return res.status(400).send(
                   JSON.stringify(new Response(`invalid_start_date`, `Your given start_date '${given_start_date}' is not a valid date. Please provide dates in YYYY-MM-DD format.`))
                )
            }
        }

        if (!req.body.end_date || req.body.end_date.length < 1) {
            return res.status(400).send(
               JSON.stringify(new Response(`invalid_end_date`, `An end_date parameter was either not given, or it was empty.`))
            )
        }
        else {
            var given_end_date = req.body.end_date.trim();
            
            try {
                given_end_date = new Date(given_end_date);
                let month_modifier = ((given_end_date.getMonth() + 1) < 10) ? `0${given_end_date.getMonth() + 1}` : given_end_date.getMonth() + 1;
                let day_modifier = (given_end_date.getDate() < 10) ? `0${given_end_date.getDate()}` : given_end_date.getDate();
                given_end_date = `${given_end_date.getFullYear()}-${month_modifier}-${day_modifier}`;
            }
            catch (ex) {
                return res.status(400).send(
                   JSON.stringify(new Response(`invalid_end_date`, `Your given end_date '${given_end_date}' is not a valid date.`))
                )
            }
        }

        // Check for a song_id parameter
        if (!req.body.song_id || req.body.song_id.length < 1) {
            return res.status(400).send(
               JSON.stringify(new Response(`invalid_song_id`, `A song_id parameter was either not given, or it was empty.`))
            )
        }
        else {
            var given_song_id = req.body.song_id.trim();
        }

        // Query the database with the new values
        let performance_query = `SELECT Songs.Song_ID, Songs.Name as Song_Name, SongPerformances.Performance_Rating, SongPerformances.Practice_Date FROM museio.Songs
        LEFT JOIN SongPerformances ON Songs.Song_ID = SongPerformances.Song_ID
        WHERE SongPerformances.Practice_Date >= DATE(?) AND SongPerformances.Practice_Date <= DATE(?) AND Songs.Song_ID = ?
        ORDER BY Songs.Song_ID, SongPerformances.Practice_Date`

        program_init.connection.query(performance_query, [given_start_date, given_end_date, given_song_id], (err, result) => {
            if (err) {
                return_object.song_performance = 'error';
            }
            else if (result.length < 1) {
                return_object.song_performance = 'no_results';
            }
            else {
                return_object.song_performance = result;
            }

            return res.status(200).send(
                JSON.stringify(new Response(`success`, return_object))
            )
        })
    })
    .catch(error => {
        return res.status(error.status_code).send(
            JSON.stringify(new Response(error.status, error.message))
        )
    })
})

app.get("/museio/api/songbank/get_song_details", (req, res) => {
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
        // Check for a song_id param
        if (!req.query.song_id || req.query.song_id.length < 1) {
            return res.status(400).send(
               JSON.stringify(new Response(`invalid_song_id`, `A song_id parameter was either not given, or it was empty.`))
            )
        }
        else {
            var given_song_id = decodeURIComponent(req.query.song_id.trim());
        }

        var return_object = {
            song_details: null,
            song_performance: null
        }

        // Get song details
        let sql_query = `SELECT Songs.Song_ID, Songs.Name as Song_Name, Songs.Genre, Songs.Book_Page_Start, Songs.Book_Page_Finish,
        Artists.Artist_ID, Artists.Name as Artist_Name,
        CustomGenres.Custom_Genre_ID, CustomGenres.Name as Custom_Genre,
        Books.Book_ID, Books.Name as Book_Name, Books.Picture as Book_Picture,
        SheetMusic.Sheet_Music_ID, SheetMusic.Name as Sheet_Music_Name, SheetMusic.CoverPhoto as Sheet_Music_Cover_Photo
        FROM Songs
        LEFT JOIN Artists ON Songs.Artist_ID = Artists.Artist_ID
        LEFT JOIN CustomGenres ON Songs.Custom_Genre_ID = CustomGenres.Custom_Genre_ID
        LEFT JOIN Books ON Songs.Book_ID = Books.Book_ID
        LEFT JOIN SheetMusic ON SheetMusic.Song_ID = Songs.Song_ID
        LEFT JOIN SongBank ON Songs.Song_Bank_ID = SongBank.Song_Bank_ID
        LEFT JOIN Users ON SongBank.User_ID = Users.User_ID
        WHERE Users.Email_Address = ? AND Songs.Song_ID = ?`;

        program_init.connection.query(sql_query, [result.user_email_address, given_song_id], (err, result) => {
            if (err) {
                return res.status(500).send(
                   JSON.stringify(new Response(`internal_error`, `Sorry, something went wrong while fetching your given song's details.`))
                )
            }

            if (result.length < 1) {
                return res.status(200).send(
                   JSON.stringify(new Response(`no_results`, `Your given song ID '${given_song_id}' did not return any results`))
                )
            }
            else {
                return_object.song_details = result;

                // Get this song's past performance going back a month by default
                let current_date_obj = new Date();
                let previous_date_obj = new Date();
                previous_date_obj.setMonth(current_date_obj.getMonth() - 1);
                let current_date = `${current_date_obj.getFullYear()}-${current_date_obj.getMonth() + 1}-${current_date_obj.getDate()}`
                let previous_date = `${previous_date_obj.getFullYear()}-${previous_date_obj.getMonth() + 1}-${previous_date_obj.getDate()}`
                
                let performance_query = `SELECT Songs.Song_ID, Songs.Name as Song_Name, SongPerformances.Performance_Rating, SongPerformances.Practice_Date FROM museio.Songs
                LEFT JOIN SongPerformances ON Songs.Song_ID = SongPerformances.Song_ID
                WHERE SongPerformances.Practice_Date >= DATE(?) AND SongPerformances.Practice_Date <= DATE(?) AND Songs.Song_ID = ?
                ORDER BY Songs.Song_ID, SongPerformances.Practice_Date`

                program_init.connection.query(performance_query, [previous_date_obj, current_date_obj, given_song_id], (err, result) => {
                    if (err) {
                        return_object.song_performance = 'error';
                    }
                    else if (result.length < 1) {
                        return_object.song_performance = 'no_results';
                    }
                    else {
                        return_object.song_performance = result;
                    }

                    return res.status(200).send(
                       JSON.stringify(new Response(`success`, return_object))
                    )
                })
            }
        })
    })
    .catch(error => {
        return res.status(error.status_code).send(
            JSON.stringify(new Response(error.status, error.message))
        )
    })
})

app.get("/museio/api/songbank/get_all_songs", (req, res) => {
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
        let sql_query = `SELECT Songs.Song_ID, Songs.Name as Song_Name, Artists.Name as Artist_Name, Songs.Genre, CustomGenres.Name as Custom_Genre FROM Songs
        LEFT JOIN Artists ON Songs.Artist_ID = Artists.Artist_ID
        LEFT JOIN CustomGenres ON Songs.Custom_Genre_ID = CustomGenres.Custom_Genre_ID
        INNER JOIN SongBank ON Songs.Song_Bank_ID = SongBank.Song_Bank_ID
        INNER JOIN Users ON SongBank.User_ID = Users.User_ID
        WHERE Users.Email_Address = ?`;

        program_init.connection.query(sql_query, [result.user_email_address], (err, result) => {
            if (err) {
                return res.status(500).send(
                   JSON.stringify(new Response(`internal_error`, `Sorry, we couldn't get your songs at this time. Please try again.`))
                )
            }

            return res.status(200).send(
               JSON.stringify(new Response(`success`, result))
            )
        })
    })
    .catch(error => {
        return res.status(error.status_code).send(
            JSON.stringify(new Response(error.status, error.message))
        )
    })
})

app.listen(4203, 'localhost', () => {
    console.log('museio songbank microservice is listening on localhost:4203!');

    init_program()
    .then(resolve => {
        console.log(`Initialization Execution Time: ${resolve.execution_time_seconds} seconds.`);
        program_ready = true;
    })
    .catch(error => {
        console.log(error);
    })
})