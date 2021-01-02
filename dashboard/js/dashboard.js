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

function check_dashboard_state() {
    
}

// Keeps track of the positions of the dashboard view marker positions
var dashboard_view_marker_positions = [];

var current_dashboard_view = {
    id: "#recent_practices_dashboard",
    index: 0
};

// Handles where to put the dashboard view marker and its positions depending on the screen width
function calculate_dashboard_view_positions() {
    dashboard_view_marker_positions = [];

    let dashboard_container_width = $("#dashboard_view_button_container").width();
    let dashboard_button_width = Math.floor(dashboard_container_width / 4);
    let current_view_marker_width = Math.floor(dashboard_button_width / 2);
    let view_marker_start =  Math.floor(current_view_marker_width / 2);

    for (var i = 0; i < 4; i++) {
        dashboard_view_marker_positions.push(view_marker_start);
        view_marker_start += dashboard_button_width;
    }

    $("#current_dashboard_view_marker").css({width: current_view_marker_width, left: dashboard_view_marker_positions[current_dashboard_view.index]})
}

$(document).ready(function() {
    if (client_is_mobile) {
        $("#sidebar_songbank_container").data().container_state = false;
        $("#sidebar_songbank_container > .sidebar_category_header_container > .sidebar_category_collapse_icon").removeClass("collapse_icon_open");
    }

    calculate_dashboard_view_positions();

    //TODO: In reality, dashboard will also need to be loaded
    container_states.dashboard = true;

    // Continuously checks the container states to see when the dashboard and sidebar are loaded
    var check_dashboard_state_loop_id = setInterval(function() {
        if (container_states.dashboard && container_states.sidebar) {
            clearInterval(check_dashboard_state_loop_id);

            // Show the dashboard
            // TODO: Uncomment
            // $("#loading_container").animate({bottom: '100%', opacity: 0}, 1000);

            // $("#sidebar_container").css({overflowY: 'auto', height: 'max-content'})
        }
    }, 250);
})

var resizeTimer = false;

$(window).on('resize', function(e) {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        resizeTimer = false;
        $(window).trigger('resizeend');
    }, 250);

}).on('resizeend', function(){
	if (!client_is_mobile) {
        calculate_dashboard_view_positions();
    }
});

// When a dashboard view button is clicked
$(document).on("click", "#dashboard_view_button_container > h1:not(.active_dashboard_view_button)", function() {
    let selected_index = $(this).index();
    let selected_id = `#${$(this).text().toLocaleLowerCase().replace(/\s+/g, "_")}_dashboard`
    let hidden_property = $(selected_id).data().hidden_property;

    $(`#dashboard_view_button_container > h1:eq(${current_dashboard_view.index})`).removeClass("active_dashboard_view_button");
    $(this).addClass("active_dashboard_view_button");

    // Slide the tracker
    $("#current_dashboard_view_marker").animate({left: dashboard_view_marker_positions[selected_index]}, 250);

    if (selected_index > current_dashboard_view.index) {
        $(current_dashboard_view.id).css({right: ''}).animate({left: '100%'}, 250).data().hidden_property = 'left';

        let index_difference = selected_index - current_dashboard_view.index;
        if (index_difference > 1) {
            for (var i = current_dashboard_view.index + 1; i < selected_index; i++) {
                let middle_id = "#" + $(`#dashboard_view_button_container > h1:eq(${i})`).text().toLocaleLowerCase().replace(/\s+/g, "_") + "_dashboard";
                console.log(middle_id);
                $(middle_id).css({right: '', left: '100%'}).data().hidden_property = 'left';
            }
        }
    }
    else {
        $(current_dashboard_view.id).css({left: ''}).animate({right: '100%'}, 250).data().hidden_property = 'right';

        let index_difference = current_dashboard_view.index - selected_index;
        if (index_difference > 1) {
            for (var i = current_dashboard_view.index - 1; i > selected_index; i--) {
                let middle_id = "#" + $(`#dashboard_view_button_container > h1:eq(${i})`).text().toLocaleLowerCase().replace(/\s+/g, "_") + "_dashboard";
                console.log(middle_id);
                $(middle_id).css({left: '', right: '100%'}).data().hidden_property = 'right';
            }
        }
    }

    let animate_property = {};
    animate_property[hidden_property] = 0;
    
    $(selected_id).animate(animate_property, 250);

    current_dashboard_view.id = selected_id;
    current_dashboard_view.index = selected_index;
})