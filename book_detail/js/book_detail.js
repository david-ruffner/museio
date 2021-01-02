// JS for book_detail

$(document).ready(function() {
    // Set the title divider's width to 10% more than the title's width, or 90% if the width in pixels would exceed the book container's width.
    let title_width = Math.ceil($("#book_detail_title").width());
    let div_width = Math.ceil(title_width + (title_width * .1));
    let book_container_width = Math.ceil($("#book_detail_container").width());

    $("#book_detail_title_divider").css({width: ((div_width >= book_container_width) ? '90%' : `${div_width}px`)});
})