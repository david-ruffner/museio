// JS for artist_detail

// Puts a detail input into edit mode
$(document).on("click", ".edit_icon, .edit_icon_hover", function() {
    let input = $(this).parent().siblings(".detail_input");
    if (!input) {
        return false;
    }

    if (!input.data().edit_mode) {
        // Put the input into edit mode
        input.attr({disabled: false}).css({border: '2px solid var(--brighter-logo-blue)'}).focus().select();
        let button_height = Math.ceil(input.siblings(".edit_save_button").height() + 20); // + 20 for padding top and bottom
        input.siblings(".edit_save_button").css({height: 0, display: 'block'}).animate({height: `${button_height}px`}, 150);

        // If the tooltip container is open, close it.
        setTimeout(function() {
            if (input.siblings(".edit_icon_tooltip").is(":visible")) {
                input.siblings(".edit_icon_tooltip").css({opacity: 0});
            }
        }, 250);

        input.data().edit_mode = true;
    }
})

function display_input_message(message, message_container, message_color = "var(--error-box-red)") {
    message_container.children("h2").text(message).css({color: message_color});
    message_container.css({height: 'max-content', display: 'none'});
    let container_height = `${Math.ceil(message_container.height())}px`;
    message_container.css({height: 0, display: 'grid'}).animate({height: container_height, marginBottom: '25px'}, 150);
}

function hide_input_message(message_container) {
    let container_height = `${Math.ceil(message_container.height())}px`;
    message_container.animate({height: 0}, 150, function() {
        $(this).css({height: container_height, display: 'none'})
    });
}

$(document).ready(function() {
    let params = parse_get_parameters();
    let genre = params.find(param => param.parameter_name === "custom_genre_id");
    if (genre) {
        genre.parameter_value = decodeURIComponent(genre.parameter_value);
        // Set the genre title header
        $("#genre_detail_title").text(`${genre.parameter_value[0].toUpperCase()}${genre.parameter_value.substring(1)}`);
        
        let user_token = get_user_token();
        
        if (user_token) {
            // Call the API
            $.ajax({
                url: `https://museio.davidr.pro/museio/api/songbank/get_genre_info?genre=${encodeURIComponent(genre.parameter_value)}`,
                type: 'GET',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('Authorization', `Bearer ${user_token}`)
                },
                success: function(result) {
                    result = JSON.parse(result);
                    
                    console.log(result);

                    $("#artist_detail_title").text(result.message.artist_name);
                    $(".detail_input:eq(0)").val(result.message.artist_name);

                    result.message.genre_songs.forEach(genre_song => {
                        // let song_id = row.Song_ID;
                        // let song_name = row.Song_Name;
                        // let song_first_letter = (/^[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]$/.test(song_name)) ? '0-9' : song_name[0].toLocaleLowerCase()();
                        let letter_name = genre_song.letter_name;
    
                        let song_display_container = $(
                            `<div data-alphabetical_letter='${letter_name}' data-sort_type='alphabetical' class='sort_display_header'>
                                <h1>${letter_name.toUpperCase()}</h1>
                                <img tabindex='40' class='sort_display_header_toggle collapse_icon_open' src='../resources/images/white_arrow.png' width='30'/>
                            </div>
                            <div data-container_state='true' data-alphabetical_letter='${letter_name}' class='songbank_display_container alphabetical_display_container'>
                                <div class='songbank_display_table_header alphabetical_display_table_header'>
                                    <h1>Name</h1>
                                    <h1>Artist</h1>
                                    <h1>Genre</h1>
                                </div>
                            </div>`
                        )
    
                        // Put each of the artist's songs in its respsective container
                        genre_song.songs.forEach(song => {
                            let song_display = $(
                                `<div data-song_id='${song.Song_ID}' class="songbank_display_song alphabetical_display_song">
                                    <h1>${song.Song_Name}</h1>
                                    <h1>${song.Artist_Name}</h1>
                                    <h1>${song.Genre}</h1>
                                </div>`
                            )
    
                            song_display_container.children(".songbank_display_table_header").parent().append(song_display);
                        })
    
                        $("#alphabetical_sort_container").append(song_display_container);
    
                        // Test if the starting letter is alphabetical or numerical/special character
                        // if (/^[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]$/.test(starting_song_letter)) {                        
                        //     // Put the song in the numerical container
                        //     $(".alphabetical_display_container").filter(function() {
                        //         return $(this).data().alphabetical_letter === '0-9'
                        //     }).append(song_display);
                        // }
                        // else {
                        //     // Put the song in an alphabet container
                        //     $(".alphabetical_display_container").filter(function() {
                        //         return $(this).data().alphabetical_letter === starting_song_letter;
                        //     }).append(song_display);
                        // }
                    })
    
                    $(".sort_display_header, .songbank_display_container").css({display: 'grid'}).animate({opacity: 1}, 250);
                },
                error: function(error) {
                    console.log(error);
                }
            })
        }
    }
})

function save_edit_input_change(edit_input) {
    let artist_id = $("#artist_detail_title").data().artist_id;
    let input = edit_input.siblings(".detail_input");
    let message_container = edit_input.siblings(".detail_input_message_container");
    let constraint = (input.data().constraint_name) ? edit_input_constraints[input.data().constraint_name] : null;
    let input_value = input.val().trim();

    if (!input_value || input_value.length < 1) {
        display_input_message("Artist name cannot be empty", message_container);
        input.focus().select();
    }
    else if (constraint && !constraint.constraint.test(input_value)) {
        display_input_message(constraint.error_message, message_container);
        input.focus().select();
    }
    else {
        message_container.css({display: 'none'})

        let user_token = get_user_token();
        
        if (user_token) {
            // Call the API
            $.ajax({
                url: 'https://museio.davidr.pro/museio/api/songbank/edit_artist',
                type: 'POST',
                input: input,
                data: {
                     artist_id: artist_id,
                     new_artist_name: input_value
                },
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('Authorization', `Bearer ${user_token}`)
                },
                success: function(result) {
                    result = JSON.parse(result);
                    
                    if (result.status === "success") {
                        display_input_message(result.message, message_container, "black");
                        setTimeout(function() {
                            hide_input_message(message_container)
                        }, 3000);

                        // Revert the input back to display mode
                        this.input.attr({disabled: true}).css({border: 'none', borderBottom: '2px solid black'});
                        this.input.siblings(".edit_save_button").css({display: 'none'});
                        this.input.data().edit_mode = false;
                        document.getSelection().removeAllRanges()
                    }
                    else {
                        // Default message color is error box red
                        display_input_message(result.message, message_container);
                    }
                },
                error: function(error) {
                    error = JSON.parse(error);
                    display_input_message(result.message, message_container);
                }
            })
        }
    }
}

// When an edit save button is clicked
$(document).on("click", ".edit_save_button", function() {
    save_edit_input_change($(this));
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