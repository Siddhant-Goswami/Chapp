/* eslint-disable no-undef */
var socket = io();
var params = jQuery.deparam(window.location.search);
var timeout = undefined;

function scrollToBottom () {
  // Selectors
  var messages = jQuery('#messages');
  var newMessage = messages.children('li:last-child')
  // Heights
  var clientHeight = messages.prop('clientHeight');
  var scrollTop = messages.prop('scrollTop');
  var scrollHeight = messages.prop('scrollHeight');
  var newMessageHeight = newMessage.innerHeight();
  var lastMessageHeight = newMessage.prev().innerHeight();

  if (clientHeight + scrollTop + newMessageHeight + lastMessageHeight >= scrollHeight) {
    messages.scrollTop(scrollHeight);
  }
}

function emitUserIsTyping(typing){
  socket.emit('isTyping', {name: params.name, typing: typing})
}

socket.on('connect', function () {
  socket.emit('join', params, function (err) {
    if (err) {
      alert(err);
      window.location.href = '/';
    } else {
      console.log('No error');
    }
  });
});

socket.on('disconnect', function () {
  console.log('Disconnected from server');
});

socket.on('updateUserList', function (users) {
  var ul = jQuery('<ul></ul>');

  users.forEach(function (user) {
    ul.append(jQuery('<li></li>').text(user));
  });

  jQuery('#rooms').text('#'+params.room);

  jQuery('#users').html(ul);
});

socket.on('newMessage', function (message) {
  var formattedTime = moment(message.createdAt).format('h:mm a');
  var template = jQuery('#message-template').html();
  var html = Mustache.render(template, {
    text: message.text,
    from: message.from,
    createdAt: formattedTime
  });

  jQuery('#messages').append(html);
  scrollToBottom();
});

socket.on('newLocationMessage', function (message) {
  var formattedTime = moment(message.createdAt).format('h:mm a');
  var template = jQuery('#location-message-template').html();
  var html = Mustache.render(template, {
    from: message.from,
    url: message.url,
    createdAt: formattedTime
  });

  jQuery('#messages').append(html);
  scrollToBottom();
});

socket.on('typing', function(user){
  if(user.typing && user.name!==params.name)
    jQuery('#typing-text').text(user.name + ' is typing...');
  else
    jQuery('#typing-text').text('');

  clearTimeout(timeout)
  timeout=setTimeout(emitUserIsTyping, 1500)

});

jQuery('#message-box').keydown(function(){
  emitUserIsTyping(true);
  clearTimeout(timeout)
  timeout=setTimeout(emitUserIsTyping, 1500)
});


jQuery('#message-form').on('submit', function (e) {
  var messageTextbox = jQuery('[name=message]');
  var formattedTime = moment().format('h:mm a');
  var template = $("#message-template").html();
  var html = Mustache.render(template, {
      text: messageTextbox.val(),
      from: params.name,
      createdAt: formattedTime
  }, function(){ messageTextbox.val(''); });
  
  e.preventDefault();
  clearTimeout(timeout);
  emitUserIsTyping(false);

  if(messageTextbox.val()!==''){
    //append user's own message to screen
    $("#messages").append(html);
    scrollToBottom();
    //emit to broadcast message
    socket.emit('createMessage', {
      from: params.name,
      text: messageTextbox.val()
    }, function () {
      messageTextbox.val('')
    });
  }
});

var locationButton = jQuery('#send-location');
locationButton.on('click', function () {
  if (!navigator.geolocation) {
    return alert('Geolocation not supported by your browser.');
  }

  locationButton.attr('disabled', 'disabled').text('Sending location...');

  navigator.geolocation.getCurrentPosition(function (position) {
    locationButton.removeAttr('disabled').text('Send location');
    socket.emit('createLocationMessage', {
      from: params.name,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    });
  }, function () {
    locationButton.removeAttr('disabled').text('Send location');
    alert('Unable to fetch location.');
  });
});
