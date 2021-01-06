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
const logging_include = require('./backend_includes/logging_include');
const { ERROR_LOG_TYPES } = require('./backend_includes/common_include');

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
        // Check for a book_id parameter
        if (!req.query.book_id || req.query.book_id.length < 1) {
            return res.status(400).send(
               JSON.stringify(new Response(`invalid_book_id`, `A book_id parameter was either not given, or it was empty.`))
            )
        }
        else {
            var given_book_id = req.query.book_id.trim();
        }

        // Get details about the given book, and get its attached sheet music (if any).
        let sql_query = `select Books.*,
        SheetMusic.Sheet_Music_ID, SheetMusic.File as Sheet_Music_File, SheetMusic.Name as Song_Name, SheetMusic.Book_Page_Start, SheetMusic.Book_Page_End
        FROM Books
        LEFT JOIN SheetMusic ON Books.Book_ID = SheetMusic.Book_ID
        WHERE Books.Book_ID = ?`;

        program_init.connection.query(sql_query, [given_book_id], (err, result) => {
            let response_results = [];
            
            if (err) {
                console.log(err);
                logging_include.write_log(`/museio/api/books/get_book_details`, err, common_include.LOG_CATEGORIES.ERROR, 129, ERROR_LOG_TYPES.SQL);
            }
            else if (result.length < 1) {
                return res.status(200).send(
                   JSON.stringify(new Response(`no_results`, `Your given book_id '${given_book_id}' could not be found in our system.`))
                )
            }
            else {
                result.forEach(row => {
                    let result_obj = response_results.find(obj => obj.book_id === row.Book_ID);
                    if (result_obj != undefined) {
                        // This book has already been added to the results, so just add this row as a sheet music child
                        result_obj.book_toc.push({
                            name: row.Song_Name,
                            sheet_music_id: row.Sheet_Music_ID,
                            sheet_music_file: Buffer.from(row.Sheet_Music_File).toString("base64"),
                            book_page_start: row.Book_Page_Start,
                            book_page_end: row.Book_Page_End
                        })
                    }
                    else {
                        response_results.push({
                            book_id: row.Book_ID,
                            book_details: {
                                name: row.Name,
                                picture: Buffer.from(row.Picture).toString("base64"),
                                author: row.Author,
                                total_pages: row.Total_Pages
                            },
                            book_toc: [
                                {
                                    name: row.Song_Name,
                                    sheet_music_id: row.Sheet_Music_ID,
                                    sheet_music_file: Buffer.from(row.Sheet_Music_File).toString("base64"),
                                    book_page_start: row.Book_Page_Start,
                                    book_page_end: row.Book_Page_End
                                }
                            ]
                        })
                    }
                })

                // Sort each book's toc by starting page number
                response_results.forEach(book => {
                    if (book.book_toc && book.book_toc.length > 0) {
                        book.book_toc = book.book_toc.sort((a, b) => a.book_page_start < b.book_page_start);
                    }
                })

                return res.status(200).send(
                   JSON.stringify(new Response(`success`, response_results))
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