function removeFileName(fileName) {
    var fileExtensions = ['.png', '.jpg', '.jpeg', '.tiff', '.tif', '.PNG', '.JPG', '.JPEG', '.TIFF', '.TIF'];
    var final_string = fileName;
    fileExtensions.forEach(function(ext) {
        final_string = final_string.replace(ext, '');
    });
    return final_string;
}

$("#lightbox-modal").modal({ show: false });

$(".gallery-thumb").click(function(e) {
	console.log(e);

	var img = $('<img class="full-img">');
	img.attr('src', e.currentTarget.src);
	img.css({'width':1150});
	var img_title = $(img).data('title');
	console.log(e.currentTarget.dataset.title);

	$("#lightbox-modal .modal-content").css({ 'width': 1200, 'margin-right':200});
	$("#lightbox-modal .modal-body").html(img);
	$("#lightbox-modal .modal-title").html(removeFileName(e.currentTarget.dataset.title));
	$("#lightbox-modal").modal('show');

});