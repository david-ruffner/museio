// Determines if we're on a mobile device or not (starts at width: 1100px)
var client_is_mobile = false;

// Common resources and functions used across the client side of the app
const base_api_url = 'https://museio.davidr.pro/museio/api';
const login_page_url = 'https://museio.davidr.pro/';
const dashboard_page_url = 'https://museio.davidr.pro/dashboard'

var user_profile_loaded = false;

// Keeps track of states that need to be loaded before displaying something
const container_states = {
    sidebar: false,
    dashboard: false
}

// Parses the GET parameters in the current URL
function parse_get_parameters() {
    if (location.search.length < 1) {
        return null;
    }
    else {
        var parameters = [];
        location.search
            .substr(1)
            .split("&")
            .forEach(function (item) {
                let temp = item.split("=");
                parameters.push(
                    {
                        parameter_name: temp[0],
                        parameter_value: temp[1]
                    }
                )
            });

        return parameters;
    }
}

// Updates container states, called from various functions.
function update_container_states(container_name, required_container_names) {
    return new Promise((resolve, reject) => {
        if (!container_states[container_name]) {
            reject("Invalid container name");
        }
        else {
            container_states[container_name] = true;
        }
    
        let active_containers = 0;
        required_container_names.forEach(container_name => {
            if (container_states[container_name]) {
                active_containers++;
            }
        })

        resolve((active_containers >= required_container_names.length) ? true : false);
    })
}

// Gets a user token from either session storage or local storage
function get_user_token() {
    let user_token = sessionStorage.getItem('museio_user_token');
    if (!user_token || user_token.length < 1) {
        user_token = localStorage.getItem("museio_user_token");
        if (!user_token || user_token.length < 1) {
            // Log the user out
            log_user_out(true, "Sorry, we can't find your token so you're going to have to log back in.");
            return false;
        }
    }

    return user_token;
}

// Removes a user's tokens and logs them out
function log_user_out(display_alert = true, alert_message = null) {
    sessionStorage.removeItem('museio_user_token');
    sessionStorage.removeItem('museio_sidebar_profile_set');
    localStorage.removeItem('museio_user_token');

    if (display_alert) {
        alert((alert_message) ? alert_message : "Sorry, we're going to have to log you out. Please log in again.");
    }

    location.replace("https://museio.davidr.pro");
}