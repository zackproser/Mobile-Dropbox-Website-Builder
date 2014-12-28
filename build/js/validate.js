validate = function() {

	var email_field = $("#email-field"),
		message_field = $("#message-field")
	;

	if (!/^[+a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/i.test($(email_field).val())) {
		$(email_field).val('Please enter a valid e-mail address!').css({'color':'red'});
		return;
	}

	if ($(message_field).val() == "") {
		$(message_field.val('Surely you can do better than that!').css({'color':'red'}));
		return;
	}

	$.post('/inbound', { 'email' : email_field.val(), 'message': message_field.val() }, function(data) {
		console.log(data)
		$(email_field.val('Thanks!').css({'color':'green'}));
		$(message_field.val('We\'ll get back to you shortly!').css({'color':'green'}));
	})
	.fail(function() {
			$(email_field.val('Ooops!').css({'color':'orange'}));
			$(message_field.val('We weren\'t able to send your message!').css({'color':'orange'}));
	});
}
