"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var observable_1 = require("data/observable");
var frame = require("ui/frame");
var user_service_1 = require("../shared/user.service");
var InvoiceModel = (function (_super) {
    __extends(InvoiceModel, _super);
    function InvoiceModel() {
        var _this = _super.call(this) || this;
        _this.userService = new user_service_1.UserService();
        return _this;
    }
    InvoiceModel.prototype.goback = function () {
        frame.topmost().goBack();
    };
    return InvoiceModel;
}(observable_1.Observable));
exports.InvoiceModel = InvoiceModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW52b2ljZS1tb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImludm9pY2UtbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw4Q0FBMkM7QUFLM0MsZ0NBQWtDO0FBRWxDLHVEQUFxRDtBQUdyRDtJQUFrQyxnQ0FBVTtJQUN4QztRQUFBLFlBQ0ksaUJBQU8sU0FDVjtRQUVPLGlCQUFXLEdBQUcsSUFBSSwwQkFBVyxFQUFFLENBQUM7O0lBRnhDLENBQUM7SUFHTSw2QkFBTSxHQUFiO1FBQ0ksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFDTCxtQkFBQztBQUFELENBQUMsQUFURCxDQUFrQyx1QkFBVSxHQVMzQztBQVRZLG9DQUFZIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtPYnNlcnZhYmxlfSBmcm9tICdkYXRhL29ic2VydmFibGUnO1xuaW1wb3J0ICogYXMgZmlyZWJhc2UgZnJvbSAnbmF0aXZlc2NyaXB0LXBsdWdpbi1maXJlYmFzZSc7XG5pbXBvcnQgKiBhcyBkaWFsb2dzIGZyb20gJ3VpL2RpYWxvZ3MnO1xuaW1wb3J0ICogYXMgYXBwU2V0dGluZ3MgZnJvbSAnYXBwbGljYXRpb24tc2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgKiBhcyBmcmFtZSBmcm9tICd1aS9mcmFtZSc7XG5cbmltcG9ydCB7IFVzZXJTZXJ2aWNlIH0gZnJvbSAnLi4vc2hhcmVkL3VzZXIuc2VydmljZSc7XG5cblxuZXhwb3J0IGNsYXNzIEludm9pY2VNb2RlbCBleHRlbmRzIE9ic2VydmFibGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgIH1cblxuICAgIHByaXZhdGUgdXNlclNlcnZpY2UgPSBuZXcgVXNlclNlcnZpY2UoKTtcbiAgICBwdWJsaWMgZ29iYWNrKCkge1xuICAgICAgICBmcmFtZS50b3Btb3N0KCkuZ29CYWNrKCk7XG4gICAgfVxufSJdfQ==