const fs = require('fs');
const { LOG_CATEGORIES } = require('./common_include.js');
const common_include = require("./common_include.js");

/*
    Categories can be:
        - info (general info)
        - error (an error message)
*/
async function write_log(endpoint_name, message, log_category, line_number, error_log_type = null) {
    var datetime = new Date();
    // -5 for Eastern Time (we won't take DST into account)
    datetime.setHours(datetime.getHours() - 5);

    let log_date = `${(datetime.getMonth() + 1 < 10) ? "0" + (datetime.getMonth() + 1) : (datetime.getMonth() + 1)}/${(datetime.getDate() < 10) ? "0" + datetime.getDate() : datetime.getDate()}/${datetime.getFullYear()}`;
    let service_name = endpoint_name.split("/");
    try {
        service_name = service_name[service_name.length - 2];
    }
    catch (ex) {
        service_name = service_name[0];
    }
    
    let file_path = `/var/log/museio/museio_${service_name.toLocaleLowerCase()}_log_${log_date.replace(/\//g, "-")}.log`;

    let period = (datetime.getHours() < 12) ? 'A.M.' : 'P.M.';
    let hours = (datetime.getHours() > 12) ? (datetime.getHours() - 12) : datetime.getHours(); // Convert to 12 hour time
    let minutes = (datetime.getMinutes() < 10) ? `0${datetime.getMinutes()}` : datetime.getMinutes();
    let seconds = (datetime.getSeconds() < 10) ? `0${datetime.getSeconds()}` : datetime.getSeconds();
    
    if (datetime.getMilliseconds() < 10) {
        var milliseconds = `00${datetime.getMilliseconds()}`;
    }
    else if (datetime.getMilliseconds() < 100) {
        var milliseconds = `0${datetime.getMilliseconds()}`;
    }
    else {
        var milliseconds = datetime.getMilliseconds();
    }
    
    let display_time = `${hours}:${minutes}:${seconds}.${milliseconds} ${period}`

    var log = "";
    switch (error_log_type) {
        case "default":
            log = log.concat(
                '---------------\n',
                `CATEGORY: ${log_category.toUpperCase()}\n`,
                `DATE: ${log_date}\n`,
                `TIME: ${display_time}\n`,
                `ENDPOINT: ${endpoint_name}\n`,
                `MESSAGE: ${message}\n`,
                `LINE NUMBER: ${line_number}\n`,
                '---------------\n'
            );
            break;

        case "sql":
            log = log.concat(
                '---------------\n',
                `CATEGORY: ${log_category.toUpperCase()}\n`,
                `DATE: ${log_date}\n`,
                `TIME: ${display_time}\n`,
                `ENDPOINT: ${endpoint_name}\n`,
                `ERROR CODE: ${message.code}\n`,
                `MESSAGE: ${message.message}\n`,
                `SQL: ${message.sql}\n`,
                `SQL MESSAGE: ${message.sqlMessage}\n`,
                `SQL STATE: ${message.sqlState}\n`,
                `STACK TRACE: ${message.stack}\n`,
                `LINE NUMBER: ${line_number}\n`,
                '---------------\n'
            );
            break;
    }

    fs.appendFile(file_path, log, function(err) {
        if (err) {
            console.log(`Error: Couldn't write out ${service_name} log file`);
            console.log(err);
        }
    })
}

module.exports = {
    write_log: write_log
}