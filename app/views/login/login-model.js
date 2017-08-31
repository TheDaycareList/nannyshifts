"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    LoginModel.prototype.getUserByEmail = function () {
        console.log('hello');
        var options = {
            singleEvent: true,
            orderBy: {
                type: firebase.QueryOrderByType.CHILD,
                value: 'email'
            },
            range: {
                type: firebase.QueryRangeType.EQUAL_TO,
                value: 'dave+2@davecoffin.com'
            }
        };
        firebase.query(function (queryResult) {
            if (queryResult.value) {
                console.log(JSON.stringify(queryResult.value));
            }
        }, '/users/', options);
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
                // passwordOptions: {
                email: this.email,
                password: this.password
                // }
            }).then(function (result) {
                _this.userService.getUser(result.uid).then(function (user) {
                    if (user) {
                        console.dir(user);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naW4tbW9kZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsb2dpbi1tb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDhDQUEyQztBQUMzQyx1REFBeUQ7QUFDekQsb0NBQXNDO0FBQ3RDLGtEQUFvRDtBQUNwRCwrQkFBaUM7QUFDakMsZ0NBQWtDO0FBRWxDLHVEQUFxRDtBQUdyRDtJQUFnQyw4QkFBVTtJQUN0QztRQUFBLFlBQ0ksaUJBQU8sU0FDVjtRQUVPLGlCQUFXLEdBQUcsSUFBSSwwQkFBVyxFQUFFLENBQUM7UUFFakMsV0FBSyxHQUFXLHFCQUFxQixDQUFDO1FBQ3RDLGNBQVEsR0FBVyxVQUFVLENBQUM7UUFFOUIsZUFBUyxHQUFZLElBQUksQ0FBQzs7SUFQakMsQ0FBQztJQVNNLGlDQUFZLEdBQW5CO1FBQ0ksSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFTSxtQ0FBYyxHQUFyQjtRQUNJLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckIsSUFBSSxPQUFPLEdBQXlCO1lBQ2hDLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLE9BQU8sRUFBRTtnQkFDTCxJQUFJLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUs7Z0JBQ3JDLEtBQUssRUFBRSxPQUFPO2FBQ2pCO1lBQ0QsS0FBSyxFQUFFO2dCQUNILElBQUksRUFBRSxRQUFRLENBQUMsY0FBYyxDQUFDLFFBQVE7Z0JBQ3RDLEtBQUssRUFBRSx1QkFBdUI7YUFDakM7U0FDSixDQUFBO1FBRUQsUUFBUSxDQUFDLEtBQUssQ0FDVixVQUFBLFdBQVc7WUFDUCxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDcEIs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QUMsQ0FBQzt3QkFDekQsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzs0QkFDbkIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQztnQ0FDckIsVUFBVSxFQUFFLDRCQUE0QjtnQ0FDeEMsZ0JBQWdCLEVBQUUsS0FBSztnQ0FDdkIsUUFBUSxFQUFFLEtBQUs7Z0NBQ2YsWUFBWSxFQUFFLElBQUk7NkJBQ3JCLENBQUMsQ0FBQTt3QkFDTixDQUFDO3dCQUFDLElBQUksQ0FBQyxDQUFDOzRCQUNKLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUM7Z0NBQ3JCLFVBQVUsRUFBRSxrQkFBa0I7Z0NBQzlCLGdCQUFnQixFQUFFLEtBQUs7Z0NBQ3ZCLFFBQVEsRUFBRSxLQUFLO2dDQUNmLFlBQVksRUFBRSxJQUFJOzZCQUNyQixDQUFDLENBQUE7d0JBQ04sQ0FBQztvQkFFTCxDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFBO1lBQ04sQ0FBQyxFQUFFLFVBQUMsWUFBWTtnQkFDWixPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQzdCLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztJQUNMLENBQUM7SUFDTCxpQkFBQztBQUFELENBQUMsQUFySEQsQ0FBZ0MsdUJBQVUsR0FxSHpDO0FBckhZLGdDQUFVIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtPYnNlcnZhYmxlfSBmcm9tICdkYXRhL29ic2VydmFibGUnO1xuaW1wb3J0ICogYXMgZmlyZWJhc2UgZnJvbSAnbmF0aXZlc2NyaXB0LXBsdWdpbi1maXJlYmFzZSc7XG5pbXBvcnQgKiBhcyBkaWFsb2dzIGZyb20gJ3VpL2RpYWxvZ3MnO1xuaW1wb3J0ICogYXMgYXBwU2V0dGluZ3MgZnJvbSAnYXBwbGljYXRpb24tc2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgKiBhcyBmcmFtZSBmcm9tICd1aS9mcmFtZSc7XG5cbmltcG9ydCB7IFVzZXJTZXJ2aWNlIH0gZnJvbSAnLi4vc2hhcmVkL3VzZXIuc2VydmljZSc7XG5cblxuZXhwb3J0IGNsYXNzIExvZ2luTW9kZWwgZXh0ZW5kcyBPYnNlcnZhYmxlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHVzZXJTZXJ2aWNlID0gbmV3IFVzZXJTZXJ2aWNlKCk7XG5cbiAgICBwdWJsaWMgZW1haWw6IHN0cmluZyA9ICdkYXZlQGRhdmVjb2ZmaW4uY29tJztcbiAgICBwdWJsaWMgcGFzc3dvcmQ6IHN0cmluZyA9ICdFbmRpZW4xLic7XG4gICAgcHVibGljIHBhc3N3b3JkMjogc3RyaW5nO1xuICAgIHB1YmxpYyBsb2dnaW5nSW46IGJvb2xlYW4gPSB0cnVlO1xuXG4gICAgcHVibGljIHRvZ2dsZU1ldGhvZCgpIHtcbiAgICAgICAgdGhpcy5zZXQoJ2xvZ2dpbmdJbicsICF0aGlzLmxvZ2dpbmdJbik7XG4gICAgICAgIGNvbnNvbGUubG9nKCdMb2dnaW5nIGluOiAnICsgdGhpcy5sb2dnaW5nSW4pO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRVc2VyQnlFbWFpbCgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2hlbGxvJyk7XG4gICAgICAgIGxldCBvcHRpb25zOmZpcmViYXNlLlF1ZXJ5T3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHNpbmdsZUV2ZW50OiB0cnVlLFxuICAgICAgICAgICAgb3JkZXJCeToge1xuICAgICAgICAgICAgICAgIHR5cGU6IGZpcmViYXNlLlF1ZXJ5T3JkZXJCeVR5cGUuQ0hJTEQsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICdlbWFpbCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByYW5nZToge1xuICAgICAgICAgICAgICAgIHR5cGU6IGZpcmViYXNlLlF1ZXJ5UmFuZ2VUeXBlLkVRVUFMX1RPLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnZGF2ZSsyQGRhdmVjb2ZmaW4uY29tJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZmlyZWJhc2UucXVlcnkoXG4gICAgICAgICAgICBxdWVyeVJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXJ5UmVzdWx0LnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHF1ZXJ5UmVzdWx0LnZhbHVlKSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICcvdXNlcnMvJywgXG4gICAgICAgICAgICBvcHRpb25zXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHVibGljIHNpZ251cCgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3NpZ251cCcpO1xuICAgICAgICBpZiAodGhpcy5lbWFpbCAmJiB0aGlzLnBhc3N3b3JkKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wYXNzd29yZCAhPSB0aGlzLnBhc3N3b3JkMikge1xuICAgICAgICAgICAgICAgIGFsZXJ0KCdUaGUgcGFzc3dvcmRzIHlvdSBlbnRlcmVkIGRvIG5vdCBtYXRjaC4nKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZpcmViYXNlLmNyZWF0ZVVzZXIoe1xuICAgICAgICAgICAgICAgIGVtYWlsOiB0aGlzLmVtYWlsLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkOiB0aGlzLnBhc3N3b3JkXG4gICAgICAgICAgICB9KS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBhcHBTZXR0aW5ncy5zZXRTdHJpbmcoJ3VpZCcsIEpTT04uc3RyaW5naWZ5KHJlc3VsdC5rZXkpKTtcbiAgICAgICAgICAgICAgICBsZXQgdXNlck9iaiA9IHtcbiAgICAgICAgICAgICAgICAgICAgXCJkYXRlX2NyZWF0ZWRcIjogbW9tZW50KCkuZm9ybWF0KCksXG4gICAgICAgICAgICAgICAgICAgIFwiZW1haWxcIjogdGhpcy5lbWFpbFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgZmlyZWJhc2Uuc2V0VmFsdWUoJy91c2Vycy8nICsgcmVzdWx0LmtleSwgdXNlck9iaikudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGFwcFNldHRpbmdzLnNldFN0cmluZygndXNlckRhdGEnLCBKU09OLnN0cmluZ2lmeSh1c2VyT2JqKSk7XG4gICAgICAgICAgICAgICAgICAgIGZyYW1lLnRvcG1vc3QoKS5uYXZpZ2F0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGVOYW1lOiAnL3ZpZXdzL3VzZXJzZXR1cC91c2Vyc2V0dXAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFja3N0YWNrVmlzaWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhckhpc3Rvcnk6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcblxuICAgICAgICAgICAgfSwgKGVycm9yTWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWxlcnQoe1xuICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJObyB1c2VyIGNyZWF0ZWRcIixcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JNZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICBva0J1dHRvblRleHQ6IFwiT0ssIGdvdCBpdFwiXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICBwdWJsaWMgbG9naW4oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdsb2dpbicpO1xuICAgICAgICBpZiAodGhpcy5lbWFpbCAmJiB0aGlzLnBhc3N3b3JkKSB7XG4gICAgICAgICAgICBmaXJlYmFzZS5sb2dpbih7XG4gICAgICAgICAgICAgICAgdHlwZTogZmlyZWJhc2UuTG9naW5UeXBlLlBBU1NXT1JELFxuICAgICAgICAgICAgICAgIC8vIHBhc3N3b3JkT3B0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICBlbWFpbDogdGhpcy5lbWFpbCxcbiAgICAgICAgICAgICAgICAgICAgcGFzc3dvcmQ6IHRoaXMucGFzc3dvcmRcbiAgICAgICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICB9KS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnVzZXJTZXJ2aWNlLmdldFVzZXIocmVzdWx0LnVpZCkudGhlbih1c2VyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGlyKHVzZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBwU2V0dGluZ3Muc2V0U3RyaW5nKCd1aWQnLCBKU09OLnN0cmluZ2lmeShyZXN1bHQudWlkKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXVzZXIuaG91cmx5UmF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lLnRvcG1vc3QoKS5uYXZpZ2F0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZHVsZU5hbWU6ICcvdmlld3MvdXNlcnNldHVwL3VzZXJzZXR1cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tzdGFja1Zpc2libGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySGlzdG9yeTogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYW1lLnRvcG1vc3QoKS5uYXZpZ2F0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZHVsZU5hbWU6ICcvdmlld3MvaG9tZS9ob21lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmFja3N0YWNrVmlzaWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJIaXN0b3J5OiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0sIChlcnJvck1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvck1lc3NhZ2UpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn0iXX0=