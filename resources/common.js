// Common resources and functions used across the client side of the app

// Dynamically loads the sidebar content so we don't have to copy paste it into each index file
$(document).ready(function() {
    $.ajax({
        url: "../../resources/navbar.html",
        type: "GET",
        success: function(text) {
            $("body").prepend(text);
        }
    })
})

// Determines if we're on a mobile device or not (starts at width: 1100px)
var client_is_mobile = false;

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

// Show a custom tooltip when an edit icon is hovered over
var tooltip_armed = false; // 250ms delay before showing the tooltip to prevent accidental discharge
$(document).on("mouseover", ".edit_icon_hover", function() {
    if (!client_is_mobile) {
        let edit_icon = $(this);
        tooltip_armed = true;
        
        setTimeout(function() {
            if (tooltip_armed) {
                edit_icon.parent().siblings(".edit_icon_tooltip").animate({opacity: 1}, 150);
                tooltip_armed = false;
            }
        }, 250);
    }
})

$(document).on("mouseleave", ".edit_icon_hover", function() {
    if (!client_is_mobile) {
        $(this).parent().siblings(".edit_icon_tooltip").animate({opacity: 0}, 250);
        tooltip_armed = false;
    }
})

// Animate a display song when it's hovered over
var display_song_active = false;
// var display_song_armed = false;
$(document).on("mouseover", ".alphabetical_display_song", function() {
    if (!client_is_mobile && !display_song_active) {
        let display_song = $(this);
        display_song.data().hover_armed = true;

        setTimeout(function() {
            if (display_song.data().hover_armed) {
                display_song.animate({width: '90%', height: '46px', paddingBottom: '3px'}, 250)
                display_song_active = true;
                display_song.data().hover_armed = false;
            }
        }, 250);
    }
})

$(document).on("mouseleave", ".alphabetical_display_song", function() {
    if ($(this).data().hover_armed) {
        $(this).data().hover_armed = false;
    }

    if (!client_is_mobile && display_song_active) {
        display_song_active = false;
        $(this).animate({width: '85%', height: '31px', paddingBottom: '15px'}, 250)
    }
})

// Constraints for edit inputs (find the appropriate one by using the input's data-constraint_name property)
const edit_input_constraints = {
    artist_name: {
        constraint: /^[A-Za-z 0-9\-\_\!\@\#\$\%\+\=]{1,300}$/,
        error_message: 'Artist names must be 1 to 300 characters long, and can only have uppercase and lowercase letters, spaces, numbers, and the following characters: - _ ! @ # $ % + ='
    }
}

$(document).on("mousedown", ".songbank_display_song", function(e) {
    try {
        // Get the song's ID
        let song_id = $(this).data().song_id;

        // Go to the song detail page
        // TODO: Change this to production URL
        let url = `https://museio.davidr.pro/song_detail?song_id=${encodeURIComponent(song_id)}`;
        switch (e.which) {
            case 1:
                window.open(url, "_self");
                break;
            case 2:
                window.open(url, "_blank");
                break;
        }
    }
    catch (ex) {
        console.log("Sorry, something went wrong while opening that song. Please try again.");
    }
})

// Fades out the loading container found on most pages
function loading_container_fadeout(fade_time = 1000) {
    $("#loading_container").animate({bottom: '100%', opacity: 0}, fade_time);
}

// Displays a simple error message and falls back to the dashboard page
function error_and_fallback(message, fallback_page = "https://museio.davidr.pro/dashboard", open_page_type = "_self") {
    alert(message);
    window.location(fallback_page, open_page_type);
}