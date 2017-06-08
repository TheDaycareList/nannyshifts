"use strict";
var observable_1 = require("data/observable");
var observable_array_1 = require("data/observable-array");
var appSettings = require("application-settings");
var frame = require("ui/frame");
var user_service_1 = require("../shared/user.service");
var UserSetup = (function (_super) {
    __extends(UserSetup, _super);
    function UserSetup() {
        var _this = _super.call(this) || this;
        _this.userService = new user_service_1.UserService();
        _this.saving = false;
        _this.families = new observable_array_1.ObservableArray([]);
        _this.addingFamily = false;
        return _this;
    }
    UserSetup.prototype.saveRates = function () {
        console.log(this.hourlyRate + ' ' + this.overtimeRate);
        if (this.hourlyRate && this.overtimeRate && this.families.length) {
            var args = {
                hourlyRate: this.hourlyRate,
                overtimeRate: this.overtimeRate
            };
            this.userService.updateUser(args).then(function (result) {
                console.log('yay!');
                frame.topmost().navigate({
                    moduleName: '/views/home/home',
                    backstackVisible: false,
                    animated: true,
                    clearHistory: true
                });
            });
        }
    };
    UserSetup.prototype.showAddFamily = function () {
        this.set('addingFamily', true);
    };
    UserSetup.prototype.addFamily = function () {
        var _this = this;
        var familyObj = {
            name: this.addingFamilyName,
            email: this.addingFamilyEmail
        };
        this.families.push(familyObj);
        this.userService.addFamily(familyObj).then(function (result) {
            console.log('added family');
            var uid = JSON.parse(appSettings.getString('uid'));
            console.log(uid);
            _this.userService.getUser(uid).then(function () {
                _this.set('addingFamilyName', '');
                _this.set('addingFamilyEmail', '');
                console.dump(JSON.parse(appSettings.getString('userData')));
                _this.set('addingFamily', false);
            });
        });
    };
    UserSetup.prototype.alert = function () {
        alert('Hi');
    };
    UserSetup.prototype.kill = function () {
        appSettings.remove('userData');
        appSettings.remove('uid');
        appSettings.remove('userRecordID');
        frame.topmost().navigate('/views/login/login');
    };
    return UserSetup;
}(observable_1.Observable));
exports.UserSetup = UserSetup;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlcnNldHVwLW1vZGVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXNlcnNldHVwLW1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw4Q0FBNkM7QUFDN0MsMERBQXdEO0FBR3hELGtEQUFvRDtBQUVwRCxnQ0FBa0M7QUFDbEMsdURBQXFEO0FBRXJEO0lBQStCLDZCQUFVO0lBQ3JDO1FBQUEsWUFDSSxpQkFBTyxTQUNWO1FBRU8saUJBQVcsR0FBRyxJQUFJLDBCQUFXLEVBQUUsQ0FBQztRQUlqQyxZQUFNLEdBQVksS0FBSyxDQUFDO1FBQ3hCLGNBQVEsR0FBRyxJQUFJLGtDQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkMsa0JBQVksR0FBWSxLQUFLLENBQUM7O0lBUnJDLENBQUM7SUFZTSw2QkFBUyxHQUFoQjtRQUNJLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3ZELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDL0QsSUFBSSxJQUFJLEdBQUc7Z0JBQ1AsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO2dCQUMzQixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7YUFDbEMsQ0FBQTtZQUNELElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07Z0JBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3BCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUM7b0JBQ3JCLFVBQVUsRUFBRSxrQkFBa0I7b0JBQzlCLGdCQUFnQixFQUFFLEtBQUs7b0JBQ3ZCLFFBQVEsRUFBRSxJQUFJO29CQUNkLFlBQVksRUFBRSxJQUFJO2lCQUNyQixDQUFDLENBQUE7WUFDTixDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUM7SUFDTCxDQUFDO0lBRU0saUNBQWEsR0FBcEI7UUFDSSxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRU0sNkJBQVMsR0FBaEI7UUFBQSxpQkFrQkM7UUFqQkcsSUFBSSxTQUFTLEdBQUc7WUFDWixJQUFJLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtZQUMzQixLQUFLLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtTQUNoQyxDQUFBO1FBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFN0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsTUFBTTtZQUM3QyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzVCLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ25ELE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDakIsS0FBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUMvQixLQUFJLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNqQyxLQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNsQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzVELEtBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ25DLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU0seUJBQUssR0FBWjtRQUNJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoQixDQUFDO0lBRU0sd0JBQUksR0FBWDtRQUNJLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDL0IsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxQixXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ25DLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBQ0wsZ0JBQUM7QUFBRCxDQUFDLEFBcEVELENBQStCLHVCQUFVLEdBb0V4QztBQXBFWSw4QkFBUyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE9ic2VydmFibGUgfSBmcm9tICdkYXRhL29ic2VydmFibGUnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZUFycmF5IH0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlLWFycmF5JztcbmltcG9ydCAqIGFzIGZpcmViYXNlIGZyb20gJ25hdGl2ZXNjcmlwdC1wbHVnaW4tZmlyZWJhc2UnO1xuaW1wb3J0ICogYXMgZGlhbG9ncyBmcm9tICd1aS9kaWFsb2dzJztcbmltcG9ydCAqIGFzIGFwcFNldHRpbmdzIGZyb20gJ2FwcGxpY2F0aW9uLXNldHRpbmdzJztcbmltcG9ydCAqIGFzIG1vbWVudCBmcm9tICdtb21lbnQnO1xuaW1wb3J0ICogYXMgZnJhbWUgZnJvbSAndWkvZnJhbWUnO1xuaW1wb3J0IHsgVXNlclNlcnZpY2UgfSBmcm9tICcuLi9zaGFyZWQvdXNlci5zZXJ2aWNlJztcblxuZXhwb3J0IGNsYXNzIFVzZXJTZXR1cCBleHRlbmRzIE9ic2VydmFibGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgIH1cblxuICAgIHByaXZhdGUgdXNlclNlcnZpY2UgPSBuZXcgVXNlclNlcnZpY2UoKTtcblxuICAgIHB1YmxpYyBob3VybHlSYXRlOiBudW1iZXI7XG4gICAgcHVibGljIG92ZXJ0aW1lUmF0ZTogbnVtYmVyO1xuICAgIHB1YmxpYyBzYXZpbmc6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBwdWJsaWMgZmFtaWxpZXMgPSBuZXcgT2JzZXJ2YWJsZUFycmF5KFtdKTtcbiAgICBwdWJsaWMgYWRkaW5nRmFtaWx5OiBib29sZWFuID0gZmFsc2U7XG4gICAgcHVibGljIGFkZGluZ0ZhbWlseU5hbWU6IHN0cmluZztcbiAgICBwdWJsaWMgYWRkaW5nRmFtaWx5RW1haWw6IHN0cmluZztcblxuICAgIHB1YmxpYyBzYXZlUmF0ZXMoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMuaG91cmx5UmF0ZSArICcgJyArIHRoaXMub3ZlcnRpbWVSYXRlKTtcbiAgICAgICAgaWYgKHRoaXMuaG91cmx5UmF0ZSAmJiB0aGlzLm92ZXJ0aW1lUmF0ZSAmJiB0aGlzLmZhbWlsaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgbGV0IGFyZ3MgPSB7XG4gICAgICAgICAgICAgICAgaG91cmx5UmF0ZTogdGhpcy5ob3VybHlSYXRlLFxuICAgICAgICAgICAgICAgIG92ZXJ0aW1lUmF0ZTogdGhpcy5vdmVydGltZVJhdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMudXNlclNlcnZpY2UudXBkYXRlVXNlcihhcmdzKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3lheSEnKTtcbiAgICAgICAgICAgICAgICBmcmFtZS50b3Btb3N0KCkubmF2aWdhdGUoe1xuICAgICAgICAgICAgICAgICAgICBtb2R1bGVOYW1lOiAnL3ZpZXdzL2hvbWUvaG9tZScsXG4gICAgICAgICAgICAgICAgICAgIGJhY2tzdGFja1Zpc2libGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBhbmltYXRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJIaXN0b3J5OiB0cnVlXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgc2hvd0FkZEZhbWlseSgpIHtcbiAgICAgICAgdGhpcy5zZXQoJ2FkZGluZ0ZhbWlseScsIHRydWUpO1xuICAgIH1cblxuICAgIHB1YmxpYyBhZGRGYW1pbHkoKSB7XG4gICAgICAgIGxldCBmYW1pbHlPYmogPSB7XG4gICAgICAgICAgICBuYW1lOiB0aGlzLmFkZGluZ0ZhbWlseU5hbWUsXG4gICAgICAgICAgICBlbWFpbDogdGhpcy5hZGRpbmdGYW1pbHlFbWFpbFxuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmFtaWxpZXMucHVzaChmYW1pbHlPYmopXG4gICAgICAgIFxuICAgICAgICB0aGlzLnVzZXJTZXJ2aWNlLmFkZEZhbWlseShmYW1pbHlPYmopLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdhZGRlZCBmYW1pbHknKTtcbiAgICAgICAgICAgIGxldCB1aWQgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpO1xuICAgICAgICAgICAgY29uc29sZS5sb2codWlkKTtcbiAgICAgICAgICAgIHRoaXMudXNlclNlcnZpY2UuZ2V0VXNlcih1aWQpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdhZGRpbmdGYW1pbHlOYW1lJywgJycpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdhZGRpbmdGYW1pbHlFbWFpbCcsICcnKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmR1bXAoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnYWRkaW5nRmFtaWx5JywgZmFsc2UpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIGFsZXJ0KCkge1xuICAgICAgICBhbGVydCgnSGknKTtcbiAgICB9XG5cbiAgICBwdWJsaWMga2lsbCgpIHtcbiAgICAgICAgYXBwU2V0dGluZ3MucmVtb3ZlKCd1c2VyRGF0YScpO1xuICAgICAgICBhcHBTZXR0aW5ncy5yZW1vdmUoJ3VpZCcpO1xuICAgICAgICBhcHBTZXR0aW5ncy5yZW1vdmUoJ3VzZXJSZWNvcmRJRCcpO1xuICAgICAgICBmcmFtZS50b3Btb3N0KCkubmF2aWdhdGUoJy92aWV3cy9sb2dpbi9sb2dpbicpO1xuICAgIH1cbn0iXX0=