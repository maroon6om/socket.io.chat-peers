// ملف main.js

$(function() {
  var FADE_TIME = 150; // جزء من الثانية
  var TYPING_TIMER_LENGTH = 400; // جزء من الثانية
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // متغير يشير إلى حقل اسم المستخدم
  var $messages = $('.messages'); // متغير يشير إلى مربع الرسائل
  var $inputMessage = $('.inputMessage'); // متغير يشير إلى حقل كتابة رسالة جديدة

  var $loginPage = $('.login.page'); // صفحة الدخول
  var $chatPage = $('.chat.page'); // صفحة المحادثة
  // ملاحظة: هذه ليست صفحات تطلب بحد ذاتها من المزود و لكن عناصر موجودة من طلب واحد
  // يتم عرضها و إخفائها لتظهر كأنها صفحات

  // اطلب من المستخدم إدخال اسمه
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  // في باديء الأمر سلط الضوء على حقل اسم المستخدم
  var $currentInput = $usernameInput.focus();

  // أنشيء محرك سوكت.ايو
  var socket = io();

  // مأمورية addParticipantsMessage لتسجيل رسائل إضافة المستخدمين في مربع الرسائل
  const addParticipantsMessage = (data) => {
    var message = '';
    if (data.numUsers === 1) {
      message += "يوجد مستخدم واحد";
    } else {
      message += "يوجد " + data.numUsers + " مستخدمين";
    }
    // مأمورية log هي التي ستضيف في مربع الرسائل رسائل سجلية
    // بعد أن تزودها بمحتوى نصي 
    log(message);
  }

  // مأمورية وضع اسم المستخدم
  const setUsername = () => {
    // مأمورية cleanInput لتنقية المدخل، ليس ضرورياً لعمل البرنامج و لمن ضروري لحماية
    // البرنامج من مدخلات غير مرغوب فيها
    username = cleanInput($usernameInput.val().trim());

    // إذا كان اسم المستخدم يتكون من حرف فأعلى
    if (username) {
      // أخف صفحة إدخال اسم المستخدم
      $loginPage.fadeOut();
      // أظهر صفحة المحادثة
      $chatPage.show();
      $loginPage.off('click');
      // الآن سلط الضوء على حقل إدخال الرسالة
      $currentInput = $inputMessage.focus();

      // ابعث للمزود بحدث إضافة المستخدم مع بيان اسم المستخدم
      socket.emit('add user', username);
    }
  }

  // مأمورية ارسال رسالة محادثة
  const sendMessage = () => {
    var message = $inputMessage.val();
    message = cleanInput(message);
    // إذا وجدت الرسالة مع وجود تواصل - ارتباط - مع المزود
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // بعث للمزود بحدث رسالة جديدة علماً أن المزود يعلم من أرسل الرسالة
      socket.emit('new message', message);
    }
  }

    // مأمورية log هي التي ستضيف في مربع الرسائل رسائل سجلية
    // بعد أن تزودها بمحتوى نصي 
    const log = (message, options) => {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // رسم الرسالة في المحادثة
  const addChatMessage = (data, options) => {

    var $typingMessages = getTypingMessages(data);
      options = options || {};
      if ($typingMessages.length !== 0) {
        options.fade = false;
        $typingMessages.remove();
    }

    var $usernameDiv = $('<div class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<div class="messageBody" \
      style="background:'+getUsernameColor(data.username)+'55;">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // أظهر رسالة جاري الكتابة
  const addChatTyping = (data) => {
    data.typing = true;
    data.message = 'يكتب ...';
    addChatMessage(data);
  }

  // مأمورية إخفاء رسالة جاري الكتابة
  const removeChatTyping = (data) => {
    getTypingMessages(data).fadeOut(() => {
      $(this).remove();
    });
  }

  const addMessageElement = (el, options) => {
    var $el = $(el);

    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // للتأكد أن المدخل يحوي على محتوى نصي فقط
  const cleanInput = (input) => {
    return $('<div/>').text(input).html();
  }

  // حدث جاري الكتابة
  const updateTyping = () => {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      // هنا للتعرف هل هي كتابة متواصلة أو لا
      // حيث إذا لم تكن متواصلة  
      // سيرسل للبقية توقف الكتابة
      setTimeout(() => {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // احصل على عناصر رسائل "جاري الكتابة" لمستخدم معين و ذلك لغرض حذفهن
  const getTypingMessages = (data) => {
    return $('.typing.message').filter((i,v) => {
      return $(v).data('username') === data.username
    });

  }

  // لون اسم المستخدم
  const getUsernameColor = (username) => {
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // أحداث لوحة المفاتيح - الكيبورد

  $window.keydown(event => {
    // إذا كتب المستخدم في الفحة فإن ذلك سينعكس في حقل كتابة رسالة 
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // ضغط مفتاح إرجاع - إدخال - فإن ذلك سيرسل الرسالة
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
      // ملاحظة: لأن هذا البرنامج يتكون من صفحتين
      // فإن مفتاح إدخال يمكت عمله بهذة الطريقة 
      // if..else
        setUsername();
      }
    }
  });

  // مستمع لحدث الكتابة في حقل الإدخال
  $inputMessage.on('input', () => {
    updateTyping();
  });

  // أحداث النقر
  
  // سلط ضوء الكتابة على حقل الإدخال في صفحة الدخول عند النقر في أي
  // مكان في الصفحة
  $loginPage.click(() => {
    $currentInput.focus();
  });

  // سلط ضوء الكتابة على حقل الإدخال في صفحة الدخول عند النقر في أي
  // مكان في الصفحة
  $loginPage.click(() => {
    $currentInput.focus();
  });

  // تضمين حدث النقر على اسم المستخدم في كل رسالة جديدة
  $(document).on('click', 'div.username', function(e){
    console.log($(this).text());
    // استخراج الرسالة المكتوبة ان وجدت وتضمينها في متغير جديد
    var currentInputText = $currentInput.val();
    // التحقق ما اذا كان المستخدم مضمن مسبقا مع @ علامة الخصوصية لرسالة الحالية
    if(currentInputText.indexOf('@'+$(this).text()) < 0)
    {
      // اضافة اسم المستخدم المختار مع وسم @ للخصوصيه
      currentInputText += ('@'+$(this).text()+" "+currentInputText);
      // تضمين الرسالة المعدلة في حقل الرسائل
      $currentInput.val(currentInputText);
    }
    
  })
  

  // أحداث الإرتباط

  // عند استقبال حدث الدخول من المزود٫ إعرض رسالة الترحيب
  socket.on('login', (data) => {
    connected = true;
    // رسالة الترحيل
    var message = "أهلاً وسهلاً بك في تطبيق السوكت.ايو";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // عند استقبال حدث الرسالة الجديدة، حدّث المحادثة لتظهر الرسالة
  socket.on('new message', (data) => {
    addChatMessage(data);
  });

  
  // استقبال حدث مستخدم انضم
  socket.on('user joined', (data) => {
    log(data.username + ' انضم');
    addParticipantsMessage(data);
  });

  // استقبال حدث مستخدم غادر
  socket.on('user left', (data) => {
    log(data.username + ' غادر');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // استقبال حدث جاري الكتابة
  socket.on('typing', (data) => {
    addChatTyping(data);
  });

  // استقبال حدث توقف الكتابةے
  socket.on('stop typing', (data) => {
    removeChatTyping(data);
  });

  // استقبال حدث انقطع الاتصال
  socket.on('disconnect', () => {
    log('لقد انقطع الاتصال');
  });

  // استقبال حدث الاتصال مجدداً
  socket.on('reconnect', () => {
    log('تم الاتصال مجدداً');
    if (username) {
      socket.emit('add user', username);
    }
  });

  // استقبال حدث الاتصال فشل
  socket.on('reconnect_error', () => {
    log('محاولة إعادة الاتصال فشلت');
  });

});
