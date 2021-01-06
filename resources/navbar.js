// Handles JS for the navbar that is the same on all app pages

// Expands or collapses a sidebar category when clicked
$(".sidebar_category_header_container").click(function() {
    if ($(this).hasClass("not_category_tray")) {
        if ($(this).data().url_param) {
            window.open(`${dashboard_page_url}?category_option=${$(this).data().url_param}`, '_self');
        }
    }

    let parent_container = $(this).parent();
    let icon_arrow = $(this).children(".sidebar_category_collapse_icon");
    
    // Check for the parent's data-container_open value
    let container_state = parent_container.data().container_state;
    if (container_state) {
        icon_arrow.toggleClass("collapse_icon_open");

        // Collapse the container
        parent_container.children(".sidebar_category_options_container").animate({height: 0}, 150);

        parent_container.data({container_state: false});
    }
    else {
        icon_arrow.toggleClass("collapse_icon_open");

        // Get the number of children in the container
        // Each child in the container is about 75 pixels in height
        let container_multiplier = (client_is_mobile) ? 171 : 75;

        let container_height = (parent_container.children(".sidebar_category_options_container").children().length) * container_multiplier;
        parent_container.children(".sidebar_category_options_container").animate({height: `${container_height}px`}, 150);

        parent_container.data({container_state: true});
    }
})

// Handles modal opening
function open_modal(model_id) {
    switch (model_id) {
        case 'reset_password':
            $("#reset_password_background").css("display", "grid").animate({opacity: 1}, 250);
            $("#reset_password_container").animate({bottom: 0}, 250, function() {
                $("#reset_password_current_input").focus();
            });
    }
}

// Handles other actions
function handle_other_action(other_action_id) {
    switch (other_action_id) {
        case 'logout':
            log_user_out(false);
            break;
    }
}

// When a sidebar category option is clicked
$(".sidebar_category_options_header_container").click(function() {
    if ($(this).data().url_param && $(this).data().url_param.length > 0) {
        let url = ($(this).data().page && $(this).data().page.length > 0) ? `https://museio.davidr.pro/${$(this).data().page}?category_option=${$(this).data().url_param}` : `${dashboard_page_url}?category_option=${$(this).data().url_param}`;
        window.open(url, '_self');
    }
    else if ($(this).data().open_modal && $(this).data().open_modal.length > 0) {
        open_modal($(this).data().open_modal);
    }
    else if ($(this).data().other_action && $(this).data().other_action.length > 0) {
        handle_other_action($(this).data().other_action);
    }
    else {
        let url = `https://museio.davidr.pro/${$(this).data().page}`;
        window.open(url, '_self');
    }
})

// When a sidebar category is middle clicked, open it in a new tab.
$(".sidebar_category_options_header_container").mousedown(function(e) {
    switch (e.which) {
        case 2:
            if ($(this).data().url_param && $(this).data().url_param.length > 0) {
                let url = ($(this).data().page && $(this).data().page.length > 0) ? `https://museio.davidr.pro/${$(this).data().page}?category_option=${$(this).data().url_param}` : `${dashboard_page_url}?category_option=${$(this).data().url_param}`;
                window.open(url, '_blank');
            }
            else if ($(this).data().open_modal && $(this).data().open_modal.length > 0) {
                open_modal($(this).data().open_modal);
            }
            else if ($(this).data().other_action && $(this).data().other_action.length > 0) {
                handle_other_action($(this).data().other_action);
            }
            else {
                let url = `https://museio.davidr.pro/${$(this).data().page}`;
                window.open(url, '_blank');
            }
            break;
    }
})

// When the password reset cancel button is clicked
$(".reset_password_cancel_button").click(function() {
    reset_password_close_modal();
})

function reset_password_close_modal() {
    $("#reset_password_container").animate({bottom: '100%'}, 250);
    $("#reset_password_background").animate({opacity: 0}, 250, function() {
        $(this).css("display", "none");

        // Reset the modal
        $("#reset_password_success_status_container, #reset_password_error_status_container").css({display: 'none'});
        $("#reset_password_inputs_container").css({display: 'grid', opacity: 1});

        // Clear the inputs
        $("#reset_password_current_input, #reset_password_new_input").val("");
    })
}

function reset_password_display_status(error_object) {
    try {
        // Use the text height test container to get the height of the status text
        let container_height = Math.round($("#reset_password_text_height_test > h1").text(error_object.message).parent().height()) + 50;

        // Set the status container's text
        $("#reset_password_status_container > h1").text(error_object.message);

        // Change the status box background color depending on the passed status param
        switch (error_object.status) {
            case "error":
                $("#reset_password_status_container > h1").css("color", "white")
                .parent().css("background-color", "var(--error-box-red)");
                break;

            default:
                $("#reset_password_status_container > h1").css("color", "black")
                .parent().css("background-color", "white");
                break;
        }

        // Highlight a given object if applicable
        if (error_object.highlight_object) {
            if (!error_object.highlight_property) {
                error_object.highlight_property = 'background-color';
            }

            if (!error_object.highlight_color) {
                error_object.highlight_color = 'var(--error-box-red)';
            }

            try {
                $(error_object.highlight_object).css(error_object.highlight_property, error_object.highlight_color);
            }
            catch (ex) {
                // Do nothing
            }
        }

        // Focus on a given object if applicable
        if (error_object.focus_object) {
            $(error_object.focus_object).focus();
        }

        // Slide in the status container
        $("#reset_password_status_container").animate({height: `${container_height}px`}, 250);
    }
    catch (ex) {
        // Fallback in case there's some reason that we can't display the status container
        alert(error_object.message);
    }
}

function get_password_reset_inputs() {
    return new Promise((resolve, reject) => {
        let current_password_input = $("#reset_password_current_input").val().trim();
        if (!current_password_input || current_password_input.length < 1) {
            return reject(
                {
                    status: "error",
                    message: 'The current password input cannot be empty.',
                    highlight_object: '#reset_password_current_input',
                    focus_object: '#reset_password_current_input'
                }
            );
        }
        else if (
            !/[A-Za-z]/.test(current_password_input) ||
            !/[0-9]/.test(current_password_input) ||
            !/[\-\_\@\.\!\#\$\%\^\&\*\+\=]/.test(current_password_input) ||
            current_password_input.length < 8 || current_password_input.length > 100
        ) {
            return reject(
                {
                    status: 'error',
                    message: `Invalid current password. Password's must contain an uppercase and lowercase letter, a number, a special character, and must be between 8 and 100 characters.`,
                    highlight_object: '#reset_password_current_input',
                    focus_object: '#reset_password_current_input'
                }
            );
        }

        let new_password_input = $("#reset_password_new_input").val().trim();
        if (!new_password_input || new_password_input.length < 1) {
            return reject(
                {
                    status: "error",
                    message: 'The new password input cannot be empty.',
                    highlight_object: '#reset_password_new_input',
                    focus_object: '#reset_password_new_input'
                }
            );
        }
        else if (
            !/[A-Za-z]/.test(new_password_input) ||
            !/[0-9]/.test(new_password_input) ||
            !/[\-\_\@\.\!\#\$\%\^\&\*\+\=]/.test(new_password_input) ||
            new_password_input.length < 8 || new_password_input.length > 100
        ) {
            return reject(
                {
                    status: 'error',
                    message: `Invalid new password. Password's must contain an uppercase and lowercase letter, a number, a special character, and must be between 8 and 100 characters.`,
                    highlight_object: '#reset_password_new_input',
                    focus_object: '#reset_password_new_input'
                }
            );
        }

        // Check if the two passwords are the same
        if (current_password_input === new_password_input) {
            return reject(
                {
                    status: 'error',
                    message: 'New password cannot be the same as your current password',
                    focus_object: '#reset_password_current_input'
                }
            )
        }

        resolve({
            current_password: current_password_input,
            new_password: new_password_input
        })
    })
}

// When the password reset submit button is clicked
$("#reset_password_submit_button").click(function() {
    // Hide the status container
    $("#reset_password_status_container").css({height: 0});

    get_password_reset_inputs()
    .then(result => {
        let user_token = get_user_token();

        if (user_token) {
            // Call the API
            $.ajax({
                url: `${base_api_url}/users/reset_password`,
                type: 'POST',
                data: result,
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('Authorization', `Bearer ${user_token}`)
                },
                success: function(result) {
                    result = JSON.parse(result);

                    console.log(result);
                    
                    // Remove all current tokens
                    sessionStorage.removeItem('museio_user_token');
                    localStorage.removeItem('museio_user_token');

                    // Place the returned new token in session storage
                    if (result.extra_parameters && result.extra_parameters.new_token) {
                        sessionStorage.setItem('museio_user_token', result.extra_parameters.new_token);
                    }
                    
                    $("#reset_password_container").animate({opacity: 0}, 250, function() {
                        $("#reset_password_inputs_container").css("display", "none");
                        $("#reset_password_success_status_container").css("display", "grid");
                        $(this).animate({opacity: 1}, 250);
                    })
                },
                error: function(error) {
                    console.log(error);
                    reset_password_display_status(
                        {
                            status: 'error',
                            message: error.message
                        }
                    )
                }
            })
        }

        // $("#reset_password_container").animate({height: '350px', width: '700px'}, 250);
    })
    .catch(error_object => {
        try {
            reset_password_display_status(error_object);
        }
        catch (ex) {
            // Fallback in case the error response doesn't come back in standard format of {error: 'error code', message: 'error message'}
            reset_password_display_status(
                {
                    status: 'error',
                    message: 'Sorry, something went wrong on our end.'
                }
            )
        }
    })
})

// Click on the reset password modal logout button
$("#reset_password_logout_button").click(function() {
    log_user_out(false);
})

// Opens and closes the user options drawer
$(".user_options_toggle").click(function() {
    // Get the current state of the user options container
    let parent_container = $(".user_options_container");

    let icon_arrow = $(".user_options_toggle");
    
    // Check for the parent's data-container_open value
    let container_state = parent_container.data().container_state;
    if (container_state) {
        icon_arrow.toggleClass("collapse_icon_open");

        // Collapse the container
        parent_container.animate({height: 0}, 150);

        parent_container.data().container_state = false;
    }
    else {
        icon_arrow.toggleClass("collapse_icon_open");

        // Get the number of children in the container
        // Each child in the container is about 75 pixels in height
        let container_multiplier = (client_is_mobile) ? 171 : 75;
        let container_height = (parent_container.children().length) * container_multiplier;
        parent_container.animate({height: `${container_height}px`}, 150);

        parent_container.data().container_state = true;
    }
})

$(document).ready(function() {
    // Check if the user is on mobile
    client_is_mobile = ($(document).width() <= 1100) ? true : false;

    // Check for user info in session storage
    let user_profile_info = sessionStorage.getItem('museio_user_info');
    if (!user_profile_info) {
        // Check for a token
        let user_token = get_user_token();

        if (user_token) {
            $.ajax({
                url: 'https://museio.davidr.pro/museio/api/users/get_profile_info',
                type: 'GET',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('Authorization', `Bearer ${user_token}`)
                },
                success: function(result) {
                    result = JSON.parse(result);

                    // Check the response status
                    switch (result.status) {
                        case "expired_token":
                        case "invalid_token":
                            log_user_out();
                            break;

                        case "success":
                            // If the result has a new_token property, the user has a persistent token so store this new token in local storage.
                            if (result.extra_parameters.new_token) {
                                localStorage.setItem('museio_user_token', result.extra_parameters.new_token);
                            }

                            // Store the user profile info that came back
                            let user_profile_info = {
                                user_email_address: result.extra_parameters.user_email_address,
                                user_first_name: result.extra_parameters.user_first_name,
                                user_last_name: result.extra_parameters.user_last_name,
                                user_profile_photo: result.extra_parameters.user_profile_photo
                            }
                            console.log(user_profile_info);
                            sessionStorage.setItem('museio_user_info', JSON.stringify(user_profile_info));
                            break;
                    }

                    prepare_nav_bar();
                },
                error: function(error) {
                    log_user_out();
                }
            })
        }
    }
    else {
        prepare_nav_bar();
    }
})

// Prepares the side navbar on document load
function prepare_nav_bar() {
    // Set the current category option if applicable
    let get_params = parse_get_parameters();
    if (get_params) {
        console.log(get_params);
        let current_category_option = get_params.find(param => param.parameter_name === "category_option");
        if (current_category_option) {
            if (current_category_option.parameter_value === 'dashboard') {
                $("#sidebar_dashboard_button > .sidebar_category_header_container").toggleClass("active_category_option");
            }
            else {
                $("#sidebar_dashboard_button > .sidebar_category_header_container").toggleClass("active_category_option");
                
                // Get the sidebar category option that should be active, and highlight it.
                let active_category_option = $(".sidebar_category_options_header_container").filter(function() {
                    if ($(this).data().url_param) {
                        let url_params = $(this).data().url_param.split(",");
                        url_params.forEach((param, index) => {
                            url_params[index] = param.trim();
                        })
                        
                        if (url_params.includes(current_category_option.parameter_value)) {
                            return true;
                        }
                    }
                })
                if (active_category_option) {
                    // De-activate the current category option
                    $(".active_category_option").each(function() {
                        $(this).toggleClass("active_category_option");
                    })

                    active_category_option.toggleClass('active_category_option');
                }
            }
        }
    }
    else {
        // Get the current page, and find the active choice by that
        let current_page = window.location.pathname.replace(/[\\\/]/g, "");
        $("#sidebar_dashboard_button > .sidebar_category_header_container").toggleClass("active_category_option");
                
        // Get the sidebar category option that should be active, and highlight it.
        let active_category_option = $(".sidebar_category_options_header_container").filter(function() {
            return ($(this).data().page && $(this).data().page === current_page);
        })
        if (active_category_option) {
            // De-activate the current category option
            $(".active_category_option").each(function() {
                $(this).toggleClass("active_category_option");
            })

            active_category_option.toggleClass('active_category_option');
        }
    }

    // Set information about the user's profile
    try {
        var user_profile_info = sessionStorage.getItem('museio_user_info');
        user_profile_info = JSON.parse(user_profile_info);
    }
    catch (ex) {
        console.log(ex);
        log_user_out();
    }

    console.log(user_profile_info);

    // Set the profile photo
    if (user_profile_info.user_profile_photo && user_profile_info.user_profile_photo.length > 0) {
        $(".user_profile_picture").attr("src", `data:image/png;base64,${user_profile_info.user_profile_photo}`);
    }
    else {
        // Set a blank profile photo
        $(".user_profile_picture").attr("src", '../../resources/images/blank_profile.png');
    }

    // Set the user's first name
    if (user_profile_info.user_first_name && user_profile_info.user_first_name.length > 0) {
        $("#sidebar_login_container > h1").text(`Hi, ${user_profile_info.user_first_name}`);
    }
    else {
        // Set a generic title in place of a name
        $("#sidebar_login_container > h1").text("Muse.io");
    }

    // Wait until the profile picture is finished loading
    $(".user_profile_picture").on("load", function() {
        container_states.sidebar = true;
    })
}

// Processes that must happen when the client has gone mobile
// These things can't be done in pure CSS because stylesheets would have already loaded
function client_went_mobile() {
    // Resize each category options header container for mobile if they are expanded
    $(".sidebar_category_options_container").each(function() {
        if ($(this).parent().data().container_state) {
            let num_children = $(this).children(".sidebar_category_options_header_container").length;
            let new_container_height = num_children * 171;
            $(this).css("height", `${new_container_height}px`);
        }
    })

    $(".user_options_container").children(".sidebar_category_options_header_container").each(function() {
        if ($(this).parent().data().container_state) {
            let num_children = 1 + $(this).siblings(".sidebar_category_options_header_container").length;
            console.log(num_children);
            let new_container_height = num_children * 171;
            $(this).parent().css("height", `${new_container_height}px`);
        }
    })

    $("#sidebar_container").css({overflowY: 'auto', height: 'max-content'})
}

// Processes that must happen when the client has gone desktop
function client_went_desktop() {
    // Resize each category options header container for desktop
    $(".sidebar_category_options_container").each(function() {
        if ($(this).parent().data().container_state) {
            let num_children = $(this).children(".sidebar_category_options_header_container").length;
            let new_container_height = num_children * 75;
            $(this).css("height", `${new_container_height}px`);
        }
    })

    $(".user_options_container").children(".sidebar_category_options_header_container").each(function() {
        if ($(this).parent().data().container_state) {
            let num_children = 1 + $(this).siblings(".sidebar_category_options_header_container").length;
            let new_container_height = num_children * 75;
            $(this).parent().css("height", `${new_container_height}px`);
        }
    })

    $("#sidebar_container").css({overflowY: 'auto', height: 'max-content'})
}

$(window).resize(function() {
    if ($(document).width() <= 1100) {
        if (!client_is_mobile) {
            client_is_mobile = true;
            client_went_mobile();
        }
    }
    else {
        if (client_is_mobile) {
            client_is_mobile = false;
            client_went_desktop();
        }
    }
})