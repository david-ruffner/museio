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

app.get("/museio/api/songbank/get_artist_info", (req, res) => {
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
        // Check for an artist_id param
        if (!req.query.artist_id || req.query.artist_id.length < 1) {
            return res.status(400).send(
               JSON.stringify(new Response(`invalid_artist_id`, `An artist_id param was either not given, or it was empty.`))
            )
        }
        else {
            var given_artist_id = decodeURIComponent(req.query.artist_id.trim());
        }

        let user_email_address = result.user_email_address;
        let sql_query = `SELECT Artists.Name AS Artist_Name,
        Songs.Song_ID, Songs.Name as Song_Name, COALESCE(Songs.Genre, CustomGenres.Name) as Genre FROM Artists
        INNER JOIN Songs ON Songs.Artist_ID = Artists.Artist_ID
        LEFT JOIN CustomGenres ON Songs.Custom_Genre_ID = CustomGenres.Custom_Genre_ID
        INNER JOIN SongBank ON Songs.Song_Bank_ID = SongBank.Song_Bank_ID
        INNER JOIN Users ON SongBank.User_ID = Users.User_ID
        WHERE Users.Email_Address = ? AND Artists.Artist_ID = ?`;

        program_init.connection.query(sql_query, [user_email_address, given_artist_id], (err, result) => {
            if (err) {
                return res.status(500).send(
                   JSON.stringify(new Response(`internal_error`, `Sorry, something went wrong while getting info about your given artist. Please try again.`))
                )
            }
            else if (result.length < 1) {
                return res.status(500).send(
                   JSON.stringify(new Response(`internal_error`, `Sorry, we couldn't find that artist in our system. Please contact the developer.`))
                )
            }
            else {
                var return_object = {
                    artist_name: result[0].Artist_Name,
                    artist_songs: []
                }
                        
                result.forEach(row => {
                    let first_letter = row.Song_Name[0].toLocaleLowerCase();
                    let ret_obj = return_object.artist_songs.find(obj => obj.letter_name === first_letter);
                    if (ret_obj != undefined) {
                        ret_obj.songs.push(row);
                    }
                    else {
                        let new_obj = {
                            letter_name: first_letter,
                            songs: []
                        };
                        return_object.artist_songs.push(new_obj);

                        new_obj = return_object.artist_songs.find(obj => obj.letter_name === first_letter);
                        new_obj.songs.push(row);
                    }
                })

                // Sort each result object's song results by song name ascending
                return_object.artist_songs = return_object.artist_songs.sort((a, b) => a.letter_name.localeCompare(b.letter_name));

                // Sort the results by artist name ascending
                return_object.artist_songs.forEach(artist_song => {
                    artist_song.songs = artist_song.songs.sort((a, b) => a.Song_Name.localeCompare(b.Song_Name))
                })

                return res.status(200).send(
                   JSON.stringify(new Response(`success`, return_object))
                )
            }
        })
    })
    .catch(error => {
        return res.status(error.status_code).send(
            JSON.stringify(new Response(error.status, error.message))
        )
    })
})

app.get("/museio/api/songbank/view_sheet_music", (req, res) => {
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
        // Check for a sheet_music_id parameter
        if (!req.query.sheet_music_id || req.query.sheet_music_id.length < 1) {
            return res.status(400).send(
               JSON.stringify(new Response(`invalid_sheet_music_id`, `A sheet_music_id parameter was either not given, or it was empty.`))
            )
        }
        else {
            var given_sheet_music_id = req.query.sheet_music_id.trim();
        }

        // Get details about the given book, and get its attached sheet music (if any).
        let sql_query = `select SheetMusic.File, SheetMusic.Book_Page_Start, SheetMusic.Book_Page_End from SheetMusic
        INNER JOIN Users ON SheetMusic.User_ID = Users.User_ID
        WHERE SheetMusic.Sheet_Music_ID = ? AND Users.Email_Address = ?`;

        program_init.connection.query(sql_query, [given_sheet_music_id, result.user_email_address], (err, result) => {            
            if (err) {
                console.log(err);
                logging_include.write_log(`/museio/api/books/get_book_details`, err, common_include.LOG_CATEGORIES.ERROR, 129, ERROR_LOG_TYPES.SQL);
            }
            else if (result.length < 1) {
                return res.status(200).send(
                   JSON.stringify(new Response(`no_results`, `Your given sheet_music_id '${given_sheet_music_id}' could not be found in our system.`))
                )
            }
            else {
                let response = {
                    book_page_start: result[0].Book_Page_Start,
                    book_page_end: result[0].Book_Page_End,
                    file: result.File = Buffer.from(result[0].File).toString("base64")
                }

                return res.status(200).send(
                   JSON.stringify(new Response(`success`, response))
                )
            }
        })
    })
    .catch(error => {
        return res.status(error.status_code).send(
            JSON.stringify(new Response(error.status, error.message))
        )
    })
})

app.post("/museio/api/songbank/edit_artist", (req, res) => {
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
        // Check for an artist_id param
        if (!req.body.artist_id || req.body.artist_id.length < 1) {
            return res.status(400).send(
               JSON.stringify(new Response(`invalid_artist_id`, `An artist_id param was either not given, or was empty.`))
            )
        }
        else {
            var given_artist_id = req.body.artist_id.trim();
        }

        // Check for a new_artist_name param
        if (!req.body.new_artist_name || req.body.new_artist_name.length < 1) {
            return res.status(400).send(
               JSON.stringify(new Response(`invalid_new_artist_name`, `A new_artist_name param was either not given, or it was empty.`))
            )
        }
        else {
            var given_new_artist_name = req.body.new_artist_name.trim();
            if (!common_include.edit_input_constraints.artist_name.constraint.test(given_new_artist_name)) {
                return res.status(400).send(
                   JSON.stringify(new Response(`invalid_new_artist_name`, `Your given_new_artist_name param '${given_new_artist_name}' was invalid. ${common_include.edit_input_constraints.artist_name.error_message}.`))
                )
            }
        }

        let user_email_address = result.user_email_address;
        let sql_query = `UPDATE Artists
        INNER JOIN Songs ON Songs.Artist_ID = Artists.Artist_ID
        INNER JOIN SongBank ON Songs.Song_Bank_ID = SongBank.Song_Bank_ID
        INNER JOIN Users ON SongBank.User_ID = Users.User_ID
        SET Artists.Name = ?
        WHERE Users.Email_Address = ? AND Artists.Artist_ID = ?`

        program_init.connection.query(sql_query, [given_new_artist_name, user_email_address, given_artist_id], (err, result) => {
            if (err) {
                return res.status(500).send(
                   JSON.stringify(new Response(`internal_error`, `Sorry, something went wrong while updating the artist's name.`))
                )
            }
            else if (result.affectedRows < 1) {
                return res.status(500).send(
                    JSON.stringify(new Response(`internal_error`, `Sorry, something went wrong while updating the artist's name.`))
                )
            }
            else {
                return res.status(200).send(
                   JSON.stringify(new Response(`success`, `Artist name was updated to '${given_new_artist_name}'.`))
                )
            }
        })
    })
    .catch(error => {
        return res.status(error.status_code).send(
            JSON.stringify(new Response(error.status, error.message))
        )
    })
})

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
        var return_object = {
            song_details: null,
            song_performance: null
        }
        
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
                if (return_object.song_details[0].Book_Picture) {
                    return_object.song_details[0].Book_Picture = Buffer.from(return_object.song_details[0].Book_Picture).toString("base64");
                }

                if (return_object.song_details[0].Sheet_Music_Cover_Photo) {
                    return_object.song_details[0].Sheet_Music_Cover_Photo = Buffer.from(return_object.song_details[0].Sheet_Music_Cover_Photo).toString("base64");
                }

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

app.get("/museio/api/songbank/get_songs_by_filter", (req, res) => {
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
        // Check for a filter param
        if (!req.query.filter || req.query.filter.length < 1) {
            return res.status(400).send(
               JSON.stringify(new Response(`invalid_filter_param`, `A filter param was either not given, or it was empty.`))
            )
        }
        else {
            var given_filter = decodeURIComponent(req.query.filter.trim());

            // Determine the order by filter to use for the sql query
            var order_by_filter = null;
            let given_user_email_address = result.user_email_address;
            let sql_query = null;

            switch (given_filter) {
                case "artist":
                    order_by_filter = "ORDER BY Artists.Name";

                    sql_query = `SELECT Songs.Song_ID, Songs.Name as Song_Name, Artists.Name as Artist_Name, Songs.Genre, CustomGenres.Name as Custom_Genre FROM Songs
                    LEFT JOIN Artists ON Songs.Artist_ID = Artists.Artist_ID
                    LEFT JOIN CustomGenres ON Songs.Custom_Genre_ID = CustomGenres.Custom_Genre_ID
                    INNER JOIN SongBank ON Songs.Song_Bank_ID = SongBank.Song_Bank_ID
                    INNER JOIN Users ON SongBank.User_ID = Users.User_ID
                    WHERE Users.Email_Address = ?`;

                    program_init.connection.query(sql_query, [given_user_email_address], (err, result) => {
                        if (err) {
                            return res.status(500).send(
                            JSON.stringify(new Response(`internal_error`, `Sorry, we couldn't get your songs at this time. Please try again.`))
                            )
                        }

                        let return_object = [];
                        
                        result.forEach(row => {
                            let ret_obj = return_object.find(obj => obj.artist_name === row.Artist_Name);
                            if (ret_obj != undefined) {
                                ret_obj.song_results.push(row);
                            }
                            else {
                                return_object.push(
                                    {
                                        artist_id: row.Artist_ID,
                                        artist_name: row.Artist_Name,
                                        song_results: [row]
                                    }
                                )
                            }
                        })

                        // Sort each result object's song results by song name ascending
                        return_object.forEach(ro => {
                            ro.song_results = ro.song_results.sort((a, b) => a.Song_Name.localeCompare(b.Song_Name));
                        })

                        // Sort the results by artist name ascending
                        return_object = return_object.sort((a, b) => a.artist_name.localeCompare(b.artist_name))

                        return res.status(200).send(
                            JSON.stringify(new Response(`success`, return_object))
                        )
                    })
                    break;

                case "genre":
                    order_by_filter = "ORDER BY Genre"

                    sql_query = `SELECT Songs.Song_ID, Songs.Name as Song_Name, Artists.Name as Artist_Name, CustomGenres.Custom_Genre_ID, COALESCE(Songs.Genre, CustomGenres.Name) as Genre FROM Songs
                    LEFT JOIN Artists ON Songs.Artist_ID = Artists.Artist_ID
                    LEFT JOIN CustomGenres ON Songs.Custom_Genre_ID = CustomGenres.Custom_Genre_ID
                    INNER JOIN SongBank ON Songs.Song_Bank_ID = SongBank.Song_Bank_ID
                    INNER JOIN Users ON SongBank.User_ID = Users.User_ID
                    WHERE Users.Email_Address = ?
                    ORDER BY Genre`;

                    program_init.connection.query(sql_query, [given_user_email_address], (err, result) => {
                        if (err) {
                            return res.status(500).send(
                            JSON.stringify(new Response(`internal_error`, `Sorry, we couldn't get your songs at this time. Please try again.`))
                            )
                        }

                        let return_object = [];
                        
                        result.forEach(row => {
                            let ret_obj = return_object.find(obj => obj.genre_name === row.Genre);
                            if (ret_obj != undefined) {
                                ret_obj.song_results.push(row);
                            }
                            else {
                                return_object.push(
                                    {
                                        genre_id: row.Genre_ID,
                                        genre_name: row.Genre,
                                        song_results: [row]
                                    }
                                )
                            }
                        })
                        
                        // Sort each result object's song results by song name ascending
                        return_object.forEach(ro => {
                            ro.song_results = ro.song_results.sort((a, b) => a.Song_Name.localeCompare(b.Song_Name));
                        })
                        
                        // Sort the results by genre name ascending
                        return_object = return_object.sort((a, b) => a.genre_name.localeCompare(b.genre_name))

                        return res.status(200).send(
                            JSON.stringify(new Response(`success`, return_object))
                        )
                    })
                    break;

                default:
                    return res.status(400).send(
                       JSON.stringify(new Response(`invalid_filter`, `Your given filter param '${given_filter}' is invalid.`))
                    )
            }
        }
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