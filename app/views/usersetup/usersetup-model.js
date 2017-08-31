"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
                console.dir(JSON.parse(appSettings.getString('userData')));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlcnNldHVwLW1vZGVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXNlcnNldHVwLW1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsOENBQTZDO0FBQzdDLDBEQUF3RDtBQUd4RCxrREFBb0Q7QUFFcEQsZ0NBQWtDO0FBQ2xDLHVEQUFxRDtBQUVyRDtJQUErQiw2QkFBVTtJQUNyQztRQUFBLFlBQ0ksaUJBQU8sU0FDVjtRQUVPLGlCQUFXLEdBQUcsSUFBSSwwQkFBVyxFQUFFLENBQUM7UUFJakMsWUFBTSxHQUFZLEtBQUssQ0FBQztRQUN4QixjQUFRLEdBQUcsSUFBSSxrQ0FBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLGtCQUFZLEdBQVksS0FBSyxDQUFDOztJQVJyQyxDQUFDO0lBWU0sNkJBQVMsR0FBaEI7UUFDSSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN2RCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQy9ELElBQUksSUFBSSxHQUFHO2dCQUNQLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtnQkFDM0IsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO2FBQ2xDLENBQUE7WUFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQSxNQUFNO2dCQUN6QyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDO29CQUNyQixVQUFVLEVBQUUsa0JBQWtCO29CQUM5QixnQkFBZ0IsRUFBRSxLQUFLO29CQUN2QixRQUFRLEVBQUUsSUFBSTtvQkFDZCxZQUFZLEVBQUUsSUFBSTtpQkFDckIsQ0FBQyxDQUFBO1lBQ04sQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDO0lBQ0wsQ0FBQztJQUVNLGlDQUFhLEdBQXBCO1FBQ0ksSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVNLDZCQUFTLEdBQWhCO1FBQUEsaUJBa0JDO1FBakJHLElBQUksU0FBUyxHQUFHO1lBQ1osSUFBSSxFQUFFLElBQUksQ0FBQyxnQkFBZ0I7WUFDM0IsS0FBSyxFQUFFLElBQUksQ0FBQyxpQkFBaUI7U0FDaEMsQ0FBQTtRQUNELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRTdCLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07WUFDN0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUM1QixJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNuRCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLEtBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDL0IsS0FBSSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDakMsS0FBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMzRCxLQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNuQyxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVNLHlCQUFLLEdBQVo7UUFDSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEIsQ0FBQztJQUVNLHdCQUFJLEdBQVg7UUFDSSxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQy9CLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDMUIsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNuQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUNMLGdCQUFDO0FBQUQsQ0FBQyxBQXBFRCxDQUErQix1QkFBVSxHQW9FeEM7QUFwRVksOEJBQVMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBPYnNlcnZhYmxlIH0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJztcbmltcG9ydCB7IE9ic2VydmFibGVBcnJheSB9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZS1hcnJheSc7XG5pbXBvcnQgKiBhcyBmaXJlYmFzZSBmcm9tICduYXRpdmVzY3JpcHQtcGx1Z2luLWZpcmViYXNlJztcbmltcG9ydCAqIGFzIGRpYWxvZ3MgZnJvbSAndWkvZGlhbG9ncyc7XG5pbXBvcnQgKiBhcyBhcHBTZXR0aW5ncyBmcm9tICdhcHBsaWNhdGlvbi1zZXR0aW5ncyc7XG5pbXBvcnQgKiBhcyBtb21lbnQgZnJvbSAnbW9tZW50JztcbmltcG9ydCAqIGFzIGZyYW1lIGZyb20gJ3VpL2ZyYW1lJztcbmltcG9ydCB7IFVzZXJTZXJ2aWNlIH0gZnJvbSAnLi4vc2hhcmVkL3VzZXIuc2VydmljZSc7XG5cbmV4cG9ydCBjbGFzcyBVc2VyU2V0dXAgZXh0ZW5kcyBPYnNlcnZhYmxlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHVzZXJTZXJ2aWNlID0gbmV3IFVzZXJTZXJ2aWNlKCk7XG5cbiAgICBwdWJsaWMgaG91cmx5UmF0ZTogbnVtYmVyO1xuICAgIHB1YmxpYyBvdmVydGltZVJhdGU6IG51bWJlcjtcbiAgICBwdWJsaWMgc2F2aW5nOiBib29sZWFuID0gZmFsc2U7XG4gICAgcHVibGljIGZhbWlsaWVzID0gbmV3IE9ic2VydmFibGVBcnJheShbXSk7XG4gICAgcHVibGljIGFkZGluZ0ZhbWlseTogYm9vbGVhbiA9IGZhbHNlO1xuICAgIHB1YmxpYyBhZGRpbmdGYW1pbHlOYW1lOiBzdHJpbmc7XG4gICAgcHVibGljIGFkZGluZ0ZhbWlseUVtYWlsOiBzdHJpbmc7XG5cbiAgICBwdWJsaWMgc2F2ZVJhdGVzKCkge1xuICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmhvdXJseVJhdGUgKyAnICcgKyB0aGlzLm92ZXJ0aW1lUmF0ZSk7XG4gICAgICAgIGlmICh0aGlzLmhvdXJseVJhdGUgJiYgdGhpcy5vdmVydGltZVJhdGUgJiYgdGhpcy5mYW1pbGllcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGxldCBhcmdzID0ge1xuICAgICAgICAgICAgICAgIGhvdXJseVJhdGU6IHRoaXMuaG91cmx5UmF0ZSxcbiAgICAgICAgICAgICAgICBvdmVydGltZVJhdGU6IHRoaXMub3ZlcnRpbWVSYXRlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnVzZXJTZXJ2aWNlLnVwZGF0ZVVzZXIoYXJncykudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd5YXkhJyk7XG4gICAgICAgICAgICAgICAgZnJhbWUudG9wbW9zdCgpLm5hdmlnYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlTmFtZTogJy92aWV3cy9ob21lL2hvbWUnLFxuICAgICAgICAgICAgICAgICAgICBiYWNrc3RhY2tWaXNpYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgYW5pbWF0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNsZWFySGlzdG9yeTogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIHNob3dBZGRGYW1pbHkoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdhZGRpbmdGYW1pbHknLCB0cnVlKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgYWRkRmFtaWx5KCkge1xuICAgICAgICBsZXQgZmFtaWx5T2JqID0ge1xuICAgICAgICAgICAgbmFtZTogdGhpcy5hZGRpbmdGYW1pbHlOYW1lLFxuICAgICAgICAgICAgZW1haWw6IHRoaXMuYWRkaW5nRmFtaWx5RW1haWxcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZhbWlsaWVzLnB1c2goZmFtaWx5T2JqKVxuICAgICAgICBcbiAgICAgICAgdGhpcy51c2VyU2VydmljZS5hZGRGYW1pbHkoZmFtaWx5T2JqKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYWRkZWQgZmFtaWx5Jyk7XG4gICAgICAgICAgICBsZXQgdWlkID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VpZCcpKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHVpZCk7XG4gICAgICAgICAgICB0aGlzLnVzZXJTZXJ2aWNlLmdldFVzZXIodWlkKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnYWRkaW5nRmFtaWx5TmFtZScsICcnKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnYWRkaW5nRmFtaWx5RW1haWwnLCAnJyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5kaXIoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnYWRkaW5nRmFtaWx5JywgZmFsc2UpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIGFsZXJ0KCkge1xuICAgICAgICBhbGVydCgnSGknKTtcbiAgICB9XG5cbiAgICBwdWJsaWMga2lsbCgpIHtcbiAgICAgICAgYXBwU2V0dGluZ3MucmVtb3ZlKCd1c2VyRGF0YScpO1xuICAgICAgICBhcHBTZXR0aW5ncy5yZW1vdmUoJ3VpZCcpO1xuICAgICAgICBhcHBTZXR0aW5ncy5yZW1vdmUoJ3VzZXJSZWNvcmRJRCcpO1xuICAgICAgICBmcmFtZS50b3Btb3N0KCkubmF2aWdhdGUoJy92aWV3cy9sb2dpbi9sb2dpbicpO1xuICAgIH1cbn0iXX0=