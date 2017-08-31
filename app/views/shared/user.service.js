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
        console.log(uid);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlci5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXNlci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdURBQXlEO0FBQ3pELGtEQUFvRDtBQUNwRCwyQkFBNkI7QUFDN0IsdUNBQWtDO0FBYWxDO0lBQUE7SUE4SUEsQ0FBQztJQTdJVSw2QkFBTyxHQUFkLFVBQWUsR0FBRztRQUNkLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBTyxVQUFDLE9BQU8sRUFBRSxNQUFNO1lBQ3JDLFFBQVEsQ0FBQyxLQUFLLENBQ1YsVUFBQSxXQUFXO2dCQUNQLElBQUksSUFBVSxDQUFDO2dCQUNmLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO29CQUNwQixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDOUIsSUFBSSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUM7b0JBQzdCLENBQUM7Z0JBQ0wsQ0FBQztnQkFDRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUNQLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDeEQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNqQixDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO2dCQUM1QixDQUFDO1lBQ0wsQ0FBQyxFQUNELFNBQVMsR0FBRyxHQUFHLEVBQ2Y7Z0JBQ0ksV0FBVyxFQUFFLElBQUk7Z0JBQ2pCLE9BQU8sRUFBRTtvQkFDTCxJQUFJLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUs7b0JBQ3JDLEtBQUssRUFBRSxjQUFjO2lCQUN4QjthQUNKLENBQ0osQ0FBQztRQUVOLENBQUMsQ0FBQyxDQUFB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Q04sQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ0osTUFBTSxDQUFDLG9DQUFvQyxDQUFDLENBQUM7WUFDakQsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVNLGtDQUFZLEdBQW5CLFVBQW9CLEVBQUUsRUFBRSxJQUFJO1FBQTVCLGlCQWVDO1FBZEcsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDbkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqQixNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUUsTUFBTTtZQUMvQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNOLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLEdBQUcsR0FBRyxZQUFZLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07b0JBQ2xFLHlCQUF5QjtvQkFDekIsS0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7d0JBQ25CLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDcEIsQ0FBQyxDQUFDLENBQUE7Z0JBQ04sQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ0osTUFBTSxDQUFDLG9DQUFvQyxDQUFDLENBQUM7WUFDakQsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUNMLGtCQUFDO0FBQUQsQ0FBQyxBQTlJRCxJQThJQztBQTlJWSxrQ0FBVyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZpcmViYXNlIGZyb20gJ25hdGl2ZXNjcmlwdC1wbHVnaW4tZmlyZWJhc2UnO1xuaW1wb3J0ICogYXMgYXBwU2V0dGluZ3MgZnJvbSAnYXBwbGljYXRpb24tc2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCBDb25maWcgZnJvbSAnLi4vLi4vY29uZmlnJztcblxuZXhwb3J0IGludGVyZmFjZSBVc2VyIHtcbiAgICBob3VybHlSYXRlOiBzdHJpbmcsXG4gICAgb3ZlcnRpbWVSYXRlOiBzdHJpbmcsXG4gICAgdWlkOiBzdHJpbmcsXG4gICAgZGF0ZV9jcmVhdGVkOiBzdHJpbmcsXG4gICAgZW1haWw6IHN0cmluZyxcbiAgICBmaXJzdF9uYW1lOiBzdHJpbmcsXG4gICAgbGFzdF9uYW1lOiBzdHJpbmcsXG4gICAgZmFtaWxpZXM/OiBBcnJheTxhbnk+XG59XG5cbmV4cG9ydCBjbGFzcyBVc2VyU2VydmljZSB7XG4gICAgcHVibGljIGdldFVzZXIodWlkKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxVc2VyPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICAgICAgZmlyZWJhc2UucXVlcnkoXG4gICAgICAgICAgICAgICAgcXVlcnlSZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdXNlcjogVXNlcjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHF1ZXJ5UmVzdWx0LnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIHF1ZXJ5UmVzdWx0LnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlciA9IHF1ZXJ5UmVzdWx0LnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHBTZXR0aW5ncy5zZXRTdHJpbmcoJ3VzZXJEYXRhJywgSlNPTi5zdHJpbmdpZnkodXNlcikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh1c2VyKVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KFwiTm8gdXNlciBmb3VuZC5cIilcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgICcvdXNlcnMvJyArIHVpZCwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBzaW5nbGVFdmVudDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJCeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogZmlyZWJhc2UuUXVlcnlPcmRlckJ5VHlwZS5DSElMRCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnZGF0ZV9jcmVhdGVkJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcblxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyB1cGRhdGVVc2VyKGRhdGEpIHtcbiAgICAgICAgbGV0IHVpZCA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1aWQnKSk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICAgICAgaWYgKHVpZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZGlyKGRhdGEpO1xuICAgICAgICAgICAgICAgIGZpcmViYXNlLnVwZGF0ZSgnL3VzZXJzLycgKyB1aWQsIGRhdGEpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIHJlc3VsdCBoZXJlIGlzIGFsd2F5cyB1bmRlZmluZWQuXG4gICAgICAgICAgICAgICAgICAgIGxldCBzYXZlZFVzZXIgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndXNlckRhdGEnKSk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gZGF0YSkgc2F2ZWRVc2VyW2ldID0gZGF0YVtpXTtcbiAgICAgICAgICAgICAgICAgICAgYXBwU2V0dGluZ3Muc2V0U3RyaW5nKCd1c2VyRGF0YScsIEpTT04uc3RyaW5naWZ5KHNhdmVkVXNlcikpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNhdmVkVXNlcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnQ291bGRuXFwndCBmaW5kIHRoZSB1c2VyIHJlY29yZCBJRC4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgYWRkRmFtaWx5KGRhdGEpIHtcbiAgICAgICAgbGV0IHVpZCA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1aWQnKSk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICAgICAgaWYgKHVpZCkge1xuICAgICAgICAgICAgICAgIGZpcmViYXNlLnB1c2goJy91c2Vycy8nICsgdWlkICsgJy9mYW1pbGllcycsIGRhdGEpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRVc2VyKHVpZCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnQ291bGRuXFwndCBmaW5kIHRoZSB1c2VyIHJlY29yZCBJRC4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgc2VuZEVtYWlsKHRvLCBmcm9tLCB0aXRsZSwgbXNnLCBzdWJqZWN0KSB7XG5cbiAgICAgICAgbGV0IGVtYWlsQ29udGVudDogYW55ID0ge1xuICAgICAgICAgICAgXCJwZXJzb25hbGl6YXRpb25zXCI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwidG9cIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZW1haWxcIjogdG8uZW1haWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IHRvLm5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgXCJzdWJqZWN0XCI6IHN1YmplY3RcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgXCJmcm9tXCI6IHtcbiAgICAgICAgICAgICAgICBcImVtYWlsXCI6IGZyb20uZW1haWwsXG4gICAgICAgICAgICAgICAgXCJuYW1lXCI6IGZyb20ubmFtZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicmVwbHlfdG9cIjoge1xuICAgICAgICAgICAgICAgIFwiZW1haWxcIjogZnJvbS5lbWFpbCxcbiAgICAgICAgICAgICAgICBcIm5hbWVcIjogZnJvbS5uYW1lXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJzdWJqZWN0XCI6IHN1YmplY3QsXG4gICAgICAgICAgICBcImNvbnRlbnRcIjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwidGV4dC9odG1sXCIsXG4gICAgICAgICAgICAgICAgICAgIFwidmFsdWVcIjogJzxodG1sPjxwPjxkaXYgc3R5bGU9XCJtYXgtd2lkdGg6IDYwMHB4OyBtYXJnaW46IGF1dG87IGZvbnQtZmFtaWx5OiBIZWx2ZXRpY2E7XCI+PGNlbnRlcj48aW1nIHNyYz1cImh0dHBzOi8vZGV2LmRhaWx5bmFubnlhcHAuY29tL2ltYWdlcy9uYW5ueXNoaWZ0c19sb2dvLnBuZ1wiIHN0eWxlPVwid2lkdGg6IDIwMHB4O1wiLz48YnIgLz48aDI+JyArIHRpdGxlICsgJzwvaDI+PHNwYW4gc3R5bGU9XCJmb250LXNpemU6IDE2cHg7IGZvbnQtd2VpZ2h0OiAzMDA7IGxpbmUtaGVpZ2h0OiAyMHB4O1wiPicgKyBtc2cgKyAnPC9zcGFuPjxiciAvPjxiciAvPjxzcGFuIHN0eWxlPVwiZm9udC1zaXplOiAxMXB4OyBjb2xvcjogZ3JheTtcIj5KdXN0IHJlcGx5IHRvIHRoaXMgZW1haWwgd2l0aCBxdWVzdGlvbnMgb3IgY29tbWVudHMuPGJyLz48YnIvPjxhIGhyZWY9XCJodHRwOi8vbmFubnlzaGlmdHMuY29tXCI+bmFubnlzaGlmdHMuY29tPC9hPjwvc3Bhbj48L2NlbnRlcj48L2Rpdj48L3A+PC9odG1sPidcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICAgbGV0IG9wdGlvbnM6IGh0dHAuSHR0cFJlcXVlc3RPcHRpb25zID0ge1xuICAgICAgICAgICAgdXJsOiAnaHR0cHM6Ly9hcGkuc2VuZGdyaWQuY29tL3YzL21haWwvc2VuZCcsXG4gICAgICAgICAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICBcImF1dGhvcml6YXRpb25cIjogXCJiZWFyZXIgXCIgKyBDb25maWcuc2VuZEdyaWRBcGlLZXksXG4gICAgICAgICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb250ZW50OiBKU09OLnN0cmluZ2lmeShlbWFpbENvbnRlbnQpXG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZygnYWJvdXQgdG8gc2VuZCBlbWFpbCB0byAnICsgdG8uZW1haWwpO1xuICAgICAgICByZXR1cm4gaHR0cC5yZXF1ZXN0KG9wdGlvbnMpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgIC8vY29uc29sZS5kaXIocmVzdWx0KTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgc2F2ZUZhbWlseShpZCwgZGF0YSkge1xuICAgICAgICBsZXQgdWlkID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VpZCcpKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsgXG4gICAgICAgICAgICBpZiAodWlkKSB7XG4gICAgICAgICAgICAgICAgZmlyZWJhc2Uuc2V0VmFsdWUoJy91c2Vycy8nICsgdWlkICsgJy9mYW1pbGllcy8nICsgaWQsIGRhdGEpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlIHRoZSBzYXZlZCB1c2VyLlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmdldFVzZXIodWlkKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdDb3VsZG5cXCd0IGZpbmQgdGhlIHVzZXIgcmVjb3JkIElELicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyB1cGRhdGVGYW1pbHkoaWQsIGRhdGEpIHtcbiAgICAgICAgbGV0IHVpZCA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1aWQnKSk7XG4gICAgICAgIGNvbnNvbGUubG9nKHVpZCk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICAgICAgaWYgKHVpZCkge1xuICAgICAgICAgICAgICAgIGZpcmViYXNlLnVwZGF0ZSgnL3VzZXJzLycgKyB1aWQgKyAnL2ZhbWlsaWVzLycgKyBpZCwgZGF0YSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGUgdGhlIHNhdmVkIHVzZXIuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0VXNlcih1aWQpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ0NvdWxkblxcJ3QgZmluZCB0aGUgdXNlciByZWNvcmQgSUQuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxufSJdfQ==