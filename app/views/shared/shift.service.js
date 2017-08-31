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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hpZnQuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNoaWZ0LnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1REFBeUQ7QUFDekQsa0RBQW9EO0FBQ3BELCtCQUFpQztBQVVqQztJQUFBO0lBb1hBLENBQUM7SUFsWFUsaUNBQVUsR0FBakIsVUFBa0IsSUFBSTtRQUF0QixpQkFtQkM7UUFsQkcsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU07WUFDL0IsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07Z0JBQzdDLElBQUksQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztnQkFDckIsSUFBSSxLQUFLLEdBQUcsS0FBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFdEMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2xDLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO29CQUN6RCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQztvQkFDM0IsV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUM1RCxDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLElBQUksTUFBTSxHQUFPLEVBQUUsQ0FBQTtvQkFDbkIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxH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QyxxQkFBcUIsQ0FBQztZQUFDLEtBQUssQ0FBQywwQkFBMEIsR0FBRyxzQkFBc0IsQ0FBQztRQUlyRixNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2pCLENBQUM7SUFDTCxtQkFBQztBQUFELENBQUMsQUFwWEQsSUFvWEM7QUFwWFksb0NBQVkiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmaXJlYmFzZSBmcm9tICduYXRpdmVzY3JpcHQtcGx1Z2luLWZpcmViYXNlJztcbmltcG9ydCAqIGFzIGFwcFNldHRpbmdzIGZyb20gJ2FwcGxpY2F0aW9uLXNldHRpbmdzJztcbmltcG9ydCAqIGFzIG1vbWVudCBmcm9tICdtb21lbnQnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFVzZXIge1xuICAgIGhvdXJseVJhdGU6IHN0cmluZyxcbiAgICBvdmVydGltZVJhdGU6IHN0cmluZyxcbiAgICB1aWQ6IHN0cmluZyxcbiAgICBkYXRlX2NyZWF0ZWQ6IHN0cmluZyxcbiAgICBlbWFpbDogc3RyaW5nXG59XG5cbmV4cG9ydCBjbGFzcyBTaGlmdFNlcnZpY2Uge1xuXG4gICAgcHVibGljIHN0YXJ0U2hpZnQoZGF0YSkge1xuICAgICAgICBsZXQgdWlkID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VpZCcpKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsgXG4gICAgICAgICAgICBmaXJlYmFzZS5wdXNoKCcvc2hpZnRzLycgKyB1aWQsIGRhdGEpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICBkYXRhLmlkID0gcmVzdWx0LmtleTtcbiAgICAgICAgICAgICAgICBsZXQgc2hpZnQgPSB0aGlzLmJ1aWxkU2hpZnREYXRhKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBzaGlmdHMgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpO1xuICAgICAgICAgICAgICAgICAgICBzaGlmdHNbcmVzdWx0LmtleV0gPSBzaGlmdDtcbiAgICAgICAgICAgICAgICAgICAgYXBwU2V0dGluZ3Muc2V0U3RyaW5nKCdzaGlmdHMnLCBKU09OLnN0cmluZ2lmeShzaGlmdHMpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgc2hpZnRzOmFueSA9IHt9XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0c1tyZXN1bHQua2V5XSA9IHNoaWZ0O1xuICAgICAgICAgICAgICAgICAgICBhcHBTZXR0aW5ncy5zZXRTdHJpbmcoJ3NoaWZ0cycsIEpTT04uc3RyaW5naWZ5KHNoaWZ0cykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHNoaWZ0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBnZXRTaGlmdHMobGltaXQ/LCBmb3JjZUdldD8pIHtcbiAgICAgICAgbGV0IHVpZCA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1aWQnKSk7XG5cbiAgICAgICAgbGV0IG9wdGlvbnM6YW55ID0ge1xuICAgICAgICAgICAgc2luZ2xlRXZlbnQ6IHRydWUsXG4gICAgICAgICAgICBvcmRlckJ5OiB7XG4gICAgICAgICAgICAgICAgdHlwZTogZmlyZWJhc2UuUXVlcnlPcmRlckJ5VHlwZS5DSElMRCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogJ3N0YXJ0X2RhdGUnXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxpbWl0KSB7XG4gICAgICAgICAgICBvcHRpb25zLmxpbWl0ID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IGZpcmViYXNlLlF1ZXJ5TGltaXRUeXBlLkxBU1QsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGxpbWl0XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8VXNlcj4oKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgICAgIGlmIChhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpICYmICFmb3JjZUdldCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZXR1cm5pbmcgY2FjaGVkIHNoaWZ0cycpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdnZXR0aW5nIGZyZXNoIHNoaWZ0cycpO1xuICAgICAgICAgICAgICAgIGZpcmViYXNlLnF1ZXJ5KFxuICAgICAgICAgICAgICAgICAgICBxdWVyeVJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocXVlcnlSZXN1bHQudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHF1ZXJ5UmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAgICAgICcvc2hpZnRzLycgKyB1aWQsIFxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGJ1aWxkQXBwRGF0YShmb3JjZUdldD8pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPFVzZXI+KChyZXNvbHZlLCByZWplY3QpID0+IHsgXG4gICAgICAgICAgICB0aGlzLmdldEludm9pY2VzKGZhbHNlLCBmb3JjZUdldCkudGhlbihpbnZvaWNlX2RhdGEgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2V0U2hpZnRzKGZhbHNlLCBmb3JjZUdldCkudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHVzZXIgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndXNlckRhdGEnKSk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgaW4gZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtpXS5pZCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBwcCBpbiBpbnZvaWNlX2RhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlX2RhdGFbcHBdLmlkID0gcHA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgeHggPSAwOyBpbnZvaWNlX2RhdGFbcHBdLnNoaWZ0X2lkcy5sZW5ndGggPiB4eDsgeHgrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PSBpbnZvaWNlX2RhdGFbcHBdLnNoaWZ0X2lkc1t4eF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vdGhpcyBzaGlmdCBleGlzdHMgaW4gYW4gaW52b2ljZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YVtpXS5pbnZvaWNlZCkgZGF0YVtpXS5pbnZvaWNlZCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGludm9pY2VkT2JqID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiaW52b2ljZV9pZFwiOiBpbnZvaWNlX2RhdGFbcHBdLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZmFtaWx5X25hbWVcIjogdXNlci5mYW1pbGllc1tpbnZvaWNlX2RhdGFbcHBdLmZhbWlseV9pZF0ubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImZhbWlseV9pZFwiOiBpbnZvaWNlX2RhdGFbcHBdLmZhbWlseV9pZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtpXS5pbnZvaWNlZC5wdXNoKGludm9pY2VkT2JqKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhcHBTZXR0aW5ncy5zZXRTdHJpbmcoJ2ludm9pY2VzJywgSlNPTi5zdHJpbmdpZnkoaW52b2ljZV9kYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgIGFwcFNldHRpbmdzLnNldFN0cmluZygnc2hpZnRzJywgSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7ICAgIFxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgXG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgIH1cblxuICAgIHB1YmxpYyBnZXRJbnZvaWNlcyhsaW1pdD8sIGZvcmNlR2V0Pykge1xuICAgICAgICBsZXQgdWlkID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VpZCcpKTtcblxuICAgICAgICBsZXQgb3B0aW9uczphbnkgPSB7XG4gICAgICAgICAgICBzaW5nbGVFdmVudDogdHJ1ZSxcbiAgICAgICAgICAgIG9yZGVyQnk6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBmaXJlYmFzZS5RdWVyeU9yZGVyQnlUeXBlLkNISUxELFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnZGF0ZV9jcmVhdGVkJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChsaW1pdCkge1xuICAgICAgICAgICAgb3B0aW9ucy5saW1pdCA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBmaXJlYmFzZS5RdWVyeUxpbWl0VHlwZS5MQVNULFxuICAgICAgICAgICAgICAgIHZhbHVlOiBsaW1pdFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPFVzZXI+KChyZXNvbHZlLCByZWplY3QpID0+IHsgXG4gICAgICAgICAgICBpZiAoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpICYmICFmb3JjZUdldCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZXR1cm5pbmcgY2FjaGVkIGludm9pY2VzJyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZ2V0dGluZyBmcmVzaCBpbnZvaWNlcycpO1xuICAgICAgICAgICAgICAgIGZpcmViYXNlLnF1ZXJ5KHF1ZXJ5UmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHF1ZXJ5UmVzdWx0LnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHF1ZXJ5UmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sICcvaW52b2ljZXMvJyArIHVpZCwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcblxuICAgICAgICB9KVxuICAgICAgICBcbiAgICB9XG5cbiAgICBwdWJsaWMgY3JlYXRlSW52b2ljZShhcmdzKSB7XG4gICAgICAgIGxldCB1aWQgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgICAgIGZpcmViYXNlLnB1c2goJy9pbnZvaWNlcy8nICsgdWlkLCBhcmdzKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5kaXIocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkQXBwRGF0YSh0cnVlKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgIH1cblxuICAgICBwdWJsaWMgdXBkYXRlSW52b2ljZShpZCwgZGF0YSkge1xuICAgICAgICBsZXQgdWlkID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VpZCcpKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsgXG4gICAgICAgICAgICBpZiAodWlkKSB7XG4gICAgICAgICAgICAgICAgZmlyZWJhc2UudXBkYXRlKCcvaW52b2ljZXMvJyArIHVpZCArICcvJyArIGlkLCBkYXRhKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRBcHBEYXRhKHRydWUpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ0NvdWxkblxcJ3QgZmluZCB0aGUgdXNlciByZWNvcmQgSUQuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGRlbGV0ZVNoaWZ0KGlkKSB7XG4gICAgICAgIGxldCB1aWQgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgICAgIGlmICh1aWQpIHtcbiAgICAgICAgICAgICAgICBmaXJlYmFzZS5yZW1vdmUoJy9zaGlmdHMvJyArIHVpZCArICcvJyArIGlkKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGxldCBzaGlmdHMgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpO1xuICAgICAgICAgICAgICAgICAgICAvLyBkZWxldGUgc2hpZnRzW2lkXTtcbiAgICAgICAgICAgICAgICAgICAgLy8gYXBwU2V0dGluZ3Muc2V0U3RyaW5nKCdzaGlmdHMnLCBKU09OLnN0cmluZ2lmeShzaGlmdHMpKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVzb2x2ZShyZXN1bHQpO1xuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRBcHBEYXRhKHRydWUpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ0NvdWxkblxcJ3QgZmluZCB0aGUgdXNlciByZWNvcmQgSUQuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIHVwZGF0ZVNoaWZ0KGlkLCBkYXRhKSB7XG4gICAgICAgIGxldCB1aWQgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgICAgIGlmICh1aWQpIHtcbiAgICAgICAgICAgICAgICBmaXJlYmFzZS51cGRhdGUoJy9zaGlmdHMvJyArIHVpZCArICcvJyArIGlkLCBkYXRhKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGxldCBzaGlmdHMgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpO1xuICAgICAgICAgICAgICAgICAgICAvLyBkYXRhLnJlY2VudGx5VXBkYXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIC8vIGZvciAobGV0IGkgaW4gZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyAgICAgc2hpZnRzW2lkXVtpXSA9IGRhdGFbaV07XG4gICAgICAgICAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gYXBwU2V0dGluZ3Muc2V0U3RyaW5nKCdzaGlmdHMnLCBKU09OLnN0cmluZ2lmeShzaGlmdHMpKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkQXBwRGF0YSh0cnVlKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdDb3VsZG5cXCd0IGZpbmQgdGhlIHVzZXIgcmVjb3JkIElELicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBhZGRTaGlmdChkYXRhKSB7XG4gICAgICAgIGxldCB1aWQgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgICAgIGZpcmViYXNlLnB1c2goJy9zaGlmdHMvJyArIHVpZCwgZGF0YSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZGlyKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgLy8gZGF0YS5pZCA9IHJlc3VsdC5rZXk7XG4gICAgICAgICAgICAgICAgLy8gbGV0IHNoaWZ0ID0gdGhpcy5idWlsZFNoaWZ0RGF0YShkYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBpZiAoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSkge1xuICAgICAgICAgICAgICAgIC8vICAgICBsZXQgc2hpZnRzID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKTtcbiAgICAgICAgICAgICAgICAvLyAgICAgc2hpZnRzW3Jlc3VsdC5rZXldID0gc2hpZnQ7XG4gICAgICAgICAgICAgICAgLy8gICAgIGFwcFNldHRpbmdzLnNldFN0cmluZygnc2hpZnRzJywgSlNPTi5zdHJpbmdpZnkoc2hpZnRzKSk7XG4gICAgICAgICAgICAgICAgLy8gfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgbGV0IHNoaWZ0czphbnkgPSB7fVxuICAgICAgICAgICAgICAgIC8vICAgICBzaGlmdHNbcmVzdWx0LmtleV0gPSBzaGlmdDtcbiAgICAgICAgICAgICAgICAvLyAgICAgYXBwU2V0dGluZ3Muc2V0U3RyaW5nKCdzaGlmdHMnLCBKU09OLnN0cmluZ2lmeShzaGlmdHMpKTtcbiAgICAgICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAgICAgLy8gcmVzb2x2ZShzaGlmdCk7XG4gICAgICAgICAgICAgICAgdGhpcy5idWlsZEFwcERhdGEodHJ1ZSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGNhbGN1bGF0ZVNoaWZ0SG91cnNXb3JrZWQoc3RhcnRfdGltZSwgZW5kX3RpbWU/LCBtaW51dGVzV29ya2VkPykge1xuICAgICAgICBpZiAoIW1pbnV0ZXNXb3JrZWQpIHtcbiAgICAgICAgICAgIHZhciBjb21wYXJlQSA9IG1vbWVudCgpO1xuICAgICAgICAgICAgaWYgKGVuZF90aW1lKSBjb21wYXJlQSA9IG1vbWVudChlbmRfdGltZSk7XG4gICAgICAgICAgICBtaW51dGVzV29ya2VkID0gY29tcGFyZUEuZGlmZihtb21lbnQoc3RhcnRfdGltZSksICdtaW51dGVzJylcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGxldCBob3Vyc1dvcmtlZCA9IHBhcnNlRmxvYXQoKG1pbnV0ZXNXb3JrZWQvNjApLnRvRml4ZWQoMikpO1xuICAgICAgICBsZXQgdGltZVdvcmtlZDtcbiAgICAgICAgaWYgKG1pbnV0ZXNXb3JrZWQvNjAgPCAxKSB7XG4gICAgICAgICAgICB0aW1lV29ya2VkID0gbWludXRlc1dvcmtlZCArICcgTUlOVVRFUyc7XG4gICAgICAgIH0gZWxzZSBpZiAoKGhvdXJzV29ya2VkKSAlIDEgPT09IDApIHtcbiAgICAgICAgICAgIHRpbWVXb3JrZWQgPSBNYXRoLmZsb29yKGhvdXJzV29ya2VkKSArICcgSE9VUlMnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IG1pbnV0ZXNPbkhvdXIgPSBtaW51dGVzV29ya2VkIC0gKE1hdGguZmxvb3IobWludXRlc1dvcmtlZC82MCkgKiA2MCk7XG4gICAgICAgICAgICB0aW1lV29ya2VkID0gTWF0aC5mbG9vcihob3Vyc1dvcmtlZCkgKyAnIEhPVVInICsgKE1hdGguZmxvb3IoaG91cnNXb3JrZWQpID09IDEgPyAnJyA6ICdTJykgKyAnICcgKyBtaW51dGVzT25Ib3VyICsgJyBNSU5VVEUnICsgKG1pbnV0ZXNPbkhvdXIgPT0gMSA/ICcnIDogJ1MnKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcnRuID0ge1xuICAgICAgICAgICAgbWludXRlc193b3JrZWQ6IG1pbnV0ZXNXb3JrZWQsXG4gICAgICAgICAgICBob3Vyc193b3JrZWQ6IGhvdXJzV29ya2VkLFxuICAgICAgICAgICAgdGltZV93b3JrZWQ6IHRpbWVXb3JrZWRcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcnRuO1xuICAgIH1cblxuICAgIHB1YmxpYyBjYWxjdWxhdGVTaGlmdEVhcm5lZChtaW51dGVzX3dvcmtlZCwgcHJldmlvdXNXZWVrTWludXRlcykge1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnTWludXRlcyB3b3JrZWQ6ICcgKyBtaW51dGVzX3dvcmtlZCk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdQcmV2aW91cyB3ZWVrIG1pbnV0ZXMgd29ya2VkOiAnICsgcHJldmlvdXNXZWVrTWludXRlcyk7XG4gICAgICAgIGxldCB1c2VyOiBVc2VyID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpO1xuICAgICAgICBsZXQgbWludXRlUmF0ZSA9IHBhcnNlRmxvYXQodXNlci5ob3VybHlSYXRlKS82MDtcbiAgICAgICAgbGV0IG92ZXJ0aW1lTWludXRlUmF0ZSA9IHBhcnNlRmxvYXQodXNlci5vdmVydGltZVJhdGUpLzYwO1xuICAgICAgICAvLyBjb25zb2xlLmxvZygncHJldmlvdXNNaW51dGVzOiAnICsgcHJldmlvdXNXZWVrTWludXRlcylcbiAgICAgICAgbGV0IG92ZXJ0aW1lX2Vhcm5lZCwgb3ZlcnRpbWVfbWludXRlcywgcmVndWxhcl9lYXJuZWQsIHJlZ3VsYXJfbWludXRlcywgdG90YWxfZWFybmVkO1xuICAgICAgICBpZiAocHJldmlvdXNXZWVrTWludXRlcyA+PSAyNDAwKSB7XG4gICAgICAgICAgICBvdmVydGltZV9lYXJuZWQgPSBtaW51dGVzX3dvcmtlZCAqIG92ZXJ0aW1lTWludXRlUmF0ZTtcbiAgICAgICAgICAgIG92ZXJ0aW1lX21pbnV0ZXMgPSBtaW51dGVzX3dvcmtlZDtcbiAgICAgICAgICAgIHJlZ3VsYXJfZWFybmVkID0gMDtcbiAgICAgICAgICAgIHJlZ3VsYXJfbWludXRlcyA9IDA7XG4gICAgICAgICAgICB0b3RhbF9lYXJuZWQgPSBtaW51dGVzX3dvcmtlZCAqIG92ZXJ0aW1lTWludXRlUmF0ZTtcbiAgICAgICAgfSBlbHNlIGlmIChwcmV2aW91c1dlZWtNaW51dGVzICsgbWludXRlc193b3JrZWQgPiAyNDAwKSB7XG4gICAgICAgICAgICBvdmVydGltZV9lYXJuZWQgPSAoKHByZXZpb3VzV2Vla01pbnV0ZXMgKyBtaW51dGVzX3dvcmtlZCkgLSAyNDAwKSpvdmVydGltZU1pbnV0ZVJhdGU7XG4gICAgICAgICAgICBvdmVydGltZV9taW51dGVzID0gKHByZXZpb3VzV2Vla01pbnV0ZXMgKyBtaW51dGVzX3dvcmtlZCkgLSAyNDAwO1xuICAgICAgICAgICAgcmVndWxhcl9lYXJuZWQgPSAobWludXRlc193b3JrZWQgLSBvdmVydGltZV9taW51dGVzKSptaW51dGVSYXRlO1xuICAgICAgICAgICAgcmVndWxhcl9taW51dGVzID0gbWludXRlc193b3JrZWQgLSBvdmVydGltZV9taW51dGVzO1xuICAgICAgICAgICAgdG90YWxfZWFybmVkID0gb3ZlcnRpbWVfZWFybmVkICsgcmVndWxhcl9lYXJuZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdmVydGltZV9lYXJuZWQgPSAwO1xuICAgICAgICAgICAgb3ZlcnRpbWVfbWludXRlcyA9IDA7XG4gICAgICAgICAgICByZWd1bGFyX2Vhcm5lZCA9IG1pbnV0ZVJhdGUgKiBtaW51dGVzX3dvcmtlZDtcbiAgICAgICAgICAgIHJlZ3VsYXJfbWludXRlcyA9IG1pbnV0ZXNfd29ya2VkO1xuICAgICAgICAgICAgdG90YWxfZWFybmVkID0gbWludXRlUmF0ZSAqIG1pbnV0ZXNfd29ya2VkO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdSZWd1bGFyIGVhcm5lZDogJyArIHJlZ3VsYXJfZWFybmVkLnRvRml4ZWQoMikpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnUmVndWxhciBtaW51dGVzOiAnICsgcmVndWxhcl9taW51dGVzKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ092ZXJ0aW1lIGVhcm5lZDogJyArIG92ZXJ0aW1lX2Vhcm5lZC50b0ZpeGVkKDIpKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ092ZXJ0aW1lIG1pbnV0ZXM6ICcgKyBvdmVydGltZV9taW51dGVzKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ1RvdGFsIGVhcm5lZDogJyArIHRvdGFsX2Vhcm5lZC50b0ZpeGVkKDIpKTtcbiAgICAgICAgbGV0IHJ0biA9IHtcbiAgICAgICAgICAgIHJlZ3VsYXJfZWFybmVkOiByZWd1bGFyX2Vhcm5lZC50b0ZpeGVkKDIpLFxuICAgICAgICAgICAgcmVndWxhcl9taW51dGVzOiByZWd1bGFyX21pbnV0ZXMsXG4gICAgICAgICAgICBvdmVydGltZV9lYXJuZWQ6IG92ZXJ0aW1lX2Vhcm5lZC50b0ZpeGVkKDIpLFxuICAgICAgICAgICAgb3ZlcnRpbWVfbWludXRlczogb3ZlcnRpbWVfbWludXRlcyxcbiAgICAgICAgICAgIHRvdGFsX2Vhcm5lZDogdG90YWxfZWFybmVkLnRvRml4ZWQoMilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcnRuO1xuICAgIH1cblxuICAgIHB1YmxpYyBidWlsZFNoaWZ0RGF0YShzaGlmdCkge1xuICAgICAgICB2YXIgY29tcGFyZUEgPSBtb21lbnQoKTtcbiAgICAgICAgaWYgKHNoaWZ0LmVuZF90aW1lKSBjb21wYXJlQSA9IG1vbWVudChzaGlmdC5lbmRfdGltZSk7XG4gICAgICAgIHZhciBtaW51dGVzV29ya2VkID0gY29tcGFyZUEuZGlmZihtb21lbnQoc2hpZnQuc3RhcnRfdGltZSksICdtaW51dGVzJylcbiAgICAgICAgdmFyIGhvdXJzV29ya2VkID0gKG1pbnV0ZXNXb3JrZWQvNjApLnRvRml4ZWQoMik7XG4gICAgICAgIGxldCB0aW1lV29ya2VkO1xuICAgICAgICBpZiAobWludXRlc1dvcmtlZC82MCA8IDEpIHtcbiAgICAgICAgICAgIHRpbWVXb3JrZWQgPSBtaW51dGVzV29ya2VkICsgJyBNSU5VVEVTJztcbiAgICAgICAgfSBlbHNlIGlmICgocGFyc2VGbG9hdChob3Vyc1dvcmtlZCkpICUgMSA9PT0gMCkge1xuICAgICAgICAgICAgdGltZVdvcmtlZCA9IGhvdXJzV29ya2VkICsgJyBIT1VSUyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgbWludXRlc09uSG91ciA9IG1pbnV0ZXNXb3JrZWQgLSAoTWF0aC5mbG9vcihtaW51dGVzV29ya2VkLzYwKSAqIDYwKTtcbiAgICAgICAgICAgIHRpbWVXb3JrZWQgPSBNYXRoLmZsb29yKHBhcnNlRmxvYXQoaG91cnNXb3JrZWQpKSArICcgSE9VUlMgJyArIG1pbnV0ZXNPbkhvdXIgKyAnIE1JTlVURScgKyAobWludXRlc09uSG91ciA9PSAxID8gJycgOiAnUycpO1xuICAgICAgICB9XG4gICAgICAgIHNoaWZ0Lm1pbnV0ZXNfd29ya2VkID0gbWludXRlc1dvcmtlZDtcbiAgICAgICAgc2hpZnQuaG91cnNfd29ya2VkID0gaG91cnNXb3JrZWQ7XG4gICAgICAgIHNoaWZ0LnRpbWVfd29ya2VkID0gdGltZVdvcmtlZDtcbiAgICAgICAgc2hpZnQudGl0bGUgPSBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdkZGQgTU1NIERvJylcbiAgICAgICAgc2hpZnQuZGlzcGxheV9zdGFydCA9IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2g6bW1hJyk7XG4gICAgICAgIHNoaWZ0LmRpc3BsYXlfZW5kID0gbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ2g6bW1hJyk7XG5cbiAgICAgICAgc2hpZnQuZGlzcGxheV9ob3VycyA9IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2g6bW1hJykgKyAnIHRvICcgKyBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnaDptbWEnKTtcbiAgICAgICAgaWYgKG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ1lZWVlNTUREJykgPCBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnWVlZWU1NREQnKSkge1xuICAgICAgICAgICAgc2hpZnQuZGlzcGxheV9ob3VycyA9IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2g6bW1hJykgKyAnIHRvICcgKyBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnTU1NIEREIFthdF0gaDptbWEnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNoaWZ0LmVuZF90aW1lKSBzaGlmdC5kaXNwbGF5X2hvdXJzID0gbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnaDptbWEnKSArICcgKEluIHByb2dyZXNzKSdcbiAgICAgICAgaWYgKCFzaGlmdC5lbmRfdGltZSkgc2hpZnQuZW5kX3RpbWUgPSBmYWxzZTtcblxuICAgICAgICBzaGlmdC5kaXNwbGF5X2RhdGUgPSBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdkZGRkIE1NTSBERCwgWVlZWScpO1xuICAgICAgICBzaGlmdC5kaXNwbGF5X3RpbWluZyA9IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2g6bW1hJykgKyAnIHRvICcgKyBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnaDptbWEnKTtcbiAgICAgICAgaWYgKG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ1lZWVlNTUREJykgPCBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnWVlZWU1NREQnKSkge1xuICAgICAgICAgICAgc2hpZnQuZGlzcGxheV90aW1pbmcgPSBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdoOm1tYScpICsgJyB0byAnICsgbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ01NTSBERCBbYXRdIGg6bW1hJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzaGlmdC5lbmRfdGltZSkge1xuICAgICAgICAgICAgc2hpZnQuZGlzcGxheV9kYXRlID0gc2hpZnQuZGlzcGxheV9kYXRlID0gbW9tZW50KCkuZm9ybWF0KCdbVE9EQVldIE1NTSBERCwgWVlZWScpO1xuXG4gICAgICAgICAgICBzaGlmdC5kaXNwbGF5X3RpbWluZyA9ICdTaGlmdCBzdGFydGVkIGF0ICcgKyBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdoOm1tYScpO1xuICAgICAgICAgICAgaWYgKG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ1lZWVlNTUREJykgPCBtb21lbnQoKS5mb3JtYXQoJ1lZWVlNTUREJykpIHtcbiAgICAgICAgICAgICAgICBzaGlmdC5kaXNwbGF5X3RpbWluZyA9ICdTaGlmdCBzdGFydGVkIG9uICcgKyBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdNTU0gREQgW2F0XSBoOm1tYScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxldCB1c2VyID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpO1xuICAgICAgICBsZXQgaW52b2ljZWRGYW1pbHlNYXAgPSB7fTtcbiAgICAgICAgaWYgKHNoaWZ0Lmludm9pY2VkICYmIHNoaWZ0Lmludm9pY2VkLmxlbmd0aCkge1xuICAgICAgICAgICAgc2hpZnQuaW52b2ljZWRfZmFtaWxpZXNfc3RyaW5nID0gJyc7XG4gICAgICAgICAgICBmb3IgKHZhciB4ID0gMDsgc2hpZnQuaW52b2ljZWQubGVuZ3RoID4geDsgeCsrKSB7XG4gICAgICAgICAgICAgICAgaW52b2ljZWRGYW1pbHlNYXBbc2hpZnQuaW52b2ljZWRbeF0uZmFtaWx5X2lkXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKHggPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBzaGlmdC5pbnZvaWNlZF9mYW1pbGllc19zdHJpbmcgKz0gc2hpZnQuaW52b2ljZWRbeF0uZmFtaWx5X25hbWVcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzaGlmdC5pbnZvaWNlZF9mYW1pbGllc19zdHJpbmcgKz0gJywgJyArIHNoaWZ0Lmludm9pY2VkW3hdLmZhbWlseV9uYW1lXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGhhc1VuaW52b2ljZWRGYW1pbGllcyA9IGZhbHNlO1xuICAgICAgICBsZXQgdW5pbnZvaWNlZEZhbWlsaWVzVGV4dCA9ICcnO1xuICAgICAgICBsZXQgY291bnQgPSAwO1xuXG4gICAgICAgIGZvciAodmFyIHogaW4gdXNlci5mYW1pbGllcykge1xuICAgICAgICAgICAgaWYgKCF1c2VyLmZhbWlsaWVzW3pdLmRlbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWludm9pY2VkRmFtaWx5TWFwW3pdICYmIHNoaWZ0LmNvbnRyaWJ1dGlvbnMgJiYgc2hpZnQuY29udHJpYnV0aW9uc1t6XSAmJiBzaGlmdC5jb250cmlidXRpb25zW3pdICE9IDAgJiYgc2hpZnQuY29udHJpYnV0aW9uc1t6XSAhPSAnMCcgJiYgc2hpZnQuY29udHJpYnV0aW9uc1t6XSAhPSAnMC4wMCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFzVW5pbnZvaWNlZEZhbWlsaWVzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvdW50ID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuaW52b2ljZWRGYW1pbGllc1RleHQgKz0gdXNlci5mYW1pbGllc1t6XS5uYW1lXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1bmludm9pY2VkRmFtaWxpZXNUZXh0ICs9ICcsICcgKyB1c2VyLmZhbWlsaWVzW3pdLm5hbWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgICAgIGlmIChoYXNVbmludm9pY2VkRmFtaWxpZXMpIHNoaWZ0LnVuaW52b2ljZWRfZmFtaWxpZXNfc3RyaW5nID0gdW5pbnZvaWNlZEZhbWlsaWVzVGV4dDtcbiAgICAgICAgXG5cblxuICAgICAgICByZXR1cm4gc2hpZnQ7XG4gICAgfVxufSJdfQ==