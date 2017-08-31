"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var home_model_1 = require("./home-model");
function loaded(args) {
    var page = args.object;
    var homeModel = new home_model_1.HomeModel();
    homeModel.pageLoaded(page);
}
exports.loaded = loaded;
// export function startShift() {
//     let args = {
//         start_time: moment().format(),
//         end_time: null,
//         uid: JSON.parse(appSettings.getString('uid'))
//     }
//     shiftService.startShift(args).then(result => {
//         console.log('saved something?');
//     })
// } 
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9tZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSwyQ0FBeUM7QUFFekMsZ0JBQXVCLElBQWU7SUFDbEMsSUFBSSxJQUFJLEdBQVMsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUM3QixJQUFJLFNBQVMsR0FBRyxJQUFJLHNCQUFTLEVBQUUsQ0FBQztJQUNoQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQy9CLENBQUM7QUFKRCx3QkFJQztBQUdELGlDQUFpQztBQUNqQyxtQkFBbUI7QUFDbkIseUNBQXlDO0FBQ3pDLDBCQUEwQjtBQUMxQix3REFBd0Q7QUFDeEQsUUFBUTtBQUNSLHFEQUFxRDtBQUNyRCwyQ0FBMkM7QUFDM0MsU0FBUztBQUNULElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFdmVudERhdGEsIE9ic2VydmFibGUgfSBmcm9tICdkYXRhL29ic2VydmFibGUnO1xuaW1wb3J0IHsgUGFnZSB9IGZyb20gJ3VpL3BhZ2UnO1xuaW1wb3J0IHsgSG9tZU1vZGVsIH0gZnJvbSAnLi9ob21lLW1vZGVsJztcblxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRlZChhcmdzOiBFdmVudERhdGEpIHtcbiAgICBsZXQgcGFnZSA9IDxQYWdlPmFyZ3Mub2JqZWN0O1xuICAgIGxldCBob21lTW9kZWwgPSBuZXcgSG9tZU1vZGVsKCk7XG4gICAgaG9tZU1vZGVsLnBhZ2VMb2FkZWQocGFnZSk7XG59XG5cblxuLy8gZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0U2hpZnQoKSB7XG4vLyAgICAgbGV0IGFyZ3MgPSB7XG4vLyAgICAgICAgIHN0YXJ0X3RpbWU6IG1vbWVudCgpLmZvcm1hdCgpLFxuLy8gICAgICAgICBlbmRfdGltZTogbnVsbCxcbi8vICAgICAgICAgdWlkOiBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpXG4vLyAgICAgfVxuLy8gICAgIHNoaWZ0U2VydmljZS5zdGFydFNoaWZ0KGFyZ3MpLnRoZW4ocmVzdWx0ID0+IHtcbi8vICAgICAgICAgY29uc29sZS5sb2coJ3NhdmVkIHNvbWV0aGluZz8nKTtcbi8vICAgICB9KVxuLy8gfSJdfQ==