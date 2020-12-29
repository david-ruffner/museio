/*
    Critical failure is something that happens that meaans the web app can't continue.
    The user is told to contact the developer, and then taken back to the login page.
    This shouldn't ever happen in release, but it's there as a stop gap just in case something goes wrong.
*/
function app_critical_failure(message_override = false) {
    if (message_override) {
        alert(message_override)
    }
    else {
        alert("Sorry, something went wrong on our end. Please contact the developer.")
    }

    window.open(login_page_url, "_self");
}

// Tries to get the user's token from either session or local storage. Logs them out if a token can't be found.
// function get_user_token() {
//     let user_token = sessionStorage.getItem('museio_user_token');
//     if (!user_token || user_token.length < 1) {
//         user_token = localStorage.getItem("museio_user_token");
//         if (!user_token || user_token.length < 1) {
//             alert("Sorry, we couldn't find your token. You will have to log back in.");
//             location.replace("https://museio.davidr.pro");
//             return false;
//         }
//     }

//     return user_token;
// }

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

function check_dashboard_state() {
    
}

$(document).ready(function() {
    if (client_is_mobile) {
        $("#sidebar_songbank_container").data().container_state = false;
        $("#sidebar_songbank_container > .sidebar_category_header_container > .sidebar_category_collapse_icon").removeClass("collapse_icon_open");
    }

    //TODO: In reality, dashboard will also need to be loaded
    container_states.dashboard = true;

    // Continuously checks the container states to see when the dashboard and sidebar are loaded
    var check_dashboard_state_loop_id = setInterval(function() {
        if (container_states.dashboard && container_states.sidebar) {
            clearInterval(check_dashboard_state_loop_id);

            // Show the dashboard
            $("#loading_container").animate({bottom: '100%', opacity: 0}, 1000);

            $("#sidebar_container").css({overflowY: 'auto', height: 'max-content'})
        }
    }, 250);
})