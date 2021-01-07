// JS for book_detail

// Global that holds PDF binary data when the viewer is open
var pdfData = null;

// Keeps track of the pieces of the page that have been loaded, and the ones that still need to be loaded.
var page_loaded_pieces = {
    book_photo: false,
    book_details_and_toc: false
}

$(document).ready(function() {
    // Set the title divider's width to 10% more than the title's width, or 90% if the width in pixels would exceed the book container's width.
    let title_width = Math.ceil($("#book_detail_title").width());
    let div_width = Math.ceil(title_width + (title_width * .1));
    let book_container_width = Math.ceil($("#book_detail_container").width());

    $("#book_detail_title_divider").css({width: ((div_width >= book_container_width) ? '90%' : `${div_width}px`)});

    let get_params = parse_get_parameters();
    let given_book_id = get_params.find(param => param.parameter_name === "book_id");
    if (!given_book_id || given_book_id.parameter_value.length < 1) {
        error_and_fallback("A book_id parameter wasn't passed to this page. Please contact the developer with this error.")
    }
    else {
        given_book_id = given_book_id.parameter_value;
    }

    // Get details about the given book
    let user_token = get_user_token();
    
    if (user_token) {
        // Call the API
        $.ajax({
            url: `https://museio.davidr.pro/museio/api/books/get_book_details?book_id=${given_book_id}`,
            type: 'GET',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', `Bearer ${user_token}`)
            },
            success: function(result) {
                result = JSON.parse(result);

                if (result.status === 'no_results') {
                    error_and_fallback(`Sorry, that book doesn't appear to be in our system.`); // This shouldn't happen unless the user manually changes the book_id param to something invalid.
                }
                else {                    
                    result = result.message[0];
                    console.log(result);

                    // Set the book's details
                    $("#book_detail_title").text((result.book_details.name && result.book_details.name.length > 0) ? result.book_details.name : "None");
                    $("#book_detail_artists").text((result.book_details.author && result.book_details.author.length > 0) ? result.book_details.author : "None");
                    $("#book_total_pages_header").text((result.book_details.total_pages && !isNaN(result.book_details.total_pages) && result.book_details.total_pages > 0) ? `${result.book_details.total_pages} pages` : `No Information`);

                    // Set the book's cover photo
                    $("#book_cover_photo").attr("src", `data:image/png;base64,${result.book_details.picture}`);

                    // Fill in the book's table of contents
                    if (result.book_toc && typeof(result.book_toc) === "object" && result.book_toc.length > 0) {
                        $("#book_detail_toc_container").css({display: 'grid'});
                        $("#book_detail_no_results_toc_container").css({display: 'none'})

                        result.book_toc.forEach(song => {
                            let song_container = $(
                            `<div data-sheet_music_id=' ${song.sheet_music_id}' class="toc_entry_container">
                                <h1>${(song.name && song.name.length > 0) ? song.name : "None"}</h1>
                                <h1>${(song.book_page_start && !isNaN(song.book_page_start) && song.book_page_start > 0 && song.book_page_end && !isNaN(song.book_page_end) && song.book_page_end > 0) ? "Pages " + song.book_page_start + " - " + song.book_page_end : "No Pages"}</h1>
                                <div class="toc_icon view_file_toc_icon">
                                    <img class="toc_view_file_icon underlay_icon" src="../resources/images/view_file_icon.png" width="45" height="55"/>
                                    <img class="toc_view_file_icon overlay_icon" src="../resources/images/view_file_icon_overlay.png" width="45" height="55"/>
                                    <div class="toc_icon_tooltip">
                                        <h1>View Song</h1>
                                    </div>
                                </div>
                                <div class="toc_option_divider"></div>
                                <div class="toc_icon download_file_toc_icon">
                                    <img class="toc_download_file_icon underlay_icon" src="../resources/images/download_file_icon.png" width="45" height="55"/>
                                    <img class="toc_download_file_icon overlay_icon" src="../resources/images/download_file_icon_overlay.png" width="45" height="55"/>
                                    <div class="toc_icon_tooltip">
                                        <h1>Download Song</h1>
                                    </div>
                                </div>
                                <div class="toc_option_divider"></div>
                                <div class="toc_icon">
                                    <img class="toc_email_file_icon underlay_icon" src="../resources/images/email_file_icon.png" width="60" height="45"/>
                                    <img class="toc_email_file_icon overlay_icon" src="../resources/images/email_file_icon_overlay.png" width="60" height="45"/>
                                    <div class="toc_icon_tooltip">
                                        <h1>Email Song</h1>
                                    </div>
                                </div>
                                <div class="toc_option_divider"></div>
                                <div class="toc_icon">
                                    <img class="toc_remove_from_book_icon underlay_icon" src="../resources/images/remove_icon.png" width="50" height="50"/>
                                    <img class="toc_remove_from_book_icon overlay_icon" src="../resources/images/remove_icon_overlay.png" width="50" height="50"/>
                                    <div class="toc_icon_tooltip">
                                        <h1>Remove Song From This Book</h1>
                                    </div>
                                </div>
                            </div>`
                            )

                            $("#book_detail_toc_container > .toc_entry_header_container").after(song_container);
                        })
                    }
                    else {
                        $("#book_detail_toc_container").css({display: 'none'});
                        $("#book_detail_no_results_toc_container").css({display: 'grid'})
                    }
                }
            },
            error: function(error) {
                error_and_fallback(`Sorry, something went wrong while getting this book's details. Error: ${error.message}.`);
            }
        })
    }
})

$("#book_cover_photo").on("load", function() {
    is_page_ready("book_photo");
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

$("#pdf_zoom_in_icon_overlay").click(function() {
    re_render_pdf(null, "add");
})

$("#pdf_zoom_out_icon_overlay").click(function() {
    re_render_pdf(null, "subtract");
})

$("#pdf_close_icon_overlay").click(function() {
    $("#pdf_view_background").animate({opacity: 0}, 500, function() {
        $(this).css({display: 'none'});
        $("body").css({overflowY: 'auto'});
    })
})

function re_render_pdf(newPage = null, scaleAction = null, scaleFactor = 0.25) {
    return new Promise((resolve, reject) => {
        // We can assume that pdfData has already been set
        pdfjsLib.GlobalWorkerOptions.workerSrc = '../../resources/pdf_js/build/pdf.worker.js';

        // Opening PDF by passing its binary data as a string. It is still preferable
        // to use Uint8Array, but string or array-like structure will work too.
        var loadingTask = pdfjsLib.getDocument({ data: pdfData, });
        loadingTask.promise.then(function(pdf) {
            // Fetch the first page.
            var current_page = parseInt($("#pdf_view").data().current_page);
            if (!current_page || isNaN(current_page) || current_page < 1) {
                return reject("#pdf_view either doesn't have data().current_page, or its value is not a number or less than 1.")
            }

            if (newPage) {
                newPage = parseInt(newPage);
                if (isNaN(newPage) || newPage < 1) {
                    return reject(`Invalid new page: '${newPage}'`);
                }
                else {
                    current_page = newPage;
                }
            }

            pdf.getPage(current_page).then(function(page) {
                
                var scale = parseFloat($("#pdf_view").data().current_scale);
                if (!scale || isNaN(scale) || scale < 0) {
                    return reject("#pdf_view either doesn't have data().current_scale, or its value is not a number or less than 0.")
                }

                if (scaleAction) {
                    if (scaleAction === "add") {
                        scale += scaleFactor;
                    }
                    else if (scaleAction === "subtract") {
                        scale -= scaleFactor;
                    }
                    else {
                        return reject(`Given scale action: '${scaleAction}' is not supported.`)
                    }
                }

                var viewport = page.getViewport({ scale: scale, });

                // Prepare canvas using PDF page dimensions.
                var canvas = document.getElementById('pdf_view');
                var context = canvas.getContext('2d');
                // canvas.height = ($("body").height() - ($("body").height() * 0.1));
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Render PDF page into canvas context.
                var renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };
                page.render(renderContext);

                $("#pdf_view").data({
                    current_page: current_page,
                    current_scale: scale
                })
                resolve();
            });
        });
    })
}

$(document).on("click", ".download_file_toc_icon", function() {
    let sheet_music_id = $(this).parent().data().sheet_music_id;
    if (!sheet_music_id || sheet_music_id.length < 1) {
        return false;
    }
    
    let user_token = get_user_token();
    
    if (user_token) {
        // Call the API
        $.ajax({
            url: `https://museio.davidr.pro/museio/api/songbank/view_sheet_music?sheet_music_id=${sheet_music_id}`,
            type: 'GET',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', `Bearer ${user_token}`)
            },
            success: function(result) {
                result = JSON.parse(result);

                // Create hidden link with base64 as source, and click it
                const blob = new Blob([`data:application/pdf;base64,${result.message.file}`], { type: "application/pdf" });
                const link = document.createElement("a");
                link.href = window.URL.createObjectURL(blob);
                link.download = "myfile.pdf";
                link.click();
            },
            error: function(error) {
                console.log(error);
            }
        })
    }
})

$(document).on("click", ".view_file_toc_icon", function() {
    let sheet_music_id = $(this).parent().data().sheet_music_id;
    if (!sheet_music_id || sheet_music_id.length < 1) {
        return false;
    }
    
    let user_token = get_user_token();
    
    if (user_token) {
        // In PDF mode, we lock the view modal in place
        $("body").css({overflowY: 'hidden'});
        $("#pdf_controls_container, #pdf_view_container").css({display: 'none', opacity: 0});
        $("#pdf_loading_header").css({display: 'block', opacity: 1});
        $("#pdf_view_background").css({display: 'grid'}).animate({opacity: 1}, 500, function() {
            
        })

        // Call the API
        $.ajax({
            url: `https://museio.davidr.pro/museio/api/songbank/view_sheet_music?sheet_music_id=${sheet_music_id}`,
            type: 'GET',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', `Bearer ${user_token}`)
            },
            success: function(result) {
                result = JSON.parse(result);
    
                console.log(result);

                pdfData = atob(result.message.file);
                pdfjsLib.GlobalWorkerOptions.workerSrc = '../../resources/pdf_js/build/pdf.worker.js';

                // Opening PDF by passing its binary data as a string. It is still preferable
                // to use Uint8Array, but string or array-like structure will work too.
                var loadingTask = pdfjsLib.getDocument({ data: pdfData, });
                loadingTask.promise.then(function(pdf) {
                    // Fetch the first page.
                    pdf.getPage(1).then(function(page) {
                        
                        var scale = 1.5;
                        var viewport = page.getViewport({ scale: scale, });

                        // Prepare canvas using PDF page dimensions.
                        var canvas = document.getElementById('pdf_view');
                        var context = canvas.getContext('2d');
                        // canvas.height = ($("body").height() - ($("body").height() * 0.1));
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        // Render PDF page into canvas context.
                        var renderContext = {
                            canvasContext: context,
                            viewport: viewport,
                        };
                        var render_task = page.render(renderContext);
                        render_task.promise.then(function() {
                            $("#pdf_loading_header").animate({opacity: 0}, 250, function() {
                                $(this).css({display: 'none'});
                                $("#pdf_controls_container").css({display: 'grid'}).animate({opacity: 1}, 250)
                                $("#pdf_view_container").css({display: 'grid'}).animate({opacity: 1}, 250)
                            })
                        })

                        $("#pdf_view").data({
                            current_page: 1,
                            current_scale: 1.5
                        })
                    });
                });
            },
            error: function(error) {
                console.log(error);
            }
        })
    }
})

$(document).on("change", "#pdf_controls_container > select", function() {
    re_render_pdf($(this).val());
})