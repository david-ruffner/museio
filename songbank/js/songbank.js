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

$(document).ready(function() {
    // Load the user's songbank results
    let user_token = get_user_token();
    
    if (user_token) {
        // Call the API
        $.ajax({
            url: 'https://museio.davidr.pro/museio/api/songbank/get_all_songs',
            type: 'GET',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', `Bearer ${user_token}`)
            },
            success: function(result) {
                result = JSON.parse(result).message;
                console.log(result);
                result.forEach(row => {
                    let starting_song_letter = row.Song_Name.substr(0, 1).toLocaleLowerCase();

                    let song_display = $(
                        `<div data-song_id='${row.Song_ID}' class="songbank_display_song alphabetical_display_song">
                            <h1>${row.Song_Name}</h1>
                            <h1>${row.Artist_Name}</h1>
                            <h1>${(row.Genre && row.Genre.length > 0) ? row.Genre : row.Custom_Genre}</h1>
                        </div>`
                    )

                    // Test if the starting letter is alphabetical or numerical/special character
                    if (/^[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]$/.test(starting_song_letter)) {                        
                        // Put the song in the numerical container
                        $(".alphabetical_display_container").filter(function() {
                            return $(this).data().alphabetical_letter === '0-9'
                        }).append(song_display);
                    }
                    else {
                        // Put the song in an alphabet container
                        $(".alphabetical_display_container").filter(function() {
                            return $(this).data().alphabetical_letter === starting_song_letter;
                        }).append(song_display);
                    }
                })

                // For each alphabetical display container that has children, fade it in.
                $(".alphabetical_display_container").filter(function() {
                    if ($(this).children(".alphabetical_display_song").length > 0) {
                        return true;
                    }
                }).each(function() {
                    // TODO: Remove
                    $(this).prev().css({display: 'grid'}).animate({opacity: 1}, 250);
                    $(this).css({display: 'grid'}).animate({opacity: 1}, 250);
                })
            },
            error: function(error) {
                console.log(error);
            }
        })
    }
})

// When an alphabetical sort letter is clicked
$(document).on("click", ".alphabetical_choice", function() {
    // Toggle the new alphabetical active choice
    $(".active_alphabetical_choice").toggleClass("active_alphabetical_choice");
    $(this).toggleClass("active_alphabetical_choice");

    let letter_choice = $(this).text().trim().toLocaleLowerCase();

    if (letter_choice !== 'all') {
        var letter_container = $(".alphabetical_display_container").filter(function() {
            if ($(this).data().alphabetical_letter && $(this).data().alphabetical_letter === letter_choice) {
                return true;
            }
        })
    }

    let visible_containers_length = $(".sort_display_header:visible, .alphabetical_display_container:visible, #no_results_song_detail_container:visible").length;
    let hidden_containers = 0;
    let visible_song_containers = $(`.sort_display_header:visible,
    .alphabetical_display_container:visible, #no_results_song_detail_container:visible`).animate({
        opacity: 0
    }, 250, function() {
        $(this).css({display: 'none'})
        hidden_containers++;

        if (hidden_containers >= visible_containers_length) {
            console.log("finished");
            // If a specific letter was chosen vs. all songs
            if (letter_container) {
                if (letter_container.children(".alphabetical_display_song").length > 0) {
                    letter_container.prev(".sort_display_header").css({display: 'grid'}).animate({opacity: 1}, 250);
                    letter_container.css({display: 'grid'}).animate({opacity: 1}, 250);
                }
                else {
                    $("#no_results_song_detail_container").css({display: 'block'}).animate({opacity: 1}, 250);
                }
            }
            else {
                // Get all alphabetical display containers that have at least 1 child song
                let filled_display_containers = $(".alphabetical_display_container").filter(function() {
                    return $(this).children(".alphabetical_display_song").length > 0;
                })

                if (filled_display_containers.length > 0) {
                    filled_display_containers.each(function() {
                        $(this).prev(".sort_display_header").css({display: 'grid'}).animate({opacity: 1}, 250);
                        $(this).css({display: 'grid'}).animate({opacity: 1}, 250);
                    })
                }
                else {
                    $("#no_results_song_detail_container").css({display: 'block'}).animate({opacity: 1}, 250);
                }
            }
        }
    })
})