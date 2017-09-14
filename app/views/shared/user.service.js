"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var firebase = require("nativescript-plugin-firebase");
var appSettings = require("application-settings");
var http = require("http");
var config_1 = require("../../config");
var UserService = (function () {
    function UserService() {
    }
    UserService.prototype.getUser = function (uid) {
        return new Promise(function (resolve, reject) {
            firebase.query(function (queryResult) {
                var user;
                if (queryResult.value) {
                    for (var i in queryResult.value) {
                        user = queryResult.value;
                    }
                }
                if (user) {
                    appSettings.setString('userData', JSON.stringify(user));
                    resolve(user);
                }
                else {
                    reject("No user found.");
                }
            }, '/users/' + uid, {
                singleEvent: true,
                orderBy: {
                    type: firebase.QueryOrderByType.CHILD,
                    value: 'date_created'
                }
            });
        });
    };
    UserService.prototype.updateUser = function (data) {
        var uid = JSON.parse(appSettings.getString('uid'));
        return new Promise(function (resolve, reject) {
            if (uid) {
                console.dir(data);
                firebase.update('/users/' + uid, data).then(function (result) {
                    // the result here is always undefined.
                    var savedUser = JSON.parse(appSettings.getString('userData'));
                    for (var i in data)
                        savedUser[i] = data[i];
                    appSettings.setString('userData', JSON.stringify(savedUser));
                    resolve(savedUser);
                });
            }
            else {
                reject('Couldn\'t find the user record ID.');
            }
        });
    };
    UserService.prototype.addFamily = function (data) {
        var _this = this;
        var uid = JSON.parse(appSettings.getString('uid'));
        return new Promise(function (resolve, reject) {
            if (uid) {
                firebase.push('/users/' + uid + '/families', data).then(function (result) {
                    _this.getUser(uid).then(function () {
                        resolve(result);
                    });
                });
            }
            else {
                reject('Couldn\'t find the user record ID.');
            }
        });
    };
    UserService.prototype.sendEmail = function (to, from, title, msg, subject) {
        var emailContent = {
            "personalizations": [
                {
                    "to": [
                        {
                            "email": to.email,
                            "name": to.name
                        }
                    ],
                    "subject": subject
                }
            ],
            "from": {
                "email": from.email,
                "name": from.name
            },
            "reply_to": {
                "email": from.email,
                "name": from.name
            },
            "subject": subject,
            "content": [
                {
                    "type": "text/html",
                    "value": '<html><p><div style="max-width: 600px; margin: auto; font-family: Helvetica;"><center><img src="https://dev.dailynannyapp.com/images/nannyshifts_logo.png" style="width: 200px;"/><br /><h2>' + title + '</h2><span style="font-size: 16px; font-weight: 300; line-height: 20px;">' + msg + '</span><br /><br /><span style="font-size: 11px; color: gray;">Just reply to this email with questions or comments.<br/><br/><a href="http://nannyshifts.com">nannyshifts.com</a></span></center></div></p></html>'
                }
            ]
        };
        var options = {
            url: 'https://api.sendgrid.com/v3/mail/send',
            method: 'post',
            headers: {
                "authorization": "bearer " + config_1.default.sendGridApiKey,
                "Content-Type": "application/json"
            },
            content: JSON.stringify(emailContent)
        };
        console.log('about to send email to ' + to.email);
        return http.request(options).then(function (result) {
            //console.dir(result);
        });
    };
    UserService.prototype.saveFamily = function (id, data) {
        var _this = this;
        var uid = JSON.parse(appSettings.getString('uid'));
        return new Promise(function (resolve, reject) {
            if (uid) {
                firebase.setValue('/users/' + uid + '/families/' + id, data).then(function (result) {
                    // update the saved user.
                    _this.getUser(uid).then(function () {
                        resolve(result);
                    });
                });
            }
            else {
                reject('Couldn\'t find the user record ID.');
            }
        });
    };
    UserService.prototype.updateFamily = function (id, data) {
        var _this = this;
        var uid = JSON.parse(appSettings.getString('uid'));
        return new Promise(function (resolve, reject) {
            if (uid) {
                firebase.update('/users/' + uid + '/families/' + id, data).then(function (result) {
                    // update the saved user.
                    _this.getUser(uid).then(function () {
                        resolve(result);
                    });
                });
            }
            else {
                reject('Couldn\'t find the user record ID.');
            }
        });
    };
    return UserService;
}());
exports.UserService = UserService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlci5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXNlci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdURBQXlEO0FBQ3pELGtEQUFvRDtBQUNwRCwyQkFBNkI7QUFDN0IsdUNBQWtDO0FBYWxDO0lBQUE7SUE2SUEsQ0FBQztJQTVJVSw2QkFBTyxHQUFkLFVBQWUsR0FBRztRQUNkLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBTyxVQUFDLE9BQU8sRUFBRSxNQUFNO1lBQ3JDLFFBQVEsQ0FBQyxLQUFLLENBQ1YsVUFBQSxXQUFXO2dCQUNQLElBQUksSUFBVSxDQUFDO2dCQUNmLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO29CQUNwQixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDOUIsSUFBSSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUM7b0JBQzdCLENBQUM7Z0JBQ0wsQ0FBQztnQkFDRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUNQLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDeEQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNqQixDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO2dCQUM1QixDQUFDO1lBQ0wsQ0FBQyxFQUNELFNBQVMsR0FBRyxHQUFHLEVBQ2Y7Z0JBQ0ksV0FBVyxFQUFFLElBQUk7Z0JBQ2pCLE9BQU8sRUFBRTtvQkFDTCxJQUFJLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUs7b0JBQ3JDLEtBQUssRUFBRSxjQUFjO2lCQUN4QjthQUNKLENBQ0osQ0FBQztRQUVOLENBQUMsQ0FBQyxDQUFB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Q04sQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ0osTUFBTSxDQUFDLG9DQUFvQyxDQUFDLENBQUM7WUFDakQsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVNLGtDQUFZLEdBQW5CLFVBQW9CLEVBQUUsRUFBRSxJQUFJO1FBQTVCLGlCQWNDO1FBYkcsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU07WUFDL0IsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDTixRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxHQUFHLEdBQUcsWUFBWSxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQSxNQUFNO29CQUNsRSx5QkFBeUI7b0JBQ3pCLEtBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO3dCQUNuQixPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3BCLENBQUMsQ0FBQyxDQUFBO2dCQUNOLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNKLE1BQU0sQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1lBQ2pELENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFDTCxrQkFBQztBQUFELENBQUMsQUE3SUQsSUE2SUM7QUE3SVksa0NBQVciLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmaXJlYmFzZSBmcm9tICduYXRpdmVzY3JpcHQtcGx1Z2luLWZpcmViYXNlJztcbmltcG9ydCAqIGFzIGFwcFNldHRpbmdzIGZyb20gJ2FwcGxpY2F0aW9uLXNldHRpbmdzJztcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgQ29uZmlnIGZyb20gJy4uLy4uL2NvbmZpZyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVXNlciB7XG4gICAgaG91cmx5UmF0ZTogc3RyaW5nLFxuICAgIG92ZXJ0aW1lUmF0ZTogc3RyaW5nLFxuICAgIHVpZDogc3RyaW5nLFxuICAgIGRhdGVfY3JlYXRlZDogc3RyaW5nLFxuICAgIGVtYWlsOiBzdHJpbmcsXG4gICAgZmlyc3RfbmFtZTogc3RyaW5nLFxuICAgIGxhc3RfbmFtZTogc3RyaW5nLFxuICAgIGZhbWlsaWVzPzogQXJyYXk8YW55PlxufVxuXG5leHBvcnQgY2xhc3MgVXNlclNlcnZpY2Uge1xuICAgIHB1YmxpYyBnZXRVc2VyKHVpZCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8VXNlcj4oKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgICAgIGZpcmViYXNlLnF1ZXJ5KFxuICAgICAgICAgICAgICAgIHF1ZXJ5UmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHVzZXI6IFVzZXI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChxdWVyeVJlc3VsdC52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBxdWVyeVJlc3VsdC52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXIgPSBxdWVyeVJlc3VsdC52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBwU2V0dGluZ3Muc2V0U3RyaW5nKCd1c2VyRGF0YScsIEpTT04uc3RyaW5naWZ5KHVzZXIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodXNlcilcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChcIk5vIHVzZXIgZm91bmQuXCIpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICAnL3VzZXJzLycgKyB1aWQsIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgc2luZ2xlRXZlbnQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG9yZGVyQnk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGZpcmViYXNlLlF1ZXJ5T3JkZXJCeVR5cGUuQ0hJTEQsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ2RhdGVfY3JlYXRlZCdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgdXBkYXRlVXNlcihkYXRhKSB7XG4gICAgICAgIGxldCB1aWQgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgICAgIGlmICh1aWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmRpcihkYXRhKTtcbiAgICAgICAgICAgICAgICBmaXJlYmFzZS51cGRhdGUoJy91c2Vycy8nICsgdWlkLCBkYXRhKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSByZXN1bHQgaGVyZSBpcyBhbHdheXMgdW5kZWZpbmVkLlxuICAgICAgICAgICAgICAgICAgICBsZXQgc2F2ZWRVc2VyID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIGRhdGEpIHNhdmVkVXNlcltpXSA9IGRhdGFbaV07XG4gICAgICAgICAgICAgICAgICAgIGFwcFNldHRpbmdzLnNldFN0cmluZygndXNlckRhdGEnLCBKU09OLnN0cmluZ2lmeShzYXZlZFVzZXIpKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzYXZlZFVzZXIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ0NvdWxkblxcJ3QgZmluZCB0aGUgdXNlciByZWNvcmQgSUQuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGFkZEZhbWlseShkYXRhKSB7XG4gICAgICAgIGxldCB1aWQgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgICAgIGlmICh1aWQpIHtcbiAgICAgICAgICAgICAgICBmaXJlYmFzZS5wdXNoKCcvdXNlcnMvJyArIHVpZCArICcvZmFtaWxpZXMnLCBkYXRhKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0VXNlcih1aWQpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ0NvdWxkblxcJ3QgZmluZCB0aGUgdXNlciByZWNvcmQgSUQuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIHNlbmRFbWFpbCh0bywgZnJvbSwgdGl0bGUsIG1zZywgc3ViamVjdCkge1xuXG4gICAgICAgIGxldCBlbWFpbENvbnRlbnQ6IGFueSA9IHtcbiAgICAgICAgICAgIFwicGVyc29uYWxpemF0aW9uc1wiOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcInRvXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImVtYWlsXCI6IHRvLmVtYWlsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiB0by5uYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgIFwic3ViamVjdFwiOiBzdWJqZWN0XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIFwiZnJvbVwiOiB7XG4gICAgICAgICAgICAgICAgXCJlbWFpbFwiOiBmcm9tLmVtYWlsLFxuICAgICAgICAgICAgICAgIFwibmFtZVwiOiBmcm9tLm5hbWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInJlcGx5X3RvXCI6IHtcbiAgICAgICAgICAgICAgICBcImVtYWlsXCI6IGZyb20uZW1haWwsXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IGZyb20ubmFtZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwic3ViamVjdFwiOiBzdWJqZWN0LFxuICAgICAgICAgICAgXCJjb250ZW50XCI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInRleHQvaHRtbFwiLFxuICAgICAgICAgICAgICAgICAgICBcInZhbHVlXCI6ICc8aHRtbD48cD48ZGl2IHN0eWxlPVwibWF4LXdpZHRoOiA2MDBweDsgbWFyZ2luOiBhdXRvOyBmb250LWZhbWlseTogSGVsdmV0aWNhO1wiPjxjZW50ZXI+PGltZyBzcmM9XCJodHRwczovL2Rldi5kYWlseW5hbm55YXBwLmNvbS9pbWFnZXMvbmFubnlzaGlmdHNfbG9nby5wbmdcIiBzdHlsZT1cIndpZHRoOiAyMDBweDtcIi8+PGJyIC8+PGgyPicgKyB0aXRsZSArICc8L2gyPjxzcGFuIHN0eWxlPVwiZm9udC1zaXplOiAxNnB4OyBmb250LXdlaWdodDogMzAwOyBsaW5lLWhlaWdodDogMjBweDtcIj4nICsgbXNnICsgJzwvc3Bhbj48YnIgLz48YnIgLz48c3BhbiBzdHlsZT1cImZvbnQtc2l6ZTogMTFweDsgY29sb3I6IGdyYXk7XCI+SnVzdCByZXBseSB0byB0aGlzIGVtYWlsIHdpdGggcXVlc3Rpb25zIG9yIGNvbW1lbnRzLjxici8+PGJyLz48YSBocmVmPVwiaHR0cDovL25hbm55c2hpZnRzLmNvbVwiPm5hbm55c2hpZnRzLmNvbTwvYT48L3NwYW4+PC9jZW50ZXI+PC9kaXY+PC9wPjwvaHRtbD4nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICAgIGxldCBvcHRpb25zOiBodHRwLkh0dHBSZXF1ZXN0T3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHVybDogJ2h0dHBzOi8vYXBpLnNlbmRncmlkLmNvbS92My9tYWlsL3NlbmQnLFxuICAgICAgICAgICAgbWV0aG9kOiAncG9zdCcsXG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgXCJhdXRob3JpemF0aW9uXCI6IFwiYmVhcmVyIFwiICsgQ29uZmlnLnNlbmRHcmlkQXBpS2V5LFxuICAgICAgICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29udGVudDogSlNPTi5zdHJpbmdpZnkoZW1haWxDb250ZW50KVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coJ2Fib3V0IHRvIHNlbmQgZW1haWwgdG8gJyArIHRvLmVtYWlsKTtcbiAgICAgICAgcmV0dXJuIGh0dHAucmVxdWVzdChvcHRpb25zKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAvL2NvbnNvbGUuZGlyKHJlc3VsdCk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIHNhdmVGYW1pbHkoaWQsIGRhdGEpIHtcbiAgICAgICAgbGV0IHVpZCA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1aWQnKSk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICAgICAgaWYgKHVpZCkge1xuICAgICAgICAgICAgICAgIGZpcmViYXNlLnNldFZhbHVlKCcvdXNlcnMvJyArIHVpZCArICcvZmFtaWxpZXMvJyArIGlkLCBkYXRhKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgc2F2ZWQgdXNlci5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRVc2VyKHVpZCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnQ291bGRuXFwndCBmaW5kIHRoZSB1c2VyIHJlY29yZCBJRC4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgdXBkYXRlRmFtaWx5KGlkLCBkYXRhKSB7XG4gICAgICAgIGxldCB1aWQgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgICAgIGlmICh1aWQpIHtcbiAgICAgICAgICAgICAgICBmaXJlYmFzZS51cGRhdGUoJy91c2Vycy8nICsgdWlkICsgJy9mYW1pbGllcy8nICsgaWQsIGRhdGEpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlIHRoZSBzYXZlZCB1c2VyLlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmdldFVzZXIodWlkKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdDb3VsZG5cXCd0IGZpbmQgdGhlIHVzZXIgcmVjb3JkIElELicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cbn0iXX0=