// When an alphabetical display song container is hovered over, animate it to be slightly larger.
var alphabetical_display_song_expanded = false;
$(document).on("mouseover", ".alphabetical_display_song", function() {
    if (!client_is_mobile && !alphabetical_display_song_expanded) {
        $(this).animate({width: '90%', height: '46px', paddingBottom: '3px'}, 250)
        alphabetical_display_song_expanded = true;
    }
})

$(document).on("mouseleave", ".alphabetical_display_song", function() {
    if (!client_is_mobile && alphabetical_display_song_expanded) {
        $(this).animate({width: '85%', height: '31px', paddingBottom: '15px'}, 250)
        alphabetical_display_song_expanded = false;
    }
})

$(document).on("click", ".sort_display_header_toggle", function() {
    $(this).toggleClass("collapse_icon_open");

    let sort_type = $(this).parent().data().sort_type;
    switch (sort_type) {
        case 'alphabetical':
            let selected_letter = $(this).parent().data().alphabetical_letter;
            
            let display_container = $(".alphabetical_display_container").filter(function() {
                if ($(this).data().alphabetical_letter && $(this).data().alphabetical_letter === selected_letter) {
                    return true;
                }
            })

            if (display_container) {
                let container_state = display_container.data().container_state;
                if (container_state) {
                    // Record the current height of the container
                    display_container.data({
                        container_height: `${Math.ceil(display_container.height())}px`,
                        container_state: false
                    })

                    // Close the container
                    display_container.animate({height: 0}, 250);
                }
                else {
                    // Open the container
                    console.log(display_container.data().container_height);
                    display_container.animate({height: display_container.data().container_height}, 250)
                    .data({container_state: true});
                }
            }
            break;
    }
})