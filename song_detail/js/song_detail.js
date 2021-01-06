var page_loaded_pieces = {
    performance_chart: false,
    book_cover_photo: false,
    sheet_music_cover_photo: false
}

$(document).ready(function() {
    let params = parse_get_parameters();
    // Get the given song_id GET param
    let song_id = decodeURIComponent(params.find(param => param.parameter_name === 'song_id').parameter_value);

    let user_token = get_user_token();
    
    if (user_token) {
        // Call the API
        $.ajax({
            crossDomain: true,
            url: `https://museio.davidr.pro/museio/api/songbank/get_song_details?song_id=${encodeURIComponent(song_id)}`,
            type: 'GET',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', `Bearer ${user_token}`)
            },
            success: function(result) {
                result = JSON.parse(result);
                
                console.log(result);

                // Load the Visualization API and the corechart package.
                google.charts.load('current', {'packages':['imageLineChart']});

                // Set a callback to run when the Google Visualization API is loaded.
                google.charts.setOnLoadCallback(function() {
                    fill_detail_cards(result.message);
                });
            },
            error: function(error) {
                console.log(error);
            }
        })
    }
})

function update_performance_card(result) {
    if (result.song_performance !== 'error' && result.song_performance !== 'no_results') {
        let chart_data = [
            ['Performance Date', 'Performance Score']
        ];
        result.song_performance.forEach(row => {
            // Format the date
            // TODO: Make this a user setting
            let date_split = row.Practice_Date.split("T")[0].split("-");
            let practice_date = `${date_split[1]}/${date_split[2]}/${date_split[0]}`;

            chart_data.push([practice_date, row.Performance_Rating])
        })
        console.log(chart_data);
        
        chart_data = new google.visualization.arrayToDataTable(chart_data);
    
        var chart = new google.visualization.ImageLineChart(document.getElementById('past_performance_chart'));
    
        // TODO: Figure out how to make tickmarks integers
        chart.draw(chart_data, {
            width: 500,
            height: 300,
            min: 1,
            max: 5
            // vAxis: {
            //     minValue: 1,
            //     maxValue: 5,
            //     format: '0'
            // },
            // hAxis: {
            //     minValue: 1,
            //     maxValue: 5,
            //     format: '0'
            // }
        });

        $("#song_detail_past_performance_card").find(".song_detail_no_results_message").animate({opacity: 0}, 250, function() {
            $(this).css({display: 'none'});
            $("#past_performance_chart").css({display: 'grid'}).animate({opacity: 1}, 250);
        })
    }
    else {
        $("#song_detail_past_performance_card").find("#past_performance_chart").animate({opacity: 0}, 250, function() {
            $(this).css({display: 'none'});
            $(this).parent().siblings(".song_detail_no_results_message").css({display: 'grid'}).animate({opacity: 1}, 250);
        })
    }
}

function after_performance_chart_draw() {
    is_page_ready("performance_chart");
    $("#song_detail_past_performance_card").find(".song_detail_loading_message").animate({opacity: 0}, 250, function() {
        $(this).css({display: 'none'});
        $(this).siblings(".song_detail_card_body_container").css({display: 'grid'}).animate({opacity: 1}, 250);
    })
}

function fill_detail_cards(result) {
    console.log(result);
    $("#song_detail_title").text(result.song_details[0].Song_Name);
    $("#song_detail_artists").text(result.song_details[0].Artist_Name);

    $("#song_artist_detail_card").data().artist_id = result.song_details[0].Artist_ID;
    let artist_last_name = result.song_details[0].Artist_Name.split(/\s+/);
    $("#song_artist_detail_card").find(".song_detail_body_title").text(result.song_details[0].Artist_Name)
    .siblings(".song_detail_body_title_overlay").text(`More about ${artist_last_name[artist_last_name.length - 1]}`);

    console.log(result.song_performance);
    if (result.song_performance !== 'error' && result.song_performance !== 'no_results') {
        $("#song_detail_past_performance_card").data().song_id = result.song_details[0].Song_ID;

        // Set the beginning and ending date filter ipnuts
        let current_date_obj = new Date();
        let previous_date_obj = new Date();
        previous_date_obj.setMonth(current_date_obj.getMonth() - 1);

        let month_modifier = ((current_date_obj.getMonth() + 1) < 10) ? `0${current_date_obj.getMonth() + 1}` : current_date_obj.getMonth() + 1;
        let day_modifier = (current_date_obj.getDate() < 10) ? `0${current_date_obj.getDate()}` : current_date_obj.getDate();
        let current_date = `${current_date_obj.getFullYear()}-${month_modifier}-${day_modifier}`;

        month_modifier = ((previous_date_obj.getMonth() + 1) < 10) ? `0${previous_date_obj.getMonth() + 1}` : previous_date_obj.getMonth() + 1;
        day_modifier = (previous_date_obj.getDate() < 10) ? `0${previous_date_obj.getDate()}` : previous_date_obj.getDate();
        let previous_date = `${previous_date_obj.getFullYear()}-${month_modifier}-${day_modifier}`;

        console.log([current_date, previous_date])
        $("#performance_start_date_input").val(previous_date);
        $("#performance_end_date_input").val(current_date);

        let chart_data = [
            ['Performance Date', 'Performance Score']
        ];
        result.song_performance.forEach(row => {
            // Format the date
            // TODO: Make this a user setting
            let date_split = row.Practice_Date.split("T")[0].split("-");
            let practice_date = `${date_split[1]}/${date_split[2]}/${date_split[0]}`;

            chart_data.push([practice_date, row.Performance_Rating])
        })
        console.log(chart_data);
        
        chart_data = new google.visualization.arrayToDataTable(chart_data);
    
        var chart = new google.visualization.ImageLineChart(document.getElementById('past_performance_chart'));
    
        // TODO: Figure out how to make tickmarks integers
        chart.draw(chart_data, {
            width: 500,
            height: 300,
            min: 1,
            max: 5
            // vAxis: {
            //     minValue: 1,
            //     maxValue: 5,
            //     format: '0'
            // },
            // hAxis: {
            //     minValue: 1,
            //     maxValue: 5,
            //     format: '0'
            // }
        });

        // Fade in the chart when its loaded
        google.visualization.events.addListener(chart, 'ready', after_performance_chart_draw);
    }
    else {
        is_page_ready("performance_chart");
        $("#song_detail_past_performance_card").find(".song_detail_loading_message").animate({opacity: 0}, 250, function() {
            $(this).css({display: 'none'});
            $(this).siblings(".song_detail_no_results_message").css({display: 'grid'}).animate({opacity: 1}, 250);
        })
    }

    let genre_card = $("#song_detail_genre_card");
    if (result.song_details[0].Custom_Genre) {
        genre_card.data().custom_genre_id = result.song_details[0].Custom_Genre_ID;
        genre_card.find(".song_detail_body_title").text(result.song_details[0].Custom_Genre);
        genre_card.find(".song_detail_body_title_overlay").text(`More about ${result.song_details[0].Custom_Genre}`)
    }
    else {
        genre_card.data().custom_genre_id = result.song_details[0].Genre.toLocaleLowerCase();
        genre_card.find(".song_detail_body_title").text(result.song_details[0].Genre);
        genre_card.find(".song_detail_body_title_overlay").text(`More about ${result.song_details[0].Genre}`)
    }

    if (result.song_details[0].Book_ID && result.song_details[0].Book_ID.length > 0) {
        let book_card = $("#song_detail_book_card");
        book_card.data().book_id = result.song_details[0].Book_ID;
        book_card.find(".song_detail_body_title").text(result.song_details[0].Book_Name);

        // If the book has a cover photo, add it.
        if (result.song_details[0].Book_Picture && result.song_details[0].Book_Picture.length > 0) {
            book_card.find(".song_detail_card_body_container").removeClass("song_detail_no_picture_card");
            book_card.find(".song_detail_book_cover_photo").attr("src", `data:image/png;base64,${result.song_details[0].Book_Picture}`);
        }
        else {
            book_card.find(".song_detail_card_body_container").addClass("song_detail_no_picture_card");
        }

        // If the song has page numbers, add them.
        if (result.song_details[0].Book_Page_Start && result.song_details[0].Book_Page_Finish) {
            var page_start = parseInt(result.song_details[0].Book_Page_Start);
            var page_end = parseInt(result.song_details[0].Book_Page_Finish);

            if (isNaN(page_start) || isNaN(page_end)) {
                return false;
            }

            $(".song_detail_page_number").text(`Pages ${page_start} - ${page_end}`).css({display: 'block'});
            $(".song_detail_page_number_divider").css({display: 'block'});
        }

        book_card.find(".song_detail_card_overlay").text(`View ${result.song_details[0].Book_Name}`);
    }
    else {
        $("#song_detail_book_card").css({display: 'none'})
        is_page_ready("book_cover_photo");
    }

    if (result.song_details[0].Sheet_Music_ID) {
        let sheet_music_card = $("#song_detail_sheet_music_card");
        sheet_music_card.data().sheet_music_id = result.song_details[0].Sheet_Music_ID;
        sheet_music_card.find(".song_detail_body_title").text(result.song_details[0].Sheet_Music_Name);

        // If the sheet music has a cover photo, add it.
        if (result.song_details[0].Sheet_Music_Cover_Photo && result.song_details[0].Sheet_Music_Cover_Photo.length > 0) {
            sheet_music_card.find(".song_detail_card_body_container").removeClass("song_detail_no_picture_card");
            sheet_music_card.find(".song_detail_sheet_music_cover_photo").attr("src", `data:image/png;base64,${result.song_details[0].Sheet_Music_Cover_Photo}`);
        }
        else {
            sheet_music_card.find(".song_detail_card_body_container").addClass("song_detail_no_picture_card");
        }

        sheet_music_card.find(".song_detail_card_overlay").text(`Open ${result.song_details[0].Sheet_Music_Name}`);
    }
    else {
        $("#song_detail_sheet_music_card").css({display: 'none'});
        is_page_ready("sheet_music_cover_photo");
    }
} 

$("#performance_start_date_input, #performance_end_date_input").change(function() {
    // Get both new date input values
    let start_date = $("#performance_start_date_input").val();
    let end_date = $("#performance_end_date_input").val();

    if (end_date < start_date) {
        display_card_status(
            "Error: Start date cannot come after the end date",
            $("#song_detail_past_performance_card").find(".song_detail_status_message_container")
        );
    }
    else {
        try {
            new Date(start_date);
        }
        catch (ex) {
            return display_card_status(
                "Error: Start date is not a valid date. Please use the date picker if you're unsure of the proper format.",
                $("#song_detail_past_performance_card").find(".song_detail_status_message_container")
            );
        }

        try {
            new Date(end_date);
        }
        catch (ex) {
            return display_card_status(
                "Error: End date is not a valid date. Please use the date picker if you're unsure of the proper format.",
                $("#song_detail_past_performance_card").find(".song_detail_status_message_container")
            );
        }

        $("#song_detail_past_performance_card").find(".song_detail_status_message_container").css({display: 'none'})
        
        // Query the API
        let song_id = $("#song_detail_past_performance_card").data().song_id;
        let user_token = get_user_token();
        
        if (user_token) {
            // Call the API
            $.ajax({
                url: 'https://museio.davidr.pro/museio/api/songbank/filter_performance_dates',
                type: 'POST',
                data: {
                    start_date: start_date,
                    end_date: end_date,
                    song_id: song_id
                },
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('Authorization', `Bearer ${user_token}`)
                },
                success: function(result) {
                    result = JSON.parse(result);
                    
                    console.log(result);
                    update_performance_card(result.message);
                },
                error: function(error) {
                    console.log(error);
                }
            })
        }
    }
})

function display_card_status(message, status_container) {
    status_container.children("h1").text(message);
    let container_height = status_container.height();
    status_container.css({height: 0, display: 'block'}).animate({height: container_height + 20}, 250);
}

// When a song detail card body is hovered over, display its overlay.
$(document).on("mouseover", ".song_detail_card_body_container", function() {
    let overlay = $(this).children(".song_detail_body_title_overlay");
    overlay.animate({opacity: 1}, 150);
})

$(document).on("mouseleave", ".song_detail_card_body_container", function() {
    let overlay = $(this).children(".song_detail_body_title_overlay");
    overlay.animate({opacity: 0}, 150);
})

$(document).on("mouseover", ".song_detail_card_overlay_container", function() {
    $(this).animate({opacity: 1}, 150);
})

$(document).on("mouseleave", ".song_detail_card_overlay_container", function() {
    $(this).animate({opacity: 0}, 150);
})

// When a song detail overlay is clicked
$(document).on("mousedown", ".song_detail_body_title_overlay, .song_detail_card_overlay_container", function(e) {
    try {
        // Get the page to go to
        let page = $(this).data().overlay_page;
        if (!page) {
            return false;
        }

        let param = $(this).data().overlay_param;
        let param_value_container = $(this).data().overlay_param_value_container;
        try {
            var param_value = $(param_value_container).data()[param];
        }
        catch (ex) {
            var param_value = null;
        }

        let url = (param_value) ? `https://museio.davidr.pro/${page}?${param}=${encodeURIComponent(param_value)}` : `https://museio.davidr.pro/${page}`;

        switch (e.which) {
            case 1:
                window.open(url, "_self");
                break;
            case 2:
                window.open(url, "_blank");
                break;
        }
    }
    catch (ex) {
        console.log("Sorry, something went wrong while opening that song. Please try again.");
    }
})

$(".song_detail_book_cover_photo").on("load", function() {
    is_page_ready("book_cover_photo");
})

$(".song_detail_sheet_music_cover_photo").on("load", function() {
    is_page_ready("sheet_music_cover_photo");
})

// Keeps track of the async parts and shows the final page when everything is loaded
function is_page_ready(load_piece) {
    page_loaded_pieces[load_piece] = true;

    for (property in page_loaded_pieces) {
        if (!page_loaded_pieces[property]) {
            return false;
        }
    }

    setTimeout(function() {
        loading_container_fadeout()
    }, 250);
}