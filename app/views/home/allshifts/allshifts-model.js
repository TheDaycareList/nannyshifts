"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var observable_1 = require("data/observable");
var shift_service_1 = require("../../shared/shift.service");
var home_model_1 = require("../../home/home-model");
var moment = require("moment");
var shiftService;
var AllShiftsModel = (function (_super) {
    __extends(AllShiftsModel, _super);
    function AllShiftsModel(view) {
        var _this = _super.call(this) || this;
        shiftService = new shift_service_1.ShiftService();
        return _this;
        // view.parent.parent.on('selectedIndexChanged', (args:SelectedIndexChangedEventData) => {
        //     if (args.newIndex == 1) {
        //         this.getShifts();
        //     }
        // })
    }
    AllShiftsModel.prototype.allShiftsLoaded = function () {
        console.log('hi');
    };
    AllShiftsModel.prototype.initAllShifts = function () {
        console.log('get all your shifts here.');
        console.log();
    };
    AllShiftsModel.prototype.getShifts = function () {
        var _this = this;
        this.set('isLoading', true);
        shiftService.getShifts().then(function (shifts) {
            _this.set('isLoading', false);
            _this.processAllShifts(shifts);
        });
    };
    AllShiftsModel.prototype.processAllShifts = function (shifts) {
        var shiftsArray = [];
        for (var i in shifts) {
            var myShift = shiftService.buildShiftData(shifts[i]);
            myShift.id = i;
            if (!myShift.end_time)
                this.set('clockedIn', shifts[i]);
            shiftsArray.push(myShift);
        }
        shiftsArray.sort(function (a, b) {
            if (moment(a.start_time) < moment(b.start_time)) {
                return 1;
            }
            else if (moment(a.start_time) > moment(b.start_time)) {
                return -1;
            }
        });
        var _loop_1 = function () {
            var shift = observable_1.fromObject(shiftsArray[s]);
            if (!this_1.allShiftsMap[shiftsArray[s].id]) {
                this_1.allShifts.push(shift);
                this_1.allShiftsMap[shiftsArray[s].id] = shiftsArray[s];
            }
            else {
                var updateIndex_1;
                this_1.allShifts.forEach(function (element, index) {
                    if (element.get('id') == shiftsArray[s].id)
                        updateIndex_1 = index;
                });
                this_1.allShifts.setItem(updateIndex_1, shift);
            }
        };
        var this_1 = this;
        for (var s = 0; shiftsArray.length > s; s++) {
            _loop_1();
        }
        console.dir(this.allShifts.length);
    };
    return AllShiftsModel;
}(home_model_1.HomeModel));
exports.AllShiftsModel = AllShiftsModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxsc2hpZnRzLW1vZGVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYWxsc2hpZnRzLW1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsOENBQThHO0FBSTlHLDREQUEwRDtBQUUxRCxvREFBaUQ7QUFFakQsK0JBQWlDO0FBRWpDLElBQUksWUFBMEIsQ0FBQztBQUMvQjtJQUFvQyxrQ0FBUztJQUV6Qyx3QkFBWSxJQUFJO1FBQWhCLFlBQ0ksaUJBQU8sU0FPVjtRQU5HLFlBQVksR0FBRyxJQUFJLDRCQUFZLEVBQUUsQ0FBQzs7UUFDbEMsMEZBQTBGO1FBQzFGLGdDQUFnQztRQUNoQyw0QkFBNEI7UUFDNUIsUUFBUTtRQUNSLEtBQUs7SUFDVCxDQUFDO0lBRU0sd0NBQWUsR0FBdEI7UUFDSSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFFTSxzQ0FBYSxHQUFwQjtRQUNJLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUN6QyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUE7SUFDakIsQ0FBQztJQUVNLGtDQUFTLEdBQWhCO1FBQUEsaUJBT0M7UUFORyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQUEsTUFBTTtZQUNoQyxLQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM3QixLQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFbEMsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBQ00seUNBQWdCLEdBQXZCLFVBQXdCLE1BQU07UUFDMUIsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDbkIsSUFBSSxPQUFPLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyRCxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNmLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztnQkFBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUd4RCxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlCLENBQUM7UUFFRCxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbEIsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNiLENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDckQsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2QsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFBOztZQUlFLElBQUksS0FBSyxHQUFHLHVCQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pELEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBSyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDeEMsT0FBSyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUMxQixPQUFLLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFELENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDSixJQUFJLGFBQVcsQ0FBQztnQkFDaEIsT0FBSyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLEtBQUs7b0JBQ2xDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFBQyxhQUFXLEdBQUcsS0FBSyxDQUFDO2dCQUNwRSxDQUFDLENBQUMsQ0FBQztnQkFDSCxPQUFLLFNBQVMsQ0FBQyxPQUFPLENBQUMsYUFBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9DLENBQUM7UUFDTCxDQUFDOztRQVpELEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7O1NBWTFDO1FBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFDTCxxQkFBQztBQUFELENBQUMsQUFqRUQsQ0FBb0Msc0JBQVMsR0FpRTVDO0FBakVZLHdDQUFjIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtFdmVudERhdGEsIE9ic2VydmFibGUsIFByb3BlcnR5Q2hhbmdlRGF0YSwgZnJvbU9iamVjdCBhcyBvYnNlcnZhYmxlRnJvbU9iamVjdH0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJztcbmltcG9ydCB7T2JzZXJ2YWJsZUFycmF5fSBmcm9tICdkYXRhL29ic2VydmFibGUtYXJyYXknO1xuaW1wb3J0IHsgUGFnZSB9IGZyb20gJ3VpL3BhZ2UnO1xuaW1wb3J0IHsgVXNlclNlcnZpY2UsIFVzZXIgfSBmcm9tICcuLi8uLi9zaGFyZWQvdXNlci5zZXJ2aWNlJztcbmltcG9ydCB7IFNoaWZ0U2VydmljZSB9IGZyb20gJy4uLy4uL3NoYXJlZC9zaGlmdC5zZXJ2aWNlJztcbmltcG9ydCB7IFNlbGVjdGVkSW5kZXhDaGFuZ2VkRXZlbnREYXRhLCBUYWJWaWV3IH0gZnJvbSBcInVpL3RhYi12aWV3XCI7XG5pbXBvcnQgeyBIb21lTW9kZWwgfSBmcm9tICcuLi8uLi9ob21lL2hvbWUtbW9kZWwnXG5pbXBvcnQgKiBhcyBhcHBTZXR0aW5ncyBmcm9tICdhcHBsaWNhdGlvbi1zZXR0aW5ncyc7XG5pbXBvcnQgKiBhcyBtb21lbnQgZnJvbSAnbW9tZW50JztcblxubGV0IHNoaWZ0U2VydmljZTogU2hpZnRTZXJ2aWNlO1xuZXhwb3J0IGNsYXNzIEFsbFNoaWZ0c01vZGVsIGV4dGVuZHMgSG9tZU1vZGVsIHtcblxuICAgIGNvbnN0cnVjdG9yKHZpZXcpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgc2hpZnRTZXJ2aWNlID0gbmV3IFNoaWZ0U2VydmljZSgpO1xuICAgICAgICAvLyB2aWV3LnBhcmVudC5wYXJlbnQub24oJ3NlbGVjdGVkSW5kZXhDaGFuZ2VkJywgKGFyZ3M6U2VsZWN0ZWRJbmRleENoYW5nZWRFdmVudERhdGEpID0+IHtcbiAgICAgICAgLy8gICAgIGlmIChhcmdzLm5ld0luZGV4ID09IDEpIHtcbiAgICAgICAgLy8gICAgICAgICB0aGlzLmdldFNoaWZ0cygpO1xuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBhbGxTaGlmdHNMb2FkZWQoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdoaScpO1xuICAgIH1cblxuICAgIHB1YmxpYyBpbml0QWxsU2hpZnRzKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnZ2V0IGFsbCB5b3VyIHNoaWZ0cyBoZXJlLicpO1xuICAgICAgICBjb25zb2xlLmxvZygpXG4gICAgfVxuXG4gICAgcHVibGljIGdldFNoaWZ0cygpIHtcbiAgICAgICAgdGhpcy5zZXQoJ2lzTG9hZGluZycsIHRydWUpO1xuICAgICAgICBzaGlmdFNlcnZpY2UuZ2V0U2hpZnRzKCkudGhlbihzaGlmdHMgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXQoJ2lzTG9hZGluZycsIGZhbHNlKTtcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc0FsbFNoaWZ0cyhzaGlmdHMpO1xuXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHB1YmxpYyBwcm9jZXNzQWxsU2hpZnRzKHNoaWZ0cykge1xuICAgICAgICBsZXQgc2hpZnRzQXJyYXkgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBzaGlmdHMpIHtcbiAgICAgICAgICAgIGxldCBteVNoaWZ0ID0gc2hpZnRTZXJ2aWNlLmJ1aWxkU2hpZnREYXRhKHNoaWZ0c1tpXSk7XG4gICAgICAgICAgICBteVNoaWZ0LmlkID0gaTtcbiAgICAgICAgICAgIGlmICghbXlTaGlmdC5lbmRfdGltZSkgdGhpcy5zZXQoJ2Nsb2NrZWRJbicsIHNoaWZ0c1tpXSk7XG5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2hpZnRzQXJyYXkucHVzaChteVNoaWZ0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNoaWZ0c0FycmF5LnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgIGlmIChtb21lbnQoYS5zdGFydF90aW1lKSA8IG1vbWVudChiLnN0YXJ0X3RpbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vbWVudChhLnN0YXJ0X3RpbWUpID4gbW9tZW50KGIuc3RhcnRfdGltZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cblxuICAgICAgICBmb3IgKHZhciBzID0gMDsgc2hpZnRzQXJyYXkubGVuZ3RoID4gczsgcysrKSB7XG4gICAgICAgICAgICBsZXQgc2hpZnQgPSBvYnNlcnZhYmxlRnJvbU9iamVjdChzaGlmdHNBcnJheVtzXSk7XG4gICAgICAgICAgICBpZiAoIXRoaXMuYWxsU2hpZnRzTWFwW3NoaWZ0c0FycmF5W3NdLmlkXSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYWxsU2hpZnRzLnB1c2goc2hpZnQpXG4gICAgICAgICAgICAgICAgdGhpcy5hbGxTaGlmdHNNYXBbc2hpZnRzQXJyYXlbc10uaWRdID0gc2hpZnRzQXJyYXlbc107XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCB1cGRhdGVJbmRleDtcbiAgICAgICAgICAgICAgICB0aGlzLmFsbFNoaWZ0cy5mb3JFYWNoKChlbGVtZW50LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5nZXQoJ2lkJykgPT0gc2hpZnRzQXJyYXlbc10uaWQpIHVwZGF0ZUluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5hbGxTaGlmdHMuc2V0SXRlbSh1cGRhdGVJbmRleCwgc2hpZnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zb2xlLmRpcih0aGlzLmFsbFNoaWZ0cy5sZW5ndGgpO1xuICAgIH1cbn0iXX0=