import * as firebase from 'nativescript-plugin-firebase';
import * as appSettings from 'application-settings';
import * as moment from 'moment';

export interface User {
    hourlyRate: string,
    overtimeRate: string,
    uid: string,
    date_created: string,
    email: string
}

export class ShiftService {

    public startShift(data) {
        let uid = JSON.parse(appSettings.getString('uid'));
        return new Promise((resolve, reject) => { 
            firebase.push('/shifts/' + uid, data).then(result => {
                data.id = result.key;
                let shift = this.buildShiftData(data);
                
                if (appSettings.getString('shifts')) {
                    let shifts = JSON.parse(appSettings.getString('shifts'));
                    shifts[result.key] = shift;
                    appSettings.setString('shifts', JSON.stringify(shifts));
                } else {
                    let shifts:any = {}
                    shifts[result.key] = shift;
                    appSettings.setString('shifts', JSON.stringify(shifts));
                }
                resolve(shift);
            });
        })
    }

    public getShifts(limit?, forceGet?) {
        let uid = JSON.parse(appSettings.getString('uid'));

        let options:any = {
            singleEvent: true,
            orderBy: {
                type: firebase.QueryOrderByType.CHILD,
                value: 'start_date'
            }
        }
        if (limit) {
            options.limit = {
                type: firebase.QueryLimitType.LAST,
                value: limit
            }
        }

        return new Promise((resolve, reject) => { 
            if (appSettings.getString('shifts') && !forceGet) {
                console.log('returning cached shifts');
                resolve(JSON.parse(appSettings.getString('shifts')));
            } else {
                console.log('getting fresh shifts');
                firebase.query(
                    queryResult => {
                        if (queryResult.value) {
                            resolve(queryResult.value);
                        } else {
                            resolve(false);
                        }
                    }, 
                    '/shifts/' + uid, 
                    options
                );
            }
            

        })
    }

    public buildAppData(forceGet?) {
        return new Promise((resolve, reject) => { 
            this.getInvoices(false, forceGet).then(invoice_data => {
                if (!invoice_data) appSettings.remove('invoices');
                this.getShifts(false, forceGet).then(data => {
                    if (!data) appSettings.remove('shifts');
                    let user = JSON.parse(appSettings.getString('userData'));
                    if (data) {
                        for (let i in data) {
                            data[i].id = i;
                            if (invoice_data) {
                                for (let pp in invoice_data) {
                                    invoice_data[pp].id = pp;
                                    if (!invoice_data[pp].paid) invoice_data[pp].paid = false;
                                    for (var xx = 0; invoice_data[pp].shift_ids.length > xx; xx++) {
                                        if (i == invoice_data[pp].shift_ids[xx]) {
                                            //this shift exists in an invoice.
                                            if (!data[i].invoiced) data[i].invoiced = [];
                                            let invoicedObj = {
                                                "invoice_id": invoice_data[pp].id,
                                                "family_name": user.families[invoice_data[pp].family_id].name,
                                                "family_id": invoice_data[pp].family_id
                                            }
                                            data[i].invoiced.push(invoicedObj);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    if (invoice_data) appSettings.setString('invoices', JSON.stringify(invoice_data));
                    if (data) appSettings.setString('shifts', JSON.stringify(data));
                    resolve();    
                })
                
            })
            
        })
        
    }

    public getInvoices(limit?, forceGet?) {
        let uid = JSON.parse(appSettings.getString('uid'));

        let options:any = {
            singleEvent: true,
            orderBy: {
                type: firebase.QueryOrderByType.CHILD,
                value: 'date_created'
            }
        }
        if (limit) {
            options.limit = {
                type: firebase.QueryLimitType.LAST,
                value: limit
            }
        }

        return new Promise((resolve, reject) => { 
            if (appSettings.getString('invoices') && !forceGet) {
                console.log('returning cached invoices');
                resolve(JSON.parse(appSettings.getString('invoices')));
            } else {
                console.log('getting fresh invoices');
                firebase.query(queryResult => {
                    if (queryResult.value) {
                        resolve(queryResult.value);
                    } else {
                        resolve(false);
                    }
                }, '/invoices/' + uid, options);
            }
            

        })
        
    }

    public createInvoice(args) {
        let uid = JSON.parse(appSettings.getString('uid'));
        return new Promise((resolve, reject) => { 
            firebase.push('/invoices/' + uid, args).then(result => {
                console.dir(result);
                this.buildAppData(true).then(() => {
                    resolve(result);
                })
                
            });
        });
     }

     public updateInvoice(id, data) {
        let uid = JSON.parse(appSettings.getString('uid'));
        return new Promise((resolve, reject) => { 
            if (uid) {
                firebase.update('/invoices/' + uid + '/' + id, data).then(result => {
                    this.buildAppData(true).then(() => {
                        resolve(result);
                    })
                });
            } else {
                reject('Couldn\'t find the user record ID.');
            }
        })
    }

    public deleteShift(id) {
        let uid = JSON.parse(appSettings.getString('uid'));
        return new Promise((resolve, reject) => { 
            if (uid) {
                firebase.remove('/shifts/' + uid + '/' + id).then(result => {
                    // let shifts = JSON.parse(appSettings.getString('shifts'));
                    // delete shifts[id];
                    // appSettings.setString('shifts', JSON.stringify(shifts));
                    // resolve(result);

                    this.buildAppData(true).then(() => {
                        resolve(result);
                    })
                });
            } else {
                reject('Couldn\'t find the user record ID.');
            }
        })
    }

    public deleteInvoice(id) {
        let uid = JSON.parse(appSettings.getString('uid'));
        return new Promise((resolve, reject) => { 
            if (uid) {
                firebase.remove('/invoices/' + uid + '/' + id).then(result => {
                    this.buildAppData(true).then(() => {
                        resolve(result);
                    })
                });
            } else {
                reject('Couldn\'t find the user record ID.');
            }
        })
    }

    public updateShift(id, data) {
        let uid = JSON.parse(appSettings.getString('uid'));
        return new Promise((resolve, reject) => { 
            if (uid) {
                firebase.update('/shifts/' + uid + '/' + id, data).then(result => {
                    // let shifts = JSON.parse(appSettings.getString('shifts'));
                    // data.recentlyUpdated = true;
                    // for (let i in data) {
                    //     shifts[id][i] = data[i];
                    // }
                    // appSettings.setString('shifts', JSON.stringify(shifts));
                    // resolve(result);
                    this.buildAppData(true).then(() => {
                        resolve(result);
                    })
                });
            } else {
                reject('Couldn\'t find the user record ID.');
            }
        })
    }

    public addShift(data) {
        let uid = JSON.parse(appSettings.getString('uid'));
        return new Promise((resolve, reject) => { 
            firebase.push('/shifts/' + uid, data).then(result => {
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
                this.buildAppData(true).then(() => {
                    resolve(result);
                })
            });
        })
    }

    public calculateShiftHoursWorked(start_time, end_time?, minutesWorked?) {
        if (!minutesWorked) {
            var compareA = moment();
            if (end_time) compareA = moment(end_time);
            minutesWorked = compareA.diff(moment(start_time), 'minutes')
        }
        
        
        let hoursWorked = parseFloat((minutesWorked/60).toFixed(2));
        let timeWorked;
        if (minutesWorked/60 < 1) {
            timeWorked = minutesWorked + ' MINUTES';
        } else if ((hoursWorked) % 1 === 0) {
            timeWorked = Math.floor(hoursWorked) + ' HOURS';
        } else {
            let minutesOnHour = minutesWorked - (Math.floor(minutesWorked/60) * 60);
            timeWorked = Math.floor(hoursWorked) + ' HOUR' + (Math.floor(hoursWorked) == 1 ? '' : 'S') + ' ' + minutesOnHour + ' MINUTE' + (minutesOnHour == 1 ? '' : 'S');
        }
        let rtn = {
            minutes_worked: minutesWorked,
            hours_worked: hoursWorked,
            time_worked: timeWorked
        }
        return rtn;
    }

    public calculateShiftEarned(minutes_worked, previousWeekMinutes) {
        // console.log('Minutes worked: ' + minutes_worked);
        // console.log('Previous week minutes worked: ' + previousWeekMinutes);
        let user: User = JSON.parse(appSettings.getString('userData'));
        let minuteRate = parseFloat(user.hourlyRate)/60;
        let overtimeMinuteRate = parseFloat(user.overtimeRate)/60;
        // console.log('previousMinutes: ' + previousWeekMinutes)
        let overtime_earned, overtime_minutes, regular_earned, regular_minutes, total_earned;
        if (previousWeekMinutes >= 2400) {
            overtime_earned = minutes_worked * overtimeMinuteRate;
            overtime_minutes = minutes_worked;
            regular_earned = 0;
            regular_minutes = 0;
            total_earned = minutes_worked * overtimeMinuteRate;
        } else if (previousWeekMinutes + minutes_worked > 2400) {
            overtime_earned = ((previousWeekMinutes + minutes_worked) - 2400)*overtimeMinuteRate;
            overtime_minutes = (previousWeekMinutes + minutes_worked) - 2400;
            regular_earned = (minutes_worked - overtime_minutes)*minuteRate;
            regular_minutes = minutes_worked - overtime_minutes;
            total_earned = overtime_earned + regular_earned;
        } else {
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
        let rtn = {
            regular_earned: regular_earned.toFixed(2),
            regular_minutes: regular_minutes,
            overtime_earned: overtime_earned.toFixed(2),
            overtime_minutes: overtime_minutes,
            total_earned: total_earned.toFixed(2)
        }
        return rtn;
    }

    public buildShiftData(shift) {
        var compareA = moment();
        if (shift.end_time) compareA = moment(shift.end_time);
        var minutesWorked = compareA.diff(moment(shift.start_time), 'minutes')
        var hoursWorked = (minutesWorked/60).toFixed(2);
        let timeWorked;
        if (minutesWorked/60 < 1) {
            timeWorked = minutesWorked + ' MINUTES';
        } else if ((parseFloat(hoursWorked)) % 1 === 0) {
            timeWorked = hoursWorked + ' HOURS';
        } else {
            let minutesOnHour = minutesWorked - (Math.floor(minutesWorked/60) * 60);
            timeWorked = Math.floor(parseFloat(hoursWorked)) + ' HOURS ' + minutesOnHour + ' MINUTE' + (minutesOnHour == 1 ? '' : 'S');
        }
        shift.minutes_worked = minutesWorked;
        shift.hours_worked = hoursWorked;
        shift.time_worked = timeWorked;
        shift.title = moment(shift.start_time).format('ddd MMM Do')
        shift.display_start = moment(shift.start_time).format('h:mma');
        shift.display_end = moment(shift.end_time).format('h:mma');

        shift.display_hours = moment(shift.start_time).format('h:mma') + ' to ' + moment(shift.end_time).format('h:mma');
        if (moment(shift.start_time).format('YYYYMMDD') < moment(shift.end_time).format('YYYYMMDD')) {
            shift.display_hours = moment(shift.start_time).format('h:mma') + ' to ' + moment(shift.end_time).format('MMM DD [at] h:mma');
        }
        if (!shift.end_time) shift.display_hours = moment(shift.start_time).format('h:mma') + ' (In progress)'
        if (!shift.end_time) shift.end_time = false;

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
        let user = JSON.parse(appSettings.getString('userData'));
        let invoicedFamilyMap = {};
        if (shift.invoiced && shift.invoiced.length) {
            shift.invoiced_families_string = '';
            for (var x = 0; shift.invoiced.length > x; x++) {
                invoicedFamilyMap[shift.invoiced[x].family_id] = true;
                if (x == 0) {
                    shift.invoiced_families_string += shift.invoiced[x].family_name
                } else {
                    shift.invoiced_families_string += ', ' + shift.invoiced[x].family_name
                }
            }
        }

        let hasUninvoicedFamilies = false;
        let uninvoicedFamiliesText = '';
        let count = 0;

        for (var z in user.families) {
            if (!user.families[z].deleted) {
                if (!invoicedFamilyMap[z] && shift.contributions && shift.contributions[z] && shift.contributions[z] != 0 && shift.contributions[z] != '0' && shift.contributions[z] != '0.00') {
                    hasUninvoicedFamilies = true;
                    if (count == 0) {
                        uninvoicedFamiliesText += user.families[z].name
                    } else {
                        uninvoicedFamiliesText += ', ' + user.families[z].name
                    }
                    count++;
                }
            }
            
        }
        if (hasUninvoicedFamilies) shift.uninvoiced_families_string = uninvoicedFamiliesText;
        


        return shift;
    }
}