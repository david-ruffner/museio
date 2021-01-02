// Keeps the state of the remember me checkbox
var remember_me = false;

function toggle_remember_me_checkbox() {
    if (!remember_me) {
        $(".check").css("animation", "dash-check .5s ease-in forwards");
        remember_me = true;
    }
    else {
        $(".check").css("animation", "dash-check-reverse .35s ease-out forwards");
        remember_me = false;
    }
}

// When the remember me checkbox is clicked
$(".login_remember_checkbox").click(function() {
    toggle_remember_me_checkbox();
})

function fade_element_in(element_list, index) {
    $(element_list[index]).animate({opacity: 1, left: 0}, 300, function() {
        // Once we've slid in all elements, focus on the username input.
        if (index >= (element_list.length - 1)) {
            $("#username_input").focus();
        }
    });
    
    setTimeout(function() {
        if (index < (element_list.length - 1)) {
            fade_element_in(element_list, ++index);
        }
    }, 50);
}

// When the document is ready
$(document).ready(function() {
    let fade_in_containers = [
        '#login_container > h1',
        '#username_input_container',
        '#password_input_container',
        '.forgot_password_link',
        '#remember_me_container',
        '.login_button'
    ];

    setTimeout(function() {
        $("#side_container").animate({opacity: 1}, 750);
        setTimeout(function() {
            fade_element_in(fade_in_containers, 0);
        }, 100);
    }, 100);
})

// Click on the forgot password link
$(".forgot_password_link").click(function() {
    $("#forgot_password_background").css("display", "grid").animate({opacity: 1}, 250);
    $("#forgot_password_container").animate({bottom: 0}, 250);
    $("#forgot_password_email_input").focus();
})

// Cancel a password reset
$("#forgot_password_cancel_button").click(function() {
    $("#forgot_password_container").animate({bottom: "100%"}, 250);
    $("#forgot_password_background").animate({opacity: 0}, 250, function() {
        $(this).css("display", "none");
        $("#username_input").focus();
    })
})

// Submit a password reset
$("#forgot_password_submit_button").click(function() {
    // On success
    $("#forgot_password_input_container").animate({opacity: 0}, 250, function() {
        $(this).css('display', "none");
        $("#forgot_password_success_container").css("display", "grid").animate({opacity: 1}, 250);

        // Play the success checkmark gif
        // Dirty, but it's all I could find on stack overflow :)
        var success_gif = new Image();
        success_gif.src='../resources/images/circle_checkmark.gif';
        $("#forgot_password_success_image").attr('src', success_gif.src); 
    })
})

// Ok button to close the modal after the password reset email was sent
$("#forgot_password_ok_button").click(function() {
    $("#forgot_password_container").animate({bottom: "100%"}, 250);
    $("#forgot_password_background").animate({opacity: 0}, 250, function() {
        $(this).css("display", "none");

        // Reset the password forgot modal
        $("#forgot_password_success_container").css({opacity: 0, display: 'none'});
        $("#forgot_password_input_container").css({opacity: 1, display: 'grid'});
    })
})

// highlight_object allows us to highlight an object's specified property (background-color by default) with a specified background color (error box red by default)
// highlight object must be a string that can be in jQuery identifier form, and highlight property and hightlight color must be valid CSS properties.
// status, message, highlight_object = false, highlight_property = "background-color", highlight_color = "var(--error-box-red)"
function display_status(error_object) {
    try {
        // Use the text height test container to get the height of the status text
        let container_height = Math.round($("#text_height_test > h1").text(error_object.message).parent().height());

        // Set the status container's text
        $("#status_container > h1").text(error_object.message);

        // Change the status box background color depending on the passed status param
        switch (error_object.status) {
            case "error":
                $("#status_container > h1").css("color", "white")
                .parent().css("background-color", "var(--error-box-red)");
                break;

            default:
                $("#status_container > h1").css("color", "black")
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
        $("#status_container").animate({height: `${container_height + 50}px`}, 250);
    }
    catch (ex) {
        // Fallback in case there's some reason that we can't display the status container
        alert(error_object.message);
    }
}

function get_login_input() {
    return new Promise((resolve, reject) => {
        // Get the email and password inputs, and validate them.
        let email_input = $("#username_input").val().trim();
        if (!email_input || email_input.length < 1) {
            return reject(
                {
                    status: "error",
                    message: "The username input cannot be empty.",
                    highlight_object: '#username_input',
                    focus_object: '#username_input'
                }
            );
        }
        else {
            // Reset the username input's background color to white (in case it was changed before)
            $("#username_input").css("background-color", 'white');
        }

        let password_input = $("#password_input").val().trim();
        if (!password_input || password_input.length < 1) {
            return reject(
                {
                    status: "error",
                    message: 'The password input cannot be empty.',
                    highlight_object: '#password_input',
                    focus_object: '#password_input'
                }
            );
        }
        else if (
            !/[A-Za-z]/.test(password_input) ||
            !/[0-9]/.test(password_input) ||
            !/[\-\_\@\.\!\#\$\%\^\&\*\+\=]/.test(password_input) ||
            password_input.length < 8 || password_input.length > 100
        ) {
            return reject(
                {
                    status: 'error',
                    message: `Invalid password. Password's must contain an uppercase and lowercase letter, a number, a special character, and must be between 8 and 100 characters.`,
                    highlight_object: '#password_input',
                    focus_object: '#password_input'
                }
            );
        }

        resolve(
            {
                email: email_input,
                password: password_input
            }
        )
    })
}

function user_login() {
    get_login_input()
    .then(result => {
        // If remember me is checked, add that to the data object
        if (remember_me) {
            result.persistent_login = "true"
        }

        // Call the login API
        $.ajax({
            url: `${base_api_url}/tokenauthor/login`,
            type: 'POST',
            data: result,
            success: function(result) {
                try {
                    result = JSON.parse(result);

                    switch (result.status) {
                        case 'invalid_email':
                            display_status(
                                {
                                    status: 'error',
                                    message: result.message,
                                    highlight_object: '#username_input',
                                    focus_object: '#username_input'
                                }
                            )
                            break;

                        case 'invalid_password':
                            display_status(
                                {
                                    status: 'error',
                                    message: result.message,
                                    highlight_object: '#password_input',
                                    focus_object: '#password_input'
                                }
                            )
                            break;

                        case 'internal_error':
                            display_status(
                                {
                                    status: 'error',
                                    message: result.message,
                                    focus_object: '#username_input'
                                }
                            )
                            break;

                        case 'incorrect_username_or_password':
                            display_status(
                                {
                                    status: 'error',
                                    message: result.message,
                                    focus_object: '#username_input'
                                }
                            )
                            break;

                        case 'success':
                            $("#status_container").css("height", 0);

                            // Store the user's info in session storage.
                            sessionStorage.setItem('museio_user_info', JSON.stringify(result.extra_parameters));

                            if (!result.message || result.message.length < 1) {
                                display_status(
                                    {
                                        status: 'error',
                                        message: 'Sorry, something went wrong while logging you in. Please contact the developer.'
                                    }
                                )
                            }
                            else {
                                // Store the response message (the user's token) in session storage if they don't want to be remembered, and local storage if they do.
                                if (remember_me) {
                                    localStorage.setItem('museio_user_token', result.message);
                                }
                                else {
                                    sessionStorage.setItem('museio_user_token', result.message);
                                }

                                // Go to the dashboard page
                                // TODO: Remove (used for vscode live development)
                                // window.open(`http://127.0.0.1:5500/songbank/?category_option=my_songs`, '_self');
                                window.open(`${dashboard_page_url}?category_option=dashboard`, '_self');
                            }
                            break;
                    }
                }
                catch (ex) {
                    // Fallback incase result isn't valid JSON (shouldn't ever happen)
                    display_status(
                        {
                            status: 'error',
                            message: 'Sorry, something went wrong while logging you in. Please contact the developer.'
                        }
                    )
                }
            },
            error: function(error) {
                console.log(error);
                display_status(
                    {
                        status: 'error',
                        message: error.message
                    },
                    "#username_input"
                )
            }
        })
    })
    .catch(error_object => {
        try {
            display_status(error_object);
        }
        catch (ex) {
            // Fallback in case the error response doesn't come back in standard format of {error: 'error code', message: 'error message'}
            display_status(
                {
                    status: 'error',
                    message: 'Sorry, something went wrong on our end.'
                }
            )
        }
    })
}

// When the login button is clicked
$(".login_button").click(function() {
    user_login();
})

$(document).on('keyup', function(e) {
    if (e.key === 'Enter') {
        // If the enter key is pressed while the remember me checkbox is focused, select that 'checkbox'
        if ($(".login_remember_checkbox").is(":focus")) {
            toggle_remember_me_checkbox();
        }
        else {
            // Perform login
            user_login();
        }
    }
    else if (e.key === "Escape" || e.key === "Esc") {
        console.log("yes");
        // If the forgot password modal is open, close it on escape key press.
        if ($("#forgot_password_background").is(":visible")) {
            $("#forgot_password_container").animate({bottom: "100%"}, 250);
            $("#forgot_password_background").animate({opacity: 0}, 250, function() {
                $(this).css("display", "none");
                // Focus on the username input
                $("#username_input").focus();
            })
        }
    }
})