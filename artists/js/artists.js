$(document).on("click", ".sort_display_header_toggle", function() {
    $(this).toggleClass("collapse_icon_open");

    let selected_artist = $(this).parent().data().artist_name;
            
    let display_container = $(".alphabetical_display_container").filter(function() {
        if ($(this).data().artist_name && $(this).data().artist_name === selected_artist) {
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

    // let sort_type = $(this).parent().data().sort_type;
    // switch (sort_type) {
    //     case 'alphabetical':
            
    //         break;
    // }
})

$(document).ready(function() {
    // Load the user's songbank results
    let user_token = get_user_token();
    
    if (user_token) {
        // Call the API
        $.ajax({
            url: 'https://museio.davidr.pro/museio/api/songbank/get_songs_by_filter?filter=artist',
            type: 'GET',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', `Bearer ${user_token}`)
            },
            success: function(result) {
                result = JSON.parse(result).message;
                console.log(result);
                result.forEach(row => {
                    let artist_id = row.artist_id;
                    let artist_name = row.artist_name;
                    let artist_first_letter = (/^[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]$/.test(artist_name)) ? '0-9' : artist_name[0].toLocaleLowerCase();

                    let song_display_container = $(
                        `<div data-alphabetical_letter='${artist_first_letter}' data-artist_name='${artist_name}' data-sort_type='alphabetical' class='sort_display_header'>
                            <h1>${artist_name}</h1>
                            <img tabindex='40' class='sort_display_header_toggle collapse_icon_open' src='../resources/images/white_arrow.png' width='30'/>
                        </div>
                        <div data-container_state='true' data-alphabetical_letter='${artist_first_letter}' data-artist_name="${artist_name}" class='songbank_display_container alphabetical_display_container'>
                            <div class='songbank_display_table_header alphabetical_display_table_header'>
                                <h1>Name</h1>
                                <h1>Artist</h1>
                                <h1>Genre</h1>
                            </div>
                        </div>`
                    )

                    // Put each of the artist's songs in its respsective container
                    row.song_results.forEach(song => {
                        let song_display = $(
                            `<div data-song_id='${song.Song_ID}' class="songbank_display_song alphabetical_display_song">
                                <h1>${song.Song_Name}</h1>
                                <h1>${song.Artist_Name}</h1>
                                <h1>${(song.Genre && song.Genre.length > 0) ? song.Genre : song.Custom_Genre}</h1>
                            </div>`
                        )

                        song_display_container.children(".songbank_display_table_header").parent().append(song_display);
                    })

                    $("#alphabetical_sort_container").append(song_display_container);
                })

                $(".sort_display_header, .songbank_display_container").css({display: 'grid'}).animate({opacity: 1}, 250);
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