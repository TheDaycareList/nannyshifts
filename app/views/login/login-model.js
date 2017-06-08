"use strict";
var observable_1 = require("data/observable");
var firebase = require("nativescript-plugin-firebase");
var dialogs = require("ui/dialogs");
var appSettings = require("application-settings");
var moment = require("moment");
var frame = require("ui/frame");
var user_service_1 = require("../shared/user.service");
var LoginModel = (function (_super) {
    __extends(LoginModel, _super);
    function LoginModel() {
        var _this = _super.call(this) || this;
        _this.userService = new user_service_1.UserService();
        _this.email = 'dave@davecoffin.com';
        _this.password = 'Endien1.';
        _this.loggingIn = true;
        return _this;
    }
    LoginModel.prototype.toggleMethod = function () {
        this.set('loggingIn', !this.loggingIn);
        console.log('Logging in: ' + this.loggingIn);
    };
    LoginModel.prototype.signup = function () {
        var _this = this;
        console.log('signup');
        if (this.email && this.password) {
            if (this.password != this.password2) {
                alert('The passwords you entered do not match.');
                return;
            }
            firebase.createUser({
                email: this.email,
                password: this.password
            }).then(function (result) {
                appSettings.setString('uid', JSON.stringify(result.key));
                var userObj = {
                    "date_created": moment().format(),
                    "email": _this.email
                };
                firebase.setValue('/users/' + result.key, userObj).then(function () {
                    appSettings.setString('userData', JSON.stringify(userObj));
                    frame.topmost().navigate({
                        moduleName: '/views/usersetup/usersetup',
                        backstackVisible: false,
                        animated: false,
                        clearHistory: true
                    });
                });
            }, function (errorMessage) {
                dialogs.alert({
                    title: "No user created",
                    message: errorMessage,
                    okButtonText: "OK, got it"
                });
            });
        }
    };
    LoginModel.prototype.login = function () {
        var _this = this;
        console.log('login');
        if (this.email && this.password) {
            firebase.login({
                type: firebase.LoginType.PASSWORD,
                email: this.email,
                password: this.password
            }).then(function (result) {
                _this.userService.getUser(result.uid).then(function (user) {
                    if (user) {
                        console.dump(user);
                        appSettings.setString('uid', JSON.stringify(result.uid));
                        if (!user.hourlyRate) {
                            frame.topmost().navigate({
                                moduleName: '/views/usersetup/usersetup',
                                backstackVisible: false,
                                animated: false,
                                clearHistory: true
                            });
                        }
                        else {
                            frame.topmost().navigate({
                                moduleName: '/views/home/home',
                                backstackVisible: false,
                                animated: false,
                                clearHistory: true
                            });
                        }
                    }
                });
            }, function (errorMessage) {
                console.log(errorMessage);
            });
        }
    };
    return LoginModel;
}(observable_1.Observable));
exports.LoginModel = LoginModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naW4tbW9kZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsb2dpbi1tb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsOENBQTJDO0FBQzNDLHVEQUF5RDtBQUN6RCxvQ0FBc0M7QUFDdEMsa0RBQW9EO0FBQ3BELCtCQUFpQztBQUNqQyxnQ0FBa0M7QUFFbEMsdURBQXFEO0FBR3JEO0lBQWdDLDhCQUFVO0lBQ3RDO1FBQUEsWUFDSSxpQkFBTyxTQUNWO1FBRU8saUJBQVcsR0FBRyxJQUFJLDBCQUFXLEVBQUUsQ0FBQztRQUVqQyxXQUFLLEdBQVcscUJBQXFCLENBQUM7UUFDdEMsY0FBUSxHQUFXLFVBQVUsQ0FBQztRQUU5QixlQUFTLEdBQVksSUFBSSxDQUFDOztJQVBqQyxDQUFDO0lBU00saUNBQVksR0FBbkI7UUFDSSxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVNLDJCQUFNLEdBQWI7UUFBQSxpQkFtQ0M7UUFsQ0csT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0QixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQzlCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFBO2dCQUNoRCxNQUFNLENBQUM7WUFDWCxDQUFDO1lBQ0QsUUFBUSxDQUFDLFVBQVUsQ0FBQztnQkFDaEIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO2dCQUNqQixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7YUFDMUIsQ0FBQyxDQUFD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QUFDO0lBQ0wsQ0FBQztJQUNMLGlCQUFDO0FBQUQsQ0FBQyxBQTFGRCxDQUFnQyx1QkFBVSxHQTBGekM7QUExRlksZ0NBQVUiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge09ic2VydmFibGV9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSc7XG5pbXBvcnQgKiBhcyBmaXJlYmFzZSBmcm9tICduYXRpdmVzY3JpcHQtcGx1Z2luLWZpcmViYXNlJztcbmltcG9ydCAqIGFzIGRpYWxvZ3MgZnJvbSAndWkvZGlhbG9ncyc7XG5pbXBvcnQgKiBhcyBhcHBTZXR0aW5ncyBmcm9tICdhcHBsaWNhdGlvbi1zZXR0aW5ncyc7XG5pbXBvcnQgKiBhcyBtb21lbnQgZnJvbSAnbW9tZW50JztcbmltcG9ydCAqIGFzIGZyYW1lIGZyb20gJ3VpL2ZyYW1lJztcblxuaW1wb3J0IHsgVXNlclNlcnZpY2UgfSBmcm9tICcuLi9zaGFyZWQvdXNlci5zZXJ2aWNlJztcblxuXG5leHBvcnQgY2xhc3MgTG9naW5Nb2RlbCBleHRlbmRzIE9ic2VydmFibGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgIH1cblxuICAgIHByaXZhdGUgdXNlclNlcnZpY2UgPSBuZXcgVXNlclNlcnZpY2UoKTtcblxuICAgIHB1YmxpYyBlbWFpbDogc3RyaW5nID0gJ2RhdmVAZGF2ZWNvZmZpbi5jb20nO1xuICAgIHB1YmxpYyBwYXNzd29yZDogc3RyaW5nID0gJ0VuZGllbjEuJztcbiAgICBwdWJsaWMgcGFzc3dvcmQyOiBzdHJpbmc7XG4gICAgcHVibGljIGxvZ2dpbmdJbjogYm9vbGVhbiA9IHRydWU7XG5cbiAgICBwdWJsaWMgdG9nZ2xlTWV0aG9kKCkge1xuICAgICAgICB0aGlzLnNldCgnbG9nZ2luZ0luJywgIXRoaXMubG9nZ2luZ0luKTtcbiAgICAgICAgY29uc29sZS5sb2coJ0xvZ2dpbmcgaW46ICcgKyB0aGlzLmxvZ2dpbmdJbik7XG4gICAgfVxuXG4gICAgcHVibGljIHNpZ251cCgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3NpZ251cCcpO1xuICAgICAgICBpZiAodGhpcy5lbWFpbCAmJiB0aGlzLnBhc3N3b3JkKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wYXNzd29yZCAhPSB0aGlzLnBhc3N3b3JkMikge1xuICAgICAgICAgICAgICAgIGFsZXJ0KCdUaGUgcGFzc3dvcmRzIHlvdSBlbnRlcmVkIGRvIG5vdCBtYXRjaC4nKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZpcmViYXNlLmNyZWF0ZVVzZXIoe1xuICAgICAgICAgICAgICAgIGVtYWlsOiB0aGlzLmVtYWlsLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkOiB0aGlzLnBhc3N3b3JkXG4gICAgICAgICAgICB9KS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBhcHBTZXR0aW5ncy5zZXRTdHJpbmcoJ3VpZCcsIEpTT04uc3RyaW5naWZ5KHJlc3VsdC5rZXkpKTtcbiAgICAgICAgICAgICAgICBsZXQgdXNlck9iaiA9IHtcbiAgICAgICAgICAgICAgICAgICAgXCJkYXRlX2NyZWF0ZWRcIjogbW9tZW50KCkuZm9ybWF0KCksXG4gICAgICAgICAgICAgICAgICAgIFwiZW1haWxcIjogdGhpcy5lbWFpbFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgZmlyZWJhc2Uuc2V0VmFsdWUoJy91c2Vycy8nICsgcmVzdWx0LmtleSwgdXNlck9iaikudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGFwcFNldHRpbmdzLnNldFN0cmluZygndXNlckRhdGEnLCBKU09OLnN0cmluZ2lmeSh1c2VyT2JqKSk7XG4gICAgICAgICAgICAgICAgICAgIGZyYW1lLnRvcG1vc3QoKS5uYXZpZ2F0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGVOYW1lOiAnL3ZpZXdzL3VzZXJzZXR1cC91c2Vyc2V0dXAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFja3N0YWNrVmlzaWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhckhpc3Rvcnk6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcblxuICAgICAgICAgICAgfSwgKGVycm9yTWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWxlcnQoe1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJObyB1c2VyIGNyZWF0ZWRcIixcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JNZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICBva0J1dHRvblRleHQ6IFwiT0ssIGdvdCBpdFwiXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICBwdWJsaWMgbG9naW4oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdsb2dpbicpO1xuICAgICAgICBpZiAodGhpcy5lbWFpbCAmJiB0aGlzLnBhc3N3b3JkKSB7XG4gICAgICAgICAgICBmaXJlYmFzZS5sb2dpbih7XG4gICAgICAgICAgICAgICAgdHlwZTogZmlyZWJhc2UuTG9naW5UeXBlLlBBU1NXT1JELFxuICAgICAgICAgICAgICAgIGVtYWlsOiB0aGlzLmVtYWlsLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkOiB0aGlzLnBhc3N3b3JkXG4gICAgICAgICAgICB9KS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnVzZXJTZXJ2aWNlLmdldFVzZXIocmVzdWx0LnVpZCkudGhlbih1c2VyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZHVtcCh1c2VyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcFNldHRpbmdzLnNldFN0cmluZygndWlkJywgSlNPTi5zdHJpbmdpZnkocmVzdWx0LnVpZCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF1c2VyLmhvdXJseVJhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZS50b3Btb3N0KCkubmF2aWdhdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGVOYW1lOiAnL3ZpZXdzL3VzZXJzZXR1cC91c2Vyc2V0dXAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiYWNrc3RhY2tWaXNpYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhckhpc3Rvcnk6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZS50b3Btb3N0KCkubmF2aWdhdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGVOYW1lOiAnL3ZpZXdzL2hvbWUvaG9tZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tzdGFja1Zpc2libGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySGlzdG9yeTogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9LCAoZXJyb3JNZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3JNZXNzYWdlKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG59Il19