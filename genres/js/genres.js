$(document).on("click", ".sort_display_header_toggle", function() {
    $(this).toggleClass("collapse_icon_open");

    let selected_genre = $(this).parent().data().genre_name;
            
    let display_container = $(".alphabetical_display_container").filter(function() {
        if ($(this).data().genre_name && $(this).data().genre_name === selected_genre) {
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
            url: 'https://museio.davidr.pro/museio/api/songbank/get_songs_by_filter?filter=genre',
            type: 'GET',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', `Bearer ${user_token}`)
            },
            success: function(result) {
                result = JSON.parse(result).message;
                console.log(result);
                result.forEach(row => {
                    let genre_id = row.genre_id;
                    let genre_name = row.genre_name;
                    let genre_first_letter = (/^[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]$/.test(genre_name)) ? '0-9' : genre_name[0].toLocaleLowerCase();

                    let song_display_container = $(
                        `<div data-alphabetical_letter='${genre_first_letter}' data-genre_name='${genre_name}' data-sort_type='alphabetical' class='sort_display_header'>
                            <h1>${genre_name}</h1>
                            <img tabindex='40' class='sort_display_header_toggle collapse_icon_open' src='../resources/images/white_arrow.png' width='30'/>
                        </div>
                        <div data-container_state='true' data-alphabetical_letter='${genre_first_letter}' data-genre_name="${genre_name}" class='songbank_display_container alphabetical_display_container'>
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