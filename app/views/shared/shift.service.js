"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var firebase = require("nativescript-plugin-firebase");
var appSettings = require("application-settings");
var moment = require("moment");
var ShiftService = (function () {
    function ShiftService() {
    }
    ShiftService.prototype.startShift = function (data) {
        var _this = this;
        var uid = JSON.parse(appSettings.getString('uid'));
        return new Promise(function (resolve, reject) {
            firebase.push('/shifts/' + uid, data).then(function (result) {
                data.id = result.key;
                var shift = _this.buildShiftData(data);
                if (appSettings.getString('shifts')) {
                    var shifts = JSON.parse(appSettings.getString('shifts'));
                    shifts[result.key] = shift;
                    appSettings.setString('shifts', JSON.stringify(shifts));
                }
                else {
                    var shifts = {};
                    shifts[result.key] = shift;
                    appSettings.setString('shifts', JSON.stringify(shifts));
                }
                resolve(shift);
            });
        });
    };
    ShiftService.prototype.getShifts = function (limit, forceGet) {
        var uid = JSON.parse(appSettings.getString('uid'));
        var options = {
            singleEvent: true,
            orderBy: {
                type: firebase.QueryOrderByType.CHILD,
                value: 'start_date'
            }
        };
        if (limit) {
            options.limit = {
                type: firebase.QueryLimitType.LAST,
                value: limit
            };
        }
        return new Promise(function (resolve, reject) {
            if (appSettings.getString('shifts') && !forceGet) {
                console.log('returning cached shifts');
                resolve(JSON.parse(appSettings.getString('shifts')));
            }
            else {
                console.log('getting fresh shifts');
                firebase.query(function (queryResult) {
                    if (queryResult.value) {
                        resolve(queryResult.value);
                    }
                }, '/shifts/' + uid, options);
            }
        });
    };
    ShiftService.prototype.buildAppData = function (forceGet) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.getInvoices(false, forceGet).then(function (invoice_data) {
                _this.getShifts(false, forceGet).then(function (data) {
                    var user = JSON.parse(appSettings.getString('userData'));
                    for (var i in data) {
                        data[i].id = i;
                        for (var pp in invoice_data) {
                            invoice_data[pp].id = pp;
                            for (var xx = 0; invoice_data[pp].shift_ids.length > xx; xx++) {
                                if (i == invoice_data[pp].shift_ids[xx]) {
                                    //this shift exists in an invoice.
                                    if (!data[i].invoiced)
                                        data[i].invoiced = [];
                                    var invoicedObj = {
                                        "invoice_id": invoice_data[pp].id,
                                        "family_name": user.families[invoice_data[pp].family_id].name,
                                        "family_id": invoice_data[pp].family_id
                                    };
                                    data[i].invoiced.push(invoicedObj);
                                }
                            }
                        }
                    }
                    appSettings.setString('invoices', JSON.stringify(invoice_data));
                    appSettings.setString('shifts', JSON.stringify(data));
                    resolve();
                });
            });
        });
    };
    ShiftService.prototype.getInvoices = function (limit, forceGet) {
        var uid = JSON.parse(appSettings.getString('uid'));
        var options = {
            singleEvent: true,
            orderBy: {
                type: firebase.QueryOrderByType.CHILD,
                value: 'date_created'
            }
        };
        if (limit) {
            options.limit = {
                type: firebase.QueryLimitType.LAST,
                value: limit
            };
        }
        return new Promise(function (resolve, reject) {
            if (appSettings.getString('invoices') && !forceGet) {
                console.log('returning cached invoices');
                resolve(JSON.parse(appSettings.getString('invoices')));
            }
            else {
                console.log('getting fresh invoices');
                firebase.query(function (queryResult) {
                    if (queryResult.value) {
                        resolve(queryResult.value);
                    }
                }, '/invoices/' + uid, options);
            }
        });
    };
    ShiftService.prototype.createInvoice = function (args) {
        var _this = this;
        var uid = JSON.parse(appSettings.getString('uid'));
        return new Promise(function (resolve, reject) {
            firebase.push('/invoices/' + uid, args).then(function (result) {
                console.dir(result);
                _this.buildAppData(true).then(function () {
                    resolve(result);
                });
            });
        });
    };
    ShiftService.prototype.updateInvoice = function (id, data) {
        var _this = this;
        var uid = JSON.parse(appSettings.getString('uid'));
        return new Promise(function (resolve, reject) {
            if (uid) {
                firebase.update('/invoices/' + uid + '/' + id, data).then(function (result) {
                    _this.buildAppData(true).then(function () {
                        resolve(result);
                    });
                });
            }
            else {
                reject('Couldn\'t find the user record ID.');
            }
        });
    };
    ShiftService.prototype.deleteShift = function (id) {
        var uid = JSON.parse(appSettings.getString('uid'));
        return new Promise(function (resolve, reject) {
            if (uid) {
                firebase.remove('/shifts/' + uid + '/' + id).then(function (result) {
                    var shifts = JSON.parse(appSettings.getString('shifts'));
                    delete shifts[id];
                    appSettings.setString('shifts', JSON.stringify(shifts));
                    resolve(result);
                });
            }
            else {
                reject('Couldn\'t find the user record ID.');
            }
        });
    };
    ShiftService.prototype.updateShift = function (id, data) {
        var uid = JSON.parse(appSettings.getString('uid'));
        return new Promise(function (resolve, reject) {
            if (uid) {
                firebase.update('/shifts/' + uid + '/' + id, data).then(function (result) {
                    var shifts = JSON.parse(appSettings.getString('shifts'));
                    data.recentlyUpdated = true;
                    for (var i in data) {
                        shifts[id][i] = data[i];
                    }
                    appSettings.setString('shifts', JSON.stringify(shifts));
                    resolve(result);
                });
            }
            else {
                reject('Couldn\'t find the user record ID.');
            }
        });
    };
    ShiftService.prototype.addShift = function (data) {
        var _this = this;
        var uid = JSON.parse(appSettings.getString('uid'));
        return new Promise(function (resolve, reject) {
            firebase.push('/shifts/' + uid, data).then(function (result) {
                console.dir(result);
                data.id = result.key;
                var shift = _this.buildShiftData(data);
                if (appSettings.getString('shifts')) {
                    var shifts = JSON.parse(appSettings.getString('shifts'));
                    shifts[result.key] = shift;
                    appSettings.setString('shifts', JSON.stringify(shifts));
                }
                else {
                    var shifts = {};
                    shifts[result.key] = shift;
                    appSettings.setString('shifts', JSON.stringify(shifts));
                }
                resolve(shift);
            });
        });
    };
    ShiftService.prototype.calculateShiftHoursWorked = function (start_time, end_time, minutesWorked) {
        if (!minutesWorked) {
            var compareA = moment();
            if (end_time)
                compareA = moment(end_time);
            minutesWorked = compareA.diff(moment(start_time), 'minutes');
        }
        var hoursWorked = parseFloat((minutesWorked / 60).toFixed(2));
        var timeWorked;
        if (minutesWorked / 60 < 1) {
            timeWorked = minutesWorked + ' MINUTES';
        }
        else if ((hoursWorked) % 1 === 0) {
            timeWorked = Math.floor(hoursWorked) + ' HOURS';
        }
        else {
            var minutesOnHour = minutesWorked - (Math.floor(minutesWorked / 60) * 60);
            timeWorked = Math.floor(hoursWorked) + ' HOUR' + (Math.floor(hoursWorked) == 1 ? '' : 'S') + ' ' + minutesOnHour + ' MINUTE' + (minutesOnHour == 1 ? '' : 'S');
        }
        var rtn = {
            minutes_worked: minutesWorked,
            hours_worked: hoursWorked,
            time_worked: timeWorked
        };
        return rtn;
    };
    ShiftService.prototype.calculateShiftEarned = function (minutes_worked, previousWeekMinutes) {
        // console.log('Minutes worked: ' + minutes_worked);
        // console.log('Previous week minutes worked: ' + previousWeekMinutes);
        var user = JSON.parse(appSettings.getString('userData'));
        var minuteRate = parseFloat(user.hourlyRate) / 60;
        var overtimeMinuteRate = parseFloat(user.overtimeRate) / 60;
        // console.log('previousMinutes: ' + previousWeekMinutes)
        var overtime_earned, overtime_minutes, regular_earned, regular_minutes, total_earned;
        if (previousWeekMinutes >= 2400) {
            overtime_earned = minutes_worked * overtimeMinuteRate;
            overtime_minutes = minutes_worked;
            regular_earned = 0;
            regular_minutes = 0;
            total_earned = minutes_worked * overtimeMinuteRate;
        }
        else if (previousWeekMinutes + minutes_worked > 2400) {
            overtime_earned = ((previousWeekMinutes + minutes_worked) - 2400) * overtimeMinuteRate;
            overtime_minutes = (previousWeekMinutes + minutes_worked) - 2400;
            regular_earned = (minutes_worked - overtime_minutes) * minuteRate;
            regular_minutes = minutes_worked - overtime_minutes;
            total_earned = overtime_earned + regular_earned;
        }
        else {
            overtime_earned = 0;
            overtime_minutes = 0;
            regular_earned = minuteRate * minutes_worked;
            regular_minutes = minutes_worked;
            total_earned = minuteRate * minutes_worked;
        }
        // console.log('Regular earned: ' + regular_earned.toFixed(2));
        // console.log('Regular minutes: ' + regular_minutes);
        // console.log('Overtime earned: ' + overtime_earned.toFixed(2));
        // console.log('Overtime minutes: ' + overtime_minutes);
        // console.log('Total earned: ' + total_earned.toFixed(2));
        var rtn = {
            regular_earned: regular_earned.toFixed(2),
            regular_minutes: regular_minutes,
            overtime_earned: overtime_earned.toFixed(2),
            overtime_minutes: overtime_minutes,
            total_earned: total_earned.toFixed(2)
        };
        return rtn;
    };
    ShiftService.prototype.buildShiftData = function (shift) {
        var compareA = moment();
        if (shift.end_time)
            compareA = moment(shift.end_time);
        var minutesWorked = compareA.diff(moment(shift.start_time), 'minutes');
        var hoursWorked = (minutesWorked / 60).toFixed(2);
        var timeWorked;
        if (minutesWorked / 60 < 1) {
            timeWorked = minutesWorked + ' MINUTES';
        }
        else if ((parseFloat(hoursWorked)) % 1 === 0) {
            timeWorked = hoursWorked + ' HOURS';
        }
        else {
            var minutesOnHour = minutesWorked - (Math.floor(minutesWorked / 60) * 60);
            timeWorked = Math.floor(parseFloat(hoursWorked)) + ' HOURS ' + minutesOnHour + ' MINUTE' + (minutesOnHour == 1 ? '' : 'S');
        }
        shift.minutes_worked = minutesWorked;
        shift.hours_worked = hoursWorked;
        shift.time_worked = timeWorked;
        shift.title = moment(shift.start_time).format('ddd MMM Do');
        shift.display_start = moment(shift.start_time).format('h:mma');
        shift.display_end = moment(shift.end_time).format('h:mma');
        shift.display_hours = moment(shift.start_time).format('h:mma') + ' to ' + moment(shift.end_time).format('h:mma');
        if (moment(shift.start_time).format('YYYYMMDD') < moment(shift.end_time).format('YYYYMMDD')) {
            shift.display_hours = moment(shift.start_time).format('h:mma') + ' to ' + moment(shift.end_time).format('MMM DD [at] h:mma');
        }
        if (!shift.end_time)
            shift.display_hours = moment(shift.start_time).format('h:mma') + ' (In progress)';
        if (!shift.end_time)
            shift.end_time = false;
        shift.display_date = moment(shift.start_time).format('dddd MMM DD, YYYY');
        shift.display_timing = moment(shift.start_time).format('h:mma') + ' to ' + moment(shift.end_time).format('h:mma');
        if (moment(shift.start_time).format('YYYYMMDD') < moment(shift.end_time).format('YYYYMMDD')) {
            shift.display_timing = moment(shift.start_time).format('h:mma') + ' to ' + moment(shift.end_time).format('MMM DD [at] h:mma');
        }
        if (!shift.end_time) {
            shift.display_date = shift.display_date = moment().format('[TODAY] MMM DD, YYYY');
            shift.display_timing = 'Shift started at ' + moment(shift.start_time).format('h:mma');
            if (moment(shift.start_time).format('YYYYMMDD') < moment().format('YYYYMMDD')) {
                shift.display_timing = 'Shift started on ' + moment(shift.start_time).format('MMM DD [at] h:mma');
            }
        }
        var user = JSON.parse(appSettings.getString('userData'));
        var invoicedFamilyMap = {};
        if (shift.invoiced && shift.invoiced.length) {
            shift.invoiced_families_string = '';
            for (var x = 0; shift.invoiced.length > x; x++) {
                invoicedFamilyMap[shift.invoiced[x].family_id] = true;
                if (x == 0) {
                    shift.invoiced_families_string += shift.invoiced[x].family_name;
                }
                else {
                    shift.invoiced_families_string += ', ' + shift.invoiced[x].family_name;
                }
            }
        }
        var hasUninvoicedFamilies = false;
        var uninvoicedFamiliesText = '';
        var count = 0;
        for (var z in user.families) {
            if (!user.families[z].deleted) {
                if (!invoicedFamilyMap[z] && shift.contributions && shift.contributions[z] && shift.contributions[z] != 0 && shift.contributions[z] != '0' && shift.contributions[z] != '0.00') {
                    hasUninvoicedFamilies = true;
                    if (count == 0) {
                        uninvoicedFamiliesText += user.families[z].name;
                    }
                    else {
                        uninvoicedFamiliesText += ', ' + user.families[z].name;
                    }
                    count++;
                }
            }
        }
        if (hasUninvoicedFamilies)
            shift.uninvoiced_families_string = uninvoicedFamiliesText;
        return shift;
    };
    return ShiftService;
}());
exports.ShiftService = ShiftService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hpZnQuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNoaWZ0LnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1REFBeUQ7QUFDekQsa0RBQW9EO0FBQ3BELCtCQUFpQztBQVVqQztJQUFBO0lBMFdBLENBQUM7SUF4V1UsaUNBQVUsR0FBakIsVUFBa0IsSUFBSTtRQUF0QixpQkFtQkM7UUFsQkcsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU07WUFDL0IsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07Z0JBQzdDLElBQUksQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztnQkFDckIsSUFBSSxLQUFLLEdBQUcsS0FBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFdEMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2xDLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO29CQUN6RCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQztvQkFDM0IsV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUM1RCxDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLElBQUksTUFBTSxHQUFPLEVBQUUsQ0FBQTtvQkFDbkIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7b0JBQzNCLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDNUQsQ0FBQztnQkFDRCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkIsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFTSxnQ0FBUyxHQUFoQixVQUFpQixLQUFNLEVBQUUsUUFBUztRQUM5QixJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUVuRCxJQUFJLE9BQU8sR0FBTztZQUNkLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLE9BQU8sRUFBRTtnQkFDTCxJQUFJLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUs7Z0JBQ3JDLEtBQUssRUFBRSxZQUFZO2FBQ3RCO1NBQ0osQ0FBQTtRQUNELEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDUixPQUFPLENBQUMsS0FBSyxHQUFHO2dCQUNaLElBQUksRUFBRSxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUk7Z0JBQ2xDLEtBQUssRUFBRSxLQUFLO2FBQ2YsQ0FBQTtRQUNMLENBQUM7UUFFRCxNQUFNLENBQUMsSUFBSSxPQUFPLENBQU8sVUFBQyxPQUFPLEVBQUUsTUFBTTtZQUNyQyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDL0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO2dCQUN2QyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6RCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ0osT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUNwQyxRQUFRLENBQUMsS0FBSyxDQUNWLFVBQUEsV0FBVztvQkFDUCxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDcEIsT0FBTyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDL0IsQ0FBQztnQkFDTCxDQUFDLEVBQ0QsVUFBVSxHQUFHLEdBQUcsRUFDaEIsT0FBTyxDQUNWLENBQUM7WUFDTixDQUFDO1FBR0wsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRU0sbUNBQVksR0FBbkIsVUFBb0IsUUFBUztRQUE3QixpQkFnQ0M7UUEvQkcsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFPLFVBQUMsT0FBTyxFQUFFLE1BQU07WUFDckMsS0FBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsWUFBWTtnQkFDL0MsS0FBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsSUFBSTtvQkFDckMsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7b0JBQ3pELEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ2pCLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO3dCQUNmLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUM7NEJBQzFCLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDOzRCQUN6QixHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7Z0NBQzVELEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQ0FDdEMsa0NBQWtDO29DQUNsQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7d0NBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7b0NBQzdDLElBQUksV0FBVyxHQUFHO3dDQUNkLFlBQVksRUFBRSxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTt3Q0FDakMsYUFBYSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUk7d0NBQzdELFdBQVcsRUFBRSxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUztxQ0FDMUMsQ0FBQTtvQ0FDRCxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztnQ0FDdkMsQ0FBQzs0QkFDTCxDQUFDO3dCQUNMLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxXQUFXLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7b0JBQ2hFLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDdEQsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsQ0FBQyxDQUFDLENBQUE7WUFFTixDQUFDLENBQUMsQ0FBQTtRQUVOLENBQUMsQ0FBQyxDQUFBO0lBRU4sQ0FBQztJQUVNLGtDQUFXLEdBQWxCLFVBQW1CLEtBQU0sRUFBRSxRQUFTO1FBQ2hDLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRW5ELElBQUksT0FBTyxHQUFPO1lBQ2QsV0FBVyxFQUFFLElBQUk7WUFDakIsT0FBTyxFQUFFO2dCQUNMLElBQUksRUFBRSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsS0FBSztnQkFDckMsS0FBSyxFQUFFLGNBQWM7YUFDeEI7U0FDSixDQUFBO1FBQ0QsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNSLE9BQU8sQ0FBQyxLQUFLLEdBQUc7Z0JBQ1osSUFBSSxFQUFFLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSTtnQkFDbEMsS0FBSyxFQUFFLEtBQUs7YUFDZixDQUFBO1FBQ0wsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBTyxVQUFDLE9BQU8sRUFBRSxNQUFNO1lBQ3JDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBQ3pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNELENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDSixPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUM7Z0JBQ3RDLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBQSxXQUFXO29CQUN0QixFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDcEIsT0FBTyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDL0IsQ0FBQztnQkFDTCxDQUFDLEVBQUUsWUFBWSxHQUFHLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNwQyxDQUFDO1FBR0wsQ0FBQyxDQUFDLENBQUE7SUFFTixDQUFDO0lBRU0sb0NBQWEsR0FBcEIsVUFBcUIsSUFBSTtRQUF6QixpQkFXRTtRQVZFLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNO1lBQy9CLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQSxNQUFNO2dCQUMvQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwQixLQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFDekIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwQixDQUFDLENBQUMsQ0FBQTtZQUVOLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDTixDQUFDO0lBRU0sb0NBQWEsR0FBcEIsVUFBcUIsRUFBRSxFQUFFLElBQUk7UUFBN0IsaUJBYUE7UUFaRyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUUsTUFBTTtZQUMvQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNOLFFBQVEsQ0FBQyxNQUFNLENBQUMsWUFBWSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07b0JBQzVELEtBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDO3dCQUN6QixPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3BCLENBQUMsQ0FBQyxDQUFBO2dCQUNOLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNKLE1BQU0sQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1lBQ2pELENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFTSxrQ0FBVyxHQUFsQixVQUFtQixFQUFFO1FBQ2pCLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNO1lBQy9CLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ04sUUFBUSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQSxNQUFNO29CQUNwRCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztvQkFDekQsT0FBTyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ2xCLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztvQkFDeEQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwQixDQUFDLENBQUMsQ0FBQztZQUNQLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDSixNQUFNLENBQUMsb0NBQW9DLENBQUMsQ0FBQztZQUNqRCxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRU0sa0NBQVcsR0FBbEIsVUFBbUIsRUFBRSxFQUFFLElBQUk7UUFDdkIsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU07WUFDL0IsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDTixRQUFRLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQSxNQUFNO29CQUMxRCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztvQkFDekQsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7b0JBQzVCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ2pCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzVCLENBQUM7b0JBQ0QsV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUN4RCxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3BCLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNKLE1BQU0sQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1lBQ2pELENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFTSwrQkFBUSxHQUFmLFVBQWdCLElBQUk7UUFBcEIsaUJBb0JDO1FBbkJHLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNO1lBQy9CLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQSxNQUFNO2dCQUM3QyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwQixJQUFJLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUM7Z0JBQ3JCLElBQUksS0FBSyxHQUFHLEtBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBRXRDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztvQkFDekQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7b0JBQzNCLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDNUQsQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDSixJQUFJLE1BQU0sR0FBTyxFQUFFLENBQUE7b0JBQ25CLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO29CQUMzQixXQUFXLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQzVELENBQUM7Z0JBQ0QsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25CLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRU0sZ0RBQXlCLEdBQWhDLFVBQWlDLFVBQVUsRUFBRSxRQUFTLEVBQUUsYUFBYztRQUNsRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7WUFDakIsSUFBSSxRQUFRLEdBQUcsTUFBTSxFQUFFLENBQUM7WUFDeEIsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDO2dCQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDMUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2hFLENBQUM7UUFHRCxJQUFJLFdBQVcsR0FBRyxVQUFVLENBQUMsQ0FBQyxhQUFhLEdBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUQsSUFBSSxVQUFVLENBQUM7UUFDZixFQUFFLENBQUMsQ0FBQyxhQUFhLEdBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkIsVUFBVSxHQUFHLGFBQWEsR0FBRyxVQUFVLENBQUM7UUFDNUMsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLFFBQVEsQ0FBQztRQUNwRCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixJQUFJLGFBQWEsR0FBRyxhQUFhLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUN4RSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLGFBQWEsR0FBRyxTQUFTLEdBQUcsQ0FBQyxhQUFhLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUNuSyxDQUFDO1FBQ0QsSUFBSSxHQUFHLEdBQUc7WUFDTixjQUFjLEVBQUUsYUFBYTtZQUM3QixZQUFZLEVBQUUsV0FBVztZQUN6QixXQUFXLEVBQUUsVUFBVTtTQUMxQixDQUFBO1FBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUNmLENBQUM7SUFFTSwyQ0FBb0IsR0FBM0IsVUFBNEIsY0FBYyxFQUFFLG1CQUFtQjtRQUMzRCxvREFBb0Q7UUFDcEQsdUVBQXVFO1FBQ3ZFLElBQUksSUFBSSxHQUFTLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQy9ELElBQUksVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUMsRUFBRSxDQUFDO1FBQ2hELElBQUksa0JBQWtCLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBQyxFQUFFLENBQUM7UUFDMUQseURBQXlEO1FBQ3pELElBQUksZUFBZSxFQUFFLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxlQUFlLEVBQUUsWUFBWSxDQUFDO1FBQ3JGLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDOUIsZUFBZSxHQUFHLGNBQWMsR0FBRyxrQkFBa0IsQ0FBQztZQUN0RCxnQkFBZ0IsR0FBRyxjQUFjLENBQUM7WUFDbEMsY0FBYyxHQUFHLENBQUMsQ0FBQztZQUNuQixlQUFlLEdBQUcsQ0FBQyxDQUFDO1lBQ3BCLFlBQVksR0FBRyxjQUFjLEdBQUcsa0JBQWtCLENBQUM7UUFDdkQsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxtQkFBbUIsR0FBRyxjQUFjLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNyRCxlQUFlLEdBQUcsQ0FBQyxDQUFDLG1CQUFtQixHQUFHLGNBQWMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFDLGtCQUFrQixDQUFDO1lBQ3JGLGdCQUFnQixHQUFHLENBQUMsbUJBQW1CLEdBQUcsY0FBYyxDQUFDLEdBQUcsSUFBSSxDQUFDO1lBQ2pFLGNBQWMsR0FBRyxDQUFDLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFDLFVBQVUsQ0FBQztZQUNoRSxlQUFlLEdBQUcsY0FBYyxHQUFHLGdCQUFnQixDQUFDO1lBQ3BELFlBQVksR0FBRyxlQUFlLEdBQUcsY0FBYyxDQUFDO1FBQ3BELENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLGVBQWUsR0FBRyxDQUFDLENBQUM7WUFDcEIsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDO1lBQ3JCLGNBQWMsR0FBRyxVQUFVLEdBQUcsY0FBYyxDQUFDO1lBQzdDLGVBQWUsR0FBRyxjQUFjLENBQUM7WUFDakMsWUFBWSxHQUFHLFVBQVUsR0FBRyxjQUFjLENBQUM7UUFDL0MsQ0FBQztRQUNELCtEQUErRDtRQUMvRCxzREFBc0Q7UUFDdEQsaUVBQWlFO1FBQ2pFLHdEQUF3RDtRQUN4RCwyREFBMkQ7UUFDM0QsSUFBSSxHQUFHLEdBQUc7WUFDTixjQUFjLEVBQUUsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDekMsZUFBZSxFQUFFLGVBQWU7WUFDaEMsZUFBZSxFQUFFLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzNDLGdCQUFnQixFQUFFLGdCQUFnQjtZQUNsQyxZQUFZLEVBQUUsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDeEMsQ0FBQTtRQUNELE1BQU0sQ0FBQyxHQUFHLENBQUM7SUFDZixDQUFDO0lBRU0scUNBQWMsR0FBckIsVUFBc0IsS0FBSztRQUN2QixJQUFJLFFBQVEsR0FBRyxNQUFNLEVBQUUsQ0FBQztRQUN4QixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO1lBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEQsSUFBSSxhQUFhLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3RFLElBQUksV0FBVyxHQUFHLENBQUMsYUFBYSxHQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRCxJQUFJLFVBQVUsQ0FBQztRQUNmLEVBQUUsQ0FBQyxDQUFDLGFBQWEsR0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2QixVQUFVLEdBQUcsYUFBYSxHQUFHLFVBQVUsQ0FBQztRQUM1QyxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0MsVUFBVSxHQUFHLFdBQVcsR0FBRyxRQUFRLENBQUM7UUFDeEMsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osSUFBSSxhQUFhLEdBQUcsYUFBYSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDeEUsVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsU0FBUyxHQUFHLGFBQWEsR0FBRyxTQUFTLEdBQUcsQ0FBQyxhQUFhLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUMvSCxDQUFDO1FBQ0QsS0FBSyxDQUFDLGNBQWMsR0FBRyxhQUFhLENBQUM7UUFDckMsS0FBSyxDQUFDLFlBQVksR0FBRyxXQUFXLENBQUM7UUFDakMsS0FBSyxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUM7UUFDL0IsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUMzRCxLQUFLLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQy9ELEtBQUssQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFM0QsS0FBSyxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakgsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFGLEtBQUssQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDakksQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQztZQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsZ0JBQWdCLENBQUE7UUFDdEcsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO1lBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFFNUMsS0FBSyxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQzFFLEtBQUssQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xILEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxRixLQUFLLENBQUMsY0FBYyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLE1BQU0sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ2xJLENBQUM7UUFDRCxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ2xCLEtBQUssQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDLFlBQVksR0FBRyxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUVsRixLQUFLLENBQUMsY0FBYyxHQUFHLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3RGLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzVFLEtBQUssQ0FBQyxjQUFjLEdBQUcsbUJBQW1CLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUN0RyxDQUFDO1FBQ0wsQ0FBQztRQUNELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ3pELElBQUksaUJBQWlCLEdBQUcsRUFBRSxDQUFDO1FBQzNCLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQzFDLEtBQUssQ0FBQyx3QkFBd0IsR0FBRyxFQUFFLENBQUM7WUFDcEMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUM3QyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQztnQkFDdEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ1QsS0FBSyxDQUFDLHdCQUF3QixJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFBO2dCQUNuRSxDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLEtBQUssQ0FBQyx3QkFBd0IsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUE7Z0JBQzFFLENBQUM7WUFDTCxDQUFDO1FBQ0wsQ0FBQztRQUVELElBQUkscUJBQXFCLEdBQUcsS0FBSyxDQUFDO1FBQ2xDLElBQUksc0JBQXNCLEdBQUcsRUFBRSxDQUFDO1FBQ2hDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztRQUVkLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQzFCLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUM1QixFQUFFLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxhQUFhLElBQUksS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0JBQzdLLHFCQUFxQixHQUFHLElBQUksQ0FBQztvQkFDN0IsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2Isc0JBQXNCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7b0JBQ25ELENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ0osc0JBQXNCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO29CQUMxRCxDQUFDO29CQUNELEtBQUssRUFBRSxDQUFDO2dCQUNaLENBQUM7WUFDTCxDQUFDO1FBRUwsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO1lBQUMsS0FBSyxDQUFDLDBCQUEwQixHQUFHLHNCQUFzQixDQUFDO1FBSXJGLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUNMLG1CQUFDO0FBQUQsQ0FBQyxBQTFXRCxJQTBXQztBQTFXWSxvQ0FBWSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZpcmViYXNlIGZyb20gJ25hdGl2ZXNjcmlwdC1wbHVnaW4tZmlyZWJhc2UnO1xuaW1wb3J0ICogYXMgYXBwU2V0dGluZ3MgZnJvbSAnYXBwbGljYXRpb24tc2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgbW9tZW50IGZyb20gJ21vbWVudCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVXNlciB7XG4gICAgaG91cmx5UmF0ZTogc3RyaW5nLFxuICAgIG92ZXJ0aW1lUmF0ZTogc3RyaW5nLFxuICAgIHVpZDogc3RyaW5nLFxuICAgIGRhdGVfY3JlYXRlZDogc3RyaW5nLFxuICAgIGVtYWlsOiBzdHJpbmdcbn1cblxuZXhwb3J0IGNsYXNzIFNoaWZ0U2VydmljZSB7XG5cbiAgICBwdWJsaWMgc3RhcnRTaGlmdChkYXRhKSB7XG4gICAgICAgIGxldCB1aWQgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgICAgIGZpcmViYXNlLnB1c2goJy9zaGlmdHMvJyArIHVpZCwgZGF0YSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgIGRhdGEuaWQgPSByZXN1bHQua2V5O1xuICAgICAgICAgICAgICAgIGxldCBzaGlmdCA9IHRoaXMuYnVpbGRTaGlmdERhdGEoZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNoaWZ0cyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSk7XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0c1tyZXN1bHQua2V5XSA9IHNoaWZ0O1xuICAgICAgICAgICAgICAgICAgICBhcHBTZXR0aW5ncy5zZXRTdHJpbmcoJ3NoaWZ0cycsIEpTT04uc3RyaW5naWZ5KHNoaWZ0cykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBzaGlmdHM6YW55ID0ge31cbiAgICAgICAgICAgICAgICAgICAgc2hpZnRzW3Jlc3VsdC5rZXldID0gc2hpZnQ7XG4gICAgICAgICAgICAgICAgICAgIGFwcFNldHRpbmdzLnNldFN0cmluZygnc2hpZnRzJywgSlNPTi5zdHJpbmdpZnkoc2hpZnRzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUoc2hpZnQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGdldFNoaWZ0cyhsaW1pdD8sIGZvcmNlR2V0Pykge1xuICAgICAgICBsZXQgdWlkID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VpZCcpKTtcblxuICAgICAgICBsZXQgb3B0aW9uczphbnkgPSB7XG4gICAgICAgICAgICBzaW5nbGVFdmVudDogdHJ1ZSxcbiAgICAgICAgICAgIG9yZGVyQnk6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBmaXJlYmFzZS5RdWVyeU9yZGVyQnlUeXBlLkNISUxELFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnc3RhcnRfZGF0ZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobGltaXQpIHtcbiAgICAgICAgICAgIG9wdGlvbnMubGltaXQgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogZmlyZWJhc2UuUXVlcnlMaW1pdFR5cGUuTEFTVCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogbGltaXRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxVc2VyPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykgJiYgIWZvcmNlR2V0KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3JldHVybmluZyBjYWNoZWQgc2hpZnRzJyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2dldHRpbmcgZnJlc2ggc2hpZnRzJyk7XG4gICAgICAgICAgICAgICAgZmlyZWJhc2UucXVlcnkoXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5UmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChxdWVyeVJlc3VsdC52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocXVlcnlSZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICAgICAgJy9zaGlmdHMvJyArIHVpZCwgXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnNcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG5cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgYnVpbGRBcHBEYXRhKGZvcmNlR2V0Pykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8VXNlcj4oKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMuZ2V0SW52b2ljZXMoZmFsc2UsIGZvcmNlR2V0KS50aGVuKGludm9pY2VfZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5nZXRTaGlmdHMoZmFsc2UsIGZvcmNlR2V0KS50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdXNlciA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1c2VyRGF0YScpKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhW2ldLmlkID0gaTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHBwIGluIGludm9pY2VfZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2VfZGF0YVtwcF0uaWQgPSBwcDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciB4eCA9IDA7IGludm9pY2VfZGF0YVtwcF0uc2hpZnRfaWRzLmxlbmd0aCA+IHh4OyB4eCsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpID09IGludm9pY2VfZGF0YVtwcF0uc2hpZnRfaWRzW3h4XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy90aGlzIHNoaWZ0IGV4aXN0cyBpbiBhbiBpbnZvaWNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhW2ldLmludm9pY2VkKSBkYXRhW2ldLmludm9pY2VkID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW52b2ljZWRPYmogPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJpbnZvaWNlX2lkXCI6IGludm9pY2VfZGF0YVtwcF0uaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJmYW1pbHlfbmFtZVwiOiB1c2VyLmZhbWlsaWVzW2ludm9pY2VfZGF0YVtwcF0uZmFtaWx5X2lkXS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZmFtaWx5X2lkXCI6IGludm9pY2VfZGF0YVtwcF0uZmFtaWx5X2lkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhW2ldLmludm9pY2VkLnB1c2goaW52b2ljZWRPYmopO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGFwcFNldHRpbmdzLnNldFN0cmluZygnaW52b2ljZXMnLCBKU09OLnN0cmluZ2lmeShpbnZvaWNlX2RhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgYXBwU2V0dGluZ3Muc2V0U3RyaW5nKCdzaGlmdHMnLCBKU09OLnN0cmluZ2lmeShkYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTsgICAgXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgfVxuXG4gICAgcHVibGljIGdldEludm9pY2VzKGxpbWl0PywgZm9yY2VHZXQ/KSB7XG4gICAgICAgIGxldCB1aWQgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpO1xuXG4gICAgICAgIGxldCBvcHRpb25zOmFueSA9IHtcbiAgICAgICAgICAgIHNpbmdsZUV2ZW50OiB0cnVlLFxuICAgICAgICAgICAgb3JkZXJCeToge1xuICAgICAgICAgICAgICAgIHR5cGU6IGZpcmViYXNlLlF1ZXJ5T3JkZXJCeVR5cGUuQ0hJTEQsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICdkYXRlX2NyZWF0ZWQnXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxpbWl0KSB7XG4gICAgICAgICAgICBvcHRpb25zLmxpbWl0ID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IGZpcmViYXNlLlF1ZXJ5TGltaXRUeXBlLkxBU1QsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGxpbWl0XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8VXNlcj4oKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgICAgIGlmIChhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykgJiYgIWZvcmNlR2V0KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3JldHVybmluZyBjYWNoZWQgaW52b2ljZXMnKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnZXR0aW5nIGZyZXNoIGludm9pY2VzJyk7XG4gICAgICAgICAgICAgICAgZmlyZWJhc2UucXVlcnkocXVlcnlSZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAocXVlcnlSZXN1bHQudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocXVlcnlSZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgJy9pbnZvaWNlcy8nICsgdWlkLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuXG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgIH1cblxuICAgIHB1YmxpYyBjcmVhdGVJbnZvaWNlKGFyZ3MpIHtcbiAgICAgICAgbGV0IHVpZCA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1aWQnKSk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICAgICAgZmlyZWJhc2UucHVzaCgnL2ludm9pY2VzLycgKyB1aWQsIGFyZ3MpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmRpcihyZXN1bHQpO1xuICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRBcHBEYXRhKHRydWUpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgfVxuXG4gICAgIHB1YmxpYyB1cGRhdGVJbnZvaWNlKGlkLCBkYXRhKSB7XG4gICAgICAgIGxldCB1aWQgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgICAgIGlmICh1aWQpIHtcbiAgICAgICAgICAgICAgICBmaXJlYmFzZS51cGRhdGUoJy9pbnZvaWNlcy8nICsgdWlkICsgJy8nICsgaWQsIGRhdGEpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZEFwcERhdGEodHJ1ZSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnQ291bGRuXFwndCBmaW5kIHRoZSB1c2VyIHJlY29yZCBJRC4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgZGVsZXRlU2hpZnQoaWQpIHtcbiAgICAgICAgbGV0IHVpZCA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1aWQnKSk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICAgICAgaWYgKHVpZCkge1xuICAgICAgICAgICAgICAgIGZpcmViYXNlLnJlbW92ZSgnL3NoaWZ0cy8nICsgdWlkICsgJy8nICsgaWQpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNoaWZ0cyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzaGlmdHNbaWRdO1xuICAgICAgICAgICAgICAgICAgICBhcHBTZXR0aW5ncy5zZXRTdHJpbmcoJ3NoaWZ0cycsIEpTT04uc3RyaW5naWZ5KHNoaWZ0cykpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnQ291bGRuXFwndCBmaW5kIHRoZSB1c2VyIHJlY29yZCBJRC4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgdXBkYXRlU2hpZnQoaWQsIGRhdGEpIHtcbiAgICAgICAgbGV0IHVpZCA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1aWQnKSk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICAgICAgaWYgKHVpZCkge1xuICAgICAgICAgICAgICAgIGZpcmViYXNlLnVwZGF0ZSgnL3NoaWZ0cy8nICsgdWlkICsgJy8nICsgaWQsIGRhdGEpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNoaWZ0cyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSk7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEucmVjZW50bHlVcGRhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaGlmdHNbaWRdW2ldID0gZGF0YVtpXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhcHBTZXR0aW5ncy5zZXRTdHJpbmcoJ3NoaWZ0cycsIEpTT04uc3RyaW5naWZ5KHNoaWZ0cykpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnQ291bGRuXFwndCBmaW5kIHRoZSB1c2VyIHJlY29yZCBJRC4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgYWRkU2hpZnQoZGF0YSkge1xuICAgICAgICBsZXQgdWlkID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VpZCcpKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsgXG4gICAgICAgICAgICBmaXJlYmFzZS5wdXNoKCcvc2hpZnRzLycgKyB1aWQsIGRhdGEpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmRpcihyZXN1bHQpO1xuICAgICAgICAgICAgICAgIGRhdGEuaWQgPSByZXN1bHQua2V5O1xuICAgICAgICAgICAgICAgIGxldCBzaGlmdCA9IHRoaXMuYnVpbGRTaGlmdERhdGEoZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNoaWZ0cyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSk7XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0c1tyZXN1bHQua2V5XSA9IHNoaWZ0O1xuICAgICAgICAgICAgICAgICAgICBhcHBTZXR0aW5ncy5zZXRTdHJpbmcoJ3NoaWZ0cycsIEpTT04uc3RyaW5naWZ5KHNoaWZ0cykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBzaGlmdHM6YW55ID0ge31cbiAgICAgICAgICAgICAgICAgICAgc2hpZnRzW3Jlc3VsdC5rZXldID0gc2hpZnQ7XG4gICAgICAgICAgICAgICAgICAgIGFwcFNldHRpbmdzLnNldFN0cmluZygnc2hpZnRzJywgSlNPTi5zdHJpbmdpZnkoc2hpZnRzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUoc2hpZnQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGNhbGN1bGF0ZVNoaWZ0SG91cnNXb3JrZWQoc3RhcnRfdGltZSwgZW5kX3RpbWU/LCBtaW51dGVzV29ya2VkPykge1xuICAgICAgICBpZiAoIW1pbnV0ZXNXb3JrZWQpIHtcbiAgICAgICAgICAgIHZhciBjb21wYXJlQSA9IG1vbWVudCgpO1xuICAgICAgICAgICAgaWYgKGVuZF90aW1lKSBjb21wYXJlQSA9IG1vbWVudChlbmRfdGltZSk7XG4gICAgICAgICAgICBtaW51dGVzV29ya2VkID0gY29tcGFyZUEuZGlmZihtb21lbnQoc3RhcnRfdGltZSksICdtaW51dGVzJylcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGxldCBob3Vyc1dvcmtlZCA9IHBhcnNlRmxvYXQoKG1pbnV0ZXNXb3JrZWQvNjApLnRvRml4ZWQoMikpO1xuICAgICAgICBsZXQgdGltZVdvcmtlZDtcbiAgICAgICAgaWYgKG1pbnV0ZXNXb3JrZWQvNjAgPCAxKSB7XG4gICAgICAgICAgICB0aW1lV29ya2VkID0gbWludXRlc1dvcmtlZCArICcgTUlOVVRFUyc7XG4gICAgICAgIH0gZWxzZSBpZiAoKGhvdXJzV29ya2VkKSAlIDEgPT09IDApIHtcbiAgICAgICAgICAgIHRpbWVXb3JrZWQgPSBNYXRoLmZsb29yKGhvdXJzV29ya2VkKSArICcgSE9VUlMnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IG1pbnV0ZXNPbkhvdXIgPSBtaW51dGVzV29ya2VkIC0gKE1hdGguZmxvb3IobWludXRlc1dvcmtlZC82MCkgKiA2MCk7XG4gICAgICAgICAgICB0aW1lV29ya2VkID0gTWF0aC5mbG9vcihob3Vyc1dvcmtlZCkgKyAnIEhPVVInICsgKE1hdGguZmxvb3IoaG91cnNXb3JrZWQpID09IDEgPyAnJyA6ICdTJykgKyAnICcgKyBtaW51dGVzT25Ib3VyICsgJyBNSU5VVEUnICsgKG1pbnV0ZXNPbkhvdXIgPT0gMSA/ICcnIDogJ1MnKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcnRuID0ge1xuICAgICAgICAgICAgbWludXRlc193b3JrZWQ6IG1pbnV0ZXNXb3JrZWQsXG4gICAgICAgICAgICBob3Vyc193b3JrZWQ6IGhvdXJzV29ya2VkLFxuICAgICAgICAgICAgdGltZV93b3JrZWQ6IHRpbWVXb3JrZWRcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcnRuO1xuICAgIH1cblxuICAgIHB1YmxpYyBjYWxjdWxhdGVTaGlmdEVhcm5lZChtaW51dGVzX3dvcmtlZCwgcHJldmlvdXNXZWVrTWludXRlcykge1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnTWludXRlcyB3b3JrZWQ6ICcgKyBtaW51dGVzX3dvcmtlZCk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdQcmV2aW91cyB3ZWVrIG1pbnV0ZXMgd29ya2VkOiAnICsgcHJldmlvdXNXZWVrTWludXRlcyk7XG4gICAgICAgIGxldCB1c2VyOiBVc2VyID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpO1xuICAgICAgICBsZXQgbWludXRlUmF0ZSA9IHBhcnNlRmxvYXQodXNlci5ob3VybHlSYXRlKS82MDtcbiAgICAgICAgbGV0IG92ZXJ0aW1lTWludXRlUmF0ZSA9IHBhcnNlRmxvYXQodXNlci5vdmVydGltZVJhdGUpLzYwO1xuICAgICAgICAvLyBjb25zb2xlLmxvZygncHJldmlvdXNNaW51dGVzOiAnICsgcHJldmlvdXNXZWVrTWludXRlcylcbiAgICAgICAgbGV0IG92ZXJ0aW1lX2Vhcm5lZCwgb3ZlcnRpbWVfbWludXRlcywgcmVndWxhcl9lYXJuZWQsIHJlZ3VsYXJfbWludXRlcywgdG90YWxfZWFybmVkO1xuICAgICAgICBpZiAocHJldmlvdXNXZWVrTWludXRlcyA+PSAyNDAwKSB7XG4gICAgICAgICAgICBvdmVydGltZV9lYXJuZWQgPSBtaW51dGVzX3dvcmtlZCAqIG92ZXJ0aW1lTWludXRlUmF0ZTtcbiAgICAgICAgICAgIG92ZXJ0aW1lX21pbnV0ZXMgPSBtaW51dGVzX3dvcmtlZDtcbiAgICAgICAgICAgIHJlZ3VsYXJfZWFybmVkID0gMDtcbiAgICAgICAgICAgIHJlZ3VsYXJfbWludXRlcyA9IDA7XG4gICAgICAgICAgICB0b3RhbF9lYXJuZWQgPSBtaW51dGVzX3dvcmtlZCAqIG92ZXJ0aW1lTWludXRlUmF0ZTtcbiAgICAgICAgfSBlbHNlIGlmIChwcmV2aW91c1dlZWtNaW51dGVzICsgbWludXRlc193b3JrZWQgPiAyNDAwKSB7XG4gICAgICAgICAgICBvdmVydGltZV9lYXJuZWQgPSAoKHByZXZpb3VzV2Vla01pbnV0ZXMgKyBtaW51dGVzX3dvcmtlZCkgLSAyNDAwKSpvdmVydGltZU1pbnV0ZVJhdGU7XG4gICAgICAgICAgICBvdmVydGltZV9taW51dGVzID0gKHByZXZpb3VzV2Vla01pbnV0ZXMgKyBtaW51dGVzX3dvcmtlZCkgLSAyNDAwO1xuICAgICAgICAgICAgcmVndWxhcl9lYXJuZWQgPSAobWludXRlc193b3JrZWQgLSBvdmVydGltZV9taW51dGVzKSptaW51dGVSYXRlO1xuICAgICAgICAgICAgcmVndWxhcl9taW51dGVzID0gbWludXRlc193b3JrZWQgLSBvdmVydGltZV9taW51dGVzO1xuICAgICAgICAgICAgdG90YWxfZWFybmVkID0gb3ZlcnRpbWVfZWFybmVkICsgcmVndWxhcl9lYXJuZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdmVydGltZV9lYXJuZWQgPSAwO1xuICAgICAgICAgICAgb3ZlcnRpbWVfbWludXRlcyA9IDA7XG4gICAgICAgICAgICByZWd1bGFyX2Vhcm5lZCA9IG1pbnV0ZVJhdGUgKiBtaW51dGVzX3dvcmtlZDtcbiAgICAgICAgICAgIHJlZ3VsYXJfbWludXRlcyA9IG1pbnV0ZXNfd29ya2VkO1xuICAgICAgICAgICAgdG90YWxfZWFybmVkID0gbWludXRlUmF0ZSAqIG1pbnV0ZXNfd29ya2VkO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdSZWd1bGFyIGVhcm5lZDogJyArIHJlZ3VsYXJfZWFybmVkLnRvRml4ZWQoMikpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnUmVndWxhciBtaW51dGVzOiAnICsgcmVndWxhcl9taW51dGVzKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ092ZXJ0aW1lIGVhcm5lZDogJyArIG92ZXJ0aW1lX2Vhcm5lZC50b0ZpeGVkKDIpKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ092ZXJ0aW1lIG1pbnV0ZXM6ICcgKyBvdmVydGltZV9taW51dGVzKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ1RvdGFsIGVhcm5lZDogJyArIHRvdGFsX2Vhcm5lZC50b0ZpeGVkKDIpKTtcbiAgICAgICAgbGV0IHJ0biA9IHtcbiAgICAgICAgICAgIHJlZ3VsYXJfZWFybmVkOiByZWd1bGFyX2Vhcm5lZC50b0ZpeGVkKDIpLFxuICAgICAgICAgICAgcmVndWxhcl9taW51dGVzOiByZWd1bGFyX21pbnV0ZXMsXG4gICAgICAgICAgICBvdmVydGltZV9lYXJuZWQ6IG92ZXJ0aW1lX2Vhcm5lZC50b0ZpeGVkKDIpLFxuICAgICAgICAgICAgb3ZlcnRpbWVfbWludXRlczogb3ZlcnRpbWVfbWludXRlcyxcbiAgICAgICAgICAgIHRvdGFsX2Vhcm5lZDogdG90YWxfZWFybmVkLnRvRml4ZWQoMilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcnRuO1xuICAgIH1cblxuICAgIHB1YmxpYyBidWlsZFNoaWZ0RGF0YShzaGlmdCkge1xuICAgICAgICB2YXIgY29tcGFyZUEgPSBtb21lbnQoKTtcbiAgICAgICAgaWYgKHNoaWZ0LmVuZF90aW1lKSBjb21wYXJlQSA9IG1vbWVudChzaGlmdC5lbmRfdGltZSk7XG4gICAgICAgIHZhciBtaW51dGVzV29ya2VkID0gY29tcGFyZUEuZGlmZihtb21lbnQoc2hpZnQuc3RhcnRfdGltZSksICdtaW51dGVzJylcbiAgICAgICAgdmFyIGhvdXJzV29ya2VkID0gKG1pbnV0ZXNXb3JrZWQvNjApLnRvRml4ZWQoMik7XG4gICAgICAgIGxldCB0aW1lV29ya2VkO1xuICAgICAgICBpZiAobWludXRlc1dvcmtlZC82MCA8IDEpIHtcbiAgICAgICAgICAgIHRpbWVXb3JrZWQgPSBtaW51dGVzV29ya2VkICsgJyBNSU5VVEVTJztcbiAgICAgICAgfSBlbHNlIGlmICgocGFyc2VGbG9hdChob3Vyc1dvcmtlZCkpICUgMSA9PT0gMCkge1xuICAgICAgICAgICAgdGltZVdvcmtlZCA9IGhvdXJzV29ya2VkICsgJyBIT1VSUyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgbWludXRlc09uSG91ciA9IG1pbnV0ZXNXb3JrZWQgLSAoTWF0aC5mbG9vcihtaW51dGVzV29ya2VkLzYwKSAqIDYwKTtcbiAgICAgICAgICAgIHRpbWVXb3JrZWQgPSBNYXRoLmZsb29yKHBhcnNlRmxvYXQoaG91cnNXb3JrZWQpKSArICcgSE9VUlMgJyArIG1pbnV0ZXNPbkhvdXIgKyAnIE1JTlVURScgKyAobWludXRlc09uSG91ciA9PSAxID8gJycgOiAnUycpO1xuICAgICAgICB9XG4gICAgICAgIHNoaWZ0Lm1pbnV0ZXNfd29ya2VkID0gbWludXRlc1dvcmtlZDtcbiAgICAgICAgc2hpZnQuaG91cnNfd29ya2VkID0gaG91cnNXb3JrZWQ7XG4gICAgICAgIHNoaWZ0LnRpbWVfd29ya2VkID0gdGltZVdvcmtlZDtcbiAgICAgICAgc2hpZnQudGl0bGUgPSBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdkZGQgTU1NIERvJylcbiAgICAgICAgc2hpZnQuZGlzcGxheV9zdGFydCA9IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2g6bW1hJyk7XG4gICAgICAgIHNoaWZ0LmRpc3BsYXlfZW5kID0gbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ2g6bW1hJyk7XG5cbiAgICAgICAgc2hpZnQuZGlzcGxheV9ob3VycyA9IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2g6bW1hJykgKyAnIHRvICcgKyBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnaDptbWEnKTtcbiAgICAgICAgaWYgKG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ1lZWVlNTUREJykgPCBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnWVlZWU1NREQnKSkge1xuICAgICAgICAgICAgc2hpZnQuZGlzcGxheV9ob3VycyA9IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2g6bW1hJykgKyAnIHRvICcgKyBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnTU1NIEREIFthdF0gaDptbWEnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNoaWZ0LmVuZF90aW1lKSBzaGlmdC5kaXNwbGF5X2hvdXJzID0gbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnaDptbWEnKSArICcgKEluIHByb2dyZXNzKSdcbiAgICAgICAgaWYgKCFzaGlmdC5lbmRfdGltZSkgc2hpZnQuZW5kX3RpbWUgPSBmYWxzZTtcblxuICAgICAgICBzaGlmdC5kaXNwbGF5X2RhdGUgPSBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdkZGRkIE1NTSBERCwgWVlZWScpO1xuICAgICAgICBzaGlmdC5kaXNwbGF5X3RpbWluZyA9IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2g6bW1hJykgKyAnIHRvICcgKyBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnaDptbWEnKTtcbiAgICAgICAgaWYgKG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ1lZWVlNTUREJykgPCBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnWVlZWU1NREQnKSkge1xuICAgICAgICAgICAgc2hpZnQuZGlzcGxheV90aW1pbmcgPSBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdoOm1tYScpICsgJyB0byAnICsgbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ01NTSBERCBbYXRdIGg6bW1hJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzaGlmdC5lbmRfdGltZSkge1xuICAgICAgICAgICAgc2hpZnQuZGlzcGxheV9kYXRlID0gc2hpZnQuZGlzcGxheV9kYXRlID0gbW9tZW50KCkuZm9ybWF0KCdbVE9EQVldIE1NTSBERCwgWVlZWScpO1xuXG4gICAgICAgICAgICBzaGlmdC5kaXNwbGF5X3RpbWluZyA9ICdTaGlmdCBzdGFydGVkIGF0ICcgKyBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdoOm1tYScpO1xuICAgICAgICAgICAgaWYgKG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ1lZWVlNTUREJykgPCBtb21lbnQoKS5mb3JtYXQoJ1lZWVlNTUREJykpIHtcbiAgICAgICAgICAgICAgICBzaGlmdC5kaXNwbGF5X3RpbWluZyA9ICdTaGlmdCBzdGFydGVkIG9uICcgKyBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdNTU0gREQgW2F0XSBoOm1tYScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxldCB1c2VyID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpO1xuICAgICAgICBsZXQgaW52b2ljZWRGYW1pbHlNYXAgPSB7fTtcbiAgICAgICAgaWYgKHNoaWZ0Lmludm9pY2VkICYmIHNoaWZ0Lmludm9pY2VkLmxlbmd0aCkge1xuICAgICAgICAgICAgc2hpZnQuaW52b2ljZWRfZmFtaWxpZXNfc3RyaW5nID0gJyc7XG4gICAgICAgICAgICBmb3IgKHZhciB4ID0gMDsgc2hpZnQuaW52b2ljZWQubGVuZ3RoID4geDsgeCsrKSB7XG4gICAgICAgICAgICAgICAgaW52b2ljZWRGYW1pbHlNYXBbc2hpZnQuaW52b2ljZWRbeF0uZmFtaWx5X2lkXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKHggPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBzaGlmdC5pbnZvaWNlZF9mYW1pbGllc19zdHJpbmcgKz0gc2hpZnQuaW52b2ljZWRbeF0uZmFtaWx5X25hbWVcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzaGlmdC5pbnZvaWNlZF9mYW1pbGllc19zdHJpbmcgKz0gJywgJyArIHNoaWZ0Lmludm9pY2VkW3hdLmZhbWlseV9uYW1lXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGhhc1VuaW52b2ljZWRGYW1pbGllcyA9IGZhbHNlO1xuICAgICAgICBsZXQgdW5pbnZvaWNlZEZhbWlsaWVzVGV4dCA9ICcnO1xuICAgICAgICBsZXQgY291bnQgPSAwO1xuXG4gICAgICAgIGZvciAodmFyIHogaW4gdXNlci5mYW1pbGllcykge1xuICAgICAgICAgICAgaWYgKCF1c2VyLmZhbWlsaWVzW3pdLmRlbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWludm9pY2VkRmFtaWx5TWFwW3pdICYmIHNoaWZ0LmNvbnRyaWJ1dGlvbnMgJiYgc2hpZnQuY29udHJpYnV0aW9uc1t6XSAmJiBzaGlmdC5jb250cmlidXRpb25zW3pdICE9IDAgJiYgc2hpZnQuY29udHJpYnV0aW9uc1t6XSAhPSAnMCcgJiYgc2hpZnQuY29udHJpYnV0aW9uc1t6XSAhPSAnMC4wMCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFzVW5pbnZvaWNlZEZhbWlsaWVzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvdW50ID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuaW52b2ljZWRGYW1pbGllc1RleHQgKz0gdXNlci5mYW1pbGllc1t6XS5uYW1lXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1bmludm9pY2VkRmFtaWxpZXNUZXh0ICs9ICcsICcgKyB1c2VyLmZhbWlsaWVzW3pdLm5hbWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgICAgIGlmIChoYXNVbmludm9pY2VkRmFtaWxpZXMpIHNoaWZ0LnVuaW52b2ljZWRfZmFtaWxpZXNfc3RyaW5nID0gdW5pbnZvaWNlZEZhbWlsaWVzVGV4dDtcbiAgICAgICAgXG5cblxuICAgICAgICByZXR1cm4gc2hpZnQ7XG4gICAgfVxufSJdfQ==