// Common classes and functions used accross the entire back-end

class Response {
    constructor(status, message, status_code = null, extra_parameters = null) {
        this.status = status;
        this.message = message;
        
        if (status_code) {
            this.status_code = status_code;
        }
        
        if (extra_parameters) {
            this.extra_parameters = extra_parameters;
        }
    }
}

// Constraints for edit inputs (find the appropriate one by using the input's data-constraint_name property)
const edit_input_constraints = {
    artist_name: {
        constraint: /^[A-Za-z 0-9\-\_\!\@\#\$\%\+\=]{1,300}$/,
        error_message: 'Artist names must be 1 to 300 characters long, and can only have uppercase and lowercase letters, spaces, numbers, and the following characters: - _ ! @ # $ % + ='
    }
}

/*
    Tests passwords for an uppercase and lowercase letter, a number, a special character,
    and for length between 8 and 100 characters inclusive.
*/
function test_password_input(password_input) {
    if (
        !/[A-Za-z]/.test(password_input) ||
        !/[0-9]/.test(password_input) ||
        !/[\-\_\@\.\!\#\$\%\^\&\*\+\=]/.test(password_input) ||
        password_input.length < 8 || password_input.length > 100
    ) {
        return false;
    }
    else {
        return true;
    }
}

module.exports = {
    Response: Response,
    test_password_input: test_password_input,
    edit_input_constraints: edit_input_constraints
}