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
        _this.email = '';
        _this.password = '';
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
    LoginModel.prototype.pressedReturn = function () {
        if (this.loggingIn) {
            this.login();
        }
        else {
            this.signup();
        }
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
        else {
            alert('Please enter an email and a password.');
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
                                backstackVisible: true,
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
        else {
            alert('Please enter an email and password.');
        }
    };
    return LoginModel;
}(observable_1.Observable));
exports.LoginModel = LoginModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naW4tbW9kZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsb2dpbi1tb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDhDQUEyQztBQUMzQyx1REFBeUQ7QUFDekQsb0NBQXNDO0FBQ3RDLGtEQUFvRDtBQUNwRCwrQkFBaUM7QUFDakMsZ0NBQWtDO0FBRWxDLHVEQUFxRDtBQUdyRDtJQUFnQyw4QkFBVTtJQUN0QztRQUFBLFlBQ0ksaUJBQU8sU0FDVjtRQUVPLGlCQUFXLEdBQUcsSUFBSSwwQkFBVyxFQUFFLENBQUM7UUFFakMsV0FBSyxHQUFXLEVBQUUsQ0FBQztRQUNuQixjQUFRLEdBQVcsRUFBRSxDQUFDO1FBRXRCLGVBQVMsR0FBWSxJQUFJLENBQUM7O0lBUGpDLENBQUM7SUFTTSxpQ0FBWSxHQUFuQjtRQUNJLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRU0sbUNBQWMsR0FBckI7UUFDSSxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JCLElBQUksT0FBTyxHQUF5QjtZQUNoQyxXQUFXLEVBQUUsSUFBSTtZQUNqQixPQUFPLEVBQUU7Z0JBQ0wsSUFBSSxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLO2dCQUNyQyxLQUFLLEVBQUUsT0FBTzthQUNqQjtZQUNELEtBQUssRUFBRTtnQkFDSCxJQUFJLEVBQUUsUUFBUSxDQUFDLGNBQWMsQ0FBQyxRQUFRO2dCQUN0QyxLQUFLLEVBQUUsdUJBQXVCO2FBQ2pDO1NBQ0osQ0FBQTtRQUVELFFBQVEsQ0FBQyxLQUFLLENBQ1YsVUFBQSxXQUFXO1lBQ1AsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtZQUNsRCxDQUFDO1FBQ0wsQ0FBQyxFQUNELFNBQVMsRUFDVCxPQUFPLENBQ1YsQ0FBQztJQUNOLENBQUM7SUFFTSxrQ0FBYSxHQUFwQjtRQUNJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ2pCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNqQixDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDbEIsQ0FBQztJQUNMLENBQUM7SUFFTSwyQkFBTSxHQUFiO1FBQUEsaUJBcUNDO1FBcENHLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUM5QixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUNsQyxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQTtnQkFDaEQsTUFBTSxDQUFDO1lBQ1gsQ0FBQztZQUNELFFBQVEsQ0FBQyxVQUFVLENBQUM7Z0JBQ2hCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztnQkFDakIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO2FBQzFCLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxNQUFNO2dCQUNYLFdBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELElBQUksT0FBTyxHQUFHO29CQUNWLGNBQWMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLEVBQUU7b0JBQ2pDLE9BQU8sRUFBRSxLQUFJLENBQUMsS0FBSztpQkFDdEIsQ0FBQztnQkFDRixRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFDcEQsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUMzRCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDO3dCQUNyQixVQUFVLEVBQUUsNEJBQTRCO3dCQUN4QyxnQkFBZ0IsRUFBRSxLQUFLO3dCQUN2QixRQUFRLEVBQUUsS0FBSzt3QkFDZixZQUFZLEVBQUUsSUFBSTtxQkFDckIsQ0FBQyxDQUFBO2dCQUNOLENBQUMsQ0FBQyxDQUFDO1lBR1AsQ0FBQyxFQUFFLFVBQUMsWUFBWTtnQkFDWixPQUFPLENBQUMsS0FBSyxDQUFDO29CQUNWLEtBQUssRUFBRSxpQkFBaUI7b0JBQ3hCLE9BQU8sRUFBRSxZQUFZO29CQUNyQixZQUFZLEVBQUUsWUFBWTtpQkFDN0IsQ0FBQyxDQUFBO1lBQ04sQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixLQUFLLENBQUMsdUNBQXVDLENBQUMsQ0FBQTtRQUNsRCxDQUFDO0lBQ0wsQ0FBQztJQUdNLDBCQUFLLEdBQVo7UUFBQSxpQkFzQ0M7UUFyQ0csT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQzlCLFFBQVEsQ0FBQyxLQUFLLENBQUM7Z0JBQ1gsSUFBSSxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUTtnQkFDakMscUJBQXFCO2dCQUNqQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7Z0JBQ2pCLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtnQkFDM0IsSUFBSTthQUNQLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxNQUFNO2dCQUNYLEtBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQSxJQUFJO29CQUMxQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO3dCQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ2xCLFdBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0JBQ3pELEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7NEJBQ25CLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUM7Z0NBQ3JCLFVBQVUsRUFBRSw0QkFBNEI7Z0NBQ3hDLGdCQUFnQixFQUFFLEtBQUs7Z0NBQ3ZCLFFBQVEsRUFBRSxLQUFLO2dDQUNmLFlBQVksRUFBRSxJQUFJOzZCQUNyQixDQUFDLENBQUE7d0JBQ04sQ0FBQzt3QkFBQyxJQUFJLENBQUMsQ0FBQzs0QkFDSixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDO2dDQUNyQixVQUFVLEVBQUUsa0JBQWtCO2dDQUM5QixnQkFBZ0IsRUFBRSxJQUFJO2dDQUN0QixRQUFRLEVBQUUsS0FBSztnQ0FDZixZQUFZLEVBQUUsSUFBSTs2QkFDckIsQ0FBQyxDQUFBO3dCQUNOLENBQUM7b0JBRUwsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQTtZQUNOLENBQUMsRUFBRSxVQUFDLFlBQVk7Z0JBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUM3QixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLEtBQUssQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFBO1FBQ2hELENBQUM7SUFDTCxDQUFDO0lBQ0wsaUJBQUM7QUFBRCxDQUFDLEFBaklELENBQWdDLHVCQUFVLEdBaUl6QztBQWpJWSxnQ0FBVSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7T2JzZXJ2YWJsZX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJztcbmltcG9ydCAqIGFzIGZpcmViYXNlIGZyb20gJ25hdGl2ZXNjcmlwdC1wbHVnaW4tZmlyZWJhc2UnO1xuaW1wb3J0ICogYXMgZGlhbG9ncyBmcm9tICd1aS9kaWFsb2dzJztcbmltcG9ydCAqIGFzIGFwcFNldHRpbmdzIGZyb20gJ2FwcGxpY2F0aW9uLXNldHRpbmdzJztcbmltcG9ydCAqIGFzIG1vbWVudCBmcm9tICdtb21lbnQnO1xuaW1wb3J0ICogYXMgZnJhbWUgZnJvbSAndWkvZnJhbWUnO1xuXG5pbXBvcnQgeyBVc2VyU2VydmljZSB9IGZyb20gJy4uL3NoYXJlZC91c2VyLnNlcnZpY2UnO1xuXG5cbmV4cG9ydCBjbGFzcyBMb2dpbk1vZGVsIGV4dGVuZHMgT2JzZXJ2YWJsZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB1c2VyU2VydmljZSA9IG5ldyBVc2VyU2VydmljZSgpO1xuXG4gICAgcHVibGljIGVtYWlsOiBzdHJpbmcgPSAnJztcbiAgICBwdWJsaWMgcGFzc3dvcmQ6IHN0cmluZyA9ICcnO1xuICAgIHB1YmxpYyBwYXNzd29yZDI6IHN0cmluZztcbiAgICBwdWJsaWMgbG9nZ2luZ0luOiBib29sZWFuID0gdHJ1ZTtcblxuICAgIHB1YmxpYyB0b2dnbGVNZXRob2QoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdsb2dnaW5nSW4nLCAhdGhpcy5sb2dnaW5nSW4pO1xuICAgICAgICBjb25zb2xlLmxvZygnTG9nZ2luZyBpbjogJyArIHRoaXMubG9nZ2luZ0luKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0VXNlckJ5RW1haWwoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdoZWxsbycpO1xuICAgICAgICBsZXQgb3B0aW9uczpmaXJlYmFzZS5RdWVyeU9wdGlvbnMgPSB7XG4gICAgICAgICAgICBzaW5nbGVFdmVudDogdHJ1ZSxcbiAgICAgICAgICAgIG9yZGVyQnk6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBmaXJlYmFzZS5RdWVyeU9yZGVyQnlUeXBlLkNISUxELFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnZW1haWwnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmFuZ2U6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBmaXJlYmFzZS5RdWVyeVJhbmdlVHlwZS5FUVVBTF9UTyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogJ2RhdmUrMkBkYXZlY29mZmluLmNvbSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZpcmViYXNlLnF1ZXJ5KFxuICAgICAgICAgICAgcXVlcnlSZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChxdWVyeVJlc3VsdC52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShxdWVyeVJlc3VsdC52YWx1ZSkpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAnL3VzZXJzLycsIFxuICAgICAgICAgICAgb3B0aW9uc1xuICAgICAgICApO1xuICAgIH1cblxuICAgIHB1YmxpYyBwcmVzc2VkUmV0dXJuKCkge1xuICAgICAgICBpZiAodGhpcy5sb2dnaW5nSW4pIHtcbiAgICAgICAgICAgIHRoaXMubG9naW4oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2lnbnVwKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgc2lnbnVwKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnc2lnbnVwJyk7XG4gICAgICAgIGlmICh0aGlzLmVtYWlsICYmIHRoaXMucGFzc3dvcmQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnBhc3N3b3JkICE9IHRoaXMucGFzc3dvcmQyKSB7XG4gICAgICAgICAgICAgICAgYWxlcnQoJ1RoZSBwYXNzd29yZHMgeW91IGVudGVyZWQgZG8gbm90IG1hdGNoLicpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmlyZWJhc2UuY3JlYXRlVXNlcih7XG4gICAgICAgICAgICAgICAgZW1haWw6IHRoaXMuZW1haWwsXG4gICAgICAgICAgICAgICAgcGFzc3dvcmQ6IHRoaXMucGFzc3dvcmRcbiAgICAgICAgICAgIH0pLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIGFwcFNldHRpbmdzLnNldFN0cmluZygndWlkJywgSlNPTi5zdHJpbmdpZnkocmVzdWx0LmtleSkpO1xuICAgICAgICAgICAgICAgIGxldCB1c2VyT2JqID0ge1xuICAgICAgICAgICAgICAgICAgICBcImRhdGVfY3JlYXRlZFwiOiBtb21lbnQoKS5mb3JtYXQoKSxcbiAgICAgICAgICAgICAgICAgICAgXCJlbWFpbFwiOiB0aGlzLmVtYWlsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBmaXJlYmFzZS5zZXRWYWx1ZSgnL3VzZXJzLycgKyByZXN1bHQua2V5LCB1c2VyT2JqKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYXBwU2V0dGluZ3Muc2V0U3RyaW5nKCd1c2VyRGF0YScsIEpTT04uc3RyaW5naWZ5KHVzZXJPYmopKTtcbiAgICAgICAgICAgICAgICAgICAgZnJhbWUudG9wbW9zdCgpLm5hdmlnYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZHVsZU5hbWU6ICcvdmlld3MvdXNlcnNldHVwL3VzZXJzZXR1cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBiYWNrc3RhY2tWaXNpYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySGlzdG9yeTogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuXG4gICAgICAgICAgICB9LCAoZXJyb3JNZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgZGlhbG9ncy5hbGVydCh7XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIk5vIHVzZXIgY3JlYXRlZFwiLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvck1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIG9rQnV0dG9uVGV4dDogXCJPSywgZ290IGl0XCJcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbGVydCgnUGxlYXNlIGVudGVyIGFuIGVtYWlsIGFuZCBhIHBhc3N3b3JkLicpXG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIHB1YmxpYyBsb2dpbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2xvZ2luJyk7XG4gICAgICAgIGlmICh0aGlzLmVtYWlsICYmIHRoaXMucGFzc3dvcmQpIHtcbiAgICAgICAgICAgIGZpcmViYXNlLmxvZ2luKHtcbiAgICAgICAgICAgICAgICB0eXBlOiBmaXJlYmFzZS5Mb2dpblR5cGUuUEFTU1dPUkQsXG4gICAgICAgICAgICAgICAgLy8gcGFzc3dvcmRPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgIGVtYWlsOiB0aGlzLmVtYWlsLFxuICAgICAgICAgICAgICAgICAgICBwYXNzd29yZDogdGhpcy5wYXNzd29yZFxuICAgICAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIH0pLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMudXNlclNlcnZpY2UuZ2V0VXNlcihyZXN1bHQudWlkKS50aGVuKHVzZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kaXIodXNlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHBTZXR0aW5ncy5zZXRTdHJpbmcoJ3VpZCcsIEpTT04uc3RyaW5naWZ5KHJlc3VsdC51aWQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdXNlci5ob3VybHlSYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWUudG9wbW9zdCgpLm5hdmlnYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kdWxlTmFtZTogJy92aWV3cy91c2Vyc2V0dXAvdXNlcnNldHVwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmFja3N0YWNrVmlzaWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJIaXN0b3J5OiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWUudG9wbW9zdCgpLm5hdmlnYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kdWxlTmFtZTogJy92aWV3cy9ob21lL2hvbWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiYWNrc3RhY2tWaXNpYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySGlzdG9yeTogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9LCAoZXJyb3JNZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3JNZXNzYWdlKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbGVydCgnUGxlYXNlIGVudGVyIGFuIGVtYWlsIGFuZCBwYXNzd29yZC4nKVxuICAgICAgICB9XG4gICAgfVxufSJdfQ==