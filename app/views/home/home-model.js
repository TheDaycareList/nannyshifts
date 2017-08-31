"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var observable_1 = require("data/observable");
var observable_array_1 = require("data/observable-array");
var dialogs = require("ui/dialogs");
var appSettings = require("application-settings");
var moment = require("moment");
var frame = require("ui/frame");
var fs = require("file-system");
var enums_1 = require("ui/enums");
var builder = require("ui/builder");
var platform_1 = require("platform");
var user_service_1 = require("../shared/user.service");
var shift_service_1 = require("../shared/shift.service");
var picker = require("../components/picker/picker");
var userService;
var shiftService;
var settingsContainer;
var settingsOverlayContainer;
var dismissNote;
var blurView;
var MyModel;
var settingsModel;
var editingShift;
var HomeModel = (function (_super) {
    __extends(HomeModel, _super);
    function HomeModel() {
        var _this = _super.call(this) || this;
        _this.header_text = 'Week of ' + moment().startOf('week').format('dddd [the] Do');
        _this.user = JSON.parse(appSettings.getString('userData'));
        _this.hours_worked = 0;
        _this.thisWeekMinutesWorked = 0;
        _this.total_earned = 0.00;
        _this.regular_earned = 0;
        _this.overtime_earned = 0;
        _this.settingsTitle = 'Settings';
        _this.families = new observable_array_1.ObservableArray([]);
        _this.familiesMap = {};
        _this.editingFamily = observable_1.fromObject({});
        _this.clockedIn = false;
        _this.thisWeek = new observable_array_1.ObservableArray([]);
        _this.shifts = new observable_array_1.ObservableArray([]);
        _this.addedShiftsMap = {};
        _this.isLoading = false;
        _this.selectedIndex = 0;
        _this.myArray = ['hi', 'world', 'would you like', 'peas'];
        _this.sectionedShifts = new observable_array_1.ObservableArray([]);
        _this.selectedFamilyToInvoice = false;
        _this.uninvoicedShiftsByFamilyMap = {};
        _this.invoicedShiftsByFamilyMap = {};
        _this.uninvoicedShifts = [];
        _this.invoices = new observable_array_1.ObservableArray([]);
        _this.invoiceMap = {};
        _this.allShifts = new observable_array_1.ObservableArray([]);
        _this.allShiftsMap = {};
        _this.weeks = {};
        MyModel = _this;
        //allShiftsModel = new AllShiftsModel();
        userService = new user_service_1.UserService();
        shiftService = new shift_service_1.ShiftService();
        var user = JSON.parse(appSettings.getString('userData'));
        for (var i in user.families) {
            user.families[i].id = i;
            if (!user.families[i].deleted)
                _this.familiesMap[i] = user.families[i];
            var family = observable_1.fromObject(user.families[i]);
            if (!user.families[i].deleted) {
                _this.families.push(family);
            }
        }
        if (_this.families.length == 1)
            _this.families.getItem(0).set('justOneFamily', true);
        _this.families.getItem(0).set('isFirst', true);
        _this.set('isLoading', true);
        shiftService.buildAppData(true).then(function (result) {
            _this.getThisWeekShifts();
            _this.set('isLoading', false);
            _this.processInvoices(JSON.parse(appSettings.getString('invoices')));
        });
        return _this;
    }
    HomeModel.prototype.rebuildAllData = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            shiftService.buildAppData(true).then(function (result) {
                _this.getThisWeekShifts();
                _this.set('isLoading', false);
                console.log('fresh invoices length ' + JSON.parse(appSettings.getString('invoices')).length);
            }).then(function () {
                _this.processInvoices(JSON.parse(appSettings.getString('invoices')));
                resolve();
            });
        });
    };
    HomeModel.prototype.pageLoaded = function (myPage) {
        var _this = this;
        this.page = myPage;
        this.page.bindingContext = this;
        this.page.getViewById('tabview').on('selectedIndexChanged', function (args) {
            _this.set('selectedIndex', args.newIndex);
            if (args.newIndex == 0) {
                setTimeout(function () {
                    _this.getThisWeekShifts();
                }, 10);
            }
            else {
                setTimeout(function () {
                    var shifts = JSON.parse(appSettings.getString('shifts'));
                    _this.processShifts(shifts);
                }, 10);
            }
        });
    };
    HomeModel.prototype.showMenu = function () {
        var sideDrawer = (frame.topmost().getViewById("drawer"));
        sideDrawer.showDrawer();
    };
    HomeModel.prototype.logUser = function () {
        console.dir(JSON.parse(appSettings.getString('userData')));
        console.log(JSON.parse(appSettings.getString('uid')));
    };
    HomeModel.prototype.editRates = function () {
        this.showSettings('/views/components/editrates/editrates.xml');
        this.set('settingsTitle', 'Edit Rates');
    };
    HomeModel.prototype.saveRates = function () {
        var _this = this;
        var data = {
            hourlyRate: this.get('user').hourlyRate,
            overtimeRate: this.get('user').overtimeRate
        };
        userService.updateUser(data).then(function (result) {
            console.log(result);
            _this.hideSettings();
        });
    };
    HomeModel.prototype.refreshData = function (args) {
        var _this = this;
        var pullRefresh = args.object;
        shiftService.buildAppData(true).then(function (result) {
            _this.getThisWeekShifts();
            _this.set('isLoading', false);
            _this.processInvoices(JSON.parse(appSettings.getString('invoices')));
            pullRefresh.refreshing = false;
        });
    };
    HomeModel.prototype.editFamily = function (args) {
        console.log('families?');
        // 'this' is now the family you tapped from the repeater
        var families = MyModel.families;
        var family = families.filter(function (item) { return item.get('id') === args.object.id; })[0];
        MyModel.set('editingFamily', family);
        MyModel.showSettings('/views/components/editfamily/editfamily.xml');
        MyModel.set('settingsTitle', 'Edit Family');
        MyModel.page.getViewById('editing_family_view').bindingContext = MyModel.editingFamily;
    };
    HomeModel.prototype.addFamily = function () {
        this.set('editingFamily', observable_1.fromObject({}));
        this.showSettings('/views/components/editfamily/editfamily.xml');
        this.set('settingsTitle', 'Add Family');
        MyModel.page.getViewById('editing_family_view').bindingContext = MyModel.editingFamily;
    };
    HomeModel.prototype.saveFamily = function () {
        var _this = this;
        var data = {
            name: this.get('editingFamily').get('name'),
            email: this.get('editingFamily').get('email')
        };
        if (this.editingFamily.get('id')) {
            console.log('editing a family');
            userService.saveFamily(this.editingFamily.get('id'), data).then(function (result) {
                var families = _this.families;
                families.forEach(function (element) {
                    if (element.get('id') == _this.editingFamily.get('id')) {
                        element.set('name', data.name);
                        element.set('email', data.email);
                    }
                });
                _this.hideSettings();
            });
        }
        else {
            console.log('adding a family');
            var families = this.families;
            userService.addFamily(data).then(function (result) {
                var families = _this.families;
                data.id = result.key;
                families.push(observable_1.fromObject(data));
                _this.set('familiesCount', families.length);
                if (families.length > 1)
                    _this.families.getItem(0).set('justOneFamily', false);
                _this.hideSettings();
            });
        }
    };
    HomeModel.prototype.removeFamily = function (args) {
        var famId = args.object.id;
        dialogs.confirm('Are you sure you want to remove this family?').then(function (result) {
            if (result) {
                userService.updateFamily(famId, { deleted: true }).then(function (result) {
                    var families = MyModel.families;
                    var deleteIndex;
                    families.forEach(function (element, index) {
                        if (element.get('id') == famId)
                            deleteIndex = index;
                    });
                    families.splice(deleteIndex, 1);
                    if (families.length == 1)
                        MyModel.families.getItem(0).set('justOneFamily', true);
                    MyModel.set('families', families);
                    MyModel.hideSettings();
                });
            }
        });
    };
    HomeModel.prototype.getThisWeekShifts = function (refreshData) {
        var _this = this;
        if (refreshData) {
            this.set('isLoading', true);
            shiftService.getShifts(15, true).then(function (shifts) {
                _this.set('isLoading', false);
                _this.processShifts(shifts);
            });
        }
        else {
            var shifts = JSON.parse(appSettings.getString('shifts'));
            console.log('shifts length + ' + shifts.length);
            this.processShifts(shifts);
        }
    };
    /****************** INVOICE FUNCTIONS ******************/
    HomeModel.prototype.invoiceOptions = function (args) {
        var _this = this;
        var invoice = this.invoices.getItem(args.index);
        if (invoice) {
            var actions = [];
            if (!invoice.get('paid')) {
                actions.push('Mark As Paid');
            }
            else {
                actions.push('Unmark As Paid');
            }
            if (!invoice.get('sent')) {
                actions.push('Send to ' + this.familiesMap[invoice.get('family_id')].name);
                actions.push('Edit');
            }
            else {
                if (!invoice.get('paid'))
                    actions.push('Re-send to ' + this.familiesMap[invoice.get('family_id')].name);
            }
            actions.push('View');
            actions.push('Delete');
            dialogs.action(this.familiesMap[invoice.get('family_id')].name + ' for $' + invoice.get('total'), "Cancel", actions).then(function (result) {
                if (result == 'Edit') {
                    //this.showEditShift(false, shift);
                }
                else if (result == 'Delete') {
                    var msg_1 = 'Are you sure you want to delete this invoice?';
                    if (invoice.get('paid')) {
                        msg_1 += ' You\'ve marked this invoice as paid, so remember to adjust your records accordingly.';
                    }
                    else if (invoice.get('sent')) {
                        msg_1 += ' You\'ve already sent this invoice to ' + _this.familiesMap[invoice.get('family_id')].name + ', so please reach out to them directly informing them that they can discard this invoice.';
                    }
                    dialogs.action(msg_1, "Cancel", ["Do it."]).then(function (result) {
                        if (result == 'Do it.') {
                            // shiftService.deleteShift(shift.id).then(result => {
                            //     this.processShifts(JSON.parse(appSettings.getString('shifts')));
                            // })
                        }
                    });
                }
                else if (result == 'Mark As Paid') {
                    invoice.set('loading', true);
                    shiftService.updateInvoice(invoice.get('id'), { paid: true }).then(function (result) {
                        invoice.set('loading', false);
                        invoice.set('paid', true);
                        //this.processInvoices(JSON.parse(appSettings.getString('invoices')));
                    });
                }
                else if (result == 'Unmark As Paid') {
                    invoice.set('loading', true);
                    shiftService.updateInvoice(invoice.get('id'), { paid: false }).then(function (result) {
                        invoice.set('loading', false);
                        invoice.set('paid', false);
                        //this.processInvoices(JSON.parse(appSettings.getString('invoices')));
                    });
                }
                else if (result == 'View') {
                    frame.topmost().navigate('/views/invoice/invoice');
                }
                else if (result == 'Send to ' + _this.familiesMap[invoice.get('family_id')].name) {
                    invoice.set('loading', true);
                    _this.sendInvoice(invoice.get('id'), invoice);
                    shiftService.updateInvoice(invoice.get('id'), { sent: true }).then(function (result) {
                        invoice.set('sent', true);
                        //this.processInvoices(JSON.parse(appSettings.getString('invoices')));
                        alert('The invoice has been sent!');
                        invoice.set('loading', false);
                    });
                }
                else if (result == 'Re-send to ' + _this.familiesMap[invoice.get('family_id')].name) {
                    _this.sendInvoice(invoice.get('id'), invoice, true);
                    alert('We sent a friendly reminder to ' + _this.familiesMap[invoice.get('family_id')].name);
                }
            });
        }
    };
    HomeModel.prototype.showCreateInvoice = function () {
        MyModel.set('selectedFamilyToInvoice', false);
        MyModel.set('uninvoicedShifts', []);
        MyModel.showSettings('/views/components/editinvoice/editinvoice.xml');
        MyModel.set('settingsTitle', 'Create Invoice');
    };
    HomeModel.prototype.chooseFamilyToInvoice = function () {
        this.dismissSoftInputs();
        this.set('picking', 'list');
        this.set('pickerTitle', 'Choose Family');
        var pickerItems = [];
        this.families.forEach(function (item) {
            pickerItems.push(item.get('name'));
        });
        this.set('pickerItems', pickerItems);
        this.set('pickerDoneText', 'Done');
        picker.animateShow();
        this.set('pickerCancel', function () {
            var _this = this;
            picker.animateHide().then(function () { return _this.set('picking', false); });
        });
        // empty the uninvoicedShifts array if theres anything in it.
        this.set('pickerDone', function () {
            var _this = this;
            while (this.uninvoicedShifts.length)
                this.uninvoicedShifts.pop();
            var uninvoicedShiftsArray = [];
            var family = this.familiesMap[this.families.getItem(this.page.getViewById('listpicker').selectedIndex).get('id')];
            this.selectedFamilyToInvoice = family;
            var invoiceTotal = 0;
            for (var i in this.uninvoicedShiftsByFamilyMap[family.id]) {
                if (this.addedShiftsMap[i].end_time && this.addedShiftsMap[i].contributions[family.id]) {
                    var familyContribution = this.addedShiftsMap[i].contributions[family.id];
                    this.addedShiftsMap[i].selected_family_contribution = familyContribution;
                    uninvoicedShiftsArray.push(this.addedShiftsMap[i]);
                    invoiceTotal += +this.addedShiftsMap[i].selected_family_contribution;
                }
            }
            this.set('invoiceTotal', invoiceTotal.toFixed(2));
            this.set('uninvoicedShifts', uninvoicedShiftsArray);
            picker.animateHide().then(function () { return _this.set('picking', false); });
        });
    };
    HomeModel.prototype.unselectUninvoicedShift = function (args) {
        if (args.object.id) {
            for (var i = 0; MyModel.uninvoicedShifts.length > i; i++) {
                var item = MyModel.uninvoicedShifts[i];
                if (item.id == args.object.id) {
                    var tappedItem = args.object;
                    var newInvoiceTotal = parseFloat(MyModel.get('invoiceTotal'));
                    console.log('displayed invoice total ' + newInvoiceTotal);
                    if (tappedItem.className == 'uninvoiced_shift selected') {
                        tappedItem.className = 'uninvoiced_shift';
                        item.do_not_invoice = true;
                        newInvoiceTotal -= parseFloat(item.selected_family_contribution);
                    }
                    else {
                        tappedItem.className = 'uninvoiced_shift selected';
                        item.do_not_invoice = false;
                        newInvoiceTotal += parseFloat(item.selected_family_contribution);
                    }
                    MyModel.set('invoiceTotal', newInvoiceTotal.toFixed(2));
                }
            }
        }
    };
    HomeModel.prototype.saveInvoice = function () {
        var _this = this;
        var shift_ids = [];
        for (var i = 0; MyModel.uninvoicedShifts.length > i; i++) {
            var item = MyModel.uninvoicedShifts[i];
            if (!item.do_not_invoice)
                shift_ids.push(item.id);
        }
        var args = {
            shift_ids: shift_ids,
            family_id: this.get('selectedFamilyToInvoice').id,
            total: this.get('invoiceTotal'),
            paid: false,
            date_created: moment().format()
        };
        if (!args.shift_ids || !args.shift_ids.length) {
            alert('Please select one or more shifts to include in this invoice.');
        }
        else {
            shiftService.createInvoice(args).then(function (result) {
                _this.hideSettings();
                _this.processInvoices(JSON.parse(appSettings.getString('invoices')));
            });
        }
    };
    HomeModel.prototype.saveAndSendInvoice = function () {
        var _this = this;
        var shift_ids = [];
        for (var i = 0; MyModel.uninvoicedShifts.length > i; i++) {
            var item = MyModel.uninvoicedShifts[i];
            if (!item.do_not_invoice)
                shift_ids.push(item.id);
        }
        var args = {
            shift_ids: shift_ids,
            family_id: this.get('selectedFamilyToInvoice').id,
            total: this.get('invoiceTotal'),
            paid: false,
            date_created: moment().format(),
            sent: true
        };
        if (!args.shift_ids || !args.shift_ids.length) {
            alert('Please select one or more shifts to include in this invoice.');
        }
        else {
            shiftService.createInvoice(args).then(function (result) {
                _this.hideSettings();
                _this.sendInvoice(result.key);
                _this.processInvoices(JSON.parse(appSettings.getString('invoices')));
            });
        }
    };
    HomeModel.prototype.sendInvoice = function (invoice_id, invoice, resending) {
        var html = this.buildInvoiceHtml(invoice_id, invoice);
        var message = this.user.first_name + ' ' + this.user.last_name + ' created the invoice below, send payment as soon as you can.';
        var subject = this.user.first_name + ' ' + this.user.last_name + ' has sent you an invoice.';
        if (resending) {
            message = this.user.first_name + ' ' + this.user.last_name + ' previously sent the invoice below, here\'s a friendly reminder to send payment as soon as you can.';
            subject = this.user.first_name + ' ' + this.user.last_name + ' is sending you a friendly reminder about an unpaid invoice.';
        }
        if (!invoice) {
            userService.sendEmail(this.selectedFamilyToInvoice, { email: this.user.email, name: this.user.first_name + ' ' + this.user.last_name }, message, html, subject);
        }
        else {
            var familyToInvoice = this.familiesMap[invoice.family_id];
            userService.sendEmail(familyToInvoice, { email: this.user.email, name: this.user.first_name + ' ' + this.user.last_name }, message, html, subject);
        }
    };
    HomeModel.prototype.buildInvoiceHtml = function (invoice_id, invoice) {
        var html = "\n            <center><span style=\"color: gray; font-size: 11px; color: gray;\">Invoice ID: " + invoice_id + "</span></center>\n            <table width=\"100%\" style=\"font-family: Helvetica; font-size: 13px;\" cellpadding=\"0\" cellspacing=\"0\">\n                <tr>\n                    <th align=\"left\" width=\"100%\" style=\"padding: 5; border-bottom: 2px solid #E0E0E0;\">Shifts</th>\n                    <th align=\"left\" style=\"padding: 5; border-bottom: 2px solid #E0E0E0;\">Contribution</th>\n                </tr>\n        ";
        if (!invoice) {
            for (var i = 0; MyModel.uninvoicedShifts.length > i; i++) {
                var item = MyModel.uninvoicedShifts[i];
                if (!item.do_not_invoice) {
                    html += "\n                        <tr>\n                            <td align=\"left\" style=\"padding: 5; border-bottom: 1px solid #f5f5f5;\">" + item.display_date + "<br /><span style=\"font-size: 11px; color: gray;\">" + item.display_timing + "</span></td>\n                            <td align=\"left\" style=\"padding: 5; border-bottom: 1px solid #f5f5f5; font-weight: bold;\">$" + item.contributions[this.selectedFamilyToInvoice.id] + "</td>\n                        </tr>\n                    ";
                }
            }
            html += "\n                    \n                </table>\n                <center><h2 style=\"font-family: Helvetica;\">Invoice Total: <span style=\"color: green;\">$" + this.invoiceTotal + "</span></h2></center>\n            ";
        }
        else {
            for (var i = 0; invoice.shift_ids.length > i; i++) {
                var shift = MyModel.addedShiftsMap[invoice.shift_ids[i]];
                html += "\n                    <tr>\n                        <td align=\"left\" style=\"padding: 5; border-bottom: 1px solid #f5f5f5;\">" + shift.display_date + "<br /><span style=\"font-size: 11px; color: gray;\">" + shift.display_timing + "</span></td>\n                        <td align=\"left\" style=\"padding: 5; border-bottom: 1px solid #f5f5f5; font-weight: bold;\">$" + shift.contributions[invoice.family_id] + "</td>\n                    </tr>\n                ";
            }
            html += "\n                    \n                </table>\n                <center><h2 style=\"font-family: Helvetica;\">Invoice Total: <span style=\"color: green;\">$" + invoice.total + "</span></h2></center>\n            ";
        }
        return html;
    };
    /****************** /INVOICE FUNCTIONS ******************/
    /****************** SHIFT FUNCTIONS ******************/
    HomeModel.prototype.shiftOptions = function (args) {
        var _this = this;
        var shift;
        if (args.eventName && args.eventName == 'itemTap') {
            shift = MyModel.addedShiftsMap[this.sectionedShifts.getItem(args.index).get('id')];
        }
        else {
            shift = MyModel.addedShiftsMap[args.object.id];
        }
        if (shift) {
            dialogs.action(shift.title + ' from ' + shift.display_hours, "Cancel", ["Edit Shift", "Delete Shift"]).then(function (result) {
                if (result == 'Edit Shift') {
                    _this.showEditShift(false, shift);
                }
                else if (result == 'Delete Shift') {
                    dialogs.action('Are you sure you want to delete this shift? This cannot be undone.', "Cancel", ["Do it."]).then(function (result) {
                        if (result == 'Do it.') {
                            shiftService.deleteShift(shift.id).then(function (result) {
                                _this.processShifts(JSON.parse(appSettings.getString('shifts')));
                                _this.processInvoices(JSON.parse(appSettings.getString('invoices')));
                            });
                        }
                    });
                }
            });
        }
    };
    HomeModel.prototype.showEditShift = function (args, shift) {
        // `this` is now referring to the tapped shift object, and not the model anymore, 
        // so we have to use MyModel which is a reference to HomeModel.
        // console.dir(args);
        if (args) {
            if (args.eventName && args.eventName == 'itemTap') {
                shift = MyModel.addedShiftsMap[this.sectionedShifts.getItem(args.index).get('id')];
            }
            else if (args.object.id) {
                shift = MyModel.addedShiftsMap[args.object.id];
            }
        }
        if (!shift) {
            MyModel.showSettings('/views/components/endshift/endshift.xml');
            MyModel.set('settingsTitle', 'Add Shift');
            editingShift = {};
            var startTime = moment().format('YYYY-MM-DD') + ' 09:00:00';
            var endTime = moment().format('YYYY-MM-DD') + ' 17:00:00';
            MyModel.set('editingShiftStartDate', moment().format('MMM Do, YYYY'));
            MyModel.set('editingShiftStartTime', moment(startTime).format('h:mma'));
            MyModel.set('selectedStartDate', moment().format('YYYY-MM-DD'));
            MyModel.set('selectedStartTime', moment(startTime).format('HH:mm'));
            MyModel.set('editingShiftEndDate', moment().format('MMM Do, YYYY'));
            MyModel.set('editingShiftEndTime', moment(endTime).format('h:mma'));
            MyModel.set('selectedEndDate', moment().format('YYYY-MM-DD'));
            MyModel.set('selectedEndTime', moment(endTime).format('HH:mm'));
            editingShift.start_time = moment(startTime).format();
            editingShift.end_time = moment(endTime).format();
            var compareA_1 = moment(endTime);
            var minutesWorked = compareA_1.diff(moment(startTime), 'minutes');
            var hoursWorked = (minutesWorked / 60).toFixed(2);
            var minuteRate = parseFloat(MyModel.user.hourlyRate) / 60;
            var overtimeMinuteRate = parseFloat(MyModel.user.overtimeRate) / 60;
            var worked = shiftService.calculateShiftHoursWorked(editingShift.start_time, editingShift.end_time);
            ;
            MyModel.updateTotalEarned();
            MyModel.set('endShiftTotalWorked', worked.time_worked);
        }
        else {
            editingShift = Object.assign({}, shift);
            MyModel.showSettings('/views/components/endshift/endshift.xml');
            MyModel.set('settingsTitle', 'End Shift');
            if (shift.end_time) {
                MyModel.set('settingsTitle', 'Edit Shift');
            }
            MyModel.set('editingShiftStartDate', moment(shift.start_time).format('MMM Do, YYYY'));
            MyModel.set('editingShiftStartTime', moment(shift.start_time).format('h:mma'));
            MyModel.set('selectedStartDate', moment(shift.start_time).format('YYYY-MM-DD'));
            MyModel.set('selectedStartTime', moment(shift.start_time).format('HH:mm'));
            MyModel.set('editingShiftEndDate', moment().format('MMM Do, YYYY'));
            MyModel.set('editingShiftEndTime', moment().format('h:mma'));
            MyModel.set('selectedEndDate', moment().format('YYYY-MM-DD'));
            MyModel.set('selectedEndTime', moment().format('HH:mm'));
            editingShift.end_time = moment().format();
            if (shift.end_time) {
                MyModel.set('editingShiftEndDate', moment(shift.end_time).format('MMM Do, YYYY'));
                MyModel.set('editingShiftEndTime', moment(shift.end_time).format('h:mma'));
                MyModel.set('selectedEndDate', moment(shift.end_time).format('YYYY-MM-DD'));
                MyModel.set('selectedEndTime', moment(shift.end_time).format('HH:mm'));
                editingShift.end_time = moment(shift.end_time).format();
            }
            // console.dir(shift.contributions);
            var compareA = moment();
            if (shift.end_time)
                compareA = moment(shift.end_time);
            var minutesWorked = compareA.diff(moment(shift.start_time), 'minutes');
            var hoursWorked = (minutesWorked / 60).toFixed(2);
            var minuteRate = parseFloat(MyModel.user.hourlyRate) / 60;
            var overtimeMinuteRate = parseFloat(MyModel.user.overtimeRate) / 60;
            var worked = shiftService.calculateShiftHoursWorked(editingShift.start_time, editingShift.end_time);
            ;
            MyModel.updateTotalEarned();
            MyModel.set('endShiftTotalWorked', worked.time_worked);
        }
    };
    HomeModel.prototype.getPreviousShiftsTotalMinutes = function (shift) {
        // this function gets the total minutes worked up to that shift that week to determine if 
        // any overtime pay should be attributed to this shift.
        var beginningOfWeek = moment(shift.start_time).isoWeekday(0).format('dddd MMMM Do YYYY');
        if (moment(shift.start_time).isoWeekday() == 0 || moment(shift.start_time).isoWeekday() == 7) {
            beginningOfWeek = moment(shift.start_time).format('dddd MMMM Do YYYY');
        }
        var totalMinutes = 0;
        var reverseShifts = this.weeks[beginningOfWeek].shifts.slice(0).reverse();
        for (var i = 0; reverseShifts.length > i; i++) {
            var myShift = reverseShifts[i];
            // console.dir(myShift);
            if (myShift.id != shift.id) {
                totalMinutes += myShift.minutes_worked;
            }
            else {
                break;
            }
        }
        // console.log('total minutes: ' + totalMinutes);
        return totalMinutes;
    };
    HomeModel.prototype.dismissSoftInputs = function () {
        for (var i = 0; this.families.length > i; i++) {
            var textField = this.page.getViewById('contribution_' + this.families.getItem(i).get('id'));
            if (textField && textField.dismissSoftInput)
                textField.dismissSoftInput();
        }
    };
    HomeModel.prototype.updateTotalEarned = function () {
        var workedObj = shiftService.calculateShiftHoursWorked(editingShift.start_time, editingShift.end_time);
        this.set('endShiftTotalWorked', workedObj.time_worked);
        var earned = shiftService.calculateShiftEarned(workedObj.minutes_worked, this.getPreviousShiftsTotalMinutes(editingShift));
        MyModel.set('endShiftTotalEarned', '$' + earned.total_earned);
        if (earned.overtime_earned != 0.00) {
            MyModel.set('endShiftOvertimeEarned', earned.overtime_earned);
        }
        else {
            MyModel.set('endShiftOvertimeEarned', false);
        }
        var families = MyModel.get('families');
        var newTotal = (earned.total_earned / families.length).toFixed(2);
        // console.log('each contribution: ' + newTotal);
        MyModel.set('endShiftFinalTotal', '$' + (newTotal * families.length).toFixed(2));
        for (var i = 0; families.length > i; i++) {
            if (editingShift.id && editingShift.contributions) {
                if (editingShift.contributions[families.getItem(i).id]) {
                    families.getItem(i).set('contribution', editingShift.contributions[families.getItem(i).id]);
                }
                else {
                    families.getItem(i).set('contribution', '0.00');
                }
            }
            else {
                families.getItem(i).set('contribution', newTotal);
            }
            families.getItem(i).on(observable_1.Observable.propertyChangeEvent, function (args) {
                if (args.propertyName == 'contribution') {
                    var finalTotal = 0;
                    var invalidNumbers = false;
                    for (var x = 0; MyModel.families.length > x; x++) {
                        if (!MyModel.families.getItem(x).get('contribution'))
                            MyModel.families.getItem(x).set('contribution', 0);
                        if (isNaN(MyModel.families.getItem(x).get('contribution'))) {
                            invalidNumbers = true;
                        }
                        else {
                            finalTotal += parseFloat(MyModel.families.getItem(x).get('contribution'));
                        }
                    }
                    if (invalidNumbers) {
                        MyModel.set('endShiftFinalTotal', 'Enter valid numbers.');
                    }
                    else {
                        MyModel.set('endShiftFinalTotal', '$' + finalTotal.toFixed(2));
                    }
                }
            });
        }
    };
    HomeModel.prototype.changeShiftEndTime = function () {
        this.dismissSoftInputs();
        this.set('pickerHour', moment(editingShift.end_time).format('H'));
        this.set('pickerMinute', moment(editingShift.end_time).format('m'));
        this.set('pickerTitle', 'Change End Time');
        this.set('pickerDoneText', 'Done');
        this.set('picking', 'time');
        this.set('pickerCancel', function () {
            var _this = this;
            picker.animateHide().then(function () { return _this.set('picking', false); });
        });
        picker.animateShow();
        this.set('pickerDone', function () {
            var _this = this;
            picker.animateHide().then(function () { return _this.set('picking', false); });
            var hour = this.pickerHour;
            if (hour < 10)
                hour = '0' + this.pickerHour;
            var minute = this.pickerMinute;
            if (minute < 10)
                minute = '0' + minute;
            this.set('selectedEndTime', hour + ':' + minute);
            MyModel.set('editingShiftEndTime', moment(this.get('selectedEndDate') + ' ' + this.get('selectedEndTime') + ':00').format('h:mma'));
            editingShift.end_time = moment(this.get('selectedEndDate') + ' ' + this.get('selectedEndTime') + ':00').format();
            this.updateTotalEarned();
        });
    };
    HomeModel.prototype.changeShiftEndDate = function () {
        this.dismissSoftInputs();
        this.set('picking', 'date');
        this.set('endDateDay', moment(editingShift.end_time).format('DD'));
        this.set('endDateMonth', moment(editingShift.end_time).format('MM'));
        this.set('endDateYear', moment(editingShift.end_time).format('YYYY'));
        this.set('pickerTitle', 'Change End Date');
        this.set('pickerDoneText', 'Done');
        picker.animateShow();
        this.set('pickerCancel', function () {
            var _this = this;
            picker.animateHide().then(function () { return _this.set('picking', false); });
        });
        this.set('pickerDone', function () {
            var _this = this;
            picker.animateHide().then(function () { return _this.set('picking', false); });
            var day = this.endDateDay;
            if (parseInt(this.endDateDay) < 10)
                day = '0' + parseInt(this.endDateDay);
            var month = this.endDateMonth;
            if (parseInt(this.endDateMonth) < 10)
                month = '0' + parseInt(this.endDateMonth);
            this.set('selectedEndDate', this.endDateYear + '-' + month + '-' + day);
            MyModel.set('editingShiftEndDate', moment(this.get('selectedEndDate')).format('MMM Do, YYYY'));
            editingShift.end_time = moment(this.get('selectedEndDate') + ' ' + this.get('selectedEndTime') + ':00').format();
            this.updateTotalEarned();
        });
    };
    HomeModel.prototype.changeShiftStartTime = function () {
        this.dismissSoftInputs();
        this.set('pickerHour', moment(editingShift.start_time).format('H'));
        this.set('pickerMinute', moment(editingShift.start_time).format('m'));
        this.set('pickerTitle', 'Change Start Time');
        this.set('picking', 'time');
        this.set('pickerDoneText', 'Done');
        picker.animateShow();
        this.set('pickerCancel', function () {
            var _this = this;
            picker.animateHide().then(function () { return _this.set('picking', false); });
        });
        this.set('pickerDone', function () {
            var _this = this;
            picker.animateHide().then(function () { return _this.set('picking', false); });
            var hour = this.pickerHour;
            if (hour < 10)
                hour = '0' + this.pickerHour;
            var minute = this.pickerMinute;
            if (minute < 10)
                minute = '0' + minute;
            this.set('selectedStartTime', hour + ':' + minute);
            MyModel.set('editingShiftStartTime', moment(this.get('selectedStartDate') + ' ' + this.get('selectedStartTime') + ':00').format('h:mma'));
            editingShift.start_time = moment(this.get('selectedStartDate') + ' ' + this.get('selectedStartTime') + ':00').format();
            this.updateTotalEarned();
        });
    };
    HomeModel.prototype.changeShiftStartDate = function () {
        this.dismissSoftInputs();
        this.set('picking', 'date');
        this.set('endDateDay', moment(editingShift.start_time).format('DD'));
        this.set('endDateMonth', moment(editingShift.start_time).format('MM'));
        this.set('endDateYear', moment(editingShift.start_time).format('YYYY'));
        this.set('pickerTitle', 'Change Start Date');
        this.set('pickerDoneText', 'Done');
        picker.animateShow();
        this.set('pickerCancel', function () {
            var _this = this;
            picker.animateHide().then(function () { return _this.set('picking', false); });
        });
        this.set('pickerDone', function () {
            var _this = this;
            picker.animateHide().then(function () { return _this.set('picking', false); });
            var day = this.endDateDay;
            if (parseInt(this.endDateDay) < 10)
                day = '0' + parseInt(this.endDateDay);
            var month = this.endDateMonth;
            if (parseInt(this.endDateMonth) < 10)
                month = '0' + parseInt(this.endDateMonth);
            this.set('selectedStartDate', this.endDateYear + '-' + month + '-' + day);
            MyModel.set('editingShiftStartDate', moment(this.get('selectedStartDate')).format('MMM Do, YYYY'));
            editingShift.start_time = moment(this.get('selectedStartDate') + ' ' + this.get('selectedStartTime') + ':00').format();
            this.updateTotalEarned();
        });
    };
    HomeModel.prototype.saveShift = function () {
        var _this = this;
        this.dismissSoftInputs();
        var end_time = this.get('selectedEndDate') + ' ' + this.get('selectedEndTime') + ':00';
        var start_time = this.get('selectedStartDate') + ' ' + this.get('selectedStartTime') + ':00';
        var args = {};
        args.end_time = moment(end_time).format();
        args.start_time = moment(start_time).format();
        args.contributions = {};
        var contributions = {};
        var families = this.get('families');
        for (var i = 0; families.length > i; i++) {
            contributions[families.getItem(i).get('id')] = families.getItem(i).get('contribution');
        }
        args.contributions = contributions;
        if (editingShift.id) {
            shiftService.updateShift(editingShift.id, args).then(function (result) {
                _this.processShifts(JSON.parse(appSettings.getString('shifts')));
                _this.processInvoices(JSON.parse(appSettings.getString('invoices')));
                if (editingShift.id == MyModel.get('clockedIn').id && args.end_time)
                    MyModel.set('clockedIn', false);
                _this.hideSettings();
            });
        }
        else {
            shiftService.addShift(args).then(function (result) {
                _this.processShifts(JSON.parse(appSettings.getString('shifts')));
                _this.processInvoices(JSON.parse(appSettings.getString('invoices')));
                _this.hideSettings();
            });
        }
    };
    HomeModel.prototype.showStartShift = function () {
        this.set('pickerHour', moment().format('H'));
        this.set('pickerMinute', moment().format('m'));
        this.set('pickerTitle', 'Set Start Time');
        this.set('pickerDoneText', 'Start');
        this.set('picking', 'time');
        picker.animateShow();
        this.set('pickerCancel', function () {
            var _this = this;
            picker.animateHide().then(function () { return _this.set('picking', false); });
        });
        this.set('pickerDone', function () {
            var _this = this;
            picker.animateHide().then(function () { return _this.set('picking', false); });
            var hour = this.pickerHour;
            if (hour < 10)
                hour = '0' + this.pickerHour;
            var minute = this.pickerMinute;
            if (minute < 10)
                minute = '0' + minute;
            var args = {
                start_time: moment(moment().format('YYYY-MM-DD') + ' ' + hour + ':' + minute + ':00').format(),
                end_time: null,
            };
            shiftService.startShift(args).then(function (startedShift) {
                //this.shifts.unshift(observableFromObject(startedShift));
                _this.processShifts(JSON.parse(appSettings.getString('shifts')));
                _this.set('clockedIn', args);
            });
        });
    };
    /****************** /SHIFT FUNCTIONS ******************/
    HomeModel.prototype.onSelectedIndexChanged = function (args) {
        console.log(args.newIndex);
        if (args.newIndex == 0) {
            this.getThisWeekShifts();
        }
        else if (args.newIndex = 1) {
            alert('maybe process shifts again?');
        }
    };
    HomeModel.prototype.kill = function () {
        appSettings.remove('userData');
        appSettings.remove('uid');
        appSettings.remove('userRecordID');
        frame.topmost().navigate('/views/login/login');
    };
    HomeModel.prototype.settingsScroll = function (args) {
        console.log('scrolling');
    };
    HomeModel.prototype.showSettings = function (viewPath) {
        var _this = this;
        this.page.getViewById('maingrid').animate({
            scale: { x: .92, y: .92 },
            duration: 300,
            curve: enums_1.AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        });
        settingsContainer = this.page.getViewById('settings_container');
        settingsOverlayContainer = this.page.getViewById('settings_overlay_container');
        dismissNote = this.page.getViewById('dismiss_note');
        this.set('settingsShown', true);
        var deviceHeight = platform_1.screen.mainScreen.heightDIPs;
        settingsContainer.translateY = deviceHeight + 30;
        settingsContainer.animate({
            translate: { x: 0, y: 0 },
            duration: 300,
            curve: enums_1.AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        });
        settingsOverlayContainer.opacity = 0;
        settingsOverlayContainer.animate({
            opacity: 1,
            duration: 100
        });
        var container = this.page.getViewById('settings_view');
        container.removeChildren();
        var path = fs.knownFolders.currentApp().path;
        var component = builder.load(path + viewPath);
        container.addChild(component);
        var containerBounds = settingsContainer.ios.bounds;
        var iosSettingsContainer = settingsContainer.ios;
        if (blurView && blurView.removeFromSuperview)
            blurView.removeFromSuperview();
        blurView = UIVisualEffectView.alloc().initWithEffect(UIBlurEffect.effectWithStyle(UIBlurEffectStyleLight));
        blurView.frame = {
            origin: { x: containerBounds.origin.x, y: containerBounds.origin.y - 20 },
            size: { width: containerBounds.size.width, height: containerBounds.size.height + 20 }
        };
        blurView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        iosSettingsContainer.addSubview(blurView);
        iosSettingsContainer.sendSubviewToBack(blurView);
        var buzz = UISelectionFeedbackGenerator.new();
        var panner = this.page.getViewById('settings_container');
        var scroller = this.page.getViewById('settings_scroller');
        if (scroller) {
            var readyToDrop_1 = false;
            panner.off('pan');
            panner.on('pan', function (args) {
                if (args.state == 3 && readyToDrop_1) {
                    _this.hideSettings();
                }
            });
            scroller.on('scroll', function (scrollArgs) {
                if (scrollArgs.scrollY < 0) {
                    settingsContainer.translateY = scrollArgs.scrollY * -1.8;
                    if (scrollArgs.scrollY * -1.8 > 150) {
                        readyToDrop_1 = true;
                        if (dismissNote.opacity == 0) {
                            buzz.selectionChanged();
                            dismissNote.animate({
                                opacity: 1,
                                duration: 250
                            });
                        }
                    }
                    else {
                        readyToDrop_1 = false;
                        if (dismissNote.opacity == 1) {
                            dismissNote.animate({
                                opacity: 0,
                                duration: 250
                            });
                        }
                    }
                }
            });
        }
        else {
            panner.off('pan');
            panner.on('pan', function (args) {
                settingsContainer.translateY = args.deltaY;
                if (args.deltaY > 150) {
                    if (dismissNote.opacity == 0) {
                        buzz.selectionChanged();
                        dismissNote.animate({
                            opacity: 1,
                            duration: 250
                        });
                    }
                }
                else {
                    if (dismissNote.opacity == 1) {
                        dismissNote.animate({
                            opacity: 0,
                            duration: 250
                        });
                    }
                }
                if (args.state == 3) {
                    if (args.deltaY > 150) {
                        _this.hideSettings();
                    }
                    else {
                        settingsContainer.animate({
                            translate: { x: 0, y: 0 },
                            duration: 200,
                            curve: enums_1.AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
                        });
                    }
                }
            });
        }
    };
    HomeModel.prototype.hideSettings = function () {
        var _this = this;
        this.dismissSoftInputs();
        editingShift = false;
        this.page.getViewById('maingrid').animate({
            scale: { x: 1, y: 1 },
            duration: 300,
            curve: enums_1.AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        });
        var deviceHeight = platform_1.screen.mainScreen.heightDIPs;
        settingsContainer.animate({
            translate: { x: 0, y: deviceHeight - 30 },
            duration: 300,
            curve: enums_1.AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        }).then(function () {
            _this.set('settingsShown', false);
        });
        settingsOverlayContainer.animate({
            opacity: 0,
            duration: 300
        });
    };
    HomeModel.prototype.removeSectionedShift = function (args) {
        console.dir(args);
        //this.sectionedShifts.getItem(args.index);
        console.log(args.index);
        this.sectionedShifts.splice(args.index, 1);
    };
    HomeModel.prototype.processShifts = function (shifts) {
        var shiftsArray = [];
        for (var i in shifts) {
            var myShift_1 = shiftService.buildShiftData(shifts[i]);
            myShift_1.id = i;
            if (!myShift_1.end_time)
                this.set('clockedIn', shifts[i]);
            shiftsArray.push(myShift_1);
        }
        console.log('shifts array length ' + shiftsArray.length);
        shiftsArray.sort(function (a, b) {
            if (moment(a.start_time) < moment(b.start_time)) {
                return 1;
            }
            else if (moment(a.start_time) > moment(b.start_time)) {
                return -1;
            }
        });
        var weeks = {};
        this.set('addedShiftsMap', {});
        // calculate hours worked and money earned.
        var thisWeekMinutesWorked = 0;
        var _loop_1 = function () {
            // add the shift if it hasnt been added already and if it is in the current week. OR if the shift has not been ended.
            if (!this_1.addedShiftsMap[shiftsArray[s].id]) {
                var shift_1 = observable_1.fromObject(shiftsArray[s]);
                this_1.shifts.push(shift_1);
                if (shiftsArray[s].end_time && moment(shiftsArray[s].start_time) > moment().startOf('week')) {
                    this_1.thisWeek.push(shift_1);
                }
            }
            // update the shift thats still running so the times and the money earned updates
            // or update a shift that was recently updated.
            if (!shiftsArray[s].end_time || shiftsArray[s].recentlyUpdated) {
                var updateIndex_1;
                this_1.shifts.forEach(function (element, index) {
                    if (element.get('id') == shiftsArray[s].id) {
                        updateIndex_1 = index;
                    }
                });
                this_1.shifts.setItem(updateIndex_1, observable_1.fromObject(shiftsArray[s]));
                // update the entity in the thisWeek observable.
                var thisWeekUpdateIndex_1;
                this_1.thisWeek.forEach(function (element, index) {
                    if (element.get('id') == shiftsArray[s].id) {
                        thisWeekUpdateIndex_1 = index;
                    }
                });
                this_1.thisWeek.setItem(thisWeekUpdateIndex_1, observable_1.fromObject(shiftsArray[s]));
                shiftsArray[s].recentlyUpdated = false;
            }
            this_1.addedShiftsMap[shiftsArray[s].id] = shiftsArray[s];
            if (!shiftsArray[s].end_time) {
                compareA = moment();
                minutesWorked = compareA.diff(moment(shiftsArray[s].start_time), 'minutes');
                if (this_1.thisWeek.length && this_1.thisWeek.getItem(0).get('id') == shiftsArray[s].id)
                    this_1.thisWeek.shift();
                this_1.thisWeek.unshift(observable_1.fromObject(shiftsArray[s]));
            }
            //set up week data.
            // var beginningOfWeekMoment = moment(shiftsArray[s].start_time).isoWeekday(0);
            // var beginningOfWeek = moment(shiftsArray[s].start_time).isoWeekday(0).format('dddd MMMM Do YYYY');
            beginningOfWeekMoment = moment(shiftsArray[s].start_time).isoWeekday(0);
            beginningOfWeek = moment(shiftsArray[s].start_time).isoWeekday(0).format('dddd MMMM Do YYYY');
            if (moment(shiftsArray[s].start_time).isoWeekday() == 0 || moment(shiftsArray[s].start_time).isoWeekday() == 7) {
                beginningOfWeekMoment = moment(shiftsArray[s].start_time);
                beginningOfWeek = moment(shiftsArray[s].start_time).format('dddd MMMM Do YYYY');
            }
            if (!weeks[beginningOfWeek]) {
                weeks[beginningOfWeek] = {
                    total_minutes: 0,
                    regular_minutes: 0,
                    overtime_minutes: 0,
                    hours_worked: 0,
                    regular_earned: 0,
                    overtime_earned: 0,
                    title: beginningOfWeekMoment.format('[Week of] MMM Do'),
                    week_start: beginningOfWeekMoment.format('YYYY-MM-DD'),
                    shifts: []
                };
            }
            compareA = moment();
            if (shiftsArray[s].end_time)
                compareA = moment(shiftsArray[s].end_time);
            minutesWorked = compareA.diff(moment(shiftsArray[s].start_time), 'minutes');
            weeks[beginningOfWeek].total_minutes += minutesWorked;
            shift = shiftService.buildShiftData(shiftsArray[s]);
            weeks[beginningOfWeek].shifts.push(shift);
        };
        var this_1 = this, compareA, minutesWorked, beginningOfWeekMoment, beginningOfWeek, compareA, minutesWorked, shift;
        for (var s = 0; shiftsArray.length > s; s++) {
            _loop_1();
        }
        while (this.sectionedShifts.length)
            this.sectionedShifts.pop();
        for (var w in weeks) {
            //console.log(weeks[w].title);
            for (var iw = 0; weeks[w].shifts.length > iw; iw++) {
                var myShift = weeks[w].shifts[iw];
                if (iw == 0) {
                    myShift.minutes_accrued = myShift.minutes_worked;
                }
                else {
                    myShift.minutes_accrued = myShift.minutes_worked + weeks[w].shifts[iw - 1].minutes_accrued;
                }
                if (myShift.minutes_accrued > 2400) {
                    // this shift has overtime minutes.
                    myShift.overtime_minutes = myShift.minutes_accrued - 2400;
                    // this line will ensure that you arent exponentially accruing overtime minutes.
                    if (myShift.overtime_minutes > myShift.minutes_worked) {
                        myShift.overtime_minutes = myShift.minutes_worked;
                    }
                    var regular_minutes_worked = myShift.minutes_worked - myShift.overtime_minutes;
                    myShift.regular_earned = (regular_minutes_worked * (this.get('user').hourlyRate / 60)).toFixed(2);
                    myShift.overtime_earned = (myShift.overtime_minutes * (this.get('user').overtimeRate / 60)).toFixed(2);
                }
                else {
                    myShift.regular_earned = (myShift.minutes_worked * (this.get('user').hourlyRate / 60)).toFixed(2);
                }
                weeks[w].regular_earned += myShift.regular_earned - 0;
                if (myShift.overtime_earned)
                    weeks[w].overtime_earned += myShift.overtime_earned - 0;
                myShift.total_earned = ((myShift.regular_earned - 0) + (myShift.overtime_earned - 0 || 0)).toFixed(2);
                myShift.display_date = moment(myShift.start_time).format('dddd MMM DD, YYYY');
                myShift.display_timing = moment(myShift.start_time).format('h:mma') + ' to ' + moment(myShift.end_time).format('h:mma');
                if (moment(myShift.start_time).format('YYYYMMDD') < moment(myShift.end_time).format('YYYYMMDD')) {
                    myShift.display_timing = moment(myShift.start_time).format('h:mma') + ' to ' + moment(myShift.end_time).format('MMM DD [at] h:mma');
                }
                if (!myShift.end_time) {
                    myShift.display_date = myShift.display_date = moment().format('[TODAY] MMM DD, YYYY');
                    myShift.display_timing = 'Shift started at ' + moment(myShift.start_time).format('h:mma');
                    if (moment(myShift.start_time).format('YYYYMMDD') < moment().format('YYYYMMDD')) {
                        myShift.display_timing = 'Shift started on ' + moment(myShift.start_time).format('MMM DD [at] h:mma');
                    }
                }
            }
            weeks[w].total_earned = (weeks[w].regular_earned + (weeks[w].overtime_earned || 0)).toFixed(2);
            weeks[w].regular_earned = weeks[w].regular_earned.toFixed(2);
            if (weeks[w].overtime_earned)
                weeks[w].overtime_earned = weeks[w].overtime_earned.toFixed(2);
            weeks[w].hours_worked = (weeks[w].total_minutes / 60).toFixed(2);
            if (weeks[w].total_minutes > 2400) {
                weeks[w].regular_minutes = 2400;
                weeks[w].overtime_minutes = weeks[w].total_minutes - 2400;
            }
            else {
                weeks[w].regular_minutes = weeks[w].total_minutes;
            }
            // setup sectioned array.
            var headerObj = {
                "id": weeks[w].title,
                "start_time": moment(weeks[w].shifts[weeks[w].shifts.length - 1].start_time).add('10', 'minutes').format('YYYY-MM-DD HH:mm:ss'),
                "header": true,
                "title": weeks[w].title,
                "hours_worked": weeks[w].hours_worked,
                "regular_earned": weeks[w].regular_earned,
                "overtime_earned": weeks[w].overtime_earned,
                "time_worked": shiftService.calculateShiftHoursWorked(false, false, weeks[w].total_minutes).time_worked,
                "total_earned": weeks[w].total_earned
            };
            //console.dir(headerObj);
            this.sectionedShifts.push(observable_1.fromObject(headerObj));
            var hasOpenShift = false;
            for (var ix = 0; weeks[w].shifts.length > ix; ix++) {
                //console.dir(weeks[w].shifts[ix]);
                this.sectionedShifts.push(observable_1.fromObject(weeks[w].shifts[ix]));
            }
        }
        //console.log(this.sectionedShifts.length);
        // this.sectionedShifts.pop();
        // while (this.sectionedShifts.length) this.sectionedShifts.pop();
        this.weeks = weeks;
        this.thisWeek.forEach(function (element) {
            var compareA = moment();
            if (element.get('end_time'))
                compareA = moment(element.get('end_time'));
            var minutesWorked = compareA.diff(moment(element.get('start_time')), 'minutes');
            thisWeekMinutesWorked += minutesWorked;
        });
        var minuteRate = parseFloat(this.user.hourlyRate) / 60;
        var overtimeMinuteRate = parseFloat(this.user.overtimeRate) / 60;
        if (thisWeekMinutesWorked > 2400) {
            var regularEarned = 2400 * minuteRate;
            var overtimeEarned = (thisWeekMinutesWorked - 2400) * overtimeMinuteRate;
            this.set('regular_earned', regularEarned);
            this.set('overtime_earned', overtimeEarned);
            this.set('total_earned', (regularEarned + overtimeEarned).toFixed(2));
        }
        else {
            this.set('regular_earned', thisWeekMinutesWorked * minuteRate);
            this.set('total_earned', (thisWeekMinutesWorked * minuteRate).toFixed(2));
        }
        this.set('thisWeekMinutesWorked', thisWeekMinutesWorked);
        console.log(thisWeekMinutesWorked);
        var timeWorked = '0 HOURS';
        if (thisWeekMinutesWorked)
            timeWorked = shiftService.calculateShiftHoursWorked(false, false, thisWeekMinutesWorked).time_worked;
        this.set('hours_worked', timeWorked);
    };
    HomeModel.prototype.processInvoices = function (invoices) {
        console.log('in process invoices');
        while (this.invoices.length)
            this.invoices.pop();
        var user = JSON.parse(appSettings.getString('userData'));
        //let invoicesArray = new ObservableArray();
        this.set('invoicedShiftsByFamilyMap', {});
        for (var i in invoices) {
            invoices[i].id = i;
            invoices[i].shifts = [];
            invoices[i].family_name = user.families[invoices[i].family_id].name;
            invoices[i].date_created_pretty = moment(invoices[i].date_created).format('MMM Do, YYYY');
            for (var s = 0; invoices[i].shift_ids.length > s; s++) {
                if (!this.invoicedShiftsByFamilyMap[invoices[i].family_id])
                    this.invoicedShiftsByFamilyMap[invoices[i].family_id] = {};
                this.invoicedShiftsByFamilyMap[invoices[i].family_id][invoices[i].shift_ids[s]] = true;
                var shift = this.addedShiftsMap[invoices[i].shift_ids[s]];
                shift.contribution = shift.contributions[invoices[i].family_id];
                shift.invoice_title_display = moment(shift.start_time).format('M/D/YY') + ': ' + shift.display_hours;
                shift.invoiced = true;
                invoices[i].shifts.push(shift);
            }
            // this is required to make the UI respect the loading indicator.
            invoices[i].loading = false;
            if (!invoices[i].sent)
                invoices[i].sent = false;
            this.invoiceMap[i] = invoices[i];
            var isAdded = false;
            //invoicesArray.push(invoices[i]);
            this.invoices.push(observable_1.fromObject(invoices[i]));
            //this.invoices.push(observableFromObject(invoices[i]));
        }
        this.invoices.sort(function (a, b) {
            if (moment(a.date_created) < moment(b.date_created)) {
                return 1;
            }
            else if (moment(a.date_created) > moment(b.date_created)) {
                return -1;
            }
        });
        console.log(this.invoices.length);
        // console.log('invoicesArray lenght ' + invoicesArray.length);
        // this.set('invoices', invoicesArray);
        // empty this and repopulate it.
        this.set('uninvoicedShiftsByFamilyMap', {});
        for (var shift_id in this.addedShiftsMap) {
            for (var family_id in this.familiesMap) {
                if (!this.uninvoicedShiftsByFamilyMap[family_id])
                    this.uninvoicedShiftsByFamilyMap[family_id] = {};
                if (!this.invoicedShiftsByFamilyMap[family_id] || !this.invoicedShiftsByFamilyMap[family_id][shift_id]) {
                    var myShift = this.addedShiftsMap[shift_id];
                    var contribution = false;
                    if (myShift.contributions)
                        contribution = myShift.contributions[family_id];
                    console.log(contribution);
                    if (contribution && contribution != '0')
                        this.uninvoicedShiftsByFamilyMap[family_id][shift_id] = true;
                }
            }
        }
        // console.log('INVOICED SHIFTS BY FAMILY')
        // console.dir(JSON.stringify(this.invoicedShiftsByFamilyMap));
        // console.log("UNINVOICED SHIFTS BY FAMILY")
        // console.dir(JSON.stringify(this.uninvoicedShiftsByFamilyMap));
    };
    return HomeModel;
}(observable_1.Observable));
exports.HomeModel = HomeModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9tZS1tb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvbWUtbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSw4Q0FBOEc7QUFDOUcsMERBQXNEO0FBR3RELG9DQUFzQztBQUN0QyxrREFBb0Q7QUFDcEQsK0JBQWlDO0FBQ2pDLGdDQUFrQztBQUNsQyxnQ0FBa0M7QUFFbEMsa0NBQTBDO0FBQzFDLG9DQUFzQztBQUN0QyxxQ0FBa0M7QUFNbEMsdURBQTJEO0FBQzNELHlEQUF1RDtBQUt2RCxvREFBc0Q7QUFDdEQsSUFBSSxXQUF3QixDQUFDO0FBQzdCLElBQUksWUFBMEIsQ0FBQztBQUMvQixJQUFJLGlCQUE4QixDQUFDO0FBQ25DLElBQUksd0JBQXdCLENBQUM7QUFDN0IsSUFBSSxXQUFXLENBQUM7QUFDaEIsSUFBSSxRQUFnQixDQUFDO0FBQ3JCLElBQUksT0FBa0IsQ0FBQztBQUN2QixJQUFJLGFBQTRCLENBQUM7QUFDakMsSUFBSSxZQUFZLENBQUM7QUFFakI7SUFBK0IsNkJBQVU7SUFDckM7UUFBQSxZQUNJLGlCQUFPLFNBd0JWO1FBR00saUJBQVcsR0FBVyxVQUFVLEdBQUcsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwRixVQUFJLEdBQVMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDM0Qsa0JBQVksR0FBVyxDQUFDLENBQUM7UUFDekIsMkJBQXFCLEdBQVcsQ0FBQyxDQUFDO1FBQ2xDLGtCQUFZLEdBQVcsSUFBSSxDQUFDO1FBQzVCLG9CQUFjLEdBQVcsQ0FBQyxDQUFDO1FBQzNCLHFCQUFlLEdBQVUsQ0FBQyxDQUFDO1FBQzNCLG1CQUFhLEdBQVcsVUFBVSxDQUFDO1FBQ25DLGNBQVEsR0FBZ0MsSUFBSSxrQ0FBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hF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QUFDO1lBQ3ZDLEdBQUcsQ0FBQyxDQUFDLElBQUksU0FBUyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUNyQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNuRyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3JHLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQzVDLElBQUksWUFBWSxHQUFPLEtBQUssQ0FBQztvQkFDN0IsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQzt3QkFBQyxZQUFZLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDM0UsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztvQkFDMUIsRUFBRSxDQUFDLENBQUMsWUFBWSxJQUFJLFlBQVksSUFBSSxHQUFHLENBQUM7d0JBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQztnQkFDMUcsQ0FBQztZQUNMLENBQUM7UUFDTCxDQUFDO1FBQ0QsMkNBQTJDO1FBQzNDLCtEQUErRDtRQUMvRCw2Q0FBNkM7UUFDN0MsaUVBQWlFO0lBQ3JFLENBQUM7SUFFTCxnQkFBQztBQUFELENBQUMsQUF2dUNELENBQStCLHVCQUFVLEdBdXVDeEM7QUF2dUNZLDhCQUFTIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGFnZSB9IGZyb20gJ3VpL3BhZ2UnO1xuaW1wb3J0IHtFdmVudERhdGEsIE9ic2VydmFibGUsIFByb3BlcnR5Q2hhbmdlRGF0YSwgZnJvbU9iamVjdCBhcyBvYnNlcnZhYmxlRnJvbU9iamVjdH0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJztcbmltcG9ydCB7T2JzZXJ2YWJsZUFycmF5fSBmcm9tICdkYXRhL29ic2VydmFibGUtYXJyYXknO1xuaW1wb3J0IHsgR2VzdHVyZVR5cGVzLCBQYW5HZXN0dXJlRXZlbnREYXRhIH0gZnJvbSBcInVpL2dlc3R1cmVzXCI7XG5pbXBvcnQgKiBhcyBmaXJlYmFzZSBmcm9tICduYXRpdmVzY3JpcHQtcGx1Z2luLWZpcmViYXNlJztcbmltcG9ydCAqIGFzIGRpYWxvZ3MgZnJvbSAndWkvZGlhbG9ncyc7XG5pbXBvcnQgKiBhcyBhcHBTZXR0aW5ncyBmcm9tICdhcHBsaWNhdGlvbi1zZXR0aW5ncyc7XG5pbXBvcnQgKiBhcyBtb21lbnQgZnJvbSAnbW9tZW50JztcbmltcG9ydCAqIGFzIGZyYW1lIGZyb20gJ3VpL2ZyYW1lJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZpbGUtc3lzdGVtJztcbmltcG9ydCB7IEFuaW1hdGlvbkRlZmluaXRpb24gfSBmcm9tIFwidWkvYW5pbWF0aW9uXCI7XG5pbXBvcnQgeyBBbmltYXRpb25DdXJ2ZSB9IGZyb20gXCJ1aS9lbnVtc1wiO1xuaW1wb3J0ICogYXMgYnVpbGRlciBmcm9tICd1aS9idWlsZGVyJztcbmltcG9ydCB7IHNjcmVlbiB9IGZyb20gXCJwbGF0Zm9ybVwiO1xuaW1wb3J0IHsgU3RhY2tMYXlvdXQgfSBmcm9tICd1aS9sYXlvdXRzL3N0YWNrLWxheW91dCc7XG5pbXBvcnQgeyBHcmlkTGF5b3V0IH0gZnJvbSAndWkvbGF5b3V0cy9ncmlkLWxheW91dCc7XG5pbXBvcnQgeyBTY3JvbGxWaWV3LCBTY3JvbGxFdmVudERhdGEgfSBmcm9tICd1aS9zY3JvbGwtdmlldyc7XG5pbXBvcnQgeyBUZXh0RmllbGQgfSBmcm9tICd1aS90ZXh0LWZpZWxkJztcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAndWkvbGFiZWwnO1xuaW1wb3J0IHsgVXNlclNlcnZpY2UsIFVzZXIgfSBmcm9tICcuLi9zaGFyZWQvdXNlci5zZXJ2aWNlJztcbmltcG9ydCB7IFNoaWZ0U2VydmljZSB9IGZyb20gJy4uL3NoYXJlZC9zaGlmdC5zZXJ2aWNlJztcbmltcG9ydCB7IFJhZFNpZGVEcmF3ZXIgfSBmcm9tIFwibmF0aXZlc2NyaXB0LXRlbGVyaWstdWkvc2lkZWRyYXdlclwiO1xuaW1wb3J0IHsgU2V0dGluZ3NNb2RlbCB9IGZyb20gJy4uL21vZGFscy9zZXR0aW5ncy9zZXR0aW5ncy1tb2RlbCc7XG5pbXBvcnQgeyBTZWxlY3RlZEluZGV4Q2hhbmdlZEV2ZW50RGF0YSwgVGFiVmlldyB9IGZyb20gXCJ1aS90YWItdmlld1wiO1xuaW1wb3J0IHsgU2xpZGVyIH0gZnJvbSBcInVpL3NsaWRlclwiO1xuaW1wb3J0ICogYXMgcGlja2VyIGZyb20gXCIuLi9jb21wb25lbnRzL3BpY2tlci9waWNrZXJcIjtcbmxldCB1c2VyU2VydmljZTogVXNlclNlcnZpY2U7XG5sZXQgc2hpZnRTZXJ2aWNlOiBTaGlmdFNlcnZpY2U7XG5sZXQgc2V0dGluZ3NDb250YWluZXI6IFN0YWNrTGF5b3V0O1xubGV0IHNldHRpbmdzT3ZlcmxheUNvbnRhaW5lcjtcbmxldCBkaXNtaXNzTm90ZTtcbmxldCBibHVyVmlldzogVUlWaWV3O1xubGV0IE15TW9kZWw6IEhvbWVNb2RlbDtcbmxldCBzZXR0aW5nc01vZGVsOiBTZXR0aW5nc01vZGVsO1xubGV0IGVkaXRpbmdTaGlmdDtcbmRlY2xhcmUgdmFyIFVJVmlzdWFsRWZmZWN0VmlldzphbnksIFVJQmx1ckVmZmVjdDphbnksIFVJVmlld0F1dG9yZXNpemluZ0ZsZXhpYmxlSGVpZ2h0OmFueSwgVUlWaWV3QXV0b3Jlc2l6aW5nRmxleGlibGVXaWR0aDphbnksIFVJQmx1ckVmZmVjdFN0eWxlTGlnaHQ6YW55O1xuZXhwb3J0IGNsYXNzIEhvbWVNb2RlbCBleHRlbmRzIE9ic2VydmFibGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBNeU1vZGVsID0gdGhpcztcbiAgICAgICAgLy9hbGxTaGlmdHNNb2RlbCA9IG5ldyBBbGxTaGlmdHNNb2RlbCgpO1xuICAgICAgICB1c2VyU2VydmljZSA9IG5ldyBVc2VyU2VydmljZSgpO1xuICAgICAgICBzaGlmdFNlcnZpY2UgPSBuZXcgU2hpZnRTZXJ2aWNlKCk7XG4gICAgICAgIGxldCB1c2VyID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpO1xuICAgICAgICBmb3IgKGxldCBpIGluIHVzZXIuZmFtaWxpZXMpIHtcbiAgICAgICAgICAgIHVzZXIuZmFtaWxpZXNbaV0uaWQgPSBpO1xuICAgICAgICAgICAgaWYgKCF1c2VyLmZhbWlsaWVzW2ldLmRlbGV0ZWQpIHRoaXMuZmFtaWxpZXNNYXBbaV0gPSB1c2VyLmZhbWlsaWVzW2ldO1xuXG4gICAgICAgICAgICBsZXQgZmFtaWx5ID0gb2JzZXJ2YWJsZUZyb21PYmplY3QodXNlci5mYW1pbGllc1tpXSk7XG4gICAgICAgICAgICBpZiAoIXVzZXIuZmFtaWxpZXNbaV0uZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZmFtaWxpZXMucHVzaChmYW1pbHkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmZhbWlsaWVzLmxlbmd0aCA9PSAxKSB0aGlzLmZhbWlsaWVzLmdldEl0ZW0oMCkuc2V0KCdqdXN0T25lRmFtaWx5JywgdHJ1ZSk7XG4gICAgICAgIHRoaXMuZmFtaWxpZXMuZ2V0SXRlbSgwKS5zZXQoJ2lzRmlyc3QnLCB0cnVlKTsgXG4gICAgICAgIHRoaXMuc2V0KCdpc0xvYWRpbmcnLCB0cnVlKTtcbiAgICAgICAgc2hpZnRTZXJ2aWNlLmJ1aWxkQXBwRGF0YSh0cnVlKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICB0aGlzLmdldFRoaXNXZWVrU2hpZnRzKCk7XG4gICAgICAgICAgICB0aGlzLnNldCgnaXNMb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgcGFnZTogUGFnZTtcbiAgICBwdWJsaWMgaGVhZGVyX3RleHQ6IHN0cmluZyA9ICdXZWVrIG9mICcgKyBtb21lbnQoKS5zdGFydE9mKCd3ZWVrJykuZm9ybWF0KCdkZGRkIFt0aGVdIERvJyk7XG4gICAgcHVibGljIHVzZXI6IFVzZXIgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndXNlckRhdGEnKSk7XG4gICAgcHVibGljIGhvdXJzX3dvcmtlZDogbnVtYmVyID0gMDtcbiAgICBwdWJsaWMgdGhpc1dlZWtNaW51dGVzV29ya2VkOiBudW1iZXIgPSAwO1xuICAgIHB1YmxpYyB0b3RhbF9lYXJuZWQ6IG51bWJlciA9IDAuMDA7XG4gICAgcHVibGljIHJlZ3VsYXJfZWFybmVkOiBudW1iZXIgPSAwO1xuICAgIHB1YmxpYyBvdmVydGltZV9lYXJuZWQ6IG51bWJlcj0gMDtcbiAgICBwdWJsaWMgc2V0dGluZ3NUaXRsZTogc3RyaW5nID0gJ1NldHRpbmdzJztcbiAgICBwdWJsaWMgZmFtaWxpZXM6IE9ic2VydmFibGVBcnJheTxPYnNlcnZhYmxlPiA9IG5ldyBPYnNlcnZhYmxlQXJyYXkoW10pO1xuICAgIHB1YmxpYyBmYW1pbGllc01hcDogYW55ID0ge307XG4gICAgcHVibGljIGVkaXRpbmdGYW1pbHk6IE9ic2VydmFibGUgPSBvYnNlcnZhYmxlRnJvbU9iamVjdCh7fSlcbiAgICBwdWJsaWMgY2xvY2tlZEluOiBhbnkgPSBmYWxzZTtcbiAgICBwdWJsaWMgdGhpc1dlZWs6IE9ic2VydmFibGVBcnJheTxPYnNlcnZhYmxlPiA9IG5ldyBPYnNlcnZhYmxlQXJyYXkoW10pO1xuICAgIHB1YmxpYyBzaGlmdHM6IE9ic2VydmFibGVBcnJheTxPYnNlcnZhYmxlPiA9IG5ldyBPYnNlcnZhYmxlQXJyYXkoW10pO1xuICAgIHB1YmxpYyBhZGRlZFNoaWZ0c01hcCA9IHt9O1xuICAgIHB1YmxpYyBpc0xvYWRpbmc6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBwdWJsaWMgc2VsZWN0ZWRJbmRleDogbnVtYmVyID0gMDtcbiAgICBwdWJsaWMgbXlBcnJheSA9IFsnaGknLCAnd29ybGQnLCAnd291bGQgeW91IGxpa2UnLCAncGVhcyddO1xuICAgIHB1YmxpYyBzZWN0aW9uZWRTaGlmdHM6IE9ic2VydmFibGVBcnJheTxPYnNlcnZhYmxlPiA9IG5ldyBPYnNlcnZhYmxlQXJyYXkoW10pO1xuXG4gICAgcHVibGljIHNlbGVjdGVkRmFtaWx5VG9JbnZvaWNlOiBhbnkgPSBmYWxzZTtcbiAgICBwdWJsaWMgdW5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwOiBhbnkgPSB7fTtcbiAgICBwdWJsaWMgaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcDogYW55ID0ge307XG4gICAgcHVibGljIHVuaW52b2ljZWRTaGlmdHM6IEFycmF5PGFueT4gPSBbXTtcbiAgICBwdWJsaWMgaW52b2ljZVRvdGFsOiBudW1iZXI7XG4gICAgcHVibGljIGludm9pY2VzOiBPYnNlcnZhYmxlQXJyYXk8T2JzZXJ2YWJsZT4gPSBuZXcgT2JzZXJ2YWJsZUFycmF5KFtdKTtcbiAgICBwdWJsaWMgaW52b2ljZU1hcCA9IHt9O1xuXG4gICAgcHVibGljIGFsbFNoaWZ0czogT2JzZXJ2YWJsZUFycmF5PE9ic2VydmFibGU+ID0gbmV3IE9ic2VydmFibGVBcnJheShbXSk7XG4gICAgcHVibGljIGFsbFNoaWZ0c01hcDogYW55ID0ge307XG4gICAgcHVibGljIHdlZWtzID0ge307XG5cbiAgICBcblxuICAgIHB1YmxpYyByZWJ1aWxkQWxsRGF0YSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHNoaWZ0U2VydmljZS5idWlsZEFwcERhdGEodHJ1ZSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2V0VGhpc1dlZWtTaGlmdHMoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnaXNMb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmcmVzaCBpbnZvaWNlcyBsZW5ndGggJyArIEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICBcbiAgICB9XG5cbiAgICBwdWJsaWMgcGFnZUxvYWRlZChteVBhZ2U6IFBhZ2UpIHtcbiAgICAgICAgdGhpcy5wYWdlID0gbXlQYWdlO1xuICAgICAgICB0aGlzLnBhZ2UuYmluZGluZ0NvbnRleHQgPSB0aGlzO1xuICAgICAgICB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ3RhYnZpZXcnKS5vbignc2VsZWN0ZWRJbmRleENoYW5nZWQnLCAoYXJnczpTZWxlY3RlZEluZGV4Q2hhbmdlZEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3NlbGVjdGVkSW5kZXgnLCBhcmdzLm5ld0luZGV4KTtcbiAgICAgICAgICAgIGlmIChhcmdzLm5ld0luZGV4ID09IDApIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRUaGlzV2Vla1NoaWZ0cygpXG4gICAgICAgICAgICAgICAgfSwgMTApXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgc2hpZnRzID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzU2hpZnRzKHNoaWZ0cyk7XG4gICAgICAgICAgICAgICAgfSwgMTApXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICB9XG5cbiAgICBwdWJsaWMgc2hvd01lbnUoKSB7XG4gICAgICAgIGxldCBzaWRlRHJhd2VyOiBSYWRTaWRlRHJhd2VyID0gPFJhZFNpZGVEcmF3ZXI+KCBmcmFtZS50b3Btb3N0KCkuZ2V0Vmlld0J5SWQoXCJkcmF3ZXJcIikpO1xuICAgICAgICBzaWRlRHJhd2VyLnNob3dEcmF3ZXIoKTtcbiAgICB9ICBcblxuICAgIHB1YmxpYyBsb2dVc2VyKCkge1xuICAgICAgICBjb25zb2xlLmRpcihKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndXNlckRhdGEnKSkpO1xuICAgICAgICBjb25zb2xlLmxvZyhKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpKVxuICAgIH1cblxuICAgIHB1YmxpYyBlZGl0UmF0ZXMoKSB7XG4gICAgICAgIHRoaXMuc2hvd1NldHRpbmdzKCcvdmlld3MvY29tcG9uZW50cy9lZGl0cmF0ZXMvZWRpdHJhdGVzLnhtbCcpO1xuICAgICAgICB0aGlzLnNldCgnc2V0dGluZ3NUaXRsZScsICdFZGl0IFJhdGVzJyk7XG4gICAgfVxuXG4gICAgcHVibGljIHNhdmVSYXRlcygpIHtcbiAgICAgICAgbGV0IGRhdGEgPSB7XG4gICAgICAgICAgICBob3VybHlSYXRlOiB0aGlzLmdldCgndXNlcicpLmhvdXJseVJhdGUsXG4gICAgICAgICAgICBvdmVydGltZVJhdGU6IHRoaXMuZ2V0KCd1c2VyJykub3ZlcnRpbWVSYXRlXG4gICAgICAgIH1cbiAgICAgICAgdXNlclNlcnZpY2UudXBkYXRlVXNlcihkYXRhKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVmcmVzaERhdGEoYXJncykge1xuICAgICAgICB2YXIgcHVsbFJlZnJlc2ggPSBhcmdzLm9iamVjdDtcbiAgICAgICAgc2hpZnRTZXJ2aWNlLmJ1aWxkQXBwRGF0YSh0cnVlKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICB0aGlzLmdldFRoaXNXZWVrU2hpZnRzKCk7XG4gICAgICAgICAgICB0aGlzLnNldCgnaXNMb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpKTtcbiAgICAgICAgICAgIHB1bGxSZWZyZXNoLnJlZnJlc2hpbmcgPSBmYWxzZTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgZWRpdEZhbWlseShhcmdzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdmYW1pbGllcz8nKVxuICAgICAgICAvLyAndGhpcycgaXMgbm93IHRoZSBmYW1pbHkgeW91IHRhcHBlZCBmcm9tIHRoZSByZXBlYXRlclxuICAgICAgICBsZXQgZmFtaWxpZXMgPSBNeU1vZGVsLmZhbWlsaWVzO1xuXG4gICAgICAgIGxldCBmYW1pbHkgPSBmYW1pbGllcy5maWx0ZXIoaXRlbSA9PiBpdGVtLmdldCgnaWQnKSA9PT0gYXJncy5vYmplY3QuaWQpWzBdO1xuICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ0ZhbWlseScsIGZhbWlseSk7XG4gICAgICAgIE15TW9kZWwuc2hvd1NldHRpbmdzKCcvdmlld3MvY29tcG9uZW50cy9lZGl0ZmFtaWx5L2VkaXRmYW1pbHkueG1sJyk7XG4gICAgICAgIE15TW9kZWwuc2V0KCdzZXR0aW5nc1RpdGxlJywgJ0VkaXQgRmFtaWx5Jyk7XG4gICAgICAgIE15TW9kZWwucGFnZS5nZXRWaWV3QnlJZCgnZWRpdGluZ19mYW1pbHlfdmlldycpLmJpbmRpbmdDb250ZXh0ID0gTXlNb2RlbC5lZGl0aW5nRmFtaWx5O1xuICAgIH1cblxuICAgIHB1YmxpYyBhZGRGYW1pbHkoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdlZGl0aW5nRmFtaWx5Jywgb2JzZXJ2YWJsZUZyb21PYmplY3Qoe30pKTtcbiAgICAgICAgdGhpcy5zaG93U2V0dGluZ3MoJy92aWV3cy9jb21wb25lbnRzL2VkaXRmYW1pbHkvZWRpdGZhbWlseS54bWwnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3NldHRpbmdzVGl0bGUnLCAnQWRkIEZhbWlseScpO1xuICAgICAgICBNeU1vZGVsLnBhZ2UuZ2V0Vmlld0J5SWQoJ2VkaXRpbmdfZmFtaWx5X3ZpZXcnKS5iaW5kaW5nQ29udGV4dCA9IE15TW9kZWwuZWRpdGluZ0ZhbWlseTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2F2ZUZhbWlseSgpIHtcbiAgICAgICAgbGV0IGRhdGE6YW55ID0ge1xuICAgICAgICAgICAgbmFtZTogdGhpcy5nZXQoJ2VkaXRpbmdGYW1pbHknKS5nZXQoJ25hbWUnKSxcbiAgICAgICAgICAgIGVtYWlsOiB0aGlzLmdldCgnZWRpdGluZ0ZhbWlseScpLmdldCgnZW1haWwnKVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5lZGl0aW5nRmFtaWx5LmdldCgnaWQnKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2VkaXRpbmcgYSBmYW1pbHknKTtcbiAgICAgICAgICAgIHVzZXJTZXJ2aWNlLnNhdmVGYW1pbHkodGhpcy5lZGl0aW5nRmFtaWx5LmdldCgnaWQnKSwgZGF0YSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGZhbWlsaWVzID0gdGhpcy5mYW1pbGllc1xuICAgICAgICAgICAgICAgIGZhbWlsaWVzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnaWQnKSA9PSB0aGlzLmVkaXRpbmdGYW1pbHkuZ2V0KCdpZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnNldCgnbmFtZScsIGRhdGEubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnNldCgnZW1haWwnLCBkYXRhLmVtYWlsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZVNldHRpbmdzKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2FkZGluZyBhIGZhbWlseScpO1xuICAgICAgICAgICAgbGV0IGZhbWlsaWVzID0gdGhpcy5mYW1pbGllcztcbiAgICAgICAgICAgIHVzZXJTZXJ2aWNlLmFkZEZhbWlseShkYXRhKS50aGVuKChyZXN1bHQ6YW55KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGZhbWlsaWVzID0gdGhpcy5mYW1pbGllcztcbiAgICAgICAgICAgICAgICBkYXRhLmlkID0gcmVzdWx0LmtleTtcbiAgICAgICAgICAgICAgICBmYW1pbGllcy5wdXNoKG9ic2VydmFibGVGcm9tT2JqZWN0KGRhdGEpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnZmFtaWxpZXNDb3VudCcsIGZhbWlsaWVzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgaWYgKGZhbWlsaWVzLmxlbmd0aCA+IDEpIHRoaXMuZmFtaWxpZXMuZ2V0SXRlbSgwKS5zZXQoJ2p1c3RPbmVGYW1pbHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgcmVtb3ZlRmFtaWx5KGFyZ3MpIHtcbiAgICAgICAgbGV0IGZhbUlkID0gYXJncy5vYmplY3QuaWQ7XG4gICAgICAgIGRpYWxvZ3MuY29uZmlybSgnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHJlbW92ZSB0aGlzIGZhbWlseT8nKS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICB1c2VyU2VydmljZS51cGRhdGVGYW1pbHkoZmFtSWQsIHtkZWxldGVkOiB0cnVlfSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBmYW1pbGllcyA9IE15TW9kZWwuZmFtaWxpZXM7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZWxldGVJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgZmFtaWxpZXMuZm9yRWFjaCgoZWxlbWVudCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnaWQnKSA9PSBmYW1JZCkgZGVsZXRlSW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGZhbWlsaWVzLnNwbGljZShkZWxldGVJbmRleCwgMSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZhbWlsaWVzLmxlbmd0aCA9PSAxKSBNeU1vZGVsLmZhbWlsaWVzLmdldEl0ZW0oMCkuc2V0KCdqdXN0T25lRmFtaWx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdmYW1pbGllcycsIGZhbWlsaWVzKTtcbiAgICAgICAgICAgICAgICAgICAgTXlNb2RlbC5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBnZXRUaGlzV2Vla1NoaWZ0cyhyZWZyZXNoRGF0YT8pIHtcbiAgICAgICAgaWYgKHJlZnJlc2hEYXRhKSB7XG4gICAgICAgICAgICB0aGlzLnNldCgnaXNMb2FkaW5nJywgdHJ1ZSk7XG4gICAgICAgICAgICBzaGlmdFNlcnZpY2UuZ2V0U2hpZnRzKDE1LCB0cnVlKS50aGVuKHNoaWZ0cyA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2lzTG9hZGluZycsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTaGlmdHMoc2hpZnRzKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgc2hpZnRzID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaGlmdHMgbGVuZ3RoICsgJyArIHNoaWZ0cy5sZW5ndGgpO1xuICAgICAgICAgICAgdGhpcy5wcm9jZXNzU2hpZnRzKHNoaWZ0cyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfVxuXG4gICAgLyoqKioqKioqKioqKioqKioqKiBJTlZPSUNFIEZVTkNUSU9OUyAqKioqKioqKioqKioqKioqKiovXG5cbiAgICBwdWJsaWMgaW52b2ljZU9wdGlvbnMoYXJncykge1xuICAgICAgICBsZXQgaW52b2ljZSA9IHRoaXMuaW52b2ljZXMuZ2V0SXRlbShhcmdzLmluZGV4KTtcbiAgICAgICAgaWYgKGludm9pY2UpIHtcbiAgICAgICAgICAgIGxldCBhY3Rpb25zID0gW107XG4gICAgICAgICAgICBpZiAoIWludm9pY2UuZ2V0KCdwYWlkJykpIHtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnB1c2goJ01hcmsgQXMgUGFpZCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnB1c2goJ1VubWFyayBBcyBQYWlkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWludm9pY2UuZ2V0KCdzZW50JykpIHtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnB1c2goJ1NlbmQgdG8gJyArIHRoaXMuZmFtaWxpZXNNYXBbaW52b2ljZS5nZXQoJ2ZhbWlseV9pZCcpXS5uYW1lKTtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnB1c2goJ0VkaXQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpbnZvaWNlLmdldCgncGFpZCcpKSBhY3Rpb25zLnB1c2goJ1JlLXNlbmQgdG8gJyArIHRoaXMuZmFtaWxpZXNNYXBbaW52b2ljZS5nZXQoJ2ZhbWlseV9pZCcpXS5uYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFjdGlvbnMucHVzaCgnVmlldycpO1xuICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCdEZWxldGUnKTtcblxuICAgICAgICAgICAgZGlhbG9ncy5hY3Rpb24odGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmdldCgnZmFtaWx5X2lkJyldLm5hbWUgKyAnIGZvciAkJyArIGludm9pY2UuZ2V0KCd0b3RhbCcpLCBcIkNhbmNlbFwiLCBhY3Rpb25zKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PSAnRWRpdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy90aGlzLnNob3dFZGl0U2hpZnQoZmFsc2UsIHNoaWZ0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PSAnRGVsZXRlJykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbXNnID0gJ0FyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgdGhpcyBpbnZvaWNlPyc7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnZvaWNlLmdldCgncGFpZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gJyBZb3VcXCd2ZSBtYXJrZWQgdGhpcyBpbnZvaWNlIGFzIHBhaWQsIHNvIHJlbWVtYmVyIHRvIGFkanVzdCB5b3VyIHJlY29yZHMgYWNjb3JkaW5nbHkuJzsgXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW52b2ljZS5nZXQoJ3NlbnQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9ICcgWW91XFwndmUgYWxyZWFkeSBzZW50IHRoaXMgaW52b2ljZSB0byAnICsgdGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmdldCgnZmFtaWx5X2lkJyldLm5hbWUgKyAnLCBzbyBwbGVhc2UgcmVhY2ggb3V0IHRvIHRoZW0gZGlyZWN0bHkgaW5mb3JtaW5nIHRoZW0gdGhhdCB0aGV5IGNhbiBkaXNjYXJkIHRoaXMgaW52b2ljZS4nO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZGlhbG9ncy5hY3Rpb24obXNnLCBcIkNhbmNlbFwiLCBbXCJEbyBpdC5cIl0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgPT0gJ0RvIGl0LicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzaGlmdFNlcnZpY2UuZGVsZXRlU2hpZnQoc2hpZnQuaWQpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdGhpcy5wcm9jZXNzU2hpZnRzKEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT0gJ01hcmsgQXMgUGFpZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLnVwZGF0ZUludm9pY2UoaW52b2ljZS5nZXQoJ2lkJyksIHtwYWlkOiB0cnVlfSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgncGFpZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy90aGlzLnByb2Nlc3NJbnZvaWNlcyhKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09ICdVbm1hcmsgQXMgUGFpZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLnVwZGF0ZUludm9pY2UoaW52b2ljZS5nZXQoJ2lkJyksIHtwYWlkOiBmYWxzZX0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdsb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ3BhaWQnLCBmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdGhpcy5wcm9jZXNzSW52b2ljZXMoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PSAnVmlldycpIHtcbiAgICAgICAgICAgICAgICAgICAgZnJhbWUudG9wbW9zdCgpLm5hdmlnYXRlKCcvdmlld3MvaW52b2ljZS9pbnZvaWNlJyk7XG5cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PSAnU2VuZCB0byAnICsgdGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmdldCgnZmFtaWx5X2lkJyldLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZW5kSW52b2ljZShpbnZvaWNlLmdldCgnaWQnKSwgaW52b2ljZSk7XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0U2VydmljZS51cGRhdGVJbnZvaWNlKGludm9pY2UuZ2V0KCdpZCcpLCB7c2VudDogdHJ1ZX0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdzZW50JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL3RoaXMucHJvY2Vzc0ludm9pY2VzKEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydCgnVGhlIGludm9pY2UgaGFzIGJlZW4gc2VudCEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdsb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09ICdSZS1zZW5kIHRvICcgKyB0aGlzLmZhbWlsaWVzTWFwW2ludm9pY2UuZ2V0KCdmYW1pbHlfaWQnKV0ubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbmRJbnZvaWNlKGludm9pY2UuZ2V0KCdpZCcpLCBpbnZvaWNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ1dlIHNlbnQgYSBmcmllbmRseSByZW1pbmRlciB0byAnICsgdGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmdldCgnZmFtaWx5X2lkJyldLm5hbWUpXG4gICAgICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgc2hvd0NyZWF0ZUludm9pY2UoKSB7XG4gICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZEZhbWlseVRvSW52b2ljZScsIGZhbHNlKTtcbiAgICAgICAgTXlNb2RlbC5zZXQoJ3VuaW52b2ljZWRTaGlmdHMnLCBbXSk7XG4gICAgICAgIE15TW9kZWwuc2hvd1NldHRpbmdzKCcvdmlld3MvY29tcG9uZW50cy9lZGl0aW52b2ljZS9lZGl0aW52b2ljZS54bWwnKTtcbiAgICAgICAgTXlNb2RlbC5zZXQoJ3NldHRpbmdzVGl0bGUnLCAnQ3JlYXRlIEludm9pY2UnKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgY2hvb3NlRmFtaWx5VG9JbnZvaWNlKCkge1xuICAgICAgICB0aGlzLmRpc21pc3NTb2Z0SW5wdXRzKCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNraW5nJywgJ2xpc3QnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlclRpdGxlJywgJ0Nob29zZSBGYW1pbHknKTtcbiAgICAgICAgbGV0IHBpY2tlckl0ZW1zID0gW107XG4gICAgICAgIHRoaXMuZmFtaWxpZXMuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgIHBpY2tlckl0ZW1zLnB1c2goaXRlbS5nZXQoJ25hbWUnKSk7XG4gICAgICAgIH0pXG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJJdGVtcycsIHBpY2tlckl0ZW1zKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmVUZXh0JywgJ0RvbmUnKTtcbiAgICAgICAgcGlja2VyLmFuaW1hdGVTaG93KCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJDYW5jZWwnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICB9KVxuICAgICAgICAvLyBlbXB0eSB0aGUgdW5pbnZvaWNlZFNoaWZ0cyBhcnJheSBpZiB0aGVyZXMgYW55dGhpbmcgaW4gaXQuXG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB3aGlsZSAodGhpcy51bmludm9pY2VkU2hpZnRzLmxlbmd0aCkgdGhpcy51bmludm9pY2VkU2hpZnRzLnBvcCgpO1xuICAgICAgICAgICAgbGV0IHVuaW52b2ljZWRTaGlmdHNBcnJheSA9IFtdO1xuICAgICAgICAgICAgbGV0IGZhbWlseSA9IHRoaXMuZmFtaWxpZXNNYXBbdGhpcy5mYW1pbGllcy5nZXRJdGVtKHRoaXMucGFnZS5nZXRWaWV3QnlJZCgnbGlzdHBpY2tlcicpLnNlbGVjdGVkSW5kZXgpLmdldCgnaWQnKV07XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkRmFtaWx5VG9JbnZvaWNlID0gZmFtaWx5O1xuICAgICAgICAgICAgbGV0IGludm9pY2VUb3RhbCA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciBpIGluIHRoaXMudW5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ZhbWlseS5pZF0pIHtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hZGRlZFNoaWZ0c01hcFtpXS5lbmRfdGltZSAmJiB0aGlzLmFkZGVkU2hpZnRzTWFwW2ldLmNvbnRyaWJ1dGlvbnNbZmFtaWx5LmlkXSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmFtaWx5Q29udHJpYnV0aW9uID0gdGhpcy5hZGRlZFNoaWZ0c01hcFtpXS5jb250cmlidXRpb25zW2ZhbWlseS5pZF07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkZWRTaGlmdHNNYXBbaV0uc2VsZWN0ZWRfZmFtaWx5X2NvbnRyaWJ1dGlvbiA9IGZhbWlseUNvbnRyaWJ1dGlvbjtcbiAgICAgICAgICAgICAgICAgICAgdW5pbnZvaWNlZFNoaWZ0c0FycmF5LnB1c2godGhpcy5hZGRlZFNoaWZ0c01hcFtpXSk7XG4gICAgICAgICAgICAgICAgICAgIGludm9pY2VUb3RhbCArPSArdGhpcy5hZGRlZFNoaWZ0c01hcFtpXS5zZWxlY3RlZF9mYW1pbHlfY29udHJpYnV0aW9uO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2V0KCdpbnZvaWNlVG90YWwnLCBpbnZvaWNlVG90YWwudG9GaXhlZCgyKSk7XG4gICAgICAgICAgICB0aGlzLnNldCgndW5pbnZvaWNlZFNoaWZ0cycsIHVuaW52b2ljZWRTaGlmdHNBcnJheSk7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgdW5zZWxlY3RVbmludm9pY2VkU2hpZnQoYXJncykge1xuICAgICAgICBpZiAoYXJncy5vYmplY3QuaWQpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHNbaV07XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0uaWQgPT0gYXJncy5vYmplY3QuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRhcHBlZEl0ZW06IEdyaWRMYXlvdXQgPSBhcmdzLm9iamVjdDtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludm9pY2VUb3RhbCA9IHBhcnNlRmxvYXQoTXlNb2RlbC5nZXQoJ2ludm9pY2VUb3RhbCcpKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2Rpc3BsYXllZCBpbnZvaWNlIHRvdGFsICcgKyBuZXdJbnZvaWNlVG90YWwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGFwcGVkSXRlbS5jbGFzc05hbWUgPT0gJ3VuaW52b2ljZWRfc2hpZnQgc2VsZWN0ZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXBwZWRJdGVtLmNsYXNzTmFtZSA9ICd1bmludm9pY2VkX3NoaWZ0JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uZG9fbm90X2ludm9pY2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SW52b2ljZVRvdGFsIC09IHBhcnNlRmxvYXQoaXRlbS5zZWxlY3RlZF9mYW1pbHlfY29udHJpYnV0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcHBlZEl0ZW0uY2xhc3NOYW1lID0gJ3VuaW52b2ljZWRfc2hpZnQgc2VsZWN0ZWQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5kb19ub3RfaW52b2ljZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SW52b2ljZVRvdGFsICs9IHBhcnNlRmxvYXQoaXRlbS5zZWxlY3RlZF9mYW1pbHlfY29udHJpYnV0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnaW52b2ljZVRvdGFsJywgbmV3SW52b2ljZVRvdGFsLnRvRml4ZWQoMikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBzYXZlSW52b2ljZSgpIHtcbiAgICAgICAgbGV0IHNoaWZ0X2lkcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgTXlNb2RlbC51bmludm9pY2VkU2hpZnRzLmxlbmd0aCA+IGk7IGkrKykge1xuICAgICAgICAgICAgbGV0IGl0ZW0gPSBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHNbaV07XG5cbiAgICAgICAgICAgIGlmICghaXRlbS5kb19ub3RfaW52b2ljZSkgc2hpZnRfaWRzLnB1c2goaXRlbS5pZCk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGFyZ3MgPSB7XG4gICAgICAgICAgICBzaGlmdF9pZHM6IHNoaWZ0X2lkcyxcbiAgICAgICAgICAgIGZhbWlseV9pZDogdGhpcy5nZXQoJ3NlbGVjdGVkRmFtaWx5VG9JbnZvaWNlJykuaWQsXG4gICAgICAgICAgICB0b3RhbDogdGhpcy5nZXQoJ2ludm9pY2VUb3RhbCcpLFxuICAgICAgICAgICAgcGFpZDogZmFsc2UsXG4gICAgICAgICAgICBkYXRlX2NyZWF0ZWQ6IG1vbWVudCgpLmZvcm1hdCgpXG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFhcmdzLnNoaWZ0X2lkcyB8fCAhYXJncy5zaGlmdF9pZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhbGVydCgnUGxlYXNlIHNlbGVjdCBvbmUgb3IgbW9yZSBzaGlmdHMgdG8gaW5jbHVkZSBpbiB0aGlzIGludm9pY2UuJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzaGlmdFNlcnZpY2UuY3JlYXRlSW52b2ljZShhcmdzKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTsgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpKTsgICAgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIFxuICAgIH1cblxuICAgIHB1YmxpYyBzYXZlQW5kU2VuZEludm9pY2UoKSB7XG4gICAgICAgIGxldCBzaGlmdF9pZHMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IE15TW9kZWwudW5pbnZvaWNlZFNoaWZ0cy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBpdGVtID0gTXlNb2RlbC51bmludm9pY2VkU2hpZnRzW2ldO1xuXG4gICAgICAgICAgICBpZiAoIWl0ZW0uZG9fbm90X2ludm9pY2UpIHNoaWZ0X2lkcy5wdXNoKGl0ZW0uaWQpO1xuICAgICAgICB9XG4gICAgICAgIGxldCBhcmdzID0ge1xuICAgICAgICAgICAgc2hpZnRfaWRzOiBzaGlmdF9pZHMsXG4gICAgICAgICAgICBmYW1pbHlfaWQ6IHRoaXMuZ2V0KCdzZWxlY3RlZEZhbWlseVRvSW52b2ljZScpLmlkLFxuICAgICAgICAgICAgdG90YWw6IHRoaXMuZ2V0KCdpbnZvaWNlVG90YWwnKSxcbiAgICAgICAgICAgIHBhaWQ6IGZhbHNlLFxuICAgICAgICAgICAgZGF0ZV9jcmVhdGVkOiBtb21lbnQoKS5mb3JtYXQoKSxcbiAgICAgICAgICAgIHNlbnQ6IHRydWVcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWFyZ3Muc2hpZnRfaWRzIHx8ICFhcmdzLnNoaWZ0X2lkcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFsZXJ0KCdQbGVhc2Ugc2VsZWN0IG9uZSBvciBtb3JlIHNoaWZ0cyB0byBpbmNsdWRlIGluIHRoaXMgaW52b2ljZS4nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNoaWZ0U2VydmljZS5jcmVhdGVJbnZvaWNlKGFyZ3MpLnRoZW4oKHJlc3VsdDphbnkpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VuZEludm9pY2UocmVzdWx0LmtleSlcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NJbnZvaWNlcyhKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkpOyAgICAgIFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9XG5cbiAgICBwdWJsaWMgc2VuZEludm9pY2UoaW52b2ljZV9pZCwgaW52b2ljZT8sIHJlc2VuZGluZz8pIHtcbiAgICAgICAgbGV0IGh0bWwgPSB0aGlzLmJ1aWxkSW52b2ljZUh0bWwoaW52b2ljZV9pZCwgaW52b2ljZSk7XG4gICAgICAgIGxldCBtZXNzYWdlID0gdGhpcy51c2VyLmZpcnN0X25hbWUgKyAnICcgKyB0aGlzLnVzZXIubGFzdF9uYW1lICsgJyBjcmVhdGVkIHRoZSBpbnZvaWNlIGJlbG93LCBzZW5kIHBheW1lbnQgYXMgc29vbiBhcyB5b3UgY2FuLic7XG4gICAgICAgIGxldCBzdWJqZWN0ID0gdGhpcy51c2VyLmZpcnN0X25hbWUgKyAnICcgKyB0aGlzLnVzZXIubGFzdF9uYW1lICsgJyBoYXMgc2VudCB5b3UgYW4gaW52b2ljZS4nO1xuICAgICAgICBpZiAocmVzZW5kaW5nKSB7XG4gICAgICAgICAgICBtZXNzYWdlID0gdGhpcy51c2VyLmZpcnN0X25hbWUgKyAnICcgKyB0aGlzLnVzZXIubGFzdF9uYW1lICsgJyBwcmV2aW91c2x5IHNlbnQgdGhlIGludm9pY2UgYmVsb3csIGhlcmVcXCdzIGEgZnJpZW5kbHkgcmVtaW5kZXIgdG8gc2VuZCBwYXltZW50IGFzIHNvb24gYXMgeW91IGNhbi4nXG4gICAgICAgICAgICBzdWJqZWN0ID0gdGhpcy51c2VyLmZpcnN0X25hbWUgKyAnICcgKyB0aGlzLnVzZXIubGFzdF9uYW1lICsgJyBpcyBzZW5kaW5nIHlvdSBhIGZyaWVuZGx5IHJlbWluZGVyIGFib3V0IGFuIHVucGFpZCBpbnZvaWNlLidcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWludm9pY2UpIHtcbiAgICAgICAgICAgIHVzZXJTZXJ2aWNlLnNlbmRFbWFpbCh0aGlzLnNlbGVjdGVkRmFtaWx5VG9JbnZvaWNlLCB7ZW1haWw6IHRoaXMudXNlci5lbWFpbCwgbmFtZTogdGhpcy51c2VyLmZpcnN0X25hbWUgKyAnICcgKyB0aGlzLnVzZXIubGFzdF9uYW1lfSwgbWVzc2FnZSwgaHRtbCwgc3ViamVjdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgZmFtaWx5VG9JbnZvaWNlID0gdGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmZhbWlseV9pZF07XG4gICAgICAgICAgICB1c2VyU2VydmljZS5zZW5kRW1haWwoZmFtaWx5VG9JbnZvaWNlLCB7ZW1haWw6IHRoaXMudXNlci5lbWFpbCwgbmFtZTogdGhpcy51c2VyLmZpcnN0X25hbWUgKyAnICcgKyB0aGlzLnVzZXIubGFzdF9uYW1lfSwgbWVzc2FnZSwgaHRtbCwgc3ViamVjdCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfVxuXG4gICAgcHJpdmF0ZSBidWlsZEludm9pY2VIdG1sKGludm9pY2VfaWQsIGludm9pY2U/KSB7XG4gICAgICAgIGxldCBodG1sID0gYFxuICAgICAgICAgICAgPGNlbnRlcj48c3BhbiBzdHlsZT1cImNvbG9yOiBncmF5OyBmb250LXNpemU6IDExcHg7IGNvbG9yOiBncmF5O1wiPkludm9pY2UgSUQ6IGAgKyBpbnZvaWNlX2lkICsgYDwvc3Bhbj48L2NlbnRlcj5cbiAgICAgICAgICAgIDx0YWJsZSB3aWR0aD1cIjEwMCVcIiBzdHlsZT1cImZvbnQtZmFtaWx5OiBIZWx2ZXRpY2E7IGZvbnQtc2l6ZTogMTNweDtcIiBjZWxscGFkZGluZz1cIjBcIiBjZWxsc3BhY2luZz1cIjBcIj5cbiAgICAgICAgICAgICAgICA8dHI+XG4gICAgICAgICAgICAgICAgICAgIDx0aCBhbGlnbj1cImxlZnRcIiB3aWR0aD1cIjEwMCVcIiBzdHlsZT1cInBhZGRpbmc6IDU7IGJvcmRlci1ib3R0b206IDJweCBzb2xpZCAjRTBFMEUwO1wiPlNoaWZ0czwvdGg+XG4gICAgICAgICAgICAgICAgICAgIDx0aCBhbGlnbj1cImxlZnRcIiBzdHlsZT1cInBhZGRpbmc6IDU7IGJvcmRlci1ib3R0b206IDJweCBzb2xpZCAjRTBFMEUwO1wiPkNvbnRyaWJ1dGlvbjwvdGg+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgYFxuICAgICAgICBpZiAoIWludm9pY2UpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHNbaV07XG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtLmRvX25vdF9pbnZvaWNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBhbGlnbj1cImxlZnRcIiBzdHlsZT1cInBhZGRpbmc6IDU7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZjVmNWY1O1wiPmArIGl0ZW0uZGlzcGxheV9kYXRlICtgPGJyIC8+PHNwYW4gc3R5bGU9XCJmb250LXNpemU6IDExcHg7IGNvbG9yOiBncmF5O1wiPmAgKyBpdGVtLmRpc3BsYXlfdGltaW5nICsgYDwvc3Bhbj48L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBhbGlnbj1cImxlZnRcIiBzdHlsZT1cInBhZGRpbmc6IDU7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZjVmNWY1OyBmb250LXdlaWdodDogYm9sZDtcIj4kYCArIGl0ZW0uY29udHJpYnV0aW9uc1t0aGlzLnNlbGVjdGVkRmFtaWx5VG9JbnZvaWNlLmlkXSArIGA8L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgPC90YWJsZT5cbiAgICAgICAgICAgICAgICA8Y2VudGVyPjxoMiBzdHlsZT1cImZvbnQtZmFtaWx5OiBIZWx2ZXRpY2E7XCI+SW52b2ljZSBUb3RhbDogPHNwYW4gc3R5bGU9XCJjb2xvcjogZ3JlZW47XCI+JGAgKyB0aGlzLmludm9pY2VUb3RhbCArIGA8L3NwYW4+PC9oMj48L2NlbnRlcj5cbiAgICAgICAgICAgIGBcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpbnZvaWNlLnNoaWZ0X2lkcy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgc2hpZnQgPSBNeU1vZGVsLmFkZGVkU2hpZnRzTWFwW2ludm9pY2Uuc2hpZnRfaWRzW2ldXTtcbiAgICAgICAgICAgICAgICBodG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGFsaWduPVwibGVmdFwiIHN0eWxlPVwicGFkZGluZzogNTsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNmNWY1ZjU7XCI+YCsgc2hpZnQuZGlzcGxheV9kYXRlICtgPGJyIC8+PHNwYW4gc3R5bGU9XCJmb250LXNpemU6IDExcHg7IGNvbG9yOiBncmF5O1wiPmAgKyBzaGlmdC5kaXNwbGF5X3RpbWluZyArIGA8L3NwYW4+PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBhbGlnbj1cImxlZnRcIiBzdHlsZT1cInBhZGRpbmc6IDU7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZjVmNWY1OyBmb250LXdlaWdodDogYm9sZDtcIj4kYCArIHNoaWZ0LmNvbnRyaWJ1dGlvbnNbaW52b2ljZS5mYW1pbHlfaWRdICsgYDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICA8L3RhYmxlPlxuICAgICAgICAgICAgICAgIDxjZW50ZXI+PGgyIHN0eWxlPVwiZm9udC1mYW1pbHk6IEhlbHZldGljYTtcIj5JbnZvaWNlIFRvdGFsOiA8c3BhbiBzdHlsZT1cImNvbG9yOiBncmVlbjtcIj4kYCArIGludm9pY2UudG90YWwgKyBgPC9zcGFuPjwvaDI+PC9jZW50ZXI+XG4gICAgICAgICAgICBgXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbiAgICBcbiAgICAvKioqKioqKioqKioqKioqKioqIC9JTlZPSUNFIEZVTkNUSU9OUyAqKioqKioqKioqKioqKioqKiovXG5cbiAgICAvKioqKioqKioqKioqKioqKioqIFNISUZUIEZVTkNUSU9OUyAqKioqKioqKioqKioqKioqKiovXG5cbiAgICBwdWJsaWMgc2hpZnRPcHRpb25zKGFyZ3MpIHtcbiAgICAgICAgbGV0IHNoaWZ0O1xuICAgICAgICBpZiAoYXJncy5ldmVudE5hbWUgJiYgYXJncy5ldmVudE5hbWUgPT0gJ2l0ZW1UYXAnKSB7XG4gICAgICAgICAgICBzaGlmdCA9IE15TW9kZWwuYWRkZWRTaGlmdHNNYXBbdGhpcy5zZWN0aW9uZWRTaGlmdHMuZ2V0SXRlbShhcmdzLmluZGV4KS5nZXQoJ2lkJyldXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzaGlmdCA9IE15TW9kZWwuYWRkZWRTaGlmdHNNYXBbYXJncy5vYmplY3QuaWRdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzaGlmdCkge1xuICAgICAgICAgICAgZGlhbG9ncy5hY3Rpb24oc2hpZnQudGl0bGUgKyAnIGZyb20gJyArIHNoaWZ0LmRpc3BsYXlfaG91cnMsIFwiQ2FuY2VsXCIsIFtcIkVkaXQgU2hpZnRcIiwgXCJEZWxldGUgU2hpZnRcIl0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0ID09ICdFZGl0IFNoaWZ0Jykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNob3dFZGl0U2hpZnQoZmFsc2UsIHNoaWZ0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PSAnRGVsZXRlIFNoaWZ0Jykge1xuICAgICAgICAgICAgICAgICAgICBkaWFsb2dzLmFjdGlvbignQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSB0aGlzIHNoaWZ0PyBUaGlzIGNhbm5vdCBiZSB1bmRvbmUuJywgXCJDYW5jZWxcIiwgW1wiRG8gaXQuXCJdKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ID09ICdEbyBpdC4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLmRlbGV0ZVNoaWZ0KHNoaWZ0LmlkKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1NoaWZ0cyhKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfVxuXG4gICAgcHVibGljIHNob3dFZGl0U2hpZnQoYXJncywgc2hpZnQpIHtcbiAgICAgICAgLy8gYHRoaXNgIGlzIG5vdyByZWZlcnJpbmcgdG8gdGhlIHRhcHBlZCBzaGlmdCBvYmplY3QsIGFuZCBub3QgdGhlIG1vZGVsIGFueW1vcmUsIFxuICAgICAgICAvLyBzbyB3ZSBoYXZlIHRvIHVzZSBNeU1vZGVsIHdoaWNoIGlzIGEgcmVmZXJlbmNlIHRvIEhvbWVNb2RlbC5cbiAgICAgICAgLy8gY29uc29sZS5kaXIoYXJncyk7XG4gICAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgICAgICBpZiAoYXJncy5ldmVudE5hbWUgJiYgYXJncy5ldmVudE5hbWUgPT0gJ2l0ZW1UYXAnKSB7XG4gICAgICAgICAgICAgICAgc2hpZnQgPSBNeU1vZGVsLmFkZGVkU2hpZnRzTWFwW3RoaXMuc2VjdGlvbmVkU2hpZnRzLmdldEl0ZW0oYXJncy5pbmRleCkuZ2V0KCdpZCcpXVxuICAgICAgICAgICAgfSBlbHNlIGlmIChhcmdzLm9iamVjdC5pZCkge1xuICAgICAgICAgICAgICAgIHNoaWZ0ID0gTXlNb2RlbC5hZGRlZFNoaWZ0c01hcFthcmdzLm9iamVjdC5pZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghc2hpZnQpIHtcbiAgICAgICAgICAgIE15TW9kZWwuc2hvd1NldHRpbmdzKCcvdmlld3MvY29tcG9uZW50cy9lbmRzaGlmdC9lbmRzaGlmdC54bWwnKTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZXR0aW5nc1RpdGxlJywgJ0FkZCBTaGlmdCcpO1xuICAgICAgICAgICAgZWRpdGluZ1NoaWZ0ID0ge307XG4gICAgICAgICAgICBsZXQgc3RhcnRUaW1lID0gbW9tZW50KCkuZm9ybWF0KCdZWVlZLU1NLUREJykgKyAnIDA5OjAwOjAwJztcbiAgICAgICAgICAgIGxldCBlbmRUaW1lID0gbW9tZW50KCkuZm9ybWF0KCdZWVlZLU1NLUREJykgKyAnIDE3OjAwOjAwJztcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRTdGFydERhdGUnLCBtb21lbnQoKS5mb3JtYXQoJ01NTSBEbywgWVlZWScpKVxuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdFN0YXJ0VGltZScsIG1vbWVudChzdGFydFRpbWUpLmZvcm1hdCgnaDptbWEnKSlcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZFN0YXJ0RGF0ZScsIG1vbWVudCgpLmZvcm1hdCgnWVlZWS1NTS1ERCcpKTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZFN0YXJ0VGltZScsIG1vbWVudChzdGFydFRpbWUpLmZvcm1hdCgnSEg6bW0nKSlcblxuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdEVuZERhdGUnLCBtb21lbnQoKS5mb3JtYXQoJ01NTSBEbywgWVlZWScpKVxuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdEVuZFRpbWUnLCBtb21lbnQoZW5kVGltZSkuZm9ybWF0KCdoOm1tYScpKVxuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NlbGVjdGVkRW5kRGF0ZScsIG1vbWVudCgpLmZvcm1hdCgnWVlZWS1NTS1ERCcpKTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZEVuZFRpbWUnLCBtb21lbnQoZW5kVGltZSkuZm9ybWF0KCdISDptbScpKVxuICAgICAgICAgICAgZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUgPSBtb21lbnQoc3RhcnRUaW1lKS5mb3JtYXQoKTtcbiAgICAgICAgICAgIGVkaXRpbmdTaGlmdC5lbmRfdGltZSA9IG1vbWVudChlbmRUaW1lKS5mb3JtYXQoKTtcbiAgICAgICAgICAgIGxldCBjb21wYXJlQSA9IG1vbWVudChlbmRUaW1lKTtcbiAgICAgICAgICAgIHZhciBtaW51dGVzV29ya2VkID0gY29tcGFyZUEuZGlmZihtb21lbnQoc3RhcnRUaW1lKSwgJ21pbnV0ZXMnKVxuICAgICAgICAgICAgdmFyIGhvdXJzV29ya2VkID0gKG1pbnV0ZXNXb3JrZWQvNjApLnRvRml4ZWQoMik7XG4gICAgICAgICAgICBsZXQgbWludXRlUmF0ZSA9IHBhcnNlRmxvYXQoTXlNb2RlbC51c2VyLmhvdXJseVJhdGUpLzYwO1xuICAgICAgICAgICAgbGV0IG92ZXJ0aW1lTWludXRlUmF0ZSA9IHBhcnNlRmxvYXQoTXlNb2RlbC51c2VyLm92ZXJ0aW1lUmF0ZSkvNjA7XG5cbiAgICAgICAgICAgIGxldCB3b3JrZWQgPSBzaGlmdFNlcnZpY2UuY2FsY3VsYXRlU2hpZnRIb3Vyc1dvcmtlZChlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSwgZWRpdGluZ1NoaWZ0LmVuZF90aW1lKTs7XG4gICAgICAgICAgICBNeU1vZGVsLnVwZGF0ZVRvdGFsRWFybmVkKCk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZW5kU2hpZnRUb3RhbFdvcmtlZCcsIHdvcmtlZC50aW1lX3dvcmtlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlZGl0aW5nU2hpZnQgPSBPYmplY3QuYXNzaWduKHt9LCBzaGlmdCk7XG4gICAgICAgICAgICBNeU1vZGVsLnNob3dTZXR0aW5ncygnL3ZpZXdzL2NvbXBvbmVudHMvZW5kc2hpZnQvZW5kc2hpZnQueG1sJyk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2V0dGluZ3NUaXRsZScsICdFbmQgU2hpZnQnKTtcbiAgICAgICAgICAgIGlmIChzaGlmdC5lbmRfdGltZSkge1xuICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZXR0aW5nc1RpdGxlJywgJ0VkaXQgU2hpZnQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRTdGFydERhdGUnLCBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKSlcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRTdGFydFRpbWUnLCBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdoOm1tYScpKVxuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NlbGVjdGVkU3RhcnREYXRlJywgbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnWVlZWS1NTS1ERCcpKTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZFN0YXJ0VGltZScsIG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ0hIOm1tJykpXG5cbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRFbmREYXRlJywgbW9tZW50KCkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKSlcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRFbmRUaW1lJywgbW9tZW50KCkuZm9ybWF0KCdoOm1tYScpKVxuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NlbGVjdGVkRW5kRGF0ZScsIG1vbWVudCgpLmZvcm1hdCgnWVlZWS1NTS1ERCcpKTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZEVuZFRpbWUnLCBtb21lbnQoKS5mb3JtYXQoJ0hIOm1tJykpXG4gICAgICAgICAgICBlZGl0aW5nU2hpZnQuZW5kX3RpbWUgPSBtb21lbnQoKS5mb3JtYXQoKTtcbiAgICAgICAgICAgIGlmIChzaGlmdC5lbmRfdGltZSkge1xuICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRFbmREYXRlJywgbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ01NTSBEbywgWVlZWScpKVxuICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRFbmRUaW1lJywgbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ2g6bW1hJykpXG4gICAgICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NlbGVjdGVkRW5kRGF0ZScsIG1vbWVudChzaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdZWVlZLU1NLUREJykpO1xuICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZEVuZFRpbWUnLCBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnSEg6bW0nKSlcbiAgICAgICAgICAgICAgICBlZGl0aW5nU2hpZnQuZW5kX3RpbWUgPSBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBjb25zb2xlLmRpcihzaGlmdC5jb250cmlidXRpb25zKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgY29tcGFyZUEgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIGlmIChzaGlmdC5lbmRfdGltZSkgY29tcGFyZUEgPSBtb21lbnQoc2hpZnQuZW5kX3RpbWUpO1xuICAgICAgICAgICAgdmFyIG1pbnV0ZXNXb3JrZWQgPSBjb21wYXJlQS5kaWZmKG1vbWVudChzaGlmdC5zdGFydF90aW1lKSwgJ21pbnV0ZXMnKVxuICAgICAgICAgICAgdmFyIGhvdXJzV29ya2VkID0gKG1pbnV0ZXNXb3JrZWQvNjApLnRvRml4ZWQoMik7XG4gICAgICAgICAgICBsZXQgbWludXRlUmF0ZSA9IHBhcnNlRmxvYXQoTXlNb2RlbC51c2VyLmhvdXJseVJhdGUpLzYwO1xuICAgICAgICAgICAgbGV0IG92ZXJ0aW1lTWludXRlUmF0ZSA9IHBhcnNlRmxvYXQoTXlNb2RlbC51c2VyLm92ZXJ0aW1lUmF0ZSkvNjA7XG5cblxuICAgICAgICAgICAgbGV0IHdvcmtlZCA9IHNoaWZ0U2VydmljZS5jYWxjdWxhdGVTaGlmdEhvdXJzV29ya2VkKGVkaXRpbmdTaGlmdC5zdGFydF90aW1lLCBlZGl0aW5nU2hpZnQuZW5kX3RpbWUpOztcbiAgICAgICAgICAgIE15TW9kZWwudXBkYXRlVG90YWxFYXJuZWQoKTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlbmRTaGlmdFRvdGFsV29ya2VkJywgd29ya2VkLnRpbWVfd29ya2VkKTtcbiAgICAgICAgfSAgICAgICAgXG4gICAgfVxuXG4gICAgcHVibGljIGdldFByZXZpb3VzU2hpZnRzVG90YWxNaW51dGVzKHNoaWZ0KSB7XG4gICAgICAgIC8vIHRoaXMgZnVuY3Rpb24gZ2V0cyB0aGUgdG90YWwgbWludXRlcyB3b3JrZWQgdXAgdG8gdGhhdCBzaGlmdCB0aGF0IHdlZWsgdG8gZGV0ZXJtaW5lIGlmIFxuICAgICAgICAvLyBhbnkgb3ZlcnRpbWUgcGF5IHNob3VsZCBiZSBhdHRyaWJ1dGVkIHRvIHRoaXMgc2hpZnQuXG4gICAgICAgIHZhciBiZWdpbm5pbmdPZldlZWsgPSBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuaXNvV2Vla2RheSgwKS5mb3JtYXQoJ2RkZGQgTU1NTSBEbyBZWVlZJyk7XG4gICAgICAgIGlmIChtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuaXNvV2Vla2RheSgpID09IDAgfHwgbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmlzb1dlZWtkYXkoKSA9PSA3KSB7IC8vaXMgYSBzdW5kYXkuXG4gICAgICAgICAgICBiZWdpbm5pbmdPZldlZWsgPSBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdkZGRkIE1NTU0gRG8gWVlZWScpO1xuICAgICAgICB9XG4gICAgICAgIGxldCB0b3RhbE1pbnV0ZXMgPSAwO1xuICAgICAgICBsZXQgcmV2ZXJzZVNoaWZ0cyA9IHRoaXMud2Vla3NbYmVnaW5uaW5nT2ZXZWVrXS5zaGlmdHMuc2xpY2UoMCkucmV2ZXJzZSgpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgcmV2ZXJzZVNoaWZ0cy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBteVNoaWZ0ID0gcmV2ZXJzZVNoaWZ0c1tpXTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUuZGlyKG15U2hpZnQpO1xuICAgICAgICAgICAgaWYgKG15U2hpZnQuaWQgIT0gc2hpZnQuaWQpIHtcbiAgICAgICAgICAgICAgICB0b3RhbE1pbnV0ZXMgKz0gbXlTaGlmdC5taW51dGVzX3dvcmtlZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ3RvdGFsIG1pbnV0ZXM6ICcgKyB0b3RhbE1pbnV0ZXMpO1xuICAgICAgICByZXR1cm4gdG90YWxNaW51dGVzO1xuICAgIH1cblxuICAgIHB1YmxpYyBkaXNtaXNzU29mdElucHV0cygpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IHRoaXMuZmFtaWxpZXMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgdGV4dEZpZWxkOlRleHRGaWVsZCA9IDxUZXh0RmllbGQ+dGhpcy5wYWdlLmdldFZpZXdCeUlkKCdjb250cmlidXRpb25fJyArIHRoaXMuZmFtaWxpZXMuZ2V0SXRlbShpKS5nZXQoJ2lkJykpO1xuICAgICAgICAgICAgaWYgKHRleHRGaWVsZCAmJiB0ZXh0RmllbGQuZGlzbWlzc1NvZnRJbnB1dCkgdGV4dEZpZWxkLmRpc21pc3NTb2Z0SW5wdXQoKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB1cGRhdGVUb3RhbEVhcm5lZCgpIHtcbiAgICAgICAgbGV0IHdvcmtlZE9iaiA9IHNoaWZ0U2VydmljZS5jYWxjdWxhdGVTaGlmdEhvdXJzV29ya2VkKGVkaXRpbmdTaGlmdC5zdGFydF90aW1lLCBlZGl0aW5nU2hpZnQuZW5kX3RpbWUpO1xuICAgICAgICB0aGlzLnNldCgnZW5kU2hpZnRUb3RhbFdvcmtlZCcsIHdvcmtlZE9iai50aW1lX3dvcmtlZCk7XG4gICAgICAgIGxldCBlYXJuZWQgPSBzaGlmdFNlcnZpY2UuY2FsY3VsYXRlU2hpZnRFYXJuZWQod29ya2VkT2JqLm1pbnV0ZXNfd29ya2VkLCB0aGlzLmdldFByZXZpb3VzU2hpZnRzVG90YWxNaW51dGVzKGVkaXRpbmdTaGlmdCkpO1xuICAgICAgICBNeU1vZGVsLnNldCgnZW5kU2hpZnRUb3RhbEVhcm5lZCcsICckJyArIGVhcm5lZC50b3RhbF9lYXJuZWQpO1xuICAgICAgICBpZiAoZWFybmVkLm92ZXJ0aW1lX2Vhcm5lZCAhPSAwLjAwKSB7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZW5kU2hpZnRPdmVydGltZUVhcm5lZCcsIGVhcm5lZC5vdmVydGltZV9lYXJuZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0T3ZlcnRpbWVFYXJuZWQnLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGZhbWlsaWVzID0gTXlNb2RlbC5nZXQoJ2ZhbWlsaWVzJyk7XG4gICAgICAgIGxldCBuZXdUb3RhbDphbnkgPSAoZWFybmVkLnRvdGFsX2Vhcm5lZC9mYW1pbGllcy5sZW5ndGgpLnRvRml4ZWQoMik7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdlYWNoIGNvbnRyaWJ1dGlvbjogJyArIG5ld1RvdGFsKTtcbiAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0RmluYWxUb3RhbCcsICckJyArIChuZXdUb3RhbCpmYW1pbGllcy5sZW5ndGgpLnRvRml4ZWQoMikpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgZmFtaWxpZXMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZWRpdGluZ1NoaWZ0LmlkICYmIGVkaXRpbmdTaGlmdC5jb250cmlidXRpb25zKSB7XG4gICAgICAgICAgICAgICAgIGlmIChlZGl0aW5nU2hpZnQuY29udHJpYnV0aW9uc1tmYW1pbGllcy5nZXRJdGVtKGkpLmlkXSkge1xuICAgICAgICAgICAgICAgICAgICBmYW1pbGllcy5nZXRJdGVtKGkpLnNldCgnY29udHJpYnV0aW9uJywgZWRpdGluZ1NoaWZ0LmNvbnRyaWJ1dGlvbnNbZmFtaWxpZXMuZ2V0SXRlbShpKS5pZF0pO1xuICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmYW1pbGllcy5nZXRJdGVtKGkpLnNldCgnY29udHJpYnV0aW9uJywgJzAuMDAnKTtcbiAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmYW1pbGllcy5nZXRJdGVtKGkpLnNldCgnY29udHJpYnV0aW9uJywgbmV3VG90YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBmYW1pbGllcy5nZXRJdGVtKGkpLm9uKE9ic2VydmFibGUucHJvcGVydHlDaGFuZ2VFdmVudCwgKGFyZ3M6IFByb3BlcnR5Q2hhbmdlRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLnByb3BlcnR5TmFtZSA9PSAnY29udHJpYnV0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmluYWxUb3RhbDpudW1iZXIgPSAwO1xuICAgICAgICAgICAgICAgICAgICBsZXQgaW52YWxpZE51bWJlcnMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgeCA9IDA7IE15TW9kZWwuZmFtaWxpZXMubGVuZ3RoID4geDsgeCsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIU15TW9kZWwuZmFtaWxpZXMuZ2V0SXRlbSh4KS5nZXQoJ2NvbnRyaWJ1dGlvbicpKSBNeU1vZGVsLmZhbWlsaWVzLmdldEl0ZW0oeCkuc2V0KCdjb250cmlidXRpb24nLCAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzTmFOKE15TW9kZWwuZmFtaWxpZXMuZ2V0SXRlbSh4KS5nZXQoJ2NvbnRyaWJ1dGlvbicpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludmFsaWROdW1iZXJzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxUb3RhbCArPSBwYXJzZUZsb2F0KE15TW9kZWwuZmFtaWxpZXMuZ2V0SXRlbSh4KS5nZXQoJ2NvbnRyaWJ1dGlvbicpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoaW52YWxpZE51bWJlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlbmRTaGlmdEZpbmFsVG90YWwnLCAnRW50ZXIgdmFsaWQgbnVtYmVycy4nKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlbmRTaGlmdEZpbmFsVG90YWwnLCAnJCcgKyBmaW5hbFRvdGFsLnRvRml4ZWQoMikpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBjaGFuZ2VTaGlmdEVuZFRpbWUoKSB7XG4gICAgICAgIHRoaXMuZGlzbWlzc1NvZnRJbnB1dHMoKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckhvdXInLCBtb21lbnQoZWRpdGluZ1NoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ0gnKSk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJNaW51dGUnLCBtb21lbnQoZWRpdGluZ1NoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ20nKSk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJUaXRsZScsICdDaGFuZ2UgRW5kIFRpbWUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmVUZXh0JywgJ0RvbmUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tpbmcnLCAndGltZScpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyQ2FuY2VsJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgfSlcbiAgICAgICAgcGlja2VyLmFuaW1hdGVTaG93KCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgICAgIGxldCBob3VyID0gdGhpcy5waWNrZXJIb3VyO1xuICAgICAgICAgICAgaWYgKGhvdXIgPCAxMCkgaG91ciA9ICcwJyArIHRoaXMucGlja2VySG91cjtcbiAgICAgICAgICAgIGxldCBtaW51dGUgPSB0aGlzLnBpY2tlck1pbnV0ZTtcbiAgICAgICAgICAgIGlmIChtaW51dGUgPCAxMCkgbWludXRlID0gJzAnICsgbWludXRlO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3NlbGVjdGVkRW5kVGltZScsIGhvdXIgKyAnOicgKyBtaW51dGUpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdEVuZFRpbWUnLCBtb21lbnQodGhpcy5nZXQoJ3NlbGVjdGVkRW5kRGF0ZScpICsgJyAnICsgdGhpcy5nZXQoJ3NlbGVjdGVkRW5kVGltZScpICsgJzowMCcpLmZvcm1hdCgnaDptbWEnKSlcbiAgICAgICAgICAgIGVkaXRpbmdTaGlmdC5lbmRfdGltZSA9IG1vbWVudCh0aGlzLmdldCgnc2VsZWN0ZWRFbmREYXRlJykgKyAnICcgKyB0aGlzLmdldCgnc2VsZWN0ZWRFbmRUaW1lJykgKyAnOjAwJykuZm9ybWF0KCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVRvdGFsRWFybmVkKClcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgY2hhbmdlU2hpZnRFbmREYXRlKCkge1xuICAgICAgICB0aGlzLmRpc21pc3NTb2Z0SW5wdXRzKCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNraW5nJywgJ2RhdGUnKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0KCdlbmREYXRlRGF5JywgbW9tZW50KGVkaXRpbmdTaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdERCcpKTtcbiAgICAgICAgdGhpcy5zZXQoJ2VuZERhdGVNb250aCcsIG1vbWVudChlZGl0aW5nU2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnTU0nKSk7XG4gICAgICAgIHRoaXMuc2V0KCdlbmREYXRlWWVhcicsIG1vbWVudChlZGl0aW5nU2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnWVlZWScpKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlclRpdGxlJywgJ0NoYW5nZSBFbmQgRGF0ZScpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZVRleHQnLCAnRG9uZScpO1xuICAgICAgICBwaWNrZXIuYW5pbWF0ZVNob3coKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckNhbmNlbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgIH0pXG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgICAgIGxldCBkYXkgPSB0aGlzLmVuZERhdGVEYXk7IFxuICAgICAgICAgICAgaWYgKHBhcnNlSW50KHRoaXMuZW5kRGF0ZURheSkgPCAxMCkgZGF5ID0gJzAnICsgcGFyc2VJbnQodGhpcy5lbmREYXRlRGF5KTtcbiAgICAgICAgICAgIGxldCBtb250aCA9IHRoaXMuZW5kRGF0ZU1vbnRoOyBcbiAgICAgICAgICAgIGlmIChwYXJzZUludCh0aGlzLmVuZERhdGVNb250aCkgPCAxMCkgbW9udGggPSAnMCcgKyBwYXJzZUludCh0aGlzLmVuZERhdGVNb250aCk7XG4gICAgICAgICAgICB0aGlzLnNldCgnc2VsZWN0ZWRFbmREYXRlJywgdGhpcy5lbmREYXRlWWVhciArICctJyArIG1vbnRoICsgJy0nICsgZGF5KTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRFbmREYXRlJywgbW9tZW50KHRoaXMuZ2V0KCdzZWxlY3RlZEVuZERhdGUnKSkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKSlcbiAgICAgICAgICAgIGVkaXRpbmdTaGlmdC5lbmRfdGltZSA9IG1vbWVudCh0aGlzLmdldCgnc2VsZWN0ZWRFbmREYXRlJykgKyAnICcgKyB0aGlzLmdldCgnc2VsZWN0ZWRFbmRUaW1lJykgKyAnOjAwJykuZm9ybWF0KCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVRvdGFsRWFybmVkKClcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgY2hhbmdlU2hpZnRTdGFydFRpbWUoKSB7XG4gICAgICAgIHRoaXMuZGlzbWlzc1NvZnRJbnB1dHMoKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckhvdXInLCBtb21lbnQoZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnSCcpKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlck1pbnV0ZScsIG1vbWVudChlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdtJykpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyVGl0bGUnLCAnQ2hhbmdlIFN0YXJ0IFRpbWUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tpbmcnLCAndGltZScpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZVRleHQnLCAnRG9uZScpO1xuICAgICAgICBwaWNrZXIuYW5pbWF0ZVNob3coKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckNhbmNlbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgIH0pXG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgICAgIGxldCBob3VyID0gdGhpcy5waWNrZXJIb3VyO1xuICAgICAgICAgICAgaWYgKGhvdXIgPCAxMCkgaG91ciA9ICcwJyArIHRoaXMucGlja2VySG91cjtcbiAgICAgICAgICAgIGxldCBtaW51dGUgPSB0aGlzLnBpY2tlck1pbnV0ZTtcbiAgICAgICAgICAgIGlmIChtaW51dGUgPCAxMCkgbWludXRlID0gJzAnICsgbWludXRlO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3NlbGVjdGVkU3RhcnRUaW1lJywgaG91ciArICc6JyArIG1pbnV0ZSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0U3RhcnRUaW1lJywgbW9tZW50KHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0RGF0ZScpICsgJyAnICsgdGhpcy5nZXQoJ3NlbGVjdGVkU3RhcnRUaW1lJykgKyAnOjAwJykuZm9ybWF0KCdoOm1tYScpKVxuICAgICAgICAgICAgZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUgPSBtb21lbnQodGhpcy5nZXQoJ3NlbGVjdGVkU3RhcnREYXRlJykgKyAnICcgKyB0aGlzLmdldCgnc2VsZWN0ZWRTdGFydFRpbWUnKSArICc6MDAnKS5mb3JtYXQoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVG90YWxFYXJuZWQoKVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBjaGFuZ2VTaGlmdFN0YXJ0RGF0ZSgpIHtcbiAgICAgICAgdGhpcy5kaXNtaXNzU29mdElucHV0cygpO1xuICAgICAgICB0aGlzLnNldCgncGlja2luZycsICdkYXRlJyk7XG4gICAgICAgIHRoaXMuc2V0KCdlbmREYXRlRGF5JywgbW9tZW50KGVkaXRpbmdTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ0REJykpO1xuICAgICAgICB0aGlzLnNldCgnZW5kRGF0ZU1vbnRoJywgbW9tZW50KGVkaXRpbmdTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ01NJykpO1xuICAgICAgICB0aGlzLnNldCgnZW5kRGF0ZVllYXInLCBtb21lbnQoZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnWVlZWScpKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlclRpdGxlJywgJ0NoYW5nZSBTdGFydCBEYXRlJyk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lVGV4dCcsICdEb25lJyk7XG4gICAgICAgIHBpY2tlci5hbmltYXRlU2hvdygpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyQ2FuY2VsJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgfSlcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICAgICAgbGV0IGRheSA9IHRoaXMuZW5kRGF0ZURheTsgXG4gICAgICAgICAgICBpZiAocGFyc2VJbnQodGhpcy5lbmREYXRlRGF5KSA8IDEwKSBkYXkgPSAnMCcgKyBwYXJzZUludCh0aGlzLmVuZERhdGVEYXkpO1xuICAgICAgICAgICAgbGV0IG1vbnRoID0gdGhpcy5lbmREYXRlTW9udGg7IFxuICAgICAgICAgICAgaWYgKHBhcnNlSW50KHRoaXMuZW5kRGF0ZU1vbnRoKSA8IDEwKSBtb250aCA9ICcwJyArIHBhcnNlSW50KHRoaXMuZW5kRGF0ZU1vbnRoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdzZWxlY3RlZFN0YXJ0RGF0ZScsIHRoaXMuZW5kRGF0ZVllYXIgKyAnLScgKyBtb250aCArICctJyArIGRheSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0U3RhcnREYXRlJywgbW9tZW50KHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0RGF0ZScpKS5mb3JtYXQoJ01NTSBEbywgWVlZWScpKVxuICAgICAgICAgICAgZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUgPSBtb21lbnQodGhpcy5nZXQoJ3NlbGVjdGVkU3RhcnREYXRlJykgKyAnICcgKyB0aGlzLmdldCgnc2VsZWN0ZWRTdGFydFRpbWUnKSArICc6MDAnKS5mb3JtYXQoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVG90YWxFYXJuZWQoKVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBzYXZlU2hpZnQoKSB7XG4gICAgICAgIHRoaXMuZGlzbWlzc1NvZnRJbnB1dHMoKTtcbiAgICAgICAgbGV0IGVuZF90aW1lID0gdGhpcy5nZXQoJ3NlbGVjdGVkRW5kRGF0ZScpICsgJyAnICsgdGhpcy5nZXQoJ3NlbGVjdGVkRW5kVGltZScpICsgJzowMCc7XG4gICAgICAgIGxldCBzdGFydF90aW1lID0gdGhpcy5nZXQoJ3NlbGVjdGVkU3RhcnREYXRlJykgKyAnICcgKyB0aGlzLmdldCgnc2VsZWN0ZWRTdGFydFRpbWUnKSArICc6MDAnO1xuICAgICAgICBsZXQgYXJnczphbnkgPSB7fTtcbiAgICAgICAgYXJncy5lbmRfdGltZSA9IG1vbWVudChlbmRfdGltZSkuZm9ybWF0KCk7XG4gICAgICAgIGFyZ3Muc3RhcnRfdGltZSA9IG1vbWVudChzdGFydF90aW1lKS5mb3JtYXQoKTtcbiAgICAgICAgYXJncy5jb250cmlidXRpb25zID0ge307XG4gICAgICAgIGxldCBjb250cmlidXRpb25zOmFueSA9IHt9O1xuICAgICAgICBsZXQgZmFtaWxpZXMgPSB0aGlzLmdldCgnZmFtaWxpZXMnKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGZhbWlsaWVzLmxlbmd0aCA+IGk7IGkrKykge1xuICAgICAgICAgICAgY29udHJpYnV0aW9uc1tmYW1pbGllcy5nZXRJdGVtKGkpLmdldCgnaWQnKV0gPSBmYW1pbGllcy5nZXRJdGVtKGkpLmdldCgnY29udHJpYnV0aW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgYXJncy5jb250cmlidXRpb25zID0gY29udHJpYnV0aW9ucztcbiAgICAgICAgaWYgKGVkaXRpbmdTaGlmdC5pZCkge1xuICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLnVwZGF0ZVNoaWZ0KGVkaXRpbmdTaGlmdC5pZCwgYXJncykudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1NoaWZ0cyhKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NJbnZvaWNlcyhKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkpO1xuICAgICAgICAgICAgICAgIGlmIChlZGl0aW5nU2hpZnQuaWQgPT0gTXlNb2RlbC5nZXQoJ2Nsb2NrZWRJbicpLmlkICYmIGFyZ3MuZW5kX3RpbWUpIE15TW9kZWwuc2V0KCdjbG9ja2VkSW4nLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzaGlmdFNlcnZpY2UuYWRkU2hpZnQoYXJncykudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1NoaWZ0cyhKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NJbnZvaWNlcyhKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkpO1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZVNldHRpbmdzKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIFxuICAgIH1cblxuICAgIHB1YmxpYyBzaG93U3RhcnRTaGlmdCgpIHtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckhvdXInLCBtb21lbnQoKS5mb3JtYXQoJ0gnKSk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJNaW51dGUnLCBtb21lbnQoKS5mb3JtYXQoJ20nKSk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJUaXRsZScsICdTZXQgU3RhcnQgVGltZScpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZVRleHQnLCAnU3RhcnQnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tpbmcnLCAndGltZScpO1xuICAgICAgICBwaWNrZXIuYW5pbWF0ZVNob3coKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckNhbmNlbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgIH0pXG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgICAgIGxldCBob3VyID0gdGhpcy5waWNrZXJIb3VyO1xuICAgICAgICAgICAgaWYgKGhvdXIgPCAxMCkgaG91ciA9ICcwJyArIHRoaXMucGlja2VySG91cjtcbiAgICAgICAgICAgIGxldCBtaW51dGUgPSB0aGlzLnBpY2tlck1pbnV0ZTtcbiAgICAgICAgICAgIGlmIChtaW51dGUgPCAxMCkgbWludXRlID0gJzAnICsgbWludXRlO1xuICAgICAgICAgICAgbGV0IGFyZ3M6YW55ID0ge1xuICAgICAgICAgICAgICAgIHN0YXJ0X3RpbWU6IG1vbWVudChtb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKSArICcgJyArIGhvdXIgKyAnOicgKyBtaW51dGUgKyAnOjAwJykuZm9ybWF0KCksXG4gICAgICAgICAgICAgICAgZW5kX3RpbWU6IG51bGwsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzaGlmdFNlcnZpY2Uuc3RhcnRTaGlmdChhcmdzKS50aGVuKChzdGFydGVkU2hpZnQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vdGhpcy5zaGlmdHMudW5zaGlmdChvYnNlcnZhYmxlRnJvbU9iamVjdChzdGFydGVkU2hpZnQpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTaGlmdHMoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2Nsb2NrZWRJbicsIGFyZ3MpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgXG4gICAgLyoqKioqKioqKioqKioqKioqKiAvU0hJRlQgRlVOQ1RJT05TICoqKioqKioqKioqKioqKioqKi9cblxuICAgIHB1YmxpYyBvblNlbGVjdGVkSW5kZXhDaGFuZ2VkKGFyZ3M6IFNlbGVjdGVkSW5kZXhDaGFuZ2VkRXZlbnREYXRhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGFyZ3MubmV3SW5kZXgpO1xuICAgICAgICBpZiAoYXJncy5uZXdJbmRleCA9PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmdldFRoaXNXZWVrU2hpZnRzKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoYXJncy5uZXdJbmRleCA9IDEpIHtcbiAgICAgICAgICAgIGFsZXJ0KCdtYXliZSBwcm9jZXNzIHNoaWZ0cyBhZ2Fpbj8nKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGtpbGwoKSB7XG4gICAgICAgIGFwcFNldHRpbmdzLnJlbW92ZSgndXNlckRhdGEnKTtcbiAgICAgICAgYXBwU2V0dGluZ3MucmVtb3ZlKCd1aWQnKTtcbiAgICAgICAgYXBwU2V0dGluZ3MucmVtb3ZlKCd1c2VyUmVjb3JkSUQnKTtcbiAgICAgICAgZnJhbWUudG9wbW9zdCgpLm5hdmlnYXRlKCcvdmlld3MvbG9naW4vbG9naW4nKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0dGluZ3NTY3JvbGwoYXJnczogU2Nyb2xsRXZlbnREYXRhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzY3JvbGxpbmcnKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNob3dTZXR0aW5ncyh2aWV3UGF0aCkge1xuICAgICAgICB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ21haW5ncmlkJykuYW5pbWF0ZSg8QW5pbWF0aW9uRGVmaW5pdGlvbj57XG4gICAgICAgICAgICBzY2FsZToge3g6IC45MiAgLCB5OiAuOTJ9LFxuICAgICAgICAgICAgZHVyYXRpb246IDMwMCxcbiAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5jdWJpY0JlemllcigwLjEsIDAuMSwgMC4xLCAxKVxuICAgICAgICB9KVxuICAgICAgICBzZXR0aW5nc0NvbnRhaW5lciA9IDxTdGFja0xheW91dD50aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ3NldHRpbmdzX2NvbnRhaW5lcicpO1xuICAgICAgICBzZXR0aW5nc092ZXJsYXlDb250YWluZXIgPSB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ3NldHRpbmdzX292ZXJsYXlfY29udGFpbmVyJylcbiAgICAgICAgZGlzbWlzc05vdGUgPSB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ2Rpc21pc3Nfbm90ZScpO1xuICAgICAgICB0aGlzLnNldCgnc2V0dGluZ3NTaG93bicsIHRydWUpO1xuICAgICAgICBsZXQgZGV2aWNlSGVpZ2h0ID0gc2NyZWVuLm1haW5TY3JlZW4uaGVpZ2h0RElQcztcbiAgICAgICAgc2V0dGluZ3NDb250YWluZXIudHJhbnNsYXRlWSA9IGRldmljZUhlaWdodCArIDMwO1xuICAgICAgICBzZXR0aW5nc0NvbnRhaW5lci5hbmltYXRlKDxBbmltYXRpb25EZWZpbml0aW9uPntcbiAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6IDAsIHk6IDB9LFxuICAgICAgICAgICAgZHVyYXRpb246IDMwMCxcbiAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5jdWJpY0JlemllcigwLjEsIDAuMSwgMC4xLCAxKVxuICAgICAgICB9KVxuICAgICAgICBzZXR0aW5nc092ZXJsYXlDb250YWluZXIub3BhY2l0eSA9IDA7XG4gICAgICAgIHNldHRpbmdzT3ZlcmxheUNvbnRhaW5lci5hbmltYXRlKHtcbiAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICBkdXJhdGlvbjogMTAwXG4gICAgICAgIH0pXG4gICAgICAgIHZhciBjb250YWluZXI6IFN0YWNrTGF5b3V0ID0gPFN0YWNrTGF5b3V0PnRoaXMucGFnZS5nZXRWaWV3QnlJZCgnc2V0dGluZ3NfdmlldycpO1xuICAgICAgICBjb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKTtcbiAgICAgICAgbGV0IHBhdGggPSBmcy5rbm93bkZvbGRlcnMuY3VycmVudEFwcCgpLnBhdGg7XG4gICAgICAgIGxldCBjb21wb25lbnQgPSBidWlsZGVyLmxvYWQocGF0aCArIHZpZXdQYXRoKTtcbiAgICAgICAgY29udGFpbmVyLmFkZENoaWxkKGNvbXBvbmVudCk7XG4gICAgICAgIGxldCBjb250YWluZXJCb3VuZHMgPSBzZXR0aW5nc0NvbnRhaW5lci5pb3MuYm91bmRzO1xuICAgICAgICBsZXQgaW9zU2V0dGluZ3NDb250YWluZXI6IFVJVmlldyA9IHNldHRpbmdzQ29udGFpbmVyLmlvcztcbiAgICAgICAgaWYgKGJsdXJWaWV3ICYmIGJsdXJWaWV3LnJlbW92ZUZyb21TdXBlcnZpZXcpIGJsdXJWaWV3LnJlbW92ZUZyb21TdXBlcnZpZXcoKTtcbiAgICAgICAgYmx1clZpZXcgPSBVSVZpc3VhbEVmZmVjdFZpZXcuYWxsb2MoKS5pbml0V2l0aEVmZmVjdChVSUJsdXJFZmZlY3QuZWZmZWN0V2l0aFN0eWxlKFVJQmx1ckVmZmVjdFN0eWxlTGlnaHQpKTtcbiAgICAgICAgYmx1clZpZXcuZnJhbWUgPSB7XG4gICAgICAgICAgICBvcmlnaW46IHsgeDogY29udGFpbmVyQm91bmRzLm9yaWdpbi54LCB5OiBjb250YWluZXJCb3VuZHMub3JpZ2luLnkgLSAyMCB9LFxuICAgICAgICAgICAgc2l6ZTogeyB3aWR0aDogY29udGFpbmVyQm91bmRzLnNpemUud2lkdGgsIGhlaWdodDogY29udGFpbmVyQm91bmRzLnNpemUuaGVpZ2h0ICsgMjAgfVxuICAgICAgICB9O1xuICAgICAgICBibHVyVmlldy5hdXRvcmVzaXppbmdNYXNrID0gVUlWaWV3QXV0b3Jlc2l6aW5nRmxleGlibGVXaWR0aCB8IFVJVmlld0F1dG9yZXNpemluZ0ZsZXhpYmxlSGVpZ2h0O1xuICAgICAgICBpb3NTZXR0aW5nc0NvbnRhaW5lci5hZGRTdWJ2aWV3KGJsdXJWaWV3KVxuICAgICAgICBpb3NTZXR0aW5nc0NvbnRhaW5lci5zZW5kU3Vidmlld1RvQmFjayhibHVyVmlldyk7XG4gICAgICAgIGxldCBidXp6ID0gVUlTZWxlY3Rpb25GZWVkYmFja0dlbmVyYXRvci5uZXcoKTtcbiAgICAgICAgbGV0IHBhbm5lciA9IHRoaXMucGFnZS5nZXRWaWV3QnlJZCgnc2V0dGluZ3NfY29udGFpbmVyJyk7XG4gICAgICAgIGxldCBzY3JvbGxlcjpTY3JvbGxWaWV3ID0gPFNjcm9sbFZpZXc+dGhpcy5wYWdlLmdldFZpZXdCeUlkKCdzZXR0aW5nc19zY3JvbGxlcicpO1xuICAgICAgICBpZiAoc2Nyb2xsZXIpIHtcbiAgICAgICAgICAgIGxldCByZWFkeVRvRHJvcCA9IGZhbHNlO1xuICAgICAgICAgICAgcGFubmVyLm9mZigncGFuJyk7XG4gICAgICAgICAgICBwYW5uZXIub24oJ3BhbicsIChhcmdzOlBhbkdlc3R1cmVFdmVudERhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5zdGF0ZSA9PSAzICYmIHJlYWR5VG9Ecm9wKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGlkZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzY3JvbGxlci5vbignc2Nyb2xsJywgKHNjcm9sbEFyZ3M6U2Nyb2xsRXZlbnREYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHNjcm9sbEFyZ3Muc2Nyb2xsWSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3NDb250YWluZXIudHJhbnNsYXRlWSA9IHNjcm9sbEFyZ3Muc2Nyb2xsWSotMS44O1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsQXJncy5zY3JvbGxZKi0xLjggPiAxNTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWR5VG9Ecm9wID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkaXNtaXNzTm90ZS5vcGFjaXR5ID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidXp6LnNlbGVjdGlvbkNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNtaXNzTm90ZS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDI1MFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkeVRvRHJvcCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRpc21pc3NOb3RlLm9wYWNpdHkgPT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc21pc3NOb3RlLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogMjUwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBhbm5lci5vZmYoJ3BhbicpO1xuICAgICAgICAgICAgcGFubmVyLm9uKCdwYW4nLCAoYXJnczpQYW5HZXN0dXJlRXZlbnREYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3NDb250YWluZXIudHJhbnNsYXRlWSA9IGFyZ3MuZGVsdGFZO1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLmRlbHRhWSA+IDE1MCkge1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpc21pc3NOb3RlLm9wYWNpdHkgPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnV6ei5zZWxlY3Rpb25DaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNtaXNzTm90ZS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAyNTBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlzbWlzc05vdGUub3BhY2l0eSA9PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNtaXNzTm90ZS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAyNTBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3Muc3RhdGUgPT0gMykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5kZWx0YVkgPiAxNTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGlkZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5nc0NvbnRhaW5lci5hbmltYXRlKDxBbmltYXRpb25EZWZpbml0aW9uPntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4OiAwLCB5OiAwfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogMjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5jdWJpY0JlemllcigwLjEsIDAuMSwgMC4xLCAxKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgaGlkZVNldHRpbmdzKCkge1xuICAgICAgICB0aGlzLmRpc21pc3NTb2Z0SW5wdXRzKCk7XG4gICAgICAgIGVkaXRpbmdTaGlmdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ21haW5ncmlkJykuYW5pbWF0ZSg8QW5pbWF0aW9uRGVmaW5pdGlvbj57XG4gICAgICAgICAgICBzY2FsZToge3g6IDEsIHk6IDF9LFxuICAgICAgICAgICAgZHVyYXRpb246IDMwMCxcbiAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5jdWJpY0JlemllcigwLjEsIDAuMSwgMC4xLCAxKVxuICAgICAgICB9KVxuICAgICAgICBsZXQgZGV2aWNlSGVpZ2h0ID0gc2NyZWVuLm1haW5TY3JlZW4uaGVpZ2h0RElQcztcbiAgICAgICAgc2V0dGluZ3NDb250YWluZXIuYW5pbWF0ZSg8QW5pbWF0aW9uRGVmaW5pdGlvbj57XG4gICAgICAgICAgICB0cmFuc2xhdGU6IHt4OiAwLCB5OiBkZXZpY2VIZWlnaHQgLSAzMH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogMzAwLFxuICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmN1YmljQmV6aWVyKDAuMSwgMC4xLCAwLjEsIDEpXG4gICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3NldHRpbmdzU2hvd24nLCBmYWxzZSk7XG4gICAgICAgIH0pXG4gICAgICAgIHNldHRpbmdzT3ZlcmxheUNvbnRhaW5lci5hbmltYXRlKHtcbiAgICAgICAgICAgIG9wYWNpdHk6IDAsXG4gICAgICAgICAgICBkdXJhdGlvbjogMzAwXG4gICAgICAgIH0pXG4gICAgfSBcblxuICAgIHB1YmxpYyByZW1vdmVTZWN0aW9uZWRTaGlmdChhcmdzKSB7XG4gICAgICAgIGNvbnNvbGUuZGlyKGFyZ3MpO1xuICAgICAgICAvL3RoaXMuc2VjdGlvbmVkU2hpZnRzLmdldEl0ZW0oYXJncy5pbmRleCk7XG4gICAgICAgIGNvbnNvbGUubG9nKGFyZ3MuaW5kZXgpO1xuICAgICAgICB0aGlzLnNlY3Rpb25lZFNoaWZ0cy5zcGxpY2UoYXJncy5pbmRleCwgMSk7XG4gICAgfVxuXG4gICAgcHVibGljIHByb2Nlc3NTaGlmdHMoc2hpZnRzKSB7XG4gICAgICAgIGxldCBzaGlmdHNBcnJheSA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpIGluIHNoaWZ0cykge1xuICAgICAgICAgICAgbGV0IG15U2hpZnQgPSBzaGlmdFNlcnZpY2UuYnVpbGRTaGlmdERhdGEoc2hpZnRzW2ldKTtcbiAgICAgICAgICAgIG15U2hpZnQuaWQgPSBpO1xuICAgICAgICAgICAgaWYgKCFteVNoaWZ0LmVuZF90aW1lKSB0aGlzLnNldCgnY2xvY2tlZEluJywgc2hpZnRzW2ldKTtcbiAgICAgICAgICAgIHNoaWZ0c0FycmF5LnB1c2gobXlTaGlmdCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coJ3NoaWZ0cyBhcnJheSBsZW5ndGggJyArIHNoaWZ0c0FycmF5Lmxlbmd0aCk7XG5cbiAgICAgICAgc2hpZnRzQXJyYXkuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICAgICAgaWYgKG1vbWVudChhLnN0YXJ0X3RpbWUpIDwgbW9tZW50KGIuc3RhcnRfdGltZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobW9tZW50KGEuc3RhcnRfdGltZSkgPiBtb21lbnQoYi5zdGFydF90aW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICBsZXQgd2Vla3MgPSB7fTtcbiAgICAgICAgdGhpcy5zZXQoJ2FkZGVkU2hpZnRzTWFwJywge30pO1xuXG4gICAgICAgIC8vIGNhbGN1bGF0ZSBob3VycyB3b3JrZWQgYW5kIG1vbmV5IGVhcm5lZC5cbiAgICAgICAgbGV0IHRoaXNXZWVrTWludXRlc1dvcmtlZCA9IDA7XG4gICAgICAgIGZvciAodmFyIHMgPSAwOyBzaGlmdHNBcnJheS5sZW5ndGggPiBzOyBzKyspIHtcbiAgICAgICAgICAgIC8vIGFkZCB0aGUgc2hpZnQgaWYgaXQgaGFzbnQgYmVlbiBhZGRlZCBhbHJlYWR5IGFuZCBpZiBpdCBpcyBpbiB0aGUgY3VycmVudCB3ZWVrLiBPUiBpZiB0aGUgc2hpZnQgaGFzIG5vdCBiZWVuIGVuZGVkLlxuICAgICAgICAgICAgaWYgKCF0aGlzLmFkZGVkU2hpZnRzTWFwW3NoaWZ0c0FycmF5W3NdLmlkXSkge1xuICAgICAgICAgICAgICAgIGxldCBzaGlmdCA9IG9ic2VydmFibGVGcm9tT2JqZWN0KHNoaWZ0c0FycmF5W3NdKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNoaWZ0cy5wdXNoKHNoaWZ0KVxuICAgICAgICAgICAgICAgIGlmIChzaGlmdHNBcnJheVtzXS5lbmRfdGltZSAmJiBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkgPiBtb21lbnQoKS5zdGFydE9mKCd3ZWVrJykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aGlzV2Vlay5wdXNoKHNoaWZ0KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gdXBkYXRlIHRoZSBzaGlmdCB0aGF0cyBzdGlsbCBydW5uaW5nIHNvIHRoZSB0aW1lcyBhbmQgdGhlIG1vbmV5IGVhcm5lZCB1cGRhdGVzXG4gICAgICAgICAgICAvLyBvciB1cGRhdGUgYSBzaGlmdCB0aGF0IHdhcyByZWNlbnRseSB1cGRhdGVkLlxuICAgICAgICAgICAgaWYgKCFzaGlmdHNBcnJheVtzXS5lbmRfdGltZSB8fCBzaGlmdHNBcnJheVtzXS5yZWNlbnRseVVwZGF0ZWQpIHtcbiAgICAgICAgICAgICAgICBsZXQgdXBkYXRlSW5kZXg7XG4gICAgICAgICAgICAgICAgdGhpcy5zaGlmdHMuZm9yRWFjaCgoZWxlbWVudCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuZ2V0KCdpZCcpID09IHNoaWZ0c0FycmF5W3NdLmlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVJbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5zaGlmdHMuc2V0SXRlbSh1cGRhdGVJbmRleCwgb2JzZXJ2YWJsZUZyb21PYmplY3Qoc2hpZnRzQXJyYXlbc10pKTtcblxuICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgZW50aXR5IGluIHRoZSB0aGlzV2VlayBvYnNlcnZhYmxlLlxuICAgICAgICAgICAgICAgIGxldCB0aGlzV2Vla1VwZGF0ZUluZGV4O1xuICAgICAgICAgICAgICAgIHRoaXMudGhpc1dlZWsuZm9yRWFjaCgoZWxlbWVudCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuZ2V0KCdpZCcpID09IHNoaWZ0c0FycmF5W3NdLmlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzV2Vla1VwZGF0ZUluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLnRoaXNXZWVrLnNldEl0ZW0odGhpc1dlZWtVcGRhdGVJbmRleCwgb2JzZXJ2YWJsZUZyb21PYmplY3Qoc2hpZnRzQXJyYXlbc10pKTtcbiAgICAgICAgICAgICAgICBzaGlmdHNBcnJheVtzXS5yZWNlbnRseVVwZGF0ZWQgPSBmYWxzZTtcblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5hZGRlZFNoaWZ0c01hcFtzaGlmdHNBcnJheVtzXS5pZF0gPSBzaGlmdHNBcnJheVtzXTtcbiAgICAgICAgICAgIGlmICghc2hpZnRzQXJyYXlbc10uZW5kX3RpbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgY29tcGFyZUEgPSBtb21lbnQoKTtcbiAgICAgICAgICAgICAgICB2YXIgbWludXRlc1dvcmtlZCA9IGNvbXBhcmVBLmRpZmYobW9tZW50KHNoaWZ0c0FycmF5W3NdLnN0YXJ0X3RpbWUpLCAnbWludXRlcycpXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGhpc1dlZWsubGVuZ3RoICYmIHRoaXMudGhpc1dlZWsuZ2V0SXRlbSgwKS5nZXQoJ2lkJykgPT0gc2hpZnRzQXJyYXlbc10uaWQpIHRoaXMudGhpc1dlZWsuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRoaXNXZWVrLnVuc2hpZnQob2JzZXJ2YWJsZUZyb21PYmplY3Qoc2hpZnRzQXJyYXlbc10pKSAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9zZXQgdXAgd2VlayBkYXRhLlxuICAgICAgICAgICAgLy8gdmFyIGJlZ2lubmluZ09mV2Vla01vbWVudCA9IG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKS5pc29XZWVrZGF5KDApO1xuICAgICAgICAgICAgLy8gdmFyIGJlZ2lubmluZ09mV2VlayA9IG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKS5pc29XZWVrZGF5KDApLmZvcm1hdCgnZGRkZCBNTU1NIERvIFlZWVknKTtcblxuICAgICAgICAgICAgdmFyIGJlZ2lubmluZ09mV2Vla01vbWVudCA9IG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKS5pc29XZWVrZGF5KDApO1xuICAgICAgICAgICAgdmFyIGJlZ2lubmluZ09mV2VlayA9IG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKS5pc29XZWVrZGF5KDApLmZvcm1hdCgnZGRkZCBNTU1NIERvIFlZWVknKTtcbiAgICAgICAgICAgIGlmIChtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuaXNvV2Vla2RheSgpID09IDAgfHwgbW9tZW50KHNoaWZ0c0FycmF5W3NdLnN0YXJ0X3RpbWUpLmlzb1dlZWtkYXkoKSA9PSA3KSB7XG4gICAgICAgICAgICAgICAgYmVnaW5uaW5nT2ZXZWVrTW9tZW50ID0gbW9tZW50KHNoaWZ0c0FycmF5W3NdLnN0YXJ0X3RpbWUpO1xuICAgICAgICAgICAgICAgIGJlZ2lubmluZ09mV2VlayA9IG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKS5mb3JtYXQoJ2RkZGQgTU1NTSBEbyBZWVlZJyk7XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIXdlZWtzW2JlZ2lubmluZ09mV2Vla10pIHtcbiAgICAgICAgICAgICAgICB3ZWVrc1tiZWdpbm5pbmdPZldlZWtdID0ge1xuICAgICAgICAgICAgICAgICAgICB0b3RhbF9taW51dGVzOiAwLFxuICAgICAgICAgICAgICAgICAgICByZWd1bGFyX21pbnV0ZXM6IDAsXG4gICAgICAgICAgICAgICAgICAgIG92ZXJ0aW1lX21pbnV0ZXM6IDAsXG4gICAgICAgICAgICAgICAgICAgIGhvdXJzX3dvcmtlZDogMCxcbiAgICAgICAgICAgICAgICAgICAgcmVndWxhcl9lYXJuZWQ6IDAsXG4gICAgICAgICAgICAgICAgICAgIG92ZXJ0aW1lX2Vhcm5lZDogMCxcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6IGJlZ2lubmluZ09mV2Vla01vbWVudC5mb3JtYXQoJ1tXZWVrIG9mXSBNTU0gRG8nKSxcbiAgICAgICAgICAgICAgICAgICAgd2Vla19zdGFydDogYmVnaW5uaW5nT2ZXZWVrTW9tZW50LmZvcm1hdCgnWVlZWS1NTS1ERCcpLFxuICAgICAgICAgICAgICAgICAgICBzaGlmdHM6IFtdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjb21wYXJlQSA9IG1vbWVudCgpO1xuICAgICAgICAgICAgaWYgKHNoaWZ0c0FycmF5W3NdLmVuZF90aW1lKSBjb21wYXJlQSA9IG1vbWVudChzaGlmdHNBcnJheVtzXS5lbmRfdGltZSk7XG4gICAgICAgICAgICB2YXIgbWludXRlc1dvcmtlZCA9IGNvbXBhcmVBLmRpZmYobW9tZW50KHNoaWZ0c0FycmF5W3NdLnN0YXJ0X3RpbWUpLCAnbWludXRlcycpXG4gICAgICAgICAgICB3ZWVrc1tiZWdpbm5pbmdPZldlZWtdLnRvdGFsX21pbnV0ZXMgKz0gbWludXRlc1dvcmtlZDtcbiAgICAgICAgICAgIHZhciBzaGlmdCA9IHNoaWZ0U2VydmljZS5idWlsZFNoaWZ0RGF0YShzaGlmdHNBcnJheVtzXSk7XG4gICAgICAgICAgICB3ZWVrc1tiZWdpbm5pbmdPZldlZWtdLnNoaWZ0cy5wdXNoKHNoaWZ0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlICh0aGlzLnNlY3Rpb25lZFNoaWZ0cy5sZW5ndGgpIHRoaXMuc2VjdGlvbmVkU2hpZnRzLnBvcCgpO1xuXG4gICAgICAgIGZvciAodmFyIHcgaW4gd2Vla3MpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2cod2Vla3Nbd10udGl0bGUpO1xuICAgICAgICAgICAgZm9yICh2YXIgaXcgPSAwOyB3ZWVrc1t3XS5zaGlmdHMubGVuZ3RoID4gaXc7IGl3KyspIHtcbiAgICAgICAgICAgICAgICB2YXIgbXlTaGlmdCA9IHdlZWtzW3ddLnNoaWZ0c1tpd11cbiAgICAgICAgICAgICAgICBpZiAoaXcgPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0Lm1pbnV0ZXNfYWNjcnVlZCA9IG15U2hpZnQubWludXRlc193b3JrZWQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5taW51dGVzX2FjY3J1ZWQgPSBteVNoaWZ0Lm1pbnV0ZXNfd29ya2VkICsgd2Vla3Nbd10uc2hpZnRzW2l3LTFdLm1pbnV0ZXNfYWNjcnVlZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG15U2hpZnQubWludXRlc19hY2NydWVkID4gMjQwMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIHNoaWZ0IGhhcyBvdmVydGltZSBtaW51dGVzLlxuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0Lm92ZXJ0aW1lX21pbnV0ZXMgPSBteVNoaWZ0Lm1pbnV0ZXNfYWNjcnVlZCAtIDI0MDA7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBsaW5lIHdpbGwgZW5zdXJlIHRoYXQgeW91IGFyZW50IGV4cG9uZW50aWFsbHkgYWNjcnVpbmcgb3ZlcnRpbWUgbWludXRlcy5cbiAgICAgICAgICAgICAgICAgICAgaWYgKG15U2hpZnQub3ZlcnRpbWVfbWludXRlcyA+IG15U2hpZnQubWludXRlc193b3JrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG15U2hpZnQub3ZlcnRpbWVfbWludXRlcyA9IG15U2hpZnQubWludXRlc193b3JrZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlZ3VsYXJfbWludXRlc193b3JrZWQgPSBteVNoaWZ0Lm1pbnV0ZXNfd29ya2VkLW15U2hpZnQub3ZlcnRpbWVfbWludXRlcztcbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5yZWd1bGFyX2Vhcm5lZCA9IChyZWd1bGFyX21pbnV0ZXNfd29ya2VkICogKHRoaXMuZ2V0KCd1c2VyJykuaG91cmx5UmF0ZS82MCkpLnRvRml4ZWQoMik7XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQub3ZlcnRpbWVfZWFybmVkID0gKG15U2hpZnQub3ZlcnRpbWVfbWludXRlcyAqICh0aGlzLmdldCgndXNlcicpLm92ZXJ0aW1lUmF0ZS82MCkpLnRvRml4ZWQoMik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5yZWd1bGFyX2Vhcm5lZCA9IChteVNoaWZ0Lm1pbnV0ZXNfd29ya2VkKih0aGlzLmdldCgndXNlcicpLmhvdXJseVJhdGUvNjApKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHdlZWtzW3ddLnJlZ3VsYXJfZWFybmVkICs9IG15U2hpZnQucmVndWxhcl9lYXJuZWQtMDtcbiAgICAgICAgICAgICAgICBpZiAobXlTaGlmdC5vdmVydGltZV9lYXJuZWQpIHdlZWtzW3ddLm92ZXJ0aW1lX2Vhcm5lZCArPSBteVNoaWZ0Lm92ZXJ0aW1lX2Vhcm5lZC0wO1xuICAgICAgICAgICAgICAgIG15U2hpZnQudG90YWxfZWFybmVkID0gKChteVNoaWZ0LnJlZ3VsYXJfZWFybmVkLTApICsgKG15U2hpZnQub3ZlcnRpbWVfZWFybmVkLTAgfHwgMCkpLnRvRml4ZWQoMilcblxuICAgICAgICAgICAgICAgIG15U2hpZnQuZGlzcGxheV9kYXRlID0gbW9tZW50KG15U2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdkZGRkIE1NTSBERCwgWVlZWScpO1xuICAgICAgICAgICAgICAgIG15U2hpZnQuZGlzcGxheV90aW1pbmcgPSBtb21lbnQobXlTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2g6bW1hJykgKyAnIHRvICcgKyBtb21lbnQobXlTaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdoOm1tYScpO1xuICAgICAgICAgICAgICAgIGlmIChtb21lbnQobXlTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ1lZWVlNTUREJykgPCBtb21lbnQobXlTaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdZWVlZTU1ERCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQuZGlzcGxheV90aW1pbmcgPSBtb21lbnQobXlTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2g6bW1hJykgKyAnIHRvICcgKyBtb21lbnQobXlTaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdNTU0gREQgW2F0XSBoOm1tYScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIW15U2hpZnQuZW5kX3RpbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5kaXNwbGF5X2RhdGUgPSBteVNoaWZ0LmRpc3BsYXlfZGF0ZSA9IG1vbWVudCgpLmZvcm1hdCgnW1RPREFZXSBNTU0gREQsIFlZWVknKTtcblxuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0LmRpc3BsYXlfdGltaW5nID0gJ1NoaWZ0IHN0YXJ0ZWQgYXQgJyArIG1vbWVudChteVNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnaDptbWEnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1vbWVudChteVNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnWVlZWU1NREQnKSA8IG1vbWVudCgpLmZvcm1hdCgnWVlZWU1NREQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5kaXNwbGF5X3RpbWluZyA9ICdTaGlmdCBzdGFydGVkIG9uICcgKyBtb21lbnQobXlTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ01NTSBERCBbYXRdIGg6bW1hJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdlZWtzW3ddLnRvdGFsX2Vhcm5lZCA9ICh3ZWVrc1t3XS5yZWd1bGFyX2Vhcm5lZCArICh3ZWVrc1t3XS5vdmVydGltZV9lYXJuZWQgfHwgMCkpLnRvRml4ZWQoMik7XG4gICAgICAgICAgICB3ZWVrc1t3XS5yZWd1bGFyX2Vhcm5lZCA9IHdlZWtzW3ddLnJlZ3VsYXJfZWFybmVkLnRvRml4ZWQoMilcbiAgICAgICAgICAgIGlmICh3ZWVrc1t3XS5vdmVydGltZV9lYXJuZWQpIHdlZWtzW3ddLm92ZXJ0aW1lX2Vhcm5lZCA9IHdlZWtzW3ddLm92ZXJ0aW1lX2Vhcm5lZC50b0ZpeGVkKDIpXG4gICAgICAgICAgICB3ZWVrc1t3XS5ob3Vyc193b3JrZWQgPSAod2Vla3Nbd10udG90YWxfbWludXRlcy82MCkudG9GaXhlZCgyKTtcbiAgICAgICAgICAgIGlmICh3ZWVrc1t3XS50b3RhbF9taW51dGVzID4gMjQwMCkge1xuICAgICAgICAgICAgICAgIHdlZWtzW3ddLnJlZ3VsYXJfbWludXRlcyA9IDI0MDA7XG4gICAgICAgICAgICAgICAgd2Vla3Nbd10ub3ZlcnRpbWVfbWludXRlcyA9IHdlZWtzW3ddLnRvdGFsX21pbnV0ZXMtMjQwMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgd2Vla3Nbd10ucmVndWxhcl9taW51dGVzID0gd2Vla3Nbd10udG90YWxfbWludXRlcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBzZXR1cCBzZWN0aW9uZWQgYXJyYXkuXG4gICAgICAgICAgICB2YXIgaGVhZGVyT2JqID0ge1xuICAgICAgICAgICAgICAgIFwiaWRcIjogd2Vla3Nbd10udGl0bGUsXG4gICAgICAgICAgICAgICAgXCJzdGFydF90aW1lXCI6IG1vbWVudCh3ZWVrc1t3XS5zaGlmdHNbd2Vla3Nbd10uc2hpZnRzLmxlbmd0aC0xXS5zdGFydF90aW1lKS5hZGQoJzEwJywgJ21pbnV0ZXMnKS5mb3JtYXQoJ1lZWVktTU0tREQgSEg6bW06c3MnKSxcbiAgICAgICAgICAgICAgICBcImhlYWRlclwiOiB0cnVlLFxuICAgICAgICAgICAgICAgIFwidGl0bGVcIjogd2Vla3Nbd10udGl0bGUsXG4gICAgICAgICAgICAgICAgXCJob3Vyc193b3JrZWRcIjogd2Vla3Nbd10uaG91cnNfd29ya2VkLFxuICAgICAgICAgICAgICAgIFwicmVndWxhcl9lYXJuZWRcIjogd2Vla3Nbd10ucmVndWxhcl9lYXJuZWQsXG4gICAgICAgICAgICAgICAgXCJvdmVydGltZV9lYXJuZWRcIjogd2Vla3Nbd10ub3ZlcnRpbWVfZWFybmVkLFxuICAgICAgICAgICAgICAgIFwidGltZV93b3JrZWRcIjogc2hpZnRTZXJ2aWNlLmNhbGN1bGF0ZVNoaWZ0SG91cnNXb3JrZWQoZmFsc2UsIGZhbHNlLCB3ZWVrc1t3XS50b3RhbF9taW51dGVzKS50aW1lX3dvcmtlZCxcbiAgICAgICAgICAgICAgICBcInRvdGFsX2Vhcm5lZFwiOiB3ZWVrc1t3XS50b3RhbF9lYXJuZWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vY29uc29sZS5kaXIoaGVhZGVyT2JqKTtcbiAgICAgICAgICAgIHRoaXMuc2VjdGlvbmVkU2hpZnRzLnB1c2gob2JzZXJ2YWJsZUZyb21PYmplY3QoaGVhZGVyT2JqKSk7XG5cbiAgICAgICAgICAgIHZhciBoYXNPcGVuU2hpZnQgPSBmYWxzZTtcbiAgICAgICAgICAgIGZvciAodmFyIGl4ID0gMDsgd2Vla3Nbd10uc2hpZnRzLmxlbmd0aCA+IGl4OyBpeCsrKSB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmRpcih3ZWVrc1t3XS5zaGlmdHNbaXhdKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlY3Rpb25lZFNoaWZ0cy5wdXNoKG9ic2VydmFibGVGcm9tT2JqZWN0KHdlZWtzW3ddLnNoaWZ0c1tpeF0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvL2NvbnNvbGUubG9nKHRoaXMuc2VjdGlvbmVkU2hpZnRzLmxlbmd0aCk7XG4gICAgICAgIFxuICAgICAgICAvLyB0aGlzLnNlY3Rpb25lZFNoaWZ0cy5wb3AoKTtcbiAgICAgICAgLy8gd2hpbGUgKHRoaXMuc2VjdGlvbmVkU2hpZnRzLmxlbmd0aCkgdGhpcy5zZWN0aW9uZWRTaGlmdHMucG9wKCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLndlZWtzID0gd2Vla3M7XG5cbiAgICAgICAgdGhpcy50aGlzV2Vlay5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgdmFyIGNvbXBhcmVBID0gbW9tZW50KCk7XG4gICAgICAgICAgICBpZiAoZWxlbWVudC5nZXQoJ2VuZF90aW1lJykpIGNvbXBhcmVBID0gbW9tZW50KGVsZW1lbnQuZ2V0KCdlbmRfdGltZScpKTtcbiAgICAgICAgICAgIHZhciBtaW51dGVzV29ya2VkID0gY29tcGFyZUEuZGlmZihtb21lbnQoZWxlbWVudC5nZXQoJ3N0YXJ0X3RpbWUnKSksICdtaW51dGVzJylcbiAgICAgICAgICAgIHRoaXNXZWVrTWludXRlc1dvcmtlZCArPSBtaW51dGVzV29ya2VkO1xuICAgICAgICB9KTtcblxuICAgICAgICBsZXQgbWludXRlUmF0ZSA9IHBhcnNlRmxvYXQodGhpcy51c2VyLmhvdXJseVJhdGUpLzYwO1xuICAgICAgICBsZXQgb3ZlcnRpbWVNaW51dGVSYXRlID0gcGFyc2VGbG9hdCh0aGlzLnVzZXIub3ZlcnRpbWVSYXRlKS82MDtcbiAgICAgICAgaWYgKHRoaXNXZWVrTWludXRlc1dvcmtlZCA+IDI0MDApIHtcbiAgICAgICAgICAgIGxldCByZWd1bGFyRWFybmVkID0gMjQwMCptaW51dGVSYXRlO1xuICAgICAgICAgICAgbGV0IG92ZXJ0aW1lRWFybmVkID0gKHRoaXNXZWVrTWludXRlc1dvcmtlZC0yNDAwKSpvdmVydGltZU1pbnV0ZVJhdGU7XG4gICAgICAgICAgICB0aGlzLnNldCgncmVndWxhcl9lYXJuZWQnLCByZWd1bGFyRWFybmVkKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdvdmVydGltZV9lYXJuZWQnLCBvdmVydGltZUVhcm5lZClcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5zZXQoJ3RvdGFsX2Vhcm5lZCcsIChyZWd1bGFyRWFybmVkK292ZXJ0aW1lRWFybmVkKS50b0ZpeGVkKDIpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdyZWd1bGFyX2Vhcm5lZCcsIHRoaXNXZWVrTWludXRlc1dvcmtlZCptaW51dGVSYXRlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCd0b3RhbF9lYXJuZWQnLCAodGhpc1dlZWtNaW51dGVzV29ya2VkKm1pbnV0ZVJhdGUpLnRvRml4ZWQoMikpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2V0KCd0aGlzV2Vla01pbnV0ZXNXb3JrZWQnLCB0aGlzV2Vla01pbnV0ZXNXb3JrZWQpO1xuICAgICAgICBjb25zb2xlLmxvZyh0aGlzV2Vla01pbnV0ZXNXb3JrZWQpO1xuICAgICAgICBsZXQgdGltZVdvcmtlZCA9ICcwIEhPVVJTJztcbiAgICAgICAgaWYgKHRoaXNXZWVrTWludXRlc1dvcmtlZCkgdGltZVdvcmtlZCA9IHNoaWZ0U2VydmljZS5jYWxjdWxhdGVTaGlmdEhvdXJzV29ya2VkKGZhbHNlLCBmYWxzZSwgdGhpc1dlZWtNaW51dGVzV29ya2VkKS50aW1lX3dvcmtlZDtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0KCdob3Vyc193b3JrZWQnLCB0aW1lV29ya2VkKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcHJvY2Vzc0ludm9pY2VzKGludm9pY2VzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdpbiBwcm9jZXNzIGludm9pY2VzJyk7XG4gICAgICAgIHdoaWxlICh0aGlzLmludm9pY2VzLmxlbmd0aCkgdGhpcy5pbnZvaWNlcy5wb3AoKTtcbiAgICAgICAgbGV0IHVzZXIgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndXNlckRhdGEnKSk7XG4gICAgICAgIC8vbGV0IGludm9pY2VzQXJyYXkgPSBuZXcgT2JzZXJ2YWJsZUFycmF5KCk7XG4gICAgICAgIHRoaXMuc2V0KCdpbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwJywge30pO1xuICAgICAgICBmb3IgKHZhciBpIGluIGludm9pY2VzKSB7XG4gICAgICAgICAgICBpbnZvaWNlc1tpXS5pZCA9IGk7XG4gICAgICAgICAgICBpbnZvaWNlc1tpXS5zaGlmdHMgPSBbXTtcbiAgICAgICAgICAgIGludm9pY2VzW2ldLmZhbWlseV9uYW1lID0gdXNlci5mYW1pbGllc1tpbnZvaWNlc1tpXS5mYW1pbHlfaWRdLm5hbWU7XG4gICAgICAgICAgICBpbnZvaWNlc1tpXS5kYXRlX2NyZWF0ZWRfcHJldHR5ID0gbW9tZW50KGludm9pY2VzW2ldLmRhdGVfY3JlYXRlZCkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKTtcbiAgICAgICAgICAgIGZvciAodmFyIHMgPSAwOyBpbnZvaWNlc1tpXS5zaGlmdF9pZHMubGVuZ3RoID4gczsgcysrKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXBbaW52b2ljZXNbaV0uZmFtaWx5X2lkXSkgdGhpcy5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ludm9pY2VzW2ldLmZhbWlseV9pZF0gPSB7fTtcbiAgICAgICAgICAgICAgICB0aGlzLmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXBbaW52b2ljZXNbaV0uZmFtaWx5X2lkXVtpbnZvaWNlc1tpXS5zaGlmdF9pZHNbc11dID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBsZXQgc2hpZnQgPSB0aGlzLmFkZGVkU2hpZnRzTWFwW2ludm9pY2VzW2ldLnNoaWZ0X2lkc1tzXV07XG4gICAgICAgICAgICAgICAgc2hpZnQuY29udHJpYnV0aW9uID0gc2hpZnQuY29udHJpYnV0aW9uc1tpbnZvaWNlc1tpXS5mYW1pbHlfaWRdO1xuICAgICAgICAgICAgICAgIHNoaWZ0Lmludm9pY2VfdGl0bGVfZGlzcGxheSA9IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ00vRC9ZWScpICsgJzogJyArIHNoaWZ0LmRpc3BsYXlfaG91cnM7XG4gICAgICAgICAgICAgICAgc2hpZnQuaW52b2ljZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGludm9pY2VzW2ldLnNoaWZ0cy5wdXNoKHNoaWZ0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHRoaXMgaXMgcmVxdWlyZWQgdG8gbWFrZSB0aGUgVUkgcmVzcGVjdCB0aGUgbG9hZGluZyBpbmRpY2F0b3IuXG4gICAgICAgICAgICBpbnZvaWNlc1tpXS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoIWludm9pY2VzW2ldLnNlbnQpIGludm9pY2VzW2ldLnNlbnQgPSBmYWxzZTtcblxuICAgICAgICAgICAgdGhpcy5pbnZvaWNlTWFwW2ldID0gaW52b2ljZXNbaV07XG4gICAgICAgICAgICBsZXQgaXNBZGRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgLy9pbnZvaWNlc0FycmF5LnB1c2goaW52b2ljZXNbaV0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLmludm9pY2VzLnB1c2gob2JzZXJ2YWJsZUZyb21PYmplY3QoaW52b2ljZXNbaV0pKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy90aGlzLmludm9pY2VzLnB1c2gob2JzZXJ2YWJsZUZyb21PYmplY3QoaW52b2ljZXNbaV0pKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmludm9pY2VzLnNvcnQoKGE6YW55LCBiOmFueSkgPT4ge1xuICAgICAgICAgICAgaWYgKG1vbWVudChhLmRhdGVfY3JlYXRlZCkgPCBtb21lbnQoYi5kYXRlX2NyZWF0ZWQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vbWVudChhLmRhdGVfY3JlYXRlZCkgPiBtb21lbnQoYi5kYXRlX2NyZWF0ZWQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMuaW52b2ljZXMubGVuZ3RoKVxuICAgICAgICAvLyBjb25zb2xlLmxvZygnaW52b2ljZXNBcnJheSBsZW5naHQgJyArIGludm9pY2VzQXJyYXkubGVuZ3RoKTtcbiAgICAgICAgLy8gdGhpcy5zZXQoJ2ludm9pY2VzJywgaW52b2ljZXNBcnJheSk7XG4gICAgICAgIC8vIGVtcHR5IHRoaXMgYW5kIHJlcG9wdWxhdGUgaXQuXG4gICAgICAgIHRoaXMuc2V0KCd1bmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXAnLCB7fSk7XG4gICAgICAgIGZvciAobGV0IHNoaWZ0X2lkIGluIHRoaXMuYWRkZWRTaGlmdHNNYXApIHtcbiAgICAgICAgICAgIGZvciAobGV0IGZhbWlseV9pZCBpbiB0aGlzLmZhbWlsaWVzTWFwKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnVuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcFtmYW1pbHlfaWRdKSB0aGlzLnVuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcFtmYW1pbHlfaWRdID0ge307XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXBbZmFtaWx5X2lkXSB8fCAhdGhpcy5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ZhbWlseV9pZF1bc2hpZnRfaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBteVNoaWZ0ID0gdGhpcy5hZGRlZFNoaWZ0c01hcFtzaGlmdF9pZF07XG4gICAgICAgICAgICAgICAgICAgIGxldCBjb250cmlidXRpb246YW55ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlmIChteVNoaWZ0LmNvbnRyaWJ1dGlvbnMpIGNvbnRyaWJ1dGlvbiA9IG15U2hpZnQuY29udHJpYnV0aW9uc1tmYW1pbHlfaWRdO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjb250cmlidXRpb24pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJpYnV0aW9uICYmIGNvbnRyaWJ1dGlvbiAhPSAnMCcpIHRoaXMudW5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ZhbWlseV9pZF1bc2hpZnRfaWRdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ0lOVk9JQ0VEIFNISUZUUyBCWSBGQU1JTFknKVxuICAgICAgICAvLyBjb25zb2xlLmRpcihKU09OLnN0cmluZ2lmeSh0aGlzLmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXApKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJVTklOVk9JQ0VEIFNISUZUUyBCWSBGQU1JTFlcIilcbiAgICAgICAgLy8gY29uc29sZS5kaXIoSlNPTi5zdHJpbmdpZnkodGhpcy51bmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXApKTtcbiAgICB9XG4gICAgXG59Il19