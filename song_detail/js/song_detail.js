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

function fill_detail_cards(result) {
    console.log(result);
    $("#song_detail_title").text(result.song_details[0].Song_Name);
    $("#song_detail_artists").text(result.song_details[0].Artist_Name);

    $("#song_artist_detail_card").data().artist_id = result.song_details[0].Artist_ID;
    $("#song_artist_detail_card").find(".song_detail_body_title").text(result.song_details[0].Artist_Name);

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
    
        if (result.song_details[0].Custom_Genre) {
            $("#song_detail_genre_card").data().custom_genre_id = result.song_details[0].Custom_Genre_ID;
            $("#song_detail_genre_card").find(".song_detail_body_title").text(result.song_details[0].Custom_Genre);
        }
        else {
            $("#song_detail_genre_card").find(".song_detail_body_title").text(result.song_details[0].Genre);
        }
    }
    else {
        $("#song_detail_past_performance_card").find(".song_detail_body_title").text("No Results");
    }
} 

$("#performance_start_date_input").change(function() {
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