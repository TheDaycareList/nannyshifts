"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var observable_1 = require("data/observable");
var appSettings = require("application-settings");
var frame = require("ui/frame");
var user_service_1 = require("../shared/user.service");
var enums_1 = require("ui/enums");
var userService;
var MyModel;
var Tutorial = (function (_super) {
    __extends(Tutorial, _super);
    function Tutorial() {
        var _this = _super.call(this) || this;
        userService = new user_service_1.UserService();
        MyModel = _this;
        var uid = JSON.parse(appSettings.getString('uid'));
        return _this;
    }
    Tutorial.prototype.doneTutorial = function () {
        appSettings.setBoolean('seenTutorial', true);
        frame.topmost().navigate({
            moduleName: '/views/home/home',
            backstackVisible: false,
            animated: true,
            clearHistory: true,
            transition: {
                name: "flip",
                duration: 380,
                curve: enums_1.AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
            }
        });
    };
    Tutorial.prototype.kill = function () {
        appSettings.remove('userData');
        appSettings.remove('uid');
        appSettings.remove('userRecordID');
        frame.topmost().navigate('/views/login/login');
    };
    return Tutorial;
}(observable_1.Observable));
exports.Tutorial = Tutorial;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHV0b3JpYWwtbW9kZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0dXRvcmlhbC1tb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLDhDQUE2QztBQUk3QyxrREFBb0Q7QUFFcEQsZ0NBQWtDO0FBQ2xDLHVEQUEyRDtBQUUzRCxrQ0FBMEM7QUFFMUMsSUFBSSxXQUF3QixDQUFDO0FBQzdCLElBQUksT0FBaUIsQ0FBQztBQUV0QjtJQUE4Qiw0QkFBVTtJQUNwQztRQUFBLFlBQ0ksaUJBQU8sU0FNVjtRQUxHLFdBQVcsR0FBRyxJQUFJLDBCQUFXLEVBQUUsQ0FBQztRQUNoQyxPQUFPLEdBQUcsS0FBSSxDQUFDO1FBRWYsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7O0lBRXZELENBQUM7SUFFTSwrQkFBWSxHQUFuQjtRQUNJLFdBQVcsQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUM7WUFDckIsVUFBVSxFQUFFLGtCQUFrQjtZQUM5QixnQkFBZ0IsRUFBRSxLQUFLO1lBQ3ZCLFFBQVEsRUFBRSxJQUFJO1lBQ2QsWUFBWSxFQUFFLElBQUk7WUFDbEIsVUFBVSxFQUFFO2dCQUNSLElBQUksRUFBRSxNQUFNO2dCQUNaLFFBQVEsRUFBRSxHQUFHO2dCQUNiLEtBQUssRUFBRSxzQkFBYyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7YUFDdEQ7U0FDSixDQUFDLENBQUE7SUFDTixDQUFDO0lBRU0sdUJBQUksR0FBWDtRQUNJLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDL0IsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxQixXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ25DLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBQ0wsZUFBQztBQUFELENBQUMsQUEvQkQsQ0FBOEIsdUJBQVUsR0ErQnZDO0FBL0JZLDRCQUFRIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGFnZSwgZ2V0Vmlld0J5SWQgfSBmcm9tICd1aS9wYWdlJztcbmltcG9ydCB7IFN0YWNrTGF5b3V0IH0gZnJvbSAndWkvbGF5b3V0cy9zdGFjay1sYXlvdXQnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSB9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlQXJyYXkgfSBmcm9tICdkYXRhL29ic2VydmFibGUtYXJyYXknO1xuaW1wb3J0ICogYXMgZmlyZWJhc2UgZnJvbSAnbmF0aXZlc2NyaXB0LXBsdWdpbi1maXJlYmFzZSc7XG5pbXBvcnQgKiBhcyBkaWFsb2dzIGZyb20gJ3VpL2RpYWxvZ3MnO1xuaW1wb3J0ICogYXMgYXBwU2V0dGluZ3MgZnJvbSAnYXBwbGljYXRpb24tc2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgKiBhcyBmcmFtZSBmcm9tICd1aS9mcmFtZSc7XG5pbXBvcnQgeyBVc2VyU2VydmljZSwgVXNlciB9IGZyb20gJy4uL3NoYXJlZC91c2VyLnNlcnZpY2UnO1xuaW1wb3J0IHsgQW5pbWF0aW9uRGVmaW5pdGlvbiB9IGZyb20gXCJ1aS9hbmltYXRpb25cIjtcbmltcG9ydCB7IEFuaW1hdGlvbkN1cnZlIH0gZnJvbSBcInVpL2VudW1zXCI7XG5cbmxldCB1c2VyU2VydmljZTogVXNlclNlcnZpY2U7XG5sZXQgTXlNb2RlbDogVHV0b3JpYWw7XG5cbmV4cG9ydCBjbGFzcyBUdXRvcmlhbCBleHRlbmRzIE9ic2VydmFibGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB1c2VyU2VydmljZSA9IG5ldyBVc2VyU2VydmljZSgpO1xuICAgICAgICBNeU1vZGVsID0gdGhpcztcblxuICAgICAgICBsZXQgdWlkID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VpZCcpKTtcbiAgICAgICAgXG4gICAgfVxuICAgIFxuICAgIHB1YmxpYyBkb25lVHV0b3JpYWwoKSB7XG4gICAgICAgIGFwcFNldHRpbmdzLnNldEJvb2xlYW4oJ3NlZW5UdXRvcmlhbCcsIHRydWUpO1xuICAgICAgICBmcmFtZS50b3Btb3N0KCkubmF2aWdhdGUoe1xuICAgICAgICAgICAgbW9kdWxlTmFtZTogJy92aWV3cy9ob21lL2hvbWUnLFxuICAgICAgICAgICAgYmFja3N0YWNrVmlzaWJsZTogZmFsc2UsXG4gICAgICAgICAgICBhbmltYXRlZDogdHJ1ZSxcbiAgICAgICAgICAgIGNsZWFySGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIHRyYW5zaXRpb246IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBcImZsaXBcIixcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMzgwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5jdWJpY0JlemllcigwLjEsIDAuMSwgMC4xLCAxKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBraWxsKCkge1xuICAgICAgICBhcHBTZXR0aW5ncy5yZW1vdmUoJ3VzZXJEYXRhJyk7XG4gICAgICAgIGFwcFNldHRpbmdzLnJlbW92ZSgndWlkJyk7XG4gICAgICAgIGFwcFNldHRpbmdzLnJlbW92ZSgndXNlclJlY29yZElEJyk7XG4gICAgICAgIGZyYW1lLnRvcG1vc3QoKS5uYXZpZ2F0ZSgnL3ZpZXdzL2xvZ2luL2xvZ2luJyk7XG4gICAgfVxufSJdfQ==