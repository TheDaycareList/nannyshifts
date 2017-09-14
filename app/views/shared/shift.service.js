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
                    else {
                        resolve(false);
                    }
                }, '/shifts/' + uid, options);
            }
        });
    };
    ShiftService.prototype.buildAppData = function (forceGet) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.getInvoices(false, forceGet).then(function (invoice_data) {
                if (!invoice_data)
                    appSettings.remove('invoices');
                _this.getShifts(false, forceGet).then(function (data) {
                    if (!data)
                        appSettings.remove('shifts');
                    var user = JSON.parse(appSettings.getString('userData'));
                    if (data) {
                        for (var i in data) {
                            data[i].id = i;
                            if (invoice_data) {
                                for (var pp in invoice_data) {
                                    invoice_data[pp].id = pp;
                                    if (!invoice_data[pp].paid)
                                        invoice_data[pp].paid = false;
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
                        }
                    }
                    if (invoice_data)
                        appSettings.setString('invoices', JSON.stringify(invoice_data));
                    if (data)
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
                    else {
                        resolve(false);
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
        var _this = this;
        var uid = JSON.parse(appSettings.getString('uid'));
        return new Promise(function (resolve, reject) {
            if (uid) {
                firebase.remove('/shifts/' + uid + '/' + id).then(function (result) {
                    // let shifts = JSON.parse(appSettings.getString('shifts'));
                    // delete shifts[id];
                    // appSettings.setString('shifts', JSON.stringify(shifts));
                    // resolve(result);
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
    ShiftService.prototype.deleteInvoice = function (id) {
        var _this = this;
        var uid = JSON.parse(appSettings.getString('uid'));
        return new Promise(function (resolve, reject) {
            if (uid) {
                firebase.remove('/invoices/' + uid + '/' + id).then(function (result) {
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
    ShiftService.prototype.updateShift = function (id, data) {
        var _this = this;
        var uid = JSON.parse(appSettings.getString('uid'));
        return new Promise(function (resolve, reject) {
            if (uid) {
                firebase.update('/shifts/' + uid + '/' + id, data).then(function (result) {
                    // let shifts = JSON.parse(appSettings.getString('shifts'));
                    // data.recentlyUpdated = true;
                    // for (let i in data) {
                    //     shifts[id][i] = data[i];
                    // }
                    // appSettings.setString('shifts', JSON.stringify(shifts));
                    // resolve(result);
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
    ShiftService.prototype.addShift = function (data) {
        var _this = this;
        var uid = JSON.parse(appSettings.getString('uid'));
        return new Promise(function (resolve, reject) {
            firebase.push('/shifts/' + uid, data).then(function (result) {
                console.dir(result);
                // data.id = result.key;
                // let shift = this.buildShiftData(data);
                // if (appSettings.getString('shifts')) {
                //     let shifts = JSON.parse(appSettings.getString('shifts'));
                //     shifts[result.key] = shift;
                //     appSettings.setString('shifts', JSON.stringify(shifts));
                // } else {
                //     let shifts:any = {}
                //     shifts[result.key] = shift;
                //     appSettings.setString('shifts', JSON.stringify(shifts));
                // }
                // resolve(shift);
                _this.buildAppData(true).then(function () {
                    resolve(result);
                });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hpZnQuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNoaWZ0LnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1REFBeUQ7QUFDekQsa0RBQW9EO0FBQ3BELCtCQUFpQztBQVVqQztJQUFBO0lBK1lBLENBQUM7SUE3WVUsaUNBQVUsR0FBakIsVUFBa0IsSUFBSTtRQUF0QixpQkFtQkM7UUFsQkcsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU07WUFDL0IsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07Z0JBQzdDLElBQUksQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztnQkFDckIsSUFBSSxLQUFLLEdBQUcsS0FBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFdEMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2xDLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO29CQUN6RCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQztvQkFDM0IsV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUM1RCxDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLElBQUksTUFBTSxHQUFPLEVBQUUsQ0FBQTtvQkFDbkIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxH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QUFJLENBQUE7b0JBQ25ELENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ0osc0JBQXNCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO29CQUMxRCxDQUFDO29CQUNELEtBQUssRUFBRSxDQUFDO2dCQUNaLENBQUM7WUFDTCxDQUFDO1FBRUwsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO1lBQUMsS0FBSyxDQUFDLDBCQUEwQixHQUFHLHNCQUFzQixDQUFDO1FBSXJGLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUNMLG1CQUFDO0FBQUQsQ0FBQyxBQS9ZRCxJQStZQztBQS9ZWSxvQ0FBWSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZpcmViYXNlIGZyb20gJ25hdGl2ZXNjcmlwdC1wbHVnaW4tZmlyZWJhc2UnO1xuaW1wb3J0ICogYXMgYXBwU2V0dGluZ3MgZnJvbSAnYXBwbGljYXRpb24tc2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgbW9tZW50IGZyb20gJ21vbWVudCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVXNlciB7XG4gICAgaG91cmx5UmF0ZTogc3RyaW5nLFxuICAgIG92ZXJ0aW1lUmF0ZTogc3RyaW5nLFxuICAgIHVpZDogc3RyaW5nLFxuICAgIGRhdGVfY3JlYXRlZDogc3RyaW5nLFxuICAgIGVtYWlsOiBzdHJpbmdcbn1cblxuZXhwb3J0IGNsYXNzIFNoaWZ0U2VydmljZSB7XG5cbiAgICBwdWJsaWMgc3RhcnRTaGlmdChkYXRhKSB7XG4gICAgICAgIGxldCB1aWQgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgICAgIGZpcmViYXNlLnB1c2goJy9zaGlmdHMvJyArIHVpZCwgZGF0YSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgIGRhdGEuaWQgPSByZXN1bHQua2V5O1xuICAgICAgICAgICAgICAgIGxldCBzaGlmdCA9IHRoaXMuYnVpbGRTaGlmdERhdGEoZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNoaWZ0cyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSk7XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0c1tyZXN1bHQua2V5XSA9IHNoaWZ0O1xuICAgICAgICAgICAgICAgICAgICBhcHBTZXR0aW5ncy5zZXRTdHJpbmcoJ3NoaWZ0cycsIEpTT04uc3RyaW5naWZ5KHNoaWZ0cykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBzaGlmdHM6YW55ID0ge31cbiAgICAgICAgICAgICAgICAgICAgc2hpZnRzW3Jlc3VsdC5rZXldID0gc2hpZnQ7XG4gICAgICAgICAgICAgICAgICAgIGFwcFNldHRpbmdzLnNldFN0cmluZygnc2hpZnRzJywgSlNPTi5zdHJpbmdpZnkoc2hpZnRzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUoc2hpZnQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGdldFNoaWZ0cyhsaW1pdD8sIGZvcmNlR2V0Pykge1xuICAgICAgICBsZXQgdWlkID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VpZCcpKTtcblxuICAgICAgICBsZXQgb3B0aW9uczphbnkgPSB7XG4gICAgICAgICAgICBzaW5nbGVFdmVudDogdHJ1ZSxcbiAgICAgICAgICAgIG9yZGVyQnk6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBmaXJlYmFzZS5RdWVyeU9yZGVyQnlUeXBlLkNISUxELFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnc3RhcnRfZGF0ZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobGltaXQpIHtcbiAgICAgICAgICAgIG9wdGlvbnMubGltaXQgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogZmlyZWJhc2UuUXVlcnlMaW1pdFR5cGUuTEFTVCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogbGltaXRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykgJiYgIWZvcmNlR2V0KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3JldHVybmluZyBjYWNoZWQgc2hpZnRzJyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2dldHRpbmcgZnJlc2ggc2hpZnRzJyk7XG4gICAgICAgICAgICAgICAgZmlyZWJhc2UucXVlcnkoXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5UmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChxdWVyeVJlc3VsdC52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocXVlcnlSZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgICAgICcvc2hpZnRzLycgKyB1aWQsIFxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGJ1aWxkQXBwRGF0YShmb3JjZUdldD8pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsgXG4gICAgICAgICAgICB0aGlzLmdldEludm9pY2VzKGZhbHNlLCBmb3JjZUdldCkudGhlbihpbnZvaWNlX2RhdGEgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghaW52b2ljZV9kYXRhKSBhcHBTZXR0aW5ncy5yZW1vdmUoJ2ludm9pY2VzJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5nZXRTaGlmdHMoZmFsc2UsIGZvcmNlR2V0KS50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEpIGFwcFNldHRpbmdzLnJlbW92ZSgnc2hpZnRzJyk7XG4gICAgICAgICAgICAgICAgICAgIGxldCB1c2VyID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtpXS5pZCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGludm9pY2VfZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBwcCBpbiBpbnZvaWNlX2RhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2VfZGF0YVtwcF0uaWQgPSBwcDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaW52b2ljZV9kYXRhW3BwXS5wYWlkKSBpbnZvaWNlX2RhdGFbcHBdLnBhaWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIHh4ID0gMDsgaW52b2ljZV9kYXRhW3BwXS5zaGlmdF9pZHMubGVuZ3RoID4geHg7IHh4KyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PSBpbnZvaWNlX2RhdGFbcHBdLnNoaWZ0X2lkc1t4eF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy90aGlzIHNoaWZ0IGV4aXN0cyBpbiBhbiBpbnZvaWNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGFbaV0uaW52b2ljZWQpIGRhdGFbaV0uaW52b2ljZWQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGludm9pY2VkT2JqID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJpbnZvaWNlX2lkXCI6IGludm9pY2VfZGF0YVtwcF0uaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImZhbWlseV9uYW1lXCI6IHVzZXIuZmFtaWxpZXNbaW52b2ljZV9kYXRhW3BwXS5mYW1pbHlfaWRdLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImZhbWlseV9pZFwiOiBpbnZvaWNlX2RhdGFbcHBdLmZhbWlseV9pZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFbaV0uaW52b2ljZWQucHVzaChpbnZvaWNlZE9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoaW52b2ljZV9kYXRhKSBhcHBTZXR0aW5ncy5zZXRTdHJpbmcoJ2ludm9pY2VzJywgSlNPTi5zdHJpbmdpZnkoaW52b2ljZV9kYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhKSBhcHBTZXR0aW5ncy5zZXRTdHJpbmcoJ3NoaWZ0cycsIEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpOyAgICBcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIFxuICAgICAgICB9KVxuICAgICAgICBcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0SW52b2ljZXMobGltaXQ/LCBmb3JjZUdldD8pIHtcbiAgICAgICAgbGV0IHVpZCA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1aWQnKSk7XG5cbiAgICAgICAgbGV0IG9wdGlvbnM6YW55ID0ge1xuICAgICAgICAgICAgc2luZ2xlRXZlbnQ6IHRydWUsXG4gICAgICAgICAgICBvcmRlckJ5OiB7XG4gICAgICAgICAgICAgICAgdHlwZTogZmlyZWJhc2UuUXVlcnlPcmRlckJ5VHlwZS5DSElMRCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogJ2RhdGVfY3JlYXRlZCdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobGltaXQpIHtcbiAgICAgICAgICAgIG9wdGlvbnMubGltaXQgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogZmlyZWJhc2UuUXVlcnlMaW1pdFR5cGUuTEFTVCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogbGltaXRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSAmJiAhZm9yY2VHZXQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncmV0dXJuaW5nIGNhY2hlZCBpbnZvaWNlcycpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2dldHRpbmcgZnJlc2ggaW52b2ljZXMnKTtcbiAgICAgICAgICAgICAgICBmaXJlYmFzZS5xdWVyeShxdWVyeVJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChxdWVyeVJlc3VsdC52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShxdWVyeVJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sICcvaW52b2ljZXMvJyArIHVpZCwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcblxuICAgICAgICB9KVxuICAgICAgICBcbiAgICB9XG5cbiAgICBwdWJsaWMgY3JlYXRlSW52b2ljZShhcmdzKSB7XG4gICAgICAgIGxldCB1aWQgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgICAgIGZpcmViYXNlLnB1c2goJy9pbnZvaWNlcy8nICsgdWlkLCBhcmdzKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5kaXIocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkQXBwRGF0YSh0cnVlKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgIH1cblxuICAgICBwdWJsaWMgdXBkYXRlSW52b2ljZShpZCwgZGF0YSkge1xuICAgICAgICBsZXQgdWlkID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VpZCcpKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsgXG4gICAgICAgICAgICBpZiAodWlkKSB7XG4gICAgICAgICAgICAgICAgZmlyZWJhc2UudXBkYXRlKCcvaW52b2ljZXMvJyArIHVpZCArICcvJyArIGlkLCBkYXRhKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRBcHBEYXRhKHRydWUpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ0NvdWxkblxcJ3QgZmluZCB0aGUgdXNlciByZWNvcmQgSUQuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGRlbGV0ZVNoaWZ0KGlkKSB7XG4gICAgICAgIGxldCB1aWQgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgICAgIGlmICh1aWQpIHtcbiAgICAgICAgICAgICAgICBmaXJlYmFzZS5yZW1vdmUoJy9zaGlmdHMvJyArIHVpZCArICcvJyArIGlkKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGxldCBzaGlmdHMgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpO1xuICAgICAgICAgICAgICAgICAgICAvLyBkZWxldGUgc2hpZnRzW2lkXTtcbiAgICAgICAgICAgICAgICAgICAgLy8gYXBwU2V0dGluZ3Muc2V0U3RyaW5nKCdzaGlmdHMnLCBKU09OLnN0cmluZ2lmeShzaGlmdHMpKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVzb2x2ZShyZXN1bHQpO1xuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRBcHBEYXRhKHRydWUpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ0NvdWxkblxcJ3QgZmluZCB0aGUgdXNlciByZWNvcmQgSUQuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGRlbGV0ZUludm9pY2UoaWQpIHtcbiAgICAgICAgbGV0IHVpZCA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1aWQnKSk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICAgICAgaWYgKHVpZCkge1xuICAgICAgICAgICAgICAgIGZpcmViYXNlLnJlbW92ZSgnL2ludm9pY2VzLycgKyB1aWQgKyAnLycgKyBpZCkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkQXBwRGF0YSh0cnVlKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdDb3VsZG5cXCd0IGZpbmQgdGhlIHVzZXIgcmVjb3JkIElELicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyB1cGRhdGVTaGlmdChpZCwgZGF0YSkge1xuICAgICAgICBsZXQgdWlkID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VpZCcpKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsgXG4gICAgICAgICAgICBpZiAodWlkKSB7XG4gICAgICAgICAgICAgICAgZmlyZWJhc2UudXBkYXRlKCcvc2hpZnRzLycgKyB1aWQgKyAnLycgKyBpZCwgZGF0YSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBsZXQgc2hpZnRzID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gZGF0YS5yZWNlbnRseVVwZGF0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAvLyBmb3IgKGxldCBpIGluIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIHNoaWZ0c1tpZF1baV0gPSBkYXRhW2ldO1xuICAgICAgICAgICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAgICAgICAgIC8vIGFwcFNldHRpbmdzLnNldFN0cmluZygnc2hpZnRzJywgSlNPTi5zdHJpbmdpZnkoc2hpZnRzKSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idWlsZEFwcERhdGEodHJ1ZSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnQ291bGRuXFwndCBmaW5kIHRoZSB1c2VyIHJlY29yZCBJRC4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgYWRkU2hpZnQoZGF0YSkge1xuICAgICAgICBsZXQgdWlkID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VpZCcpKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsgXG4gICAgICAgICAgICBmaXJlYmFzZS5wdXNoKCcvc2hpZnRzLycgKyB1aWQsIGRhdGEpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmRpcihyZXN1bHQpO1xuICAgICAgICAgICAgICAgIC8vIGRhdGEuaWQgPSByZXN1bHQua2V5O1xuICAgICAgICAgICAgICAgIC8vIGxldCBzaGlmdCA9IHRoaXMuYnVpbGRTaGlmdERhdGEoZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgbGV0IHNoaWZ0cyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSk7XG4gICAgICAgICAgICAgICAgLy8gICAgIHNoaWZ0c1tyZXN1bHQua2V5XSA9IHNoaWZ0O1xuICAgICAgICAgICAgICAgIC8vICAgICBhcHBTZXR0aW5ncy5zZXRTdHJpbmcoJ3NoaWZ0cycsIEpTT04uc3RyaW5naWZ5KHNoaWZ0cykpO1xuICAgICAgICAgICAgICAgIC8vIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIGxldCBzaGlmdHM6YW55ID0ge31cbiAgICAgICAgICAgICAgICAvLyAgICAgc2hpZnRzW3Jlc3VsdC5rZXldID0gc2hpZnQ7XG4gICAgICAgICAgICAgICAgLy8gICAgIGFwcFNldHRpbmdzLnNldFN0cmluZygnc2hpZnRzJywgSlNPTi5zdHJpbmdpZnkoc2hpZnRzKSk7XG4gICAgICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgICAgIC8vIHJlc29sdmUoc2hpZnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRBcHBEYXRhKHRydWUpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBjYWxjdWxhdGVTaGlmdEhvdXJzV29ya2VkKHN0YXJ0X3RpbWUsIGVuZF90aW1lPywgbWludXRlc1dvcmtlZD8pIHtcbiAgICAgICAgaWYgKCFtaW51dGVzV29ya2VkKSB7XG4gICAgICAgICAgICB2YXIgY29tcGFyZUEgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIGlmIChlbmRfdGltZSkgY29tcGFyZUEgPSBtb21lbnQoZW5kX3RpbWUpO1xuICAgICAgICAgICAgbWludXRlc1dvcmtlZCA9IGNvbXBhcmVBLmRpZmYobW9tZW50KHN0YXJ0X3RpbWUpLCAnbWludXRlcycpXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBsZXQgaG91cnNXb3JrZWQgPSBwYXJzZUZsb2F0KChtaW51dGVzV29ya2VkLzYwKS50b0ZpeGVkKDIpKTtcbiAgICAgICAgbGV0IHRpbWVXb3JrZWQ7XG4gICAgICAgIGlmIChtaW51dGVzV29ya2VkLzYwIDwgMSkge1xuICAgICAgICAgICAgdGltZVdvcmtlZCA9IG1pbnV0ZXNXb3JrZWQgKyAnIE1JTlVURVMnO1xuICAgICAgICB9IGVsc2UgaWYgKChob3Vyc1dvcmtlZCkgJSAxID09PSAwKSB7XG4gICAgICAgICAgICB0aW1lV29ya2VkID0gTWF0aC5mbG9vcihob3Vyc1dvcmtlZCkgKyAnIEhPVVJTJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBtaW51dGVzT25Ib3VyID0gbWludXRlc1dvcmtlZCAtIChNYXRoLmZsb29yKG1pbnV0ZXNXb3JrZWQvNjApICogNjApO1xuICAgICAgICAgICAgdGltZVdvcmtlZCA9IE1hdGguZmxvb3IoaG91cnNXb3JrZWQpICsgJyBIT1VSJyArIChNYXRoLmZsb29yKGhvdXJzV29ya2VkKSA9PSAxID8gJycgOiAnUycpICsgJyAnICsgbWludXRlc09uSG91ciArICcgTUlOVVRFJyArIChtaW51dGVzT25Ib3VyID09IDEgPyAnJyA6ICdTJyk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHJ0biA9IHtcbiAgICAgICAgICAgIG1pbnV0ZXNfd29ya2VkOiBtaW51dGVzV29ya2VkLFxuICAgICAgICAgICAgaG91cnNfd29ya2VkOiBob3Vyc1dvcmtlZCxcbiAgICAgICAgICAgIHRpbWVfd29ya2VkOiB0aW1lV29ya2VkXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJ0bjtcbiAgICB9XG5cbiAgICBwdWJsaWMgY2FsY3VsYXRlU2hpZnRFYXJuZWQobWludXRlc193b3JrZWQsIHByZXZpb3VzV2Vla01pbnV0ZXMpIHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ01pbnV0ZXMgd29ya2VkOiAnICsgbWludXRlc193b3JrZWQpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnUHJldmlvdXMgd2VlayBtaW51dGVzIHdvcmtlZDogJyArIHByZXZpb3VzV2Vla01pbnV0ZXMpO1xuICAgICAgICBsZXQgdXNlcjogVXNlciA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1c2VyRGF0YScpKTtcbiAgICAgICAgbGV0IG1pbnV0ZVJhdGUgPSBwYXJzZUZsb2F0KHVzZXIuaG91cmx5UmF0ZSkvNjA7XG4gICAgICAgIGxldCBvdmVydGltZU1pbnV0ZVJhdGUgPSBwYXJzZUZsb2F0KHVzZXIub3ZlcnRpbWVSYXRlKS82MDtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ3ByZXZpb3VzTWludXRlczogJyArIHByZXZpb3VzV2Vla01pbnV0ZXMpXG4gICAgICAgIGxldCBvdmVydGltZV9lYXJuZWQsIG92ZXJ0aW1lX21pbnV0ZXMsIHJlZ3VsYXJfZWFybmVkLCByZWd1bGFyX21pbnV0ZXMsIHRvdGFsX2Vhcm5lZDtcbiAgICAgICAgaWYgKHByZXZpb3VzV2Vla01pbnV0ZXMgPj0gMjQwMCkge1xuICAgICAgICAgICAgb3ZlcnRpbWVfZWFybmVkID0gbWludXRlc193b3JrZWQgKiBvdmVydGltZU1pbnV0ZVJhdGU7XG4gICAgICAgICAgICBvdmVydGltZV9taW51dGVzID0gbWludXRlc193b3JrZWQ7XG4gICAgICAgICAgICByZWd1bGFyX2Vhcm5lZCA9IDA7XG4gICAgICAgICAgICByZWd1bGFyX21pbnV0ZXMgPSAwO1xuICAgICAgICAgICAgdG90YWxfZWFybmVkID0gbWludXRlc193b3JrZWQgKiBvdmVydGltZU1pbnV0ZVJhdGU7XG4gICAgICAgIH0gZWxzZSBpZiAocHJldmlvdXNXZWVrTWludXRlcyArIG1pbnV0ZXNfd29ya2VkID4gMjQwMCkge1xuICAgICAgICAgICAgb3ZlcnRpbWVfZWFybmVkID0gKChwcmV2aW91c1dlZWtNaW51dGVzICsgbWludXRlc193b3JrZWQpIC0gMjQwMCkqb3ZlcnRpbWVNaW51dGVSYXRlO1xuICAgICAgICAgICAgb3ZlcnRpbWVfbWludXRlcyA9IChwcmV2aW91c1dlZWtNaW51dGVzICsgbWludXRlc193b3JrZWQpIC0gMjQwMDtcbiAgICAgICAgICAgIHJlZ3VsYXJfZWFybmVkID0gKG1pbnV0ZXNfd29ya2VkIC0gb3ZlcnRpbWVfbWludXRlcykqbWludXRlUmF0ZTtcbiAgICAgICAgICAgIHJlZ3VsYXJfbWludXRlcyA9IG1pbnV0ZXNfd29ya2VkIC0gb3ZlcnRpbWVfbWludXRlcztcbiAgICAgICAgICAgIHRvdGFsX2Vhcm5lZCA9IG92ZXJ0aW1lX2Vhcm5lZCArIHJlZ3VsYXJfZWFybmVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3ZlcnRpbWVfZWFybmVkID0gMDtcbiAgICAgICAgICAgIG92ZXJ0aW1lX21pbnV0ZXMgPSAwO1xuICAgICAgICAgICAgcmVndWxhcl9lYXJuZWQgPSBtaW51dGVSYXRlICogbWludXRlc193b3JrZWQ7XG4gICAgICAgICAgICByZWd1bGFyX21pbnV0ZXMgPSBtaW51dGVzX3dvcmtlZDtcbiAgICAgICAgICAgIHRvdGFsX2Vhcm5lZCA9IG1pbnV0ZVJhdGUgKiBtaW51dGVzX3dvcmtlZDtcbiAgICAgICAgfVxuICAgICAgICAvLyBjb25zb2xlLmxvZygnUmVndWxhciBlYXJuZWQ6ICcgKyByZWd1bGFyX2Vhcm5lZC50b0ZpeGVkKDIpKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ1JlZ3VsYXIgbWludXRlczogJyArIHJlZ3VsYXJfbWludXRlcyk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdPdmVydGltZSBlYXJuZWQ6ICcgKyBvdmVydGltZV9lYXJuZWQudG9GaXhlZCgyKSk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdPdmVydGltZSBtaW51dGVzOiAnICsgb3ZlcnRpbWVfbWludXRlcyk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdUb3RhbCBlYXJuZWQ6ICcgKyB0b3RhbF9lYXJuZWQudG9GaXhlZCgyKSk7XG4gICAgICAgIGxldCBydG4gPSB7XG4gICAgICAgICAgICByZWd1bGFyX2Vhcm5lZDogcmVndWxhcl9lYXJuZWQudG9GaXhlZCgyKSxcbiAgICAgICAgICAgIHJlZ3VsYXJfbWludXRlczogcmVndWxhcl9taW51dGVzLFxuICAgICAgICAgICAgb3ZlcnRpbWVfZWFybmVkOiBvdmVydGltZV9lYXJuZWQudG9GaXhlZCgyKSxcbiAgICAgICAgICAgIG92ZXJ0aW1lX21pbnV0ZXM6IG92ZXJ0aW1lX21pbnV0ZXMsXG4gICAgICAgICAgICB0b3RhbF9lYXJuZWQ6IHRvdGFsX2Vhcm5lZC50b0ZpeGVkKDIpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJ0bjtcbiAgICB9XG5cbiAgICBwdWJsaWMgYnVpbGRTaGlmdERhdGEoc2hpZnQpIHtcbiAgICAgICAgdmFyIGNvbXBhcmVBID0gbW9tZW50KCk7XG4gICAgICAgIGlmIChzaGlmdC5lbmRfdGltZSkgY29tcGFyZUEgPSBtb21lbnQoc2hpZnQuZW5kX3RpbWUpO1xuICAgICAgICB2YXIgbWludXRlc1dvcmtlZCA9IGNvbXBhcmVBLmRpZmYobW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLCAnbWludXRlcycpXG4gICAgICAgIHZhciBob3Vyc1dvcmtlZCA9IChtaW51dGVzV29ya2VkLzYwKS50b0ZpeGVkKDIpO1xuICAgICAgICBsZXQgdGltZVdvcmtlZDtcbiAgICAgICAgaWYgKG1pbnV0ZXNXb3JrZWQvNjAgPCAxKSB7XG4gICAgICAgICAgICB0aW1lV29ya2VkID0gbWludXRlc1dvcmtlZCArICcgTUlOVVRFUyc7XG4gICAgICAgIH0gZWxzZSBpZiAoKHBhcnNlRmxvYXQoaG91cnNXb3JrZWQpKSAlIDEgPT09IDApIHtcbiAgICAgICAgICAgIHRpbWVXb3JrZWQgPSBob3Vyc1dvcmtlZCArICcgSE9VUlMnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IG1pbnV0ZXNPbkhvdXIgPSBtaW51dGVzV29ya2VkIC0gKE1hdGguZmxvb3IobWludXRlc1dvcmtlZC82MCkgKiA2MCk7XG4gICAgICAgICAgICB0aW1lV29ya2VkID0gTWF0aC5mbG9vcihwYXJzZUZsb2F0KGhvdXJzV29ya2VkKSkgKyAnIEhPVVJTICcgKyBtaW51dGVzT25Ib3VyICsgJyBNSU5VVEUnICsgKG1pbnV0ZXNPbkhvdXIgPT0gMSA/ICcnIDogJ1MnKTtcbiAgICAgICAgfVxuICAgICAgICBzaGlmdC5taW51dGVzX3dvcmtlZCA9IG1pbnV0ZXNXb3JrZWQ7XG4gICAgICAgIHNoaWZ0LmhvdXJzX3dvcmtlZCA9IGhvdXJzV29ya2VkO1xuICAgICAgICBzaGlmdC50aW1lX3dvcmtlZCA9IHRpbWVXb3JrZWQ7XG4gICAgICAgIHNoaWZ0LnRpdGxlID0gbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnZGRkIE1NTSBEbycpXG4gICAgICAgIHNoaWZ0LmRpc3BsYXlfc3RhcnQgPSBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdoOm1tYScpO1xuICAgICAgICBzaGlmdC5kaXNwbGF5X2VuZCA9IG1vbWVudChzaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdoOm1tYScpO1xuXG4gICAgICAgIHNoaWZ0LmRpc3BsYXlfaG91cnMgPSBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdoOm1tYScpICsgJyB0byAnICsgbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ2g6bW1hJyk7XG4gICAgICAgIGlmIChtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdZWVlZTU1ERCcpIDwgbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ1lZWVlNTUREJykpIHtcbiAgICAgICAgICAgIHNoaWZ0LmRpc3BsYXlfaG91cnMgPSBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdoOm1tYScpICsgJyB0byAnICsgbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ01NTSBERCBbYXRdIGg6bW1hJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzaGlmdC5lbmRfdGltZSkgc2hpZnQuZGlzcGxheV9ob3VycyA9IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2g6bW1hJykgKyAnIChJbiBwcm9ncmVzcyknXG4gICAgICAgIGlmICghc2hpZnQuZW5kX3RpbWUpIHNoaWZ0LmVuZF90aW1lID0gZmFsc2U7XG5cbiAgICAgICAgc2hpZnQuZGlzcGxheV9kYXRlID0gbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnZGRkZCBNTU0gREQsIFlZWVknKTtcbiAgICAgICAgc2hpZnQuZGlzcGxheV90aW1pbmcgPSBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdoOm1tYScpICsgJyB0byAnICsgbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ2g6bW1hJyk7XG4gICAgICAgIGlmIChtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdZWVlZTU1ERCcpIDwgbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ1lZWVlNTUREJykpIHtcbiAgICAgICAgICAgIHNoaWZ0LmRpc3BsYXlfdGltaW5nID0gbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnaDptbWEnKSArICcgdG8gJyArIG1vbWVudChzaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdNTU0gREQgW2F0XSBoOm1tYScpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghc2hpZnQuZW5kX3RpbWUpIHtcbiAgICAgICAgICAgIHNoaWZ0LmRpc3BsYXlfZGF0ZSA9IHNoaWZ0LmRpc3BsYXlfZGF0ZSA9IG1vbWVudCgpLmZvcm1hdCgnW1RPREFZXSBNTU0gREQsIFlZWVknKTtcblxuICAgICAgICAgICAgc2hpZnQuZGlzcGxheV90aW1pbmcgPSAnU2hpZnQgc3RhcnRlZCBhdCAnICsgbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnaDptbWEnKTtcbiAgICAgICAgICAgIGlmIChtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdZWVlZTU1ERCcpIDwgbW9tZW50KCkuZm9ybWF0KCdZWVlZTU1ERCcpKSB7XG4gICAgICAgICAgICAgICAgc2hpZnQuZGlzcGxheV90aW1pbmcgPSAnU2hpZnQgc3RhcnRlZCBvbiAnICsgbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnTU1NIEREIFthdF0gaDptbWEnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsZXQgdXNlciA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1c2VyRGF0YScpKTtcbiAgICAgICAgbGV0IGludm9pY2VkRmFtaWx5TWFwID0ge307XG4gICAgICAgIGlmIChzaGlmdC5pbnZvaWNlZCAmJiBzaGlmdC5pbnZvaWNlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHNoaWZ0Lmludm9pY2VkX2ZhbWlsaWVzX3N0cmluZyA9ICcnO1xuICAgICAgICAgICAgZm9yICh2YXIgeCA9IDA7IHNoaWZ0Lmludm9pY2VkLmxlbmd0aCA+IHg7IHgrKykge1xuICAgICAgICAgICAgICAgIGludm9pY2VkRmFtaWx5TWFwW3NoaWZ0Lmludm9pY2VkW3hdLmZhbWlseV9pZF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmICh4ID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc2hpZnQuaW52b2ljZWRfZmFtaWxpZXNfc3RyaW5nICs9IHNoaWZ0Lmludm9pY2VkW3hdLmZhbWlseV9uYW1lXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2hpZnQuaW52b2ljZWRfZmFtaWxpZXNfc3RyaW5nICs9ICcsICcgKyBzaGlmdC5pbnZvaWNlZFt4XS5mYW1pbHlfbmFtZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBoYXNVbmludm9pY2VkRmFtaWxpZXMgPSBmYWxzZTtcbiAgICAgICAgbGV0IHVuaW52b2ljZWRGYW1pbGllc1RleHQgPSAnJztcbiAgICAgICAgbGV0IGNvdW50ID0gMDtcblxuICAgICAgICBmb3IgKHZhciB6IGluIHVzZXIuZmFtaWxpZXMpIHtcbiAgICAgICAgICAgIGlmICghdXNlci5mYW1pbGllc1t6XS5kZWxldGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpbnZvaWNlZEZhbWlseU1hcFt6XSAmJiBzaGlmdC5jb250cmlidXRpb25zICYmIHNoaWZ0LmNvbnRyaWJ1dGlvbnNbel0gJiYgc2hpZnQuY29udHJpYnV0aW9uc1t6XSAhPSAwICYmIHNoaWZ0LmNvbnRyaWJ1dGlvbnNbel0gIT0gJzAnICYmIHNoaWZ0LmNvbnRyaWJ1dGlvbnNbel0gIT0gJzAuMDAnKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhc1VuaW52b2ljZWRGYW1pbGllcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb3VudCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1bmludm9pY2VkRmFtaWxpZXNUZXh0ICs9IHVzZXIuZmFtaWxpZXNbel0ubmFtZVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdW5pbnZvaWNlZEZhbWlsaWVzVGV4dCArPSAnLCAnICsgdXNlci5mYW1pbGllc1t6XS5uYW1lXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGFzVW5pbnZvaWNlZEZhbWlsaWVzKSBzaGlmdC51bmludm9pY2VkX2ZhbWlsaWVzX3N0cmluZyA9IHVuaW52b2ljZWRGYW1pbGllc1RleHQ7XG4gICAgICAgIFxuXG5cbiAgICAgICAgcmV0dXJuIHNoaWZ0O1xuICAgIH1cbn0iXX0=