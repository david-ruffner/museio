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

    // update_container_states('dashboard', ['dashboard', 'sidebar'])
    // .then(function(result) {
    //     if (result) {
    //         console.log("finished loading");
    //     }
    // })
    // .catch(function(error) {
    //     console.log(error);
    // })

    // // Try to get the user's dashboard info with their token
    // let user_token = get_user_token();
    
    // if (user_token) {
    //     $.ajax({
    //         url: `${base_api_url}/dashboard/get_dashboard`,
    //         type: 'GET',
    //         beforeSend: function(xhr) {
    //             xhr.setRequestHeader('Authorization', `Bearer ${user_token}`)
    //         },
    //         success: function(result) {
    //             try {
    //                 result = JSON.parse(result);
    //                 console.log(result);

    //                 // Check the result status for different actions
    //                 switch (result.status) {
    //                     case "invalid_token":
    //                     case "internal_error":
    //                     case "incorrect_username_or_password":
    //                         return log_user_out();
    //                 }

    //                 // If the result has a new token extra param, override the current local storage token with this new one.
    //                 if (result.extra_parameters && result.extra_parameters.new_token) {
    //                     localStorage.setItem("museio_user_token", result.extra_parameters.new_token);
    //                 }

    //                 // Set the current category option if applicable
    //                 let get_params = parse_get_parameters();
    //                 if (get_params) {
    //                     let current_category_option = get_params.find(param => param.parameter_name === "category_option");
    //                     if (current_category_option) {
    //                         if (current_category_option.parameter_value === 'dashboard') {
    //                             $("#sidebar_dashboard_button > .sidebar_category_header_container").toggleClass("active_category_option");
    //                         }
    //                         else {
    //                             $("#sidebar_dashboard_button > .sidebar_category_header_container").toggleClass("active_category_option");
                                
    //                             // Get the sidebar category option that should be active, and highlight it.
    //                             let active_category_option = $(".sidebar_category_options_header_container").filter(function() {
    //                                 if ($(this).data().url_param && $(this).data().url_param === current_category_option.parameter_value) {
    //                                     return true;
    //                                 }
    //                             })
    //                             if (active_category_option) {
    //                                 // De-activate the current category option
    //                                 $(".active_category_option").each(function() {
    //                                     $(this).toggleClass("active_category_option");
    //                                 })

    //                                 active_category_option.toggleClass('active_category_option');
    //                             }
    //                         }
    //                     }
    //                 }

    //                 // Set information about the user's profile if it was returned
    //                 if (result.extra_parameters) {
    //                     // Set the profile photo
    //                     if (result.extra_parameters.user_profile_photo && result.extra_parameters.user_profile_photo.length > 0) {
    //                         $(".user_profile_picture").attr("src", `data:image/png;base64,${result.extra_parameters.user_profile_photo}`);
    //                     }
    //                     else {
    //                         // Set a blank profile photo
    //                         $(".user_profile_picture").attr("src", '../../resources/images/blank_profile.png');
    //                     }

    //                     // Set the user's first name
    //                     if (result.extra_parameters.user_first_name && result.extra_parameters.user_first_name.length > 0) {
    //                         $("#sidebar_login_container > h1").text(`Hi, ${result.extra_parameters.user_first_name}`);
    //                     }
    //                     else {
    //                         // Set a generic title in place of a name
    //                         $("#sidebar_login_container > h1").text("Muse.io");
    //                     }
    //                 }
    //                 if (result.extra_parameters && result.extra_parameters.profile_photo
    //                     && result.extra_parameters.profile_photo.length > 0) {
                        
    //                 }
    //             }
    //             catch (ex) {
    //                 app_critical_failure();
    //             }
    //         },
    //         error: function(error) {
    //             log_user_out();
    //         }
    //     })
    // }
})