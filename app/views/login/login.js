"use strict";
var login_model_1 = require("./login-model");
var firebase = require("nativescript-plugin-firebase");
var appSettings = require("application-settings");
var frame = require("ui/frame");
function loaded(args) {
    var page = args.object;
    console.log('looking for stored userdata');
    if (appSettings.getString('userData')) {
        var userData = JSON.parse(appSettings.getString('userData'));
        console.dump(userData);
        if (!userData.hourlyRate) {
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
    firebase.init().then(function (instance) {
        //console.log("firebase.init done");
    }, function (error) {
        //console.log("firebase.init error: " + error);
    });
    page.bindingContext = new login_model_1.LoginModel();
}
exports.loaded = loaded;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsb2dpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBRUEsNkNBQTJDO0FBQzNDLHVEQUF5RDtBQUN6RCxrREFBb0Q7QUFDcEQsZ0NBQWtDO0FBRWxDLGdCQUF1QixJQUFlO0lBQ2xDLElBQUksSUFBSSxHQUFTLElBQUksQ0FBQyxNQUFNLENBQUM7SUFFN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQzNDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBRTdELE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFdkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUN2QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDO2dCQUNyQixVQUFVLEVBQUUsNEJBQTRCO2dCQUN4QyxnQkFBZ0IsRUFBRSxLQUFLO2dCQUN2QixRQUFRLEVBQUUsS0FBSztnQkFDZixZQUFZLEVBQUUsSUFBSTthQUNyQixDQUFDLENBQUE7UUFDTixDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDO2dCQUNyQixVQUFVLEVBQUUsa0JBQWtCO2dCQUM5QixnQkFBZ0IsRUFBRSxLQUFLO2dCQUN2QixRQUFRLEVBQUUsS0FBSztnQkFDZixZQUFZLEVBQUUsSUFBSTthQUNyQixDQUFDLENBQUE7UUFDTixDQUFDO0lBQ0wsQ0FBQztJQUVELFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBQyxRQUFRO1FBQzFCLG9DQUFvQztJQUN4QyxDQUFDLEVBQUUsVUFBQyxLQUFLO1FBQ0wsK0NBQStDO0lBQ25ELENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQztBQUMzQyxDQUFDO0FBaENELHdCQWdDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEV2ZW50RGF0YSB9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBQYWdlIH0gZnJvbSAndWkvcGFnZSc7XG5pbXBvcnQgeyBMb2dpbk1vZGVsIH0gZnJvbSAnLi9sb2dpbi1tb2RlbCc7XG5pbXBvcnQgKiBhcyBmaXJlYmFzZSBmcm9tICduYXRpdmVzY3JpcHQtcGx1Z2luLWZpcmViYXNlJztcbmltcG9ydCAqIGFzIGFwcFNldHRpbmdzIGZyb20gJ2FwcGxpY2F0aW9uLXNldHRpbmdzJztcbmltcG9ydCAqIGFzIGZyYW1lIGZyb20gJ3VpL2ZyYW1lJztcblxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRlZChhcmdzOiBFdmVudERhdGEpIHtcbiAgICBsZXQgcGFnZSA9IDxQYWdlPmFyZ3Mub2JqZWN0O1xuICAgIFxuICAgIGNvbnNvbGUubG9nKCdsb29raW5nIGZvciBzdG9yZWQgdXNlcmRhdGEnKTtcbiAgICBpZiAoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1c2VyRGF0YScpKSB7XG4gICAgICAgIGxldCB1c2VyRGF0YSA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1c2VyRGF0YScpKTtcblxuICAgICAgICBjb25zb2xlLmR1bXAodXNlckRhdGEpO1xuXG4gICAgICAgIGlmICghdXNlckRhdGEuaG91cmx5UmF0ZSkge1xuICAgICAgICAgICAgZnJhbWUudG9wbW9zdCgpLm5hdmlnYXRlKHtcbiAgICAgICAgICAgICAgICBtb2R1bGVOYW1lOiAnL3ZpZXdzL3VzZXJzZXR1cC91c2Vyc2V0dXAnLFxuICAgICAgICAgICAgICAgIGJhY2tzdGFja1Zpc2libGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFuaW1hdGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBjbGVhckhpc3Rvcnk6IHRydWVcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcmFtZS50b3Btb3N0KCkubmF2aWdhdGUoe1xuICAgICAgICAgICAgICAgIG1vZHVsZU5hbWU6ICcvdmlld3MvaG9tZS9ob21lJyxcbiAgICAgICAgICAgICAgICBiYWNrc3RhY2tWaXNpYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhbmltYXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgY2xlYXJIaXN0b3J5OiB0cnVlXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZmlyZWJhc2UuaW5pdCgpLnRoZW4oKGluc3RhbmNlKSA9PiB7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJmaXJlYmFzZS5pbml0IGRvbmVcIik7XG4gICAgfSwgKGVycm9yKSA9PiB7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJmaXJlYmFzZS5pbml0IGVycm9yOiBcIiArIGVycm9yKTtcbiAgICB9KTtcbiAgICBwYWdlLmJpbmRpbmdDb250ZXh0ID0gbmV3IExvZ2luTW9kZWwoKTtcbn0iXX0=