// ملف index.js

var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log('Server listening at port %d', port);
});
// تجهيز المجلد - public -
// للوصول لمحتوايته من خلال روابط الموقع مباشرة 
// يحتوي هذا المجلد عادة على المحتويات الثابتة من مثل ملفات
// css و javascript و images  
// و الأيقونات
// هذا شيء عام  لكل التطبيقات التي تقوم بعملها
app.use(express.static(path.join(__dirname, 'public')));

// هنا يبدأ منطق التطبيق

// متغير لحفظ عدد المستخدمين في الوقت الواحد
var numUsers = 0;

// هنا منطق التعامل مع حدث "الارتباط" الجديد مع العميل - المتصفح
//  حيث يقوم محرك السوكت.ايو بإرسال هذا "الارتباط" كمتغير 
io.on('connection', (socket) => {
    var addedUser = false;

    // هذا ارتباط خاص لكل مستخدم و هنا تم تحديد أنه عند استقبال الحدث 
    // new message
    // data و بيانات الحدث المضمنة في
    socket.on('new message', (data) => {
        // فسيقوم الارتباط بإرسال الحدث لكل المستخدمين (الارتباطات ) الآخرين
        //  مع بيانات مضمنة في كائن يحتوي على اسم المستخدم و الرسالة التي قام بكتابتها المستخدم
        socket.broadcast.emit('new message', {
            username: socket.username,
            message: data
        });
    });

    // عند ارتباط مستخدم يمكنه ارسال أي 
    // حدث (البرمجة عند المتصفح هي من تقوم بالإرسال) و هنا يقوم بإرسال 
    // حدث "أضف مستخدم" و معه بيان اسم الشخص
    socket.on('add user', (username) => {
        if (addedUser) return;
        // يتم تخزين اسم الشخص في "الارتباط" ليبقى على مدى الارتباط
        socket.username = username;
        // هنا نٌعلم أن عدد المستخدمين زاد بمقدار واحد
        ++numUsers;
        addedUser = true;
        // هنا يتم الرد على الشخص بحدث الدخول و معه بيان عدد المستخدمين
        socket.emit('login', {
            numUsers: numUsers
        });
        //  هنا يتم بعث حدث "شخص جديد" لكل المستخدمين ومعه اسم الشخص و عدد الأشخاص كافة
        socket.broadcast.emit('user joined', {
            username: socket.username,
            numUsers: numUsers
        });
    });

    // هنا يتم استقبال حدث "جاري الكتابة" ليتم ارساله إلى جميع المستخدمين
    socket.on('typing', () => {
        socket.broadcast.emit('typing', {
            username: socket.username
        });
    });

    // هنا يتم استقبال حدث توقف عن الكتابة ليتم ارساله الى جميع المستخدمين
    socket.on('stop typing', () => {
        socket.broadcast.emit('stop typing', {
            username: socket.username
        });
    });

    // هنا يتم استقبال حدث انفصال الارتباط و هذا الحدث يقوم محرك العميل في  المتصفح 
    // بإرساله بطريقة آلية ، أي أن هذا موجود و لو لم تكتب له كود معين 
    socket.on('disconnect', () => {
        if (addedUser) {
            --numUsers;

            // بعد انقاص عدد الأشخاص، يتم إخطار الجميع بأن الشخص غادر
            socket.broadcast.emit('user left', {
                username: socket.username,
                numUsers: numUsers
            });
        }
    });
});