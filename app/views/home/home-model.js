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
    HomeModel.prototype.sendTestEmail = function () {
        userService.sendEmail("Welcome.", "Your nanny has added you as a family in Nanny Shifts, an app that helps nannies keep track of their hours and expenses. You dont' have to do anything, you will start receiving invoices when your nanny requests to be paid.", "Your nanny added you as a family on Nanny Shifts.").then(function (result) {
            console.log('did it');
        });
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
        shiftService.createInvoice(args).then(function (result) {
            _this.hideSettings();
            _this.processInvoices(JSON.parse(appSettings.getString('invoices')));
        });
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
        shiftService.createInvoice(args).then(function (result) {
            _this.hideSettings();
            _this.sendInvoice(result.key);
            _this.processInvoices(JSON.parse(appSettings.getString('invoices')));
        });
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
                if (editingShift.id == MyModel.get('clockedIn').id && args.end_time)
                    MyModel.set('clockedIn', false);
                _this.hideSettings();
            });
        }
        else {
            shiftService.addShift(args).then(function (result) {
                _this.processShifts(JSON.parse(appSettings.getString('shifts')));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9tZS1tb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvbWUtbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSw4Q0FBOEc7QUFDOUcsMERBQXNEO0FBR3RELG9DQUFzQztBQUN0QyxrREFBb0Q7QUFDcEQsK0JBQWlDO0FBQ2pDLGdDQUFrQztBQUNsQyxnQ0FBa0M7QUFFbEMsa0NBQTBDO0FBQzFDLG9DQUFzQztBQUN0QyxxQ0FBa0M7QUFNbEMsdURBQTJEO0FBQzNELHlEQUF1RDtBQUt2RCxvREFBc0Q7QUFDdEQsSUFBSSxXQUF3QixDQUFDO0FBQzdCLElBQUksWUFBMEIsQ0FBQztBQUMvQixJQUFJLGlCQUE4QixDQUFDO0FBQ25DLElBQUksd0JBQXdCLENBQUM7QUFDN0IsSUFBSSxXQUFXLENBQUM7QUFDaEIsSUFBSSxRQUFnQixDQUFDO0FBQ3JCLElBQUksT0FBa0IsQ0FBQztBQUN2QixJQUFJLGFBQTRCLENBQUM7QUFDakMsSUFBSSxZQUFZLENBQUM7QUFFakI7SUFBK0IsNkJBQVU7SUFDckM7UUFBQSxZQUNJLGlCQUFPLFNBd0JWO1FBR00saUJBQVcsR0FBVyxVQUFVLEdBQUcsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwRixVQUFJLEdBQVMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDM0Qsa0JBQVksR0FBVyxDQUFDLENBQUM7UUFDekIsMkJBQXFCLEdBQVcsQ0FBQyxDQUFDO1FBQ2xDLGtCQUFZLEdBQVcsSUFBSSxDQUFDO1FBQzVCLG9CQUFjLEdBQVcsQ0FBQyxDQUFDO1FBQzNCLHFCQUFlLEdBQVUsQ0FBQyxDQUFDO1FBQzNCLG1CQUFhLEdBQVcsVUFBVSxDQUFDO1FBQ25DLGNBQVEsR0FBZ0MsSUFBSSxrQ0FBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hFLGlCQUFXLEdBQVEsRUFBRSxDQUFDO1FBQ3RCLG1CQUFhLEdBQWUsdUJBQW9CLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDcEQsZUFBUyxHQUFRLEtBQUssQ0FBQztRQUN2QixjQUFRLEdBQWdDLElBQUksa0NBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoRSxZQUFNLEdBQWdDLElBQUksa0NBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM5RCxvQkFBYyxHQUFHLEVBQUUsQ0FBQztRQUNwQixlQUFTLEdBQVksS0FBSyxDQUFDO1FBQzNCLG1CQUFhLEdBQVcsQ0FBQyxDQUFDO1FBQzFCLGFBQU8sR0FBRyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDcEQscUJBQWUsR0FBZ0MsSUFBSSxrQ0FBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXZFLDZCQUF1QixHQUFRLEtBQUssQ0FBQztRQUNyQyxpQ0FBMkIsR0FBUSxFQUFFLENBQUM7UUFDdEMsK0JBQXlCLEdBQVEsRUFBRSxDQUFDO1FBQ3BDLHNCQUFnQixHQUFlLEVBQUUsQ0FBQztRQUVsQyxjQUFRLEdBQWdDLElBQUksa0NBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoRSxnQkFBVSxHQUFHLEVBQUUsQ0FBQztRQUVoQixlQUFTLEdBQWdDLElBQUksa0NBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNqRSxrQkFBWSxHQUFRLEVBQUUsQ0FBQztRQUN2QixXQUFLLEdBQUcsRUFBRSxDQUFDO1FBeERkLE9BQU8sR0FBRyxLQUFJLENBQUM7UUFDZix3Q0FBd0M7UUFDeEMsV0FBVyxHQUFHLElBQUksMEJBQVcsRUFBRSxDQUFDO1FBQ2hDLFlBQVksR0FBRyxJQUFJLDRCQUFZLEVBQUUsQ0FBQztRQUNsQyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUN6RCxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUMxQixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDeEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztnQkFBQyxLQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFdEUsSUFBSSxNQUFNLEdBQUcsdUJBQW9CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BELEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUM1QixLQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUUvQixDQUFDO1FBQ0wsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLEtBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQztZQUFDLEtBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkYsS0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QyxLQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1QixZQUFZLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07WUFDdkMsS0FBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDekIsS0FBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDN0IsS0FBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hFLENBQUMsQ0FBQyxDQUFBOztJQUNOLENBQUM7SUFxQ00sa0NBQWMsR0FBckI7UUFBQSxpQkFhQztRQVpHLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNO1lBQy9CLFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsTUFBTTtnQkFDdkMsS0FBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3pCLEtBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRWpHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDSixLQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BFLE9BQU8sRUFBRSxDQUFBO1lBQ2IsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQTtJQUVOLENBQUM7SUFFTSw4QkFBVSxHQUFqQixVQUFrQixNQUFZO1FBQTlCLGlCQWtCQztRQWpCRyxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQztRQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFDaEMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLHNCQUFzQixFQUFFLFVBQUMsSUFBa0M7WUFDM0YsS0FBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3pDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDckIsVUFBVSxDQUFDO29CQUNQLEtBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO2dCQUM1QixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDVixDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ0osVUFBVSxDQUFDO29CQUNQLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO29CQUN6RCxLQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUMvQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFFVixDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUE7SUFFTixDQUFDO0lBRU0sNEJBQVEsR0FBZjtRQUNJLElBQUksVUFBVSxHQUFpQyxDQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN4RixVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVNLDJCQUFPLEdBQWQ7UUFDSSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3pELENBQUM7SUFFTSxpQ0FBYSxHQUFwQjtRQUNJLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLCtOQUErTixFQUFFLG1EQUFtRCxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsTUFBTTtZQUMvVCxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFCLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVNLDZCQUFTLEdBQWhCO1FBQ0ksSUFBSSxDQUFDLFlBQVksQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO1FBQy9ELElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFTSw2QkFBUyxHQUFoQjtRQUFBLGlCQVNDO1FBUkcsSUFBSSxJQUFJLEdBQUc7WUFDUCxVQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxVQUFVO1lBQ3ZDLFlBQVksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFlBQVk7U0FDOUMsQ0FBQTtRQUNELFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsTUFBTTtZQUNwQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3BCLEtBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFTSwrQkFBVyxHQUFsQixVQUFtQixJQUFJO1FBQXZCLGlCQVFDO1FBUEcsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUM5QixZQUFZLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07WUFDdkMsS0FBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDekIsS0FBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDN0IsS0FBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BFLFdBQVcsQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO1FBQ25DLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVNLDhCQUFVLEdBQWpCLFVBQWtCLElBQUk7UUFDbEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUN4Qix3REFBd0Q7UUFDeEQsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQztRQUVoQyxJQUFJLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBakMsQ0FBaUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxZQUFZLENBQUMsNkNBQTZDLENBQUMsQ0FBQztRQUNwRSxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUM1QyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDO0lBQzNGLENBQUM7SUFFTSw2QkFBUyxHQUFoQjtRQUNJLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLHVCQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLFlBQVksQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUM7SUFDM0YsQ0FBQztJQUVNLDhCQUFVLEdBQWpCO1FBQUEsaUJBK0JDO1FBOUJHLElBQUksSUFBSSxHQUFPO1lBQ1gsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztZQUMzQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO1NBQ2hELENBQUE7UUFFRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQ2hDLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsTUFBTTtnQkFDbkUsSUFBSSxRQUFRLEdBQUcsS0FBSSxDQUFDLFFBQVEsQ0FBQTtnQkFDNUIsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFBLE9BQU87b0JBQ3BCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNwRCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDckMsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQztnQkFDSCxLQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDL0IsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUM3QixXQUFXLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLE1BQVU7Z0JBQ3hDLElBQUksUUFBUSxHQUFHLEtBQUksQ0FBQyxRQUFRLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztnQkFDckIsUUFBUSxDQUFDLElBQUksQ0FBQyx1QkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUMxQyxLQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzNDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO29CQUFDLEtBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBRTlFLEtBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4QixDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUM7SUFDTCxDQUFDO0lBRU0sZ0NBQVksR0FBbkIsVUFBb0IsSUFBSTtRQUNwQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUMzQixPQUFPLENBQUMsT0FBTyxDQUFDLDhDQUE4QyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsTUFBTTtZQUN4RSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNULFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsTUFBTTtvQkFDekQsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQztvQkFDaEMsSUFBSSxXQUFXLENBQUM7b0JBQ2hCLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUUsS0FBSzt3QkFDNUIsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUM7NEJBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztvQkFDeEQsQ0FBQyxDQUFDLENBQUM7b0JBQ0gsUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7b0JBQy9CLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDO3dCQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ2pGLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO29CQUNsQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQzNCLENBQUMsQ0FBQyxDQUFBO1lBQ04sQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVNLHFDQUFpQixHQUF4QixVQUF5QixXQUFZO1FBQXJDLGlCQWFDO1FBWkcsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUNkLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzVCLFlBQVksQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07Z0JBQ3hDLEtBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUM3QixLQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQy9CLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDekQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDaEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvQixDQUFDO0lBRUwsQ0FBQztJQUVELHlEQUF5RDtJQUVsRCxrQ0FBYyxHQUFyQixVQUFzQixJQUFJO1FBQTFCLGlCQW9FQztRQW5FRyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEQsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNWLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNqQixFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN2QixPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ2pDLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDSixPQUFPLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDbkMsQ0FBQztZQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMzRSxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDSixFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUcsQ0FBQztZQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDckIsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUV2QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsTUFBTTtnQkFDNUgsRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0JBQ25CLG1DQUFtQztnQkFDdkMsQ0FBQztnQkFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7b0JBQzVCLElBQUksS0FBRyxHQUFHLCtDQUErQyxDQUFDO29CQUMxRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDdEIsS0FBRyxJQUFJLHVGQUF1RixDQUFDO29CQUNuRyxDQUFDO29CQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDN0IsS0FBRyxJQUFJLHdDQUF3QyxHQUFHLEtBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRywyRkFBMkYsQ0FBQztvQkFDcE0sQ0FBQztvQkFFRCxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07d0JBQ2pELEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDOzRCQUNyQixzREFBc0Q7NEJBQ3RELHVFQUF1RTs0QkFDdkUsS0FBSzt3QkFDVCxDQUFDO29CQUNMLENBQUMsQ0FBQyxDQUFBO2dCQUNOLENBQUM7Z0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxjQUFjLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDN0IsWUFBWSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsTUFBTTt3QkFDbkUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7d0JBQzlCLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO3dCQUMxQixzRUFBc0U7b0JBQzFFLENBQUMsQ0FBQyxDQUFBO2dCQUNOLENBQUM7Z0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7b0JBQ3BDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUM3QixZQUFZLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQSxNQUFNO3dCQUNwRSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQzt3QkFDOUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7d0JBQzFCLHNFQUFzRTtvQkFDMUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ04sQ0FBQztnQkFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0JBQzFCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLENBQUMsQ0FBQztnQkFFdkQsQ0FBQztnQkFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLFVBQVUsR0FBRyxLQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUNoRixPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDN0IsS0FBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO29CQUM3QyxZQUFZLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQSxNQUFNO3dCQUNuRSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFDMUIsc0VBQXNFO3dCQUN0RSxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQzt3QkFDcEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ2xDLENBQUMsQ0FBQyxDQUFBO2dCQUNOLENBQUM7Z0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxhQUFhLEdBQUcsS0FBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDbkYsS0FBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDbkQsS0FBSyxDQUFDLGlDQUFpQyxHQUFHLEtBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUM5RixDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDO0lBQ0wsQ0FBQztJQUVNLHFDQUFpQixHQUF4QjtRQUNJLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwQyxPQUFPLENBQUMsWUFBWSxDQUFDLCtDQUErQyxDQUFDLENBQUM7UUFDdEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRU0seUNBQXFCLEdBQTVCO1FBQ0ksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDekMsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQUEsSUFBSTtZQUN0QixXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN2QyxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFO1lBQUEsaUJBRXhCO1lBREcsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFNLE9BQUEsS0FBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLEVBQTFCLENBQTBCLENBQUMsQ0FBQztRQUNoRSxDQUFDLENBQUMsQ0FBQTtRQUNGLDZEQUE2RDtRQUM3RCxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRTtZQUFBLGlCQWtCdEI7WUFqQkcsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTTtnQkFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDakUsSUFBSSxxQkFBcUIsR0FBRyxFQUFFLENBQUM7WUFDL0IsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsSCxJQUFJLENBQUMsdUJBQXVCLEdBQUcsTUFBTSxDQUFDO1lBQ3RDLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztZQUNyQixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsMkJBQTJCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFeEQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDckYsSUFBSSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3pFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsNEJBQTRCLEdBQUcsa0JBQWtCLENBQUM7b0JBQ3pFLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ25ELFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsNEJBQTRCLENBQUM7Z0JBQ3pFLENBQUM7WUFDTCxDQUFDO1lBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xELElBQUksQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUscUJBQXFCLENBQUMsQ0FBQztZQUNwRCxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQU0sT0FBQSxLQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFBMUIsQ0FBMEIsQ0FBQyxDQUFDO1FBQ2hFLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVNLDJDQUF1QixHQUE5QixVQUErQixJQUFJO1FBQy9CLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNqQixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdkQsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN2QyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDNUIsSUFBSSxVQUFVLEdBQWUsSUFBSSxDQUFDLE1BQU0sQ0FBQztvQkFDekMsSUFBSSxlQUFlLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztvQkFDOUQsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsR0FBRyxlQUFlLENBQUMsQ0FBQztvQkFDMUQsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsSUFBSSwyQkFBMkIsQ0FBQyxDQUFDLENBQUM7d0JBQ3RELFVBQVUsQ0FBQyxTQUFTLEdBQUcsa0JBQWtCLENBQUM7d0JBQzFDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO3dCQUMzQixlQUFlLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO29CQUNyRSxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNKLFVBQVUsQ0FBQyxTQUFTLEdBQUcsMkJBQTJCLENBQUM7d0JBQ25ELElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDO3dCQUM1QixlQUFlLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO29CQUNyRSxDQUFDO29CQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDNUQsQ0FBQztZQUNMLENBQUM7UUFDTCxDQUFDO0lBQ0wsQ0FBQztJQUVNLCtCQUFXLEdBQWxCO1FBQUEsaUJBb0JDO1FBbkJHLElBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUNuQixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2RCxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFdkMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDO2dCQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFDRCxJQUFJLElBQUksR0FBRztZQUNQLFNBQVMsRUFBRSxTQUFTO1lBQ3BCLFNBQVMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUMsRUFBRTtZQUNqRCxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUM7WUFDL0IsSUFBSSxFQUFFLEtBQUs7WUFDWCxZQUFZLEVBQUUsTUFBTSxFQUFFLENBQUMsTUFBTSxFQUFFO1NBQ2xDLENBQUE7UUFDRCxZQUFZLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07WUFDeEMsS0FBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBRXBCLEtBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV4RSxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFTSxzQ0FBa0IsR0FBekI7UUFBQSxpQkFxQkM7UUFwQkcsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ25CLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV2QyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUM7Z0JBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdEQsQ0FBQztRQUNELElBQUksSUFBSSxHQUFHO1lBQ1AsU0FBUyxFQUFFLFNBQVM7WUFDcEIsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQyxFQUFFO1lBQ2pELEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQztZQUMvQixJQUFJLEVBQUUsS0FBSztZQUNYLFlBQVksRUFBRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLEVBQUU7WUFDL0IsSUFBSSxFQUFFLElBQUk7U0FDYixDQUFBO1FBQ0QsWUFBWSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxNQUFVO1lBQzdDLEtBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNwQixLQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM1QixLQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFeEUsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRU0sK0JBQVcsR0FBbEIsVUFBbUIsVUFBVSxFQUFFLE9BQVEsRUFBRSxTQUFVO1FBQy9DLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDdEQsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLDhEQUE4RCxDQUFDO1FBQ2hJLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRywyQkFBMkIsQ0FBQztRQUM3RixFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ1osT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxxR0FBcUcsQ0FBQTtZQUNsSyxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLDhEQUE4RCxDQUFBO1FBQy9ILENBQUM7UUFDRCxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDWCxXQUFXLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxFQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNsSyxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixJQUFJLGVBQWUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMxRCxXQUFXLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxFQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNySixDQUFDO0lBRUwsQ0FBQztJQUVPLG9DQUFnQixHQUF4QixVQUF5QixVQUFVLEVBQUUsT0FBUTtRQUN6QyxJQUFJLElBQUksR0FBRywrRkFDdUUsR0FBRyxVQUFVLEdBQUcsaWJBTWpHLENBQUE7UUFDRCxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDWCxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdkQsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN2QyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO29CQUN2QixJQUFJLElBQUkseUlBRXdFLEdBQUUsSUFBSSxDQUFDLFlBQVksR0FBRSxzREFBb0QsR0FBRyxJQUFJLENBQUMsY0FBYyxHQUFHLDJJQUM5RSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxHQUFHLDREQUU1SixDQUFDO2dCQUNOLENBQUM7WUFDTCxDQUFDO1lBQ0QsSUFBSSxJQUFJLGdLQUdxRixHQUFHLElBQUksQ0FBQyxZQUFZLEdBQUcscUNBQ25ILENBQUE7UUFDTCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ2hELElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxJQUFJLElBQUksaUlBRXdFLEdBQUUsS0FBSyxDQUFDLFlBQVksR0FBRSxzREFBb0QsR0FBRyxLQUFLLENBQUMsY0FBYyxHQUFHLHVJQUNoRixHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLG9EQUUvSSxDQUFDO1lBQ04sQ0FBQztZQUNELElBQUksSUFBSSxnS0FHcUYsR0FBRyxPQUFPLENBQUMsS0FBSyxHQUFHLHFDQUMvRyxDQUFBO1FBQ0wsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVELDBEQUEwRDtJQUUxRCx1REFBdUQ7SUFFaEQsZ0NBQVksR0FBbkIsVUFBb0IsSUFBSTtRQUF4QixpQkF3QkM7UUF2QkcsSUFBSSxLQUFLLENBQUM7UUFDVixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNoRCxLQUFLLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDdEYsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osS0FBSyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuRCxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNSLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxRQUFRLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxZQUFZLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQSxNQUFNO2dCQUM5RyxFQUFFLENBQUMsQ0FBQyxNQUFNLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQztvQkFDekIsS0FBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ3JDLENBQUM7Z0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxjQUFjLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxPQUFPLENBQUMsTUFBTSxDQUFDLG9FQUFvRSxFQUFFLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsTUFBTTt3QkFDbEgsRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7NEJBQ3JCLFlBQVksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07Z0NBQzFDLEtBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDcEUsQ0FBQyxDQUFDLENBQUE7d0JBQ04sQ0FBQztvQkFDTCxDQUFDLENBQUMsQ0FBQTtnQkFFTixDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDO0lBRUwsQ0FBQztJQUVNLGlDQUFhLEdBQXBCLFVBQXFCLElBQUksRUFBRSxLQUFLO1FBQzVCLGtGQUFrRjtRQUNsRiwrREFBK0Q7UUFDL0QscUJBQXFCO1FBQ3JCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDUCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDaEQsS0FBSyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBQ3RGLENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixLQUFLLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25ELENBQUM7UUFDTCxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1QsT0FBTyxDQUFDLFlBQVksQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1lBQ2hFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzFDLFlBQVksR0FBRyxFQUFFLENBQUM7WUFDbEIsSUFBSSxTQUFTLEdBQUcsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFHLFdBQVcsQ0FBQztZQUM1RCxJQUFJLE9BQU8sR0FBRyxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsV0FBVyxDQUFDO1lBQzFELE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7WUFDckUsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDdkUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUNoRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtZQUVuRSxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFBO1lBQ25FLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBQ25FLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDOUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDL0QsWUFBWSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckQsWUFBWSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakQsSUFBSSxVQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQy9CLElBQUksYUFBYSxHQUFHLFVBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQy9ELElBQUksV0FBVyxHQUFHLENBQUMsYUFBYSxHQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoRCxJQUFJLFVBQVUsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBQyxFQUFFLENBQUM7WUFDeEQsSUFBSSxrQkFBa0IsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBQyxFQUFFLENBQUM7WUFFbEUsSUFBSSxNQUFNLEdBQUcsWUFBWSxDQUFDLHlCQUF5QixDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQUEsQ0FBQztZQUNyRyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDeEMsT0FBTyxDQUFDLFlBQVksQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1lBQ2hFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUNqQixPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUMvQyxDQUFDO1lBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFBO1lBQ3JGLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtZQUM5RSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDaEYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBRTFFLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7WUFDbkUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtZQUM1RCxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBQzlELE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDeEQsWUFBWSxDQUFDLFFBQVEsR0FBRyxNQUFNLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMxQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDakIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFBO2dCQUNqRixPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7Z0JBQzFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztnQkFDNUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO2dCQUN0RSxZQUFZLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDNUQsQ0FBQztZQUVELG9DQUFvQztZQUdwQyxJQUFJLFFBQVEsR0FBRyxNQUFNLEVBQUUsQ0FBQztZQUN4QixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO2dCQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3RELElBQUksYUFBYSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUN0RSxJQUFJLFdBQVcsR0FBRyxDQUFDLGFBQWEsR0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEQsSUFBSSxVQUFVLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUMsRUFBRSxDQUFDO1lBQ3hELElBQUksa0JBQWtCLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUMsRUFBRSxDQUFDO1lBR2xFLElBQUksTUFBTSxHQUFHLFlBQVksQ0FBQyx5QkFBeUIsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUFBLENBQUM7WUFDckcsT0FBTyxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDNUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDM0QsQ0FBQztJQUNMLENBQUM7SUFFTSxpREFBNkIsR0FBcEMsVUFBcUMsS0FBSztRQUN0QywwRkFBMEY7UUFDMUYsdURBQXVEO1FBQ3ZELElBQUksZUFBZSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3pGLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzRixlQUFlLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUMzRSxDQUFDO1FBQ0QsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMxRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM1QyxJQUFJLE9BQU8sR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0Isd0JBQXdCO1lBQ3hCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pCLFlBQVksSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDO1lBQzNDLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDSixLQUFLLENBQUM7WUFDVixDQUFDO1FBQ0wsQ0FBQztRQUNELGlEQUFpRDtRQUNqRCxNQUFNLENBQUMsWUFBWSxDQUFDO0lBQ3hCLENBQUM7SUFFTSxxQ0FBaUIsR0FBeEI7UUFDSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUMsSUFBSSxTQUFTLEdBQXdCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNqSCxFQUFFLENBQUMsQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLGdCQUFnQixDQUFDO2dCQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1FBQzdFLENBQUM7SUFDTCxDQUFDO0lBRU8scUNBQWlCLEdBQXpCO1FBQ0ksSUFBSSxTQUFTLEdBQUcsWUFBWSxDQUFDLHlCQUF5QixDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZHLElBQUksQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3ZELElBQUksTUFBTSxHQUFHLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQzNILE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM5RCxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDakMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBQ0QsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN2QyxJQUFJLFFBQVEsR0FBTyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEdBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRSxpREFBaUQ7UUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEdBQUcsQ0FBQyxRQUFRLEdBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9FLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3ZDLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxFQUFFLElBQUksWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3RELFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxZQUFZLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDL0YsQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDTCxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ25ELENBQUM7WUFDTixDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ0osUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3RELENBQUM7WUFFRCxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyx1QkFBVSxDQUFDLG1CQUFtQixFQUFFLFVBQUMsSUFBd0I7Z0JBQzVFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLElBQUksY0FBYyxDQUFDLENBQUMsQ0FBQztvQkFDdEMsSUFBSSxVQUFVLEdBQVUsQ0FBQyxDQUFDO29CQUMxQixJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUM7b0JBQzNCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzt3QkFDL0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7NEJBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQTt3QkFDeEcsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDekQsY0FBYyxHQUFHLElBQUksQ0FBQzt3QkFDMUIsQ0FBQzt3QkFBQyxJQUFJLENBQUMsQ0FBQzs0QkFDSixVQUFVLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO3dCQUM5RSxDQUFDO29CQUNMLENBQUM7b0JBQ0QsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQzt3QkFDakIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO29CQUM5RCxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNKLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbkUsQ0FBQztnQkFFTCxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUE7UUFFTixDQUFDO0lBQ0wsQ0FBQztJQUVNLHNDQUFrQixHQUF6QjtRQUNJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDbEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNwRSxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUU7WUFBQSxpQkFFeEI7WUFERyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQU0sT0FBQSxLQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFBMUIsQ0FBMEIsQ0FBQyxDQUFDO1FBQ2hFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFO1lBQUEsaUJBVXRCO1lBVEcsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFNLE9BQUEsS0FBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLEVBQTFCLENBQTBCLENBQUMsQ0FBQztZQUM1RCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQzNCLEVBQUUsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQzVDLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDL0IsRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztnQkFBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLE1BQU0sQ0FBQztZQUN2QyxJQUFJLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLElBQUksR0FBRyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUM7WUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDbkksWUFBWSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakgsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDNUIsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRU0sc0NBQWtCLEdBQXpCO1FBQ0ksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFNUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNuRSxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDdEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRTtZQUFBLGlCQUV4QjtZQURHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBTSxPQUFBLEtBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUExQixDQUEwQixDQUFDLENBQUM7UUFDaEUsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRTtZQUFBLGlCQVV0QjtZQVRHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBTSxPQUFBLEtBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUExQixDQUEwQixDQUFDLENBQUM7WUFDNUQsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUMxQixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDMUUsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUM5QixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDaEYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsV0FBVyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQ3hFLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFBO1lBQzlGLFlBQVksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pILElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQzVCLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVNLHdDQUFvQixHQUEzQjtRQUNJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzVCLElBQUksQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFO1lBQUEsaUJBRXhCO1lBREcsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFNLE9BQUEsS0FBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLEVBQTFCLENBQTBCLENBQUMsQ0FBQztRQUNoRSxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFO1lBQUEsaUJBVXRCO1lBVEcsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFNLE9BQUEsS0FBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLEVBQTFCLENBQTBCLENBQUMsQ0FBQztZQUM1RCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQzNCLEVBQUUsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQzVDLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDL0IsRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztnQkFBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLE1BQU0sQ0FBQztZQUN2QyxJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLElBQUksR0FBRyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUM7WUFDbkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDekksWUFBWSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdkgsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDNUIsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDO0lBRU0sd0NBQW9CLEdBQTNCO1FBQ0ksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDeEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRTtZQUFBLGlCQUV4QjtZQURHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBTSxPQUFBLEtBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUExQixDQUEwQixDQUFDLENBQUM7UUFDaEUsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRTtZQUFBLGlCQVV0QjtZQVRHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBTSxPQUFBLEtBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUExQixDQUEwQixDQUFDLENBQUM7WUFDNUQsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUMxQixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDMUUsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUM5QixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDaEYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsV0FBVyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQzFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFBO1lBQ2xHLFlBQVksQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3ZILElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQzVCLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVNLDZCQUFTLEdBQWhCO1FBQUEsaUJBMkJDO1FBMUJHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3pCLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUN2RixJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDN0YsSUFBSSxJQUFJLEdBQU8sRUFBRSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzFDLElBQUksQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzlDLElBQUksQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFDO1FBQ3hCLElBQUksYUFBYSxHQUFPLEVBQUUsQ0FBQztRQUMzQixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3BDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3ZDLGFBQWEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzNGLENBQUM7UUFDRCxJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQztRQUNuQyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsQixZQUFZLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsTUFBTTtnQkFDdkQsS0FBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoRSxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsRUFBRSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUM7b0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ3JHLEtBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4QixDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUEsTUFBTTtnQkFDbkMsS0FBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoRSxLQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDO0lBRUwsQ0FBQztJQUVNLGtDQUFjLEdBQXJCO1FBQ0ksSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRTtZQUFBLGlCQUV4QjtZQURHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBTSxPQUFBLEtBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUExQixDQUEwQixDQUFDLENBQUM7UUFDaEUsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRTtZQUFBLGlCQWV0QjtZQWRHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBTSxPQUFBLEtBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUExQixDQUEwQixDQUFDLENBQUM7WUFDNUQsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUMzQixFQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO2dCQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUM1QyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQy9CLEVBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7Z0JBQUMsTUFBTSxHQUFHLEdBQUcsR0FBRyxNQUFNLENBQUM7WUFDdkMsSUFBSSxJQUFJLEdBQU87Z0JBQ1gsVUFBVSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRTtnQkFDOUYsUUFBUSxFQUFFLElBQUk7YUFDakIsQ0FBQTtZQUNELFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsWUFBaUI7Z0JBQ2pELDBEQUEwRDtnQkFDMUQsS0FBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoRSxLQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNoQyxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVELHdEQUF3RDtJQUVqRCwwQ0FBc0IsR0FBN0IsVUFBOEIsSUFBbUM7UUFDN0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzdCLENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNCLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO1FBQ3hDLENBQUM7SUFDTCxDQUFDO0lBRU0sd0JBQUksR0FBWDtRQUNJLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDL0IsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxQixXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ25DLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRU0sa0NBQWMsR0FBckIsVUFBc0IsSUFBcUI7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRU8sZ0NBQVksR0FBcEIsVUFBcUIsUUFBUTtRQUE3QixpQkEyR0M7UUExR0csSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFzQjtZQUMzRCxLQUFLLEVBQUUsRUFBQyxDQUFDLEVBQUUsR0FBRyxFQUFJLENBQUMsRUFBRSxHQUFHLEVBQUM7WUFDekIsUUFBUSxFQUFFLEdBQUc7WUFDYixLQUFLLEVBQUUsc0JBQWMsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQ3RELENBQUMsQ0FBQTtRQUNGLGlCQUFpQixHQUFnQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQzdFLHdCQUF3QixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLDRCQUE0QixDQUFDLENBQUE7UUFDOUUsV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hDLElBQUksWUFBWSxHQUFHLGlCQUFNLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztRQUNoRCxpQkFBaUIsQ0FBQyxVQUFVLEdBQUcsWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUNqRCxpQkFBaUIsQ0FBQyxPQUFPLENBQXNCO1lBQzNDLFNBQVMsRUFBRSxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBQztZQUN2QixRQUFRLEVBQUUsR0FBRztZQUNiLEtBQUssRUFBRSxzQkFBYyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7U0FDdEQsQ0FBQyxDQUFBO1FBQ0Ysd0JBQXdCLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztRQUNyQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUM7WUFDN0IsT0FBTyxFQUFFLENBQUM7WUFDVixRQUFRLEVBQUUsR0FBRztTQUNoQixDQUFDLENBQUE7UUFDRixJQUFJLFNBQVMsR0FBNkIsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDakYsU0FBUyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzNCLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLENBQUMsSUFBSSxDQUFDO1FBQzdDLElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDO1FBQzlDLFNBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUIsSUFBSSxlQUFlLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUNuRCxJQUFJLG9CQUFvQixHQUFXLGlCQUFpQixDQUFDLEdBQUcsQ0FBQztRQUN6RCxFQUFFLENBQUMsQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLG1CQUFtQixDQUFDO1lBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDN0UsUUFBUSxHQUFHLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztRQUMzRyxRQUFRLENBQUMsS0FBSyxHQUFHO1lBQ2IsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDekUsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLEVBQUU7U0FDeEYsQ0FBQztRQUNGLFFBQVEsQ0FBQyxnQkFBZ0IsR0FBRywrQkFBK0IsR0FBRyxnQ0FBZ0MsQ0FBQztRQUMvRixvQkFBb0IsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDekMsb0JBQW9CLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakQsSUFBSSxJQUFJLEdBQUcsNEJBQTRCLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDOUMsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUN6RCxJQUFJLFFBQVEsR0FBMEIsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNqRixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ1gsSUFBSSxhQUFXLEdBQUcsS0FBSyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsVUFBQyxJQUF3QjtnQkFDdEMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksYUFBVyxDQUFDLENBQUMsQ0FBQztvQkFDakMsS0FBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUN4QixDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFDSCxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxVQUFDLFVBQTBCO2dCQUM3QyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3pCLGlCQUFpQixDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsT0FBTyxHQUFDLENBQUMsR0FBRyxDQUFDO29CQUN2RCxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxHQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0JBQ2hDLGFBQVcsR0FBRyxJQUFJLENBQUM7d0JBQ25CLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDM0IsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7NEJBQ3hCLFdBQVcsQ0FBQyxPQUFPLENBQUM7Z0NBQ2hCLE9BQU8sRUFBRSxDQUFDO2dDQUNWLFFBQVEsRUFBRSxHQUFHOzZCQUNoQixDQUFDLENBQUE7d0JBQ04sQ0FBQztvQkFDTCxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNKLGFBQVcsR0FBRyxLQUFLLENBQUM7d0JBQ3BCLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDM0IsV0FBVyxDQUFDLE9BQU8sQ0FBQztnQ0FDaEIsT0FBTyxFQUFFLENBQUM7Z0NBQ1YsUUFBUSxFQUFFLEdBQUc7NkJBQ2hCLENBQUMsQ0FBQTt3QkFDTixDQUFDO29CQUNMLENBQUM7Z0JBRUwsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNsQixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxVQUFDLElBQXdCO2dCQUN0QyxpQkFBaUIsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztnQkFDM0MsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUVwQixFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzNCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO3dCQUN4QixXQUFXLENBQUMsT0FBTyxDQUFDOzRCQUNoQixPQUFPLEVBQUUsQ0FBQzs0QkFDVixRQUFRLEVBQUUsR0FBRzt5QkFDaEIsQ0FBQyxDQUFBO29CQUNOLENBQUM7Z0JBQ0wsQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDSixFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzNCLFdBQVcsQ0FBQyxPQUFPLENBQUM7NEJBQ2hCLE9BQU8sRUFBRSxDQUFDOzRCQUNWLFFBQVEsRUFBRSxHQUFHO3lCQUNoQixDQUFDLENBQUE7b0JBQ04sQ0FBQztnQkFDTCxDQUFDO2dCQUNELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbEIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO3dCQUNwQixLQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3hCLENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ0osaUJBQWlCLENBQUMsT0FBTyxDQUFzQjs0QkFDM0MsU0FBUyxFQUFFLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFDOzRCQUN2QixRQUFRLEVBQUUsR0FBRzs0QkFDYixLQUFLLEVBQUUsc0JBQWMsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO3lCQUN0RCxDQUFDLENBQUE7b0JBQ04sQ0FBQztnQkFDTCxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDO0lBQ0wsQ0FBQztJQUVNLGdDQUFZLEdBQW5CO1FBQUEsaUJBb0JDO1FBbkJHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3pCLFlBQVksR0FBRyxLQUFLLENBQUM7UUFDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFzQjtZQUMzRCxLQUFLLEVBQUUsRUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUM7WUFDbkIsUUFBUSxFQUFFLEdBQUc7WUFDYixLQUFLLEVBQUUsc0JBQWMsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQ3RELENBQUMsQ0FBQTtRQUNGLElBQUksWUFBWSxHQUFHLGlCQUFNLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztRQUNoRCxpQkFBaUIsQ0FBQyxPQUFPLENBQXNCO1lBQzNDLFNBQVMsRUFBRSxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFlBQVksR0FBRyxFQUFFLEVBQUM7WUFDdkMsUUFBUSxFQUFFLEdBQUc7WUFDYixLQUFLLEVBQUUsc0JBQWMsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQ3RELENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDSixLQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixDQUFDLE9BQU8sQ0FBQztZQUM3QixPQUFPLEVBQUUsQ0FBQztZQUNWLFFBQVEsRUFBRSxHQUFHO1NBQ2hCLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFTSx3Q0FBb0IsR0FBM0IsVUFBNEIsSUFBSTtRQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xCLDJDQUEyQztRQUMzQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFTSxpQ0FBYSxHQUFwQixVQUFxQixNQUFNO1FBQ3ZCLElBQUksV0FBVyxHQUFHLEVBQUUsQ0FBQztRQUNyQixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ25CLElBQUksU0FBTyxHQUFHLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckQsU0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDZixFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQU8sQ0FBQyxRQUFRLENBQUM7Z0JBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEQsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFPLENBQUMsQ0FBQztRQUM5QixDQUFDO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFekQsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2xCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDYixDQUFDO1lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNkLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUdmLDJDQUEyQztRQUMzQyxJQUFJLHFCQUFxQixHQUFHLENBQUMsQ0FBQzs7WUFFMUIscUhBQXFIO1lBQ3JILEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBSyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUMsSUFBSSxPQUFLLEdBQUcsdUJBQW9CLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pELE9BQUssTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFLLENBQUMsQ0FBQTtnQkFDdkIsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzFGLE9BQUssUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFLLENBQUMsQ0FBQTtnQkFDN0IsQ0FBQztZQUNMLENBQUM7WUFFRCxpRkFBaUY7WUFDakYsK0NBQStDO1lBQy9DLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztnQkFDN0QsSUFBSSxhQUFXLENBQUM7Z0JBQ2hCLE9BQUssTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxLQUFLO29CQUMvQixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO3dCQUN6QyxhQUFXLEdBQUcsS0FBSyxDQUFDO29CQUN4QixDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO2dCQUNILE9BQUssTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFXLEVBQUUsdUJBQW9CLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFdkUsZ0RBQWdEO2dCQUNoRCxJQUFJLHFCQUFtQixDQUFDO2dCQUN4QixPQUFLLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUUsS0FBSztvQkFDakMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzt3QkFDekMscUJBQW1CLEdBQUcsS0FBSyxDQUFDO29CQUNoQyxDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO2dCQUNILE9BQUssUUFBUSxDQUFDLE9BQU8sQ0FBQyxxQkFBbUIsRUFBRSx1QkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqRixXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQztZQUUzQyxDQUFDO1lBQ0QsT0FBSyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4RCxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUN2QixRQUFRLEdBQUcsTUFBTSxFQUFFLENBQUM7Z0JBQ3BCLGFBQWEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQy9FLEVBQUUsQ0FBQyxDQUFDLE9BQUssUUFBUSxDQUFDLE1BQU0sSUFBSSxPQUFLLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQUMsT0FBSyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzNHLE9BQUssUUFBUSxDQUFDLE9BQU8sQ0FBQyx1QkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQy9ELENBQUM7WUFFRCxtQkFBbUI7WUFDbkIsK0VBQStFO1lBQy9FLHFHQUFxRztZQUVqRyxxQkFBcUIsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4RSxlQUFlLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFDbEcsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM3RyxxQkFBcUIsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUMxRCxlQUFlLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUNwRixDQUFDO1lBSUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMxQixLQUFLLENBQUMsZUFBZSxDQUFDLEdBQUc7b0JBQ3JCLGFBQWEsRUFBRSxDQUFDO29CQUNoQixlQUFlLEVBQUUsQ0FBQztvQkFDbEIsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDbkIsWUFBWSxFQUFFLENBQUM7b0JBQ2YsY0FBYyxFQUFFLENBQUM7b0JBQ2pCLGVBQWUsRUFBRSxDQUFDO29CQUNsQixLQUFLLEVBQUUscUJBQXFCLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDO29CQUN2RCxVQUFVLEVBQUUscUJBQXFCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQztvQkFDdEQsTUFBTSxFQUFFLEVBQUU7aUJBQ2IsQ0FBQztZQUNOLENBQUM7WUFDRyxRQUFRLEdBQUcsTUFBTSxFQUFFLENBQUM7WUFDeEIsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNwRSxhQUFhLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQy9FLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxhQUFhLElBQUksYUFBYSxDQUFDO1lBQ2xELEtBQUssR0FBRyxZQUFZLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hELEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlDLENBQUM7MkJBdENXLFFBQVEsRUFDUixhQUFhLEVBU2pCLHFCQUFxQixFQUNyQixlQUFlLEVBcUJmLFFBQVEsRUFFUixhQUFhLEVBRWIsS0FBSztRQXRFYixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFOztTQXdFMUM7UUFFRCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTTtZQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFL0QsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNsQiw4QkFBOEI7WUFDOUIsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUNqRCxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUNqQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDVixPQUFPLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUM7Z0JBQ3JELENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ0osT0FBTyxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxHQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQztnQkFDN0YsQ0FBQztnQkFDRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ2pDLG1DQUFtQztvQkFDbkMsT0FBTyxDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO29CQUUxRCxnRkFBZ0Y7b0JBQ2hGLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQzt3QkFDcEQsT0FBTyxDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUM7b0JBQ3RELENBQUM7b0JBQ0QsSUFBSSxzQkFBc0IsR0FBRyxPQUFPLENBQUMsY0FBYyxHQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztvQkFDN0UsT0FBTyxDQUFDLGNBQWMsR0FBRyxDQUFDLHNCQUFzQixHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxVQUFVLEdBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2hHLE9BQU8sQ0FBQyxlQUFlLEdBQUcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFlBQVksR0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekcsQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDSixPQUFPLENBQUMsY0FBYyxHQUFHLENBQUMsT0FBTyxDQUFDLGNBQWMsR0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsVUFBVSxHQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsRyxDQUFDO2dCQUVELEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLElBQUksT0FBTyxDQUFDLGNBQWMsR0FBQyxDQUFDLENBQUM7Z0JBQ3BELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUM7b0JBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsSUFBSSxPQUFPLENBQUMsZUFBZSxHQUFDLENBQUMsQ0FBQztnQkFDbkYsT0FBTyxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsR0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxlQUFlLEdBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUVqRyxPQUFPLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUM7Z0JBQzlFLE9BQU8sQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUN4SCxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzlGLE9BQU8sQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3hJLENBQUM7Z0JBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztvQkFDcEIsT0FBTyxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsWUFBWSxHQUFHLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO29CQUV0RixPQUFPLENBQUMsY0FBYyxHQUFHLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUMxRixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUM5RSxPQUFPLENBQUMsY0FBYyxHQUFHLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUM7b0JBQzFHLENBQUM7Z0JBQ0wsQ0FBQztZQUNMLENBQUM7WUFFRCxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0YsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1RCxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDO2dCQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUYsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLEdBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9ELEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDaEMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7Z0JBQ2hDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxHQUFDLElBQUksQ0FBQztZQUM1RCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ0osS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDO1lBQ3RELENBQUM7WUFHRCx5QkFBeUI7WUFDekIsSUFBSSxTQUFTLEdBQUc7Z0JBQ1osSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO2dCQUNwQixZQUFZLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUM7Z0JBQzdILFFBQVEsRUFBRSxJQUFJO2dCQUNkLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztnQkFDdkIsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZO2dCQUNyQyxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYztnQkFDekMsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWU7Z0JBQzNDLGFBQWEsRUFBRSxZQUFZLENBQUMseUJBQXlCLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsV0FBVztnQkFDdkcsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZO2FBQ3hDLENBQUE7WUFDRCx5QkFBeUI7WUFDekIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsdUJBQW9CLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUUzRCxJQUFJLFlBQVksR0FBRyxLQUFLLENBQUM7WUFDekIsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUNqRCxtQ0FBbUM7Z0JBQ25DLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLHVCQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pFLENBQUM7UUFDTCxDQUFDO1FBQ0QsMkNBQTJDO1FBRTNDLDhCQUE4QjtRQUM5QixrRUFBa0U7UUFFbEUsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFFbkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBQSxPQUFPO1lBQ3pCLElBQUksUUFBUSxHQUFHLE1BQU0sRUFBRSxDQUFDO1lBQ3hCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDeEUsSUFBSSxhQUFhLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQy9FLHFCQUFxQixJQUFJLGFBQWEsQ0FBQztRQUMzQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFDLEVBQUUsQ0FBQztRQUNyRCxJQUFJLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFDLEVBQUUsQ0FBQztRQUMvRCxFQUFFLENBQUMsQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQy9CLElBQUksYUFBYSxHQUFHLElBQUksR0FBQyxVQUFVLENBQUM7WUFDcEMsSUFBSSxjQUFjLEdBQUcsQ0FBQyxxQkFBcUIsR0FBQyxJQUFJLENBQUMsR0FBQyxrQkFBa0IsQ0FBQztZQUNyRSxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsY0FBYyxDQUFDLENBQUE7WUFFM0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxhQUFhLEdBQUMsY0FBYyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxxQkFBcUIsR0FBQyxVQUFVLENBQUMsQ0FBQztZQUM3RCxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDLHFCQUFxQixHQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDekQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ25DLElBQUksVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUMzQixFQUFFLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztZQUFDLFVBQVUsR0FBRyxZQUFZLENBQUMseUJBQXlCLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLFdBQVcsQ0FBQztRQUVoSSxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRU0sbUNBQWUsR0FBdEIsVUFBdUIsUUFBUTtRQUMzQixPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDbkMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU07WUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ2pELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ3pELDRDQUE0QztRQUM1QyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ3JCLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ25CLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1lBQ3hCLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3BFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUMxRixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3BELEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDdkgsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO2dCQUN2RixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUQsS0FBSyxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDaEUsS0FBSyxDQUFDLHFCQUFxQixHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDO2dCQUNyRyxLQUFLLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztnQkFDdEIsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkMsQ0FBQztZQUNELGlFQUFpRTtZQUNqRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztZQUM1QixFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7WUFFaEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakMsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO1lBQ3BCLGtDQUFrQztZQUVsQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyx1QkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXRELHdEQUF3RDtRQUM1RCxDQUFDO1FBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBQyxDQUFLLEVBQUUsQ0FBSztZQUM1QixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsRCxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2IsQ0FBQztZQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDZCxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDakMsK0RBQStEO1FBQy9ELHVDQUF1QztRQUN2QyxnQ0FBZ0M7UUFDaEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM1QyxHQUFHLENBQUMsQ0FBQyxJQUFJLFFBQVEsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUN2QyxHQUFHLENBQUMsQ0FBQyxJQUFJLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDckMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDbkcsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNyRyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUM1QyxJQUFJLFlBQVksR0FBTyxLQUFLLENBQUM7b0JBQzdCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7d0JBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQzNFLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7b0JBQzFCLEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxZQUFZLElBQUksR0FBRyxDQUFDO3dCQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzFHLENBQUM7WUFDTCxDQUFDO1FBQ0wsQ0FBQztRQUNELDJDQUEyQztRQUMzQywrREFBK0Q7UUFDL0QsNkNBQTZDO1FBQzdDLGlFQUFpRTtJQUNyRSxDQUFDO0lBRUwsZ0JBQUM7QUFBRCxDQUFDLEFBaHVDRCxDQUErQix1QkFBVSxHQWd1Q3hDO0FBaHVDWSw4QkFBUyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBhZ2UgfSBmcm9tICd1aS9wYWdlJztcbmltcG9ydCB7RXZlbnREYXRhLCBPYnNlcnZhYmxlLCBQcm9wZXJ0eUNoYW5nZURhdGEsIGZyb21PYmplY3QgYXMgb2JzZXJ2YWJsZUZyb21PYmplY3R9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSc7XG5pbXBvcnQge09ic2VydmFibGVBcnJheX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlLWFycmF5JztcbmltcG9ydCB7IEdlc3R1cmVUeXBlcywgUGFuR2VzdHVyZUV2ZW50RGF0YSB9IGZyb20gXCJ1aS9nZXN0dXJlc1wiO1xuaW1wb3J0ICogYXMgZmlyZWJhc2UgZnJvbSAnbmF0aXZlc2NyaXB0LXBsdWdpbi1maXJlYmFzZSc7XG5pbXBvcnQgKiBhcyBkaWFsb2dzIGZyb20gJ3VpL2RpYWxvZ3MnO1xuaW1wb3J0ICogYXMgYXBwU2V0dGluZ3MgZnJvbSAnYXBwbGljYXRpb24tc2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgKiBhcyBmcmFtZSBmcm9tICd1aS9mcmFtZSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmaWxlLXN5c3RlbSc7XG5pbXBvcnQgeyBBbmltYXRpb25EZWZpbml0aW9uIH0gZnJvbSBcInVpL2FuaW1hdGlvblwiO1xuaW1wb3J0IHsgQW5pbWF0aW9uQ3VydmUgfSBmcm9tIFwidWkvZW51bXNcIjtcbmltcG9ydCAqIGFzIGJ1aWxkZXIgZnJvbSAndWkvYnVpbGRlcic7XG5pbXBvcnQgeyBzY3JlZW4gfSBmcm9tIFwicGxhdGZvcm1cIjtcbmltcG9ydCB7IFN0YWNrTGF5b3V0IH0gZnJvbSAndWkvbGF5b3V0cy9zdGFjay1sYXlvdXQnO1xuaW1wb3J0IHsgR3JpZExheW91dCB9IGZyb20gJ3VpL2xheW91dHMvZ3JpZC1sYXlvdXQnO1xuaW1wb3J0IHsgU2Nyb2xsVmlldywgU2Nyb2xsRXZlbnREYXRhIH0gZnJvbSAndWkvc2Nyb2xsLXZpZXcnO1xuaW1wb3J0IHsgVGV4dEZpZWxkIH0gZnJvbSAndWkvdGV4dC1maWVsZCc7XG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gJ3VpL2xhYmVsJztcbmltcG9ydCB7IFVzZXJTZXJ2aWNlLCBVc2VyIH0gZnJvbSAnLi4vc2hhcmVkL3VzZXIuc2VydmljZSc7XG5pbXBvcnQgeyBTaGlmdFNlcnZpY2UgfSBmcm9tICcuLi9zaGFyZWQvc2hpZnQuc2VydmljZSc7XG5pbXBvcnQgeyBSYWRTaWRlRHJhd2VyIH0gZnJvbSBcIm5hdGl2ZXNjcmlwdC10ZWxlcmlrLXVpL3NpZGVkcmF3ZXJcIjtcbmltcG9ydCB7IFNldHRpbmdzTW9kZWwgfSBmcm9tICcuLi9tb2RhbHMvc2V0dGluZ3Mvc2V0dGluZ3MtbW9kZWwnO1xuaW1wb3J0IHsgU2VsZWN0ZWRJbmRleENoYW5nZWRFdmVudERhdGEsIFRhYlZpZXcgfSBmcm9tIFwidWkvdGFiLXZpZXdcIjtcbmltcG9ydCB7IFNsaWRlciB9IGZyb20gXCJ1aS9zbGlkZXJcIjtcbmltcG9ydCAqIGFzIHBpY2tlciBmcm9tIFwiLi4vY29tcG9uZW50cy9waWNrZXIvcGlja2VyXCI7XG5sZXQgdXNlclNlcnZpY2U6IFVzZXJTZXJ2aWNlO1xubGV0IHNoaWZ0U2VydmljZTogU2hpZnRTZXJ2aWNlO1xubGV0IHNldHRpbmdzQ29udGFpbmVyOiBTdGFja0xheW91dDtcbmxldCBzZXR0aW5nc092ZXJsYXlDb250YWluZXI7XG5sZXQgZGlzbWlzc05vdGU7XG5sZXQgYmx1clZpZXc6IFVJVmlldztcbmxldCBNeU1vZGVsOiBIb21lTW9kZWw7XG5sZXQgc2V0dGluZ3NNb2RlbDogU2V0dGluZ3NNb2RlbDtcbmxldCBlZGl0aW5nU2hpZnQ7XG5kZWNsYXJlIHZhciBVSVZpc3VhbEVmZmVjdFZpZXc6YW55LCBVSUJsdXJFZmZlY3Q6YW55LCBVSVZpZXdBdXRvcmVzaXppbmdGbGV4aWJsZUhlaWdodDphbnksIFVJVmlld0F1dG9yZXNpemluZ0ZsZXhpYmxlV2lkdGg6YW55LCBVSUJsdXJFZmZlY3RTdHlsZUxpZ2h0OmFueTtcbmV4cG9ydCBjbGFzcyBIb21lTW9kZWwgZXh0ZW5kcyBPYnNlcnZhYmxlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgTXlNb2RlbCA9IHRoaXM7XG4gICAgICAgIC8vYWxsU2hpZnRzTW9kZWwgPSBuZXcgQWxsU2hpZnRzTW9kZWwoKTtcbiAgICAgICAgdXNlclNlcnZpY2UgPSBuZXcgVXNlclNlcnZpY2UoKTtcbiAgICAgICAgc2hpZnRTZXJ2aWNlID0gbmV3IFNoaWZ0U2VydmljZSgpO1xuICAgICAgICBsZXQgdXNlciA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1c2VyRGF0YScpKTtcbiAgICAgICAgZm9yIChsZXQgaSBpbiB1c2VyLmZhbWlsaWVzKSB7XG4gICAgICAgICAgICB1c2VyLmZhbWlsaWVzW2ldLmlkID0gaTtcbiAgICAgICAgICAgIGlmICghdXNlci5mYW1pbGllc1tpXS5kZWxldGVkKSB0aGlzLmZhbWlsaWVzTWFwW2ldID0gdXNlci5mYW1pbGllc1tpXTtcblxuICAgICAgICAgICAgbGV0IGZhbWlseSA9IG9ic2VydmFibGVGcm9tT2JqZWN0KHVzZXIuZmFtaWxpZXNbaV0pO1xuICAgICAgICAgICAgaWYgKCF1c2VyLmZhbWlsaWVzW2ldLmRlbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZhbWlsaWVzLnB1c2goZmFtaWx5KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5mYW1pbGllcy5sZW5ndGggPT0gMSkgdGhpcy5mYW1pbGllcy5nZXRJdGVtKDApLnNldCgnanVzdE9uZUZhbWlseScsIHRydWUpO1xuICAgICAgICB0aGlzLmZhbWlsaWVzLmdldEl0ZW0oMCkuc2V0KCdpc0ZpcnN0JywgdHJ1ZSk7IFxuICAgICAgICB0aGlzLnNldCgnaXNMb2FkaW5nJywgdHJ1ZSk7XG4gICAgICAgIHNoaWZ0U2VydmljZS5idWlsZEFwcERhdGEodHJ1ZSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgdGhpcy5nZXRUaGlzV2Vla1NoaWZ0cygpO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ2lzTG9hZGluZycsIGZhbHNlKTtcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc0ludm9pY2VzKEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIHBhZ2U6IFBhZ2U7XG4gICAgcHVibGljIGhlYWRlcl90ZXh0OiBzdHJpbmcgPSAnV2VlayBvZiAnICsgbW9tZW50KCkuc3RhcnRPZignd2VlaycpLmZvcm1hdCgnZGRkZCBbdGhlXSBEbycpO1xuICAgIHB1YmxpYyB1c2VyOiBVc2VyID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpO1xuICAgIHB1YmxpYyBob3Vyc193b3JrZWQ6IG51bWJlciA9IDA7XG4gICAgcHVibGljIHRoaXNXZWVrTWludXRlc1dvcmtlZDogbnVtYmVyID0gMDtcbiAgICBwdWJsaWMgdG90YWxfZWFybmVkOiBudW1iZXIgPSAwLjAwO1xuICAgIHB1YmxpYyByZWd1bGFyX2Vhcm5lZDogbnVtYmVyID0gMDtcbiAgICBwdWJsaWMgb3ZlcnRpbWVfZWFybmVkOiBudW1iZXI9IDA7XG4gICAgcHVibGljIHNldHRpbmdzVGl0bGU6IHN0cmluZyA9ICdTZXR0aW5ncyc7XG4gICAgcHVibGljIGZhbWlsaWVzOiBPYnNlcnZhYmxlQXJyYXk8T2JzZXJ2YWJsZT4gPSBuZXcgT2JzZXJ2YWJsZUFycmF5KFtdKTtcbiAgICBwdWJsaWMgZmFtaWxpZXNNYXA6IGFueSA9IHt9O1xuICAgIHB1YmxpYyBlZGl0aW5nRmFtaWx5OiBPYnNlcnZhYmxlID0gb2JzZXJ2YWJsZUZyb21PYmplY3Qoe30pXG4gICAgcHVibGljIGNsb2NrZWRJbjogYW55ID0gZmFsc2U7XG4gICAgcHVibGljIHRoaXNXZWVrOiBPYnNlcnZhYmxlQXJyYXk8T2JzZXJ2YWJsZT4gPSBuZXcgT2JzZXJ2YWJsZUFycmF5KFtdKTtcbiAgICBwdWJsaWMgc2hpZnRzOiBPYnNlcnZhYmxlQXJyYXk8T2JzZXJ2YWJsZT4gPSBuZXcgT2JzZXJ2YWJsZUFycmF5KFtdKTtcbiAgICBwdWJsaWMgYWRkZWRTaGlmdHNNYXAgPSB7fTtcbiAgICBwdWJsaWMgaXNMb2FkaW5nOiBib29sZWFuID0gZmFsc2U7XG4gICAgcHVibGljIHNlbGVjdGVkSW5kZXg6IG51bWJlciA9IDA7XG4gICAgcHVibGljIG15QXJyYXkgPSBbJ2hpJywgJ3dvcmxkJywgJ3dvdWxkIHlvdSBsaWtlJywgJ3BlYXMnXTtcbiAgICBwdWJsaWMgc2VjdGlvbmVkU2hpZnRzOiBPYnNlcnZhYmxlQXJyYXk8T2JzZXJ2YWJsZT4gPSBuZXcgT2JzZXJ2YWJsZUFycmF5KFtdKTtcblxuICAgIHB1YmxpYyBzZWxlY3RlZEZhbWlseVRvSW52b2ljZTogYW55ID0gZmFsc2U7XG4gICAgcHVibGljIHVuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcDogYW55ID0ge307XG4gICAgcHVibGljIGludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXA6IGFueSA9IHt9O1xuICAgIHB1YmxpYyB1bmludm9pY2VkU2hpZnRzOiBBcnJheTxhbnk+ID0gW107XG4gICAgcHVibGljIGludm9pY2VUb3RhbDogbnVtYmVyO1xuICAgIHB1YmxpYyBpbnZvaWNlczogT2JzZXJ2YWJsZUFycmF5PE9ic2VydmFibGU+ID0gbmV3IE9ic2VydmFibGVBcnJheShbXSk7XG4gICAgcHVibGljIGludm9pY2VNYXAgPSB7fTtcblxuICAgIHB1YmxpYyBhbGxTaGlmdHM6IE9ic2VydmFibGVBcnJheTxPYnNlcnZhYmxlPiA9IG5ldyBPYnNlcnZhYmxlQXJyYXkoW10pO1xuICAgIHB1YmxpYyBhbGxTaGlmdHNNYXA6IGFueSA9IHt9O1xuICAgIHB1YmxpYyB3ZWVrcyA9IHt9O1xuXG4gICAgXG5cbiAgICBwdWJsaWMgcmVidWlsZEFsbERhdGEoKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBzaGlmdFNlcnZpY2UuYnVpbGRBcHBEYXRhKHRydWUpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmdldFRoaXNXZWVrU2hpZnRzKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2lzTG9hZGluZycsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZnJlc2ggaW52b2ljZXMgbGVuZ3RoICcgKyBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0ludm9pY2VzKEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgXG4gICAgfVxuXG4gICAgcHVibGljIHBhZ2VMb2FkZWQobXlQYWdlOiBQYWdlKSB7XG4gICAgICAgIHRoaXMucGFnZSA9IG15UGFnZTtcbiAgICAgICAgdGhpcy5wYWdlLmJpbmRpbmdDb250ZXh0ID0gdGhpcztcbiAgICAgICAgdGhpcy5wYWdlLmdldFZpZXdCeUlkKCd0YWJ2aWV3Jykub24oJ3NlbGVjdGVkSW5kZXhDaGFuZ2VkJywgKGFyZ3M6U2VsZWN0ZWRJbmRleENoYW5nZWRFdmVudERhdGEpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdzZWxlY3RlZEluZGV4JywgYXJncy5uZXdJbmRleCk7XG4gICAgICAgICAgICBpZiAoYXJncy5uZXdJbmRleCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0VGhpc1dlZWtTaGlmdHMoKVxuICAgICAgICAgICAgICAgIH0sIDEwKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNoaWZ0cyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1NoaWZ0cyhzaGlmdHMpO1xuICAgICAgICAgICAgICAgIH0sIDEwKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgfVxuXG4gICAgcHVibGljIHNob3dNZW51KCkge1xuICAgICAgICBsZXQgc2lkZURyYXdlcjogUmFkU2lkZURyYXdlciA9IDxSYWRTaWRlRHJhd2VyPiggZnJhbWUudG9wbW9zdCgpLmdldFZpZXdCeUlkKFwiZHJhd2VyXCIpKTtcbiAgICAgICAgc2lkZURyYXdlci5zaG93RHJhd2VyKCk7XG4gICAgfSAgXG5cbiAgICBwdWJsaWMgbG9nVXNlcigpIHtcbiAgICAgICAgY29uc29sZS5kaXIoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpKTtcbiAgICAgICAgY29uc29sZS5sb2coSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VpZCcpKSlcbiAgICB9XG5cbiAgICBwdWJsaWMgc2VuZFRlc3RFbWFpbCgpIHtcbiAgICAgICAgdXNlclNlcnZpY2Uuc2VuZEVtYWlsKFwiV2VsY29tZS5cIiwgXCJZb3VyIG5hbm55IGhhcyBhZGRlZCB5b3UgYXMgYSBmYW1pbHkgaW4gTmFubnkgU2hpZnRzLCBhbiBhcHAgdGhhdCBoZWxwcyBuYW5uaWVzIGtlZXAgdHJhY2sgb2YgdGhlaXIgaG91cnMgYW5kIGV4cGVuc2VzLiBZb3UgZG9udCcgaGF2ZSB0byBkbyBhbnl0aGluZywgeW91IHdpbGwgc3RhcnQgcmVjZWl2aW5nIGludm9pY2VzIHdoZW4geW91ciBuYW5ueSByZXF1ZXN0cyB0byBiZSBwYWlkLlwiLCBcIllvdXIgbmFubnkgYWRkZWQgeW91IGFzIGEgZmFtaWx5IG9uIE5hbm55IFNoaWZ0cy5cIikudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2RpZCBpdCcpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBlZGl0UmF0ZXMoKSB7XG4gICAgICAgIHRoaXMuc2hvd1NldHRpbmdzKCcvdmlld3MvY29tcG9uZW50cy9lZGl0cmF0ZXMvZWRpdHJhdGVzLnhtbCcpO1xuICAgICAgICB0aGlzLnNldCgnc2V0dGluZ3NUaXRsZScsICdFZGl0IFJhdGVzJyk7XG4gICAgfVxuXG4gICAgcHVibGljIHNhdmVSYXRlcygpIHtcbiAgICAgICAgbGV0IGRhdGEgPSB7XG4gICAgICAgICAgICBob3VybHlSYXRlOiB0aGlzLmdldCgndXNlcicpLmhvdXJseVJhdGUsXG4gICAgICAgICAgICBvdmVydGltZVJhdGU6IHRoaXMuZ2V0KCd1c2VyJykub3ZlcnRpbWVSYXRlXG4gICAgICAgIH1cbiAgICAgICAgdXNlclNlcnZpY2UudXBkYXRlVXNlcihkYXRhKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVmcmVzaERhdGEoYXJncykge1xuICAgICAgICB2YXIgcHVsbFJlZnJlc2ggPSBhcmdzLm9iamVjdDtcbiAgICAgICAgc2hpZnRTZXJ2aWNlLmJ1aWxkQXBwRGF0YSh0cnVlKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICB0aGlzLmdldFRoaXNXZWVrU2hpZnRzKCk7XG4gICAgICAgICAgICB0aGlzLnNldCgnaXNMb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpKTtcbiAgICAgICAgICAgIHB1bGxSZWZyZXNoLnJlZnJlc2hpbmcgPSBmYWxzZTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgZWRpdEZhbWlseShhcmdzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdmYW1pbGllcz8nKVxuICAgICAgICAvLyAndGhpcycgaXMgbm93IHRoZSBmYW1pbHkgeW91IHRhcHBlZCBmcm9tIHRoZSByZXBlYXRlclxuICAgICAgICBsZXQgZmFtaWxpZXMgPSBNeU1vZGVsLmZhbWlsaWVzO1xuXG4gICAgICAgIGxldCBmYW1pbHkgPSBmYW1pbGllcy5maWx0ZXIoaXRlbSA9PiBpdGVtLmdldCgnaWQnKSA9PT0gYXJncy5vYmplY3QuaWQpWzBdO1xuICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ0ZhbWlseScsIGZhbWlseSk7XG4gICAgICAgIE15TW9kZWwuc2hvd1NldHRpbmdzKCcvdmlld3MvY29tcG9uZW50cy9lZGl0ZmFtaWx5L2VkaXRmYW1pbHkueG1sJyk7XG4gICAgICAgIE15TW9kZWwuc2V0KCdzZXR0aW5nc1RpdGxlJywgJ0VkaXQgRmFtaWx5Jyk7XG4gICAgICAgIE15TW9kZWwucGFnZS5nZXRWaWV3QnlJZCgnZWRpdGluZ19mYW1pbHlfdmlldycpLmJpbmRpbmdDb250ZXh0ID0gTXlNb2RlbC5lZGl0aW5nRmFtaWx5O1xuICAgIH1cblxuICAgIHB1YmxpYyBhZGRGYW1pbHkoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdlZGl0aW5nRmFtaWx5Jywgb2JzZXJ2YWJsZUZyb21PYmplY3Qoe30pKTtcbiAgICAgICAgdGhpcy5zaG93U2V0dGluZ3MoJy92aWV3cy9jb21wb25lbnRzL2VkaXRmYW1pbHkvZWRpdGZhbWlseS54bWwnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3NldHRpbmdzVGl0bGUnLCAnQWRkIEZhbWlseScpO1xuICAgICAgICBNeU1vZGVsLnBhZ2UuZ2V0Vmlld0J5SWQoJ2VkaXRpbmdfZmFtaWx5X3ZpZXcnKS5iaW5kaW5nQ29udGV4dCA9IE15TW9kZWwuZWRpdGluZ0ZhbWlseTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2F2ZUZhbWlseSgpIHtcbiAgICAgICAgbGV0IGRhdGE6YW55ID0ge1xuICAgICAgICAgICAgbmFtZTogdGhpcy5nZXQoJ2VkaXRpbmdGYW1pbHknKS5nZXQoJ25hbWUnKSxcbiAgICAgICAgICAgIGVtYWlsOiB0aGlzLmdldCgnZWRpdGluZ0ZhbWlseScpLmdldCgnZW1haWwnKVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5lZGl0aW5nRmFtaWx5LmdldCgnaWQnKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2VkaXRpbmcgYSBmYW1pbHknKTtcbiAgICAgICAgICAgIHVzZXJTZXJ2aWNlLnNhdmVGYW1pbHkodGhpcy5lZGl0aW5nRmFtaWx5LmdldCgnaWQnKSwgZGF0YSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGZhbWlsaWVzID0gdGhpcy5mYW1pbGllc1xuICAgICAgICAgICAgICAgIGZhbWlsaWVzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnaWQnKSA9PSB0aGlzLmVkaXRpbmdGYW1pbHkuZ2V0KCdpZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnNldCgnbmFtZScsIGRhdGEubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnNldCgnZW1haWwnLCBkYXRhLmVtYWlsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZVNldHRpbmdzKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2FkZGluZyBhIGZhbWlseScpO1xuICAgICAgICAgICAgbGV0IGZhbWlsaWVzID0gdGhpcy5mYW1pbGllcztcbiAgICAgICAgICAgIHVzZXJTZXJ2aWNlLmFkZEZhbWlseShkYXRhKS50aGVuKChyZXN1bHQ6YW55KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGZhbWlsaWVzID0gdGhpcy5mYW1pbGllcztcbiAgICAgICAgICAgICAgICBkYXRhLmlkID0gcmVzdWx0LmtleTtcbiAgICAgICAgICAgICAgICBmYW1pbGllcy5wdXNoKG9ic2VydmFibGVGcm9tT2JqZWN0KGRhdGEpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnZmFtaWxpZXNDb3VudCcsIGZhbWlsaWVzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgaWYgKGZhbWlsaWVzLmxlbmd0aCA+IDEpIHRoaXMuZmFtaWxpZXMuZ2V0SXRlbSgwKS5zZXQoJ2p1c3RPbmVGYW1pbHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgcmVtb3ZlRmFtaWx5KGFyZ3MpIHtcbiAgICAgICAgbGV0IGZhbUlkID0gYXJncy5vYmplY3QuaWQ7XG4gICAgICAgIGRpYWxvZ3MuY29uZmlybSgnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHJlbW92ZSB0aGlzIGZhbWlseT8nKS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICB1c2VyU2VydmljZS51cGRhdGVGYW1pbHkoZmFtSWQsIHtkZWxldGVkOiB0cnVlfSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBmYW1pbGllcyA9IE15TW9kZWwuZmFtaWxpZXM7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZWxldGVJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgZmFtaWxpZXMuZm9yRWFjaCgoZWxlbWVudCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnaWQnKSA9PSBmYW1JZCkgZGVsZXRlSW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGZhbWlsaWVzLnNwbGljZShkZWxldGVJbmRleCwgMSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZhbWlsaWVzLmxlbmd0aCA9PSAxKSBNeU1vZGVsLmZhbWlsaWVzLmdldEl0ZW0oMCkuc2V0KCdqdXN0T25lRmFtaWx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdmYW1pbGllcycsIGZhbWlsaWVzKTtcbiAgICAgICAgICAgICAgICAgICAgTXlNb2RlbC5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBnZXRUaGlzV2Vla1NoaWZ0cyhyZWZyZXNoRGF0YT8pIHtcbiAgICAgICAgaWYgKHJlZnJlc2hEYXRhKSB7XG4gICAgICAgICAgICB0aGlzLnNldCgnaXNMb2FkaW5nJywgdHJ1ZSk7XG4gICAgICAgICAgICBzaGlmdFNlcnZpY2UuZ2V0U2hpZnRzKDE1LCB0cnVlKS50aGVuKHNoaWZ0cyA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2lzTG9hZGluZycsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTaGlmdHMoc2hpZnRzKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgc2hpZnRzID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaGlmdHMgbGVuZ3RoICsgJyArIHNoaWZ0cy5sZW5ndGgpO1xuICAgICAgICAgICAgdGhpcy5wcm9jZXNzU2hpZnRzKHNoaWZ0cyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfVxuXG4gICAgLyoqKioqKioqKioqKioqKioqKiBJTlZPSUNFIEZVTkNUSU9OUyAqKioqKioqKioqKioqKioqKiovXG5cbiAgICBwdWJsaWMgaW52b2ljZU9wdGlvbnMoYXJncykge1xuICAgICAgICBsZXQgaW52b2ljZSA9IHRoaXMuaW52b2ljZXMuZ2V0SXRlbShhcmdzLmluZGV4KTtcbiAgICAgICAgaWYgKGludm9pY2UpIHtcbiAgICAgICAgICAgIGxldCBhY3Rpb25zID0gW107XG4gICAgICAgICAgICBpZiAoIWludm9pY2UuZ2V0KCdwYWlkJykpIHtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnB1c2goJ01hcmsgQXMgUGFpZCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnB1c2goJ1VubWFyayBBcyBQYWlkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWludm9pY2UuZ2V0KCdzZW50JykpIHtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnB1c2goJ1NlbmQgdG8gJyArIHRoaXMuZmFtaWxpZXNNYXBbaW52b2ljZS5nZXQoJ2ZhbWlseV9pZCcpXS5uYW1lKTtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnB1c2goJ0VkaXQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpbnZvaWNlLmdldCgncGFpZCcpKSBhY3Rpb25zLnB1c2goJ1JlLXNlbmQgdG8gJyArIHRoaXMuZmFtaWxpZXNNYXBbaW52b2ljZS5nZXQoJ2ZhbWlseV9pZCcpXS5uYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFjdGlvbnMucHVzaCgnVmlldycpO1xuICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCdEZWxldGUnKTtcblxuICAgICAgICAgICAgZGlhbG9ncy5hY3Rpb24odGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmdldCgnZmFtaWx5X2lkJyldLm5hbWUgKyAnIGZvciAkJyArIGludm9pY2UuZ2V0KCd0b3RhbCcpLCBcIkNhbmNlbFwiLCBhY3Rpb25zKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PSAnRWRpdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy90aGlzLnNob3dFZGl0U2hpZnQoZmFsc2UsIHNoaWZ0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PSAnRGVsZXRlJykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbXNnID0gJ0FyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgdGhpcyBpbnZvaWNlPyc7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnZvaWNlLmdldCgncGFpZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gJyBZb3VcXCd2ZSBtYXJrZWQgdGhpcyBpbnZvaWNlIGFzIHBhaWQsIHNvIHJlbWVtYmVyIHRvIGFkanVzdCB5b3VyIHJlY29yZHMgYWNjb3JkaW5nbHkuJzsgXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW52b2ljZS5nZXQoJ3NlbnQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9ICcgWW91XFwndmUgYWxyZWFkeSBzZW50IHRoaXMgaW52b2ljZSB0byAnICsgdGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmdldCgnZmFtaWx5X2lkJyldLm5hbWUgKyAnLCBzbyBwbGVhc2UgcmVhY2ggb3V0IHRvIHRoZW0gZGlyZWN0bHkgaW5mb3JtaW5nIHRoZW0gdGhhdCB0aGV5IGNhbiBkaXNjYXJkIHRoaXMgaW52b2ljZS4nO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZGlhbG9ncy5hY3Rpb24obXNnLCBcIkNhbmNlbFwiLCBbXCJEbyBpdC5cIl0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgPT0gJ0RvIGl0LicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzaGlmdFNlcnZpY2UuZGVsZXRlU2hpZnQoc2hpZnQuaWQpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdGhpcy5wcm9jZXNzU2hpZnRzKEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT0gJ01hcmsgQXMgUGFpZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLnVwZGF0ZUludm9pY2UoaW52b2ljZS5nZXQoJ2lkJyksIHtwYWlkOiB0cnVlfSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgncGFpZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy90aGlzLnByb2Nlc3NJbnZvaWNlcyhKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09ICdVbm1hcmsgQXMgUGFpZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLnVwZGF0ZUludm9pY2UoaW52b2ljZS5nZXQoJ2lkJyksIHtwYWlkOiBmYWxzZX0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdsb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ3BhaWQnLCBmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdGhpcy5wcm9jZXNzSW52b2ljZXMoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PSAnVmlldycpIHtcbiAgICAgICAgICAgICAgICAgICAgZnJhbWUudG9wbW9zdCgpLm5hdmlnYXRlKCcvdmlld3MvaW52b2ljZS9pbnZvaWNlJyk7XG5cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PSAnU2VuZCB0byAnICsgdGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmdldCgnZmFtaWx5X2lkJyldLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZW5kSW52b2ljZShpbnZvaWNlLmdldCgnaWQnKSwgaW52b2ljZSk7XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0U2VydmljZS51cGRhdGVJbnZvaWNlKGludm9pY2UuZ2V0KCdpZCcpLCB7c2VudDogdHJ1ZX0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdzZW50JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL3RoaXMucHJvY2Vzc0ludm9pY2VzKEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydCgnVGhlIGludm9pY2UgaGFzIGJlZW4gc2VudCEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdsb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09ICdSZS1zZW5kIHRvICcgKyB0aGlzLmZhbWlsaWVzTWFwW2ludm9pY2UuZ2V0KCdmYW1pbHlfaWQnKV0ubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbmRJbnZvaWNlKGludm9pY2UuZ2V0KCdpZCcpLCBpbnZvaWNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ1dlIHNlbnQgYSBmcmllbmRseSByZW1pbmRlciB0byAnICsgdGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmdldCgnZmFtaWx5X2lkJyldLm5hbWUpXG4gICAgICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgc2hvd0NyZWF0ZUludm9pY2UoKSB7XG4gICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZEZhbWlseVRvSW52b2ljZScsIGZhbHNlKTtcbiAgICAgICAgTXlNb2RlbC5zZXQoJ3VuaW52b2ljZWRTaGlmdHMnLCBbXSk7XG4gICAgICAgIE15TW9kZWwuc2hvd1NldHRpbmdzKCcvdmlld3MvY29tcG9uZW50cy9lZGl0aW52b2ljZS9lZGl0aW52b2ljZS54bWwnKTtcbiAgICAgICAgTXlNb2RlbC5zZXQoJ3NldHRpbmdzVGl0bGUnLCAnQ3JlYXRlIEludm9pY2UnKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgY2hvb3NlRmFtaWx5VG9JbnZvaWNlKCkge1xuICAgICAgICB0aGlzLmRpc21pc3NTb2Z0SW5wdXRzKCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNraW5nJywgJ2xpc3QnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlclRpdGxlJywgJ0Nob29zZSBGYW1pbHknKTtcbiAgICAgICAgbGV0IHBpY2tlckl0ZW1zID0gW107XG4gICAgICAgIHRoaXMuZmFtaWxpZXMuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgIHBpY2tlckl0ZW1zLnB1c2goaXRlbS5nZXQoJ25hbWUnKSk7XG4gICAgICAgIH0pXG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJJdGVtcycsIHBpY2tlckl0ZW1zKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmVUZXh0JywgJ0RvbmUnKTtcbiAgICAgICAgcGlja2VyLmFuaW1hdGVTaG93KCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJDYW5jZWwnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICB9KVxuICAgICAgICAvLyBlbXB0eSB0aGUgdW5pbnZvaWNlZFNoaWZ0cyBhcnJheSBpZiB0aGVyZXMgYW55dGhpbmcgaW4gaXQuXG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB3aGlsZSAodGhpcy51bmludm9pY2VkU2hpZnRzLmxlbmd0aCkgdGhpcy51bmludm9pY2VkU2hpZnRzLnBvcCgpO1xuICAgICAgICAgICAgbGV0IHVuaW52b2ljZWRTaGlmdHNBcnJheSA9IFtdO1xuICAgICAgICAgICAgbGV0IGZhbWlseSA9IHRoaXMuZmFtaWxpZXNNYXBbdGhpcy5mYW1pbGllcy5nZXRJdGVtKHRoaXMucGFnZS5nZXRWaWV3QnlJZCgnbGlzdHBpY2tlcicpLnNlbGVjdGVkSW5kZXgpLmdldCgnaWQnKV07XG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkRmFtaWx5VG9JbnZvaWNlID0gZmFtaWx5O1xuICAgICAgICAgICAgbGV0IGludm9pY2VUb3RhbCA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciBpIGluIHRoaXMudW5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ZhbWlseS5pZF0pIHtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hZGRlZFNoaWZ0c01hcFtpXS5lbmRfdGltZSAmJiB0aGlzLmFkZGVkU2hpZnRzTWFwW2ldLmNvbnRyaWJ1dGlvbnNbZmFtaWx5LmlkXSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmFtaWx5Q29udHJpYnV0aW9uID0gdGhpcy5hZGRlZFNoaWZ0c01hcFtpXS5jb250cmlidXRpb25zW2ZhbWlseS5pZF07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkZWRTaGlmdHNNYXBbaV0uc2VsZWN0ZWRfZmFtaWx5X2NvbnRyaWJ1dGlvbiA9IGZhbWlseUNvbnRyaWJ1dGlvbjtcbiAgICAgICAgICAgICAgICAgICAgdW5pbnZvaWNlZFNoaWZ0c0FycmF5LnB1c2godGhpcy5hZGRlZFNoaWZ0c01hcFtpXSk7XG4gICAgICAgICAgICAgICAgICAgIGludm9pY2VUb3RhbCArPSArdGhpcy5hZGRlZFNoaWZ0c01hcFtpXS5zZWxlY3RlZF9mYW1pbHlfY29udHJpYnV0aW9uO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2V0KCdpbnZvaWNlVG90YWwnLCBpbnZvaWNlVG90YWwudG9GaXhlZCgyKSk7XG4gICAgICAgICAgICB0aGlzLnNldCgndW5pbnZvaWNlZFNoaWZ0cycsIHVuaW52b2ljZWRTaGlmdHNBcnJheSk7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgdW5zZWxlY3RVbmludm9pY2VkU2hpZnQoYXJncykge1xuICAgICAgICBpZiAoYXJncy5vYmplY3QuaWQpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHNbaV07XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0uaWQgPT0gYXJncy5vYmplY3QuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRhcHBlZEl0ZW06IEdyaWRMYXlvdXQgPSBhcmdzLm9iamVjdDtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludm9pY2VUb3RhbCA9IHBhcnNlRmxvYXQoTXlNb2RlbC5nZXQoJ2ludm9pY2VUb3RhbCcpKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2Rpc3BsYXllZCBpbnZvaWNlIHRvdGFsICcgKyBuZXdJbnZvaWNlVG90YWwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGFwcGVkSXRlbS5jbGFzc05hbWUgPT0gJ3VuaW52b2ljZWRfc2hpZnQgc2VsZWN0ZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXBwZWRJdGVtLmNsYXNzTmFtZSA9ICd1bmludm9pY2VkX3NoaWZ0JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uZG9fbm90X2ludm9pY2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SW52b2ljZVRvdGFsIC09IHBhcnNlRmxvYXQoaXRlbS5zZWxlY3RlZF9mYW1pbHlfY29udHJpYnV0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcHBlZEl0ZW0uY2xhc3NOYW1lID0gJ3VuaW52b2ljZWRfc2hpZnQgc2VsZWN0ZWQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5kb19ub3RfaW52b2ljZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SW52b2ljZVRvdGFsICs9IHBhcnNlRmxvYXQoaXRlbS5zZWxlY3RlZF9mYW1pbHlfY29udHJpYnV0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnaW52b2ljZVRvdGFsJywgbmV3SW52b2ljZVRvdGFsLnRvRml4ZWQoMikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBzYXZlSW52b2ljZSgpIHtcbiAgICAgICAgbGV0IHNoaWZ0X2lkcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgTXlNb2RlbC51bmludm9pY2VkU2hpZnRzLmxlbmd0aCA+IGk7IGkrKykge1xuICAgICAgICAgICAgbGV0IGl0ZW0gPSBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHNbaV07XG5cbiAgICAgICAgICAgIGlmICghaXRlbS5kb19ub3RfaW52b2ljZSkgc2hpZnRfaWRzLnB1c2goaXRlbS5pZCk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGFyZ3MgPSB7XG4gICAgICAgICAgICBzaGlmdF9pZHM6IHNoaWZ0X2lkcyxcbiAgICAgICAgICAgIGZhbWlseV9pZDogdGhpcy5nZXQoJ3NlbGVjdGVkRmFtaWx5VG9JbnZvaWNlJykuaWQsXG4gICAgICAgICAgICB0b3RhbDogdGhpcy5nZXQoJ2ludm9pY2VUb3RhbCcpLFxuICAgICAgICAgICAgcGFpZDogZmFsc2UsXG4gICAgICAgICAgICBkYXRlX2NyZWF0ZWQ6IG1vbWVudCgpLmZvcm1hdCgpXG4gICAgICAgIH1cbiAgICAgICAgc2hpZnRTZXJ2aWNlLmNyZWF0ZUludm9pY2UoYXJncykudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpKTsgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgc2F2ZUFuZFNlbmRJbnZvaWNlKCkge1xuICAgICAgICBsZXQgc2hpZnRfaWRzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgaXRlbSA9IE15TW9kZWwudW5pbnZvaWNlZFNoaWZ0c1tpXTtcblxuICAgICAgICAgICAgaWYgKCFpdGVtLmRvX25vdF9pbnZvaWNlKSBzaGlmdF9pZHMucHVzaChpdGVtLmlkKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgYXJncyA9IHtcbiAgICAgICAgICAgIHNoaWZ0X2lkczogc2hpZnRfaWRzLFxuICAgICAgICAgICAgZmFtaWx5X2lkOiB0aGlzLmdldCgnc2VsZWN0ZWRGYW1pbHlUb0ludm9pY2UnKS5pZCxcbiAgICAgICAgICAgIHRvdGFsOiB0aGlzLmdldCgnaW52b2ljZVRvdGFsJyksXG4gICAgICAgICAgICBwYWlkOiBmYWxzZSxcbiAgICAgICAgICAgIGRhdGVfY3JlYXRlZDogbW9tZW50KCkuZm9ybWF0KCksXG4gICAgICAgICAgICBzZW50OiB0cnVlXG4gICAgICAgIH1cbiAgICAgICAgc2hpZnRTZXJ2aWNlLmNyZWF0ZUludm9pY2UoYXJncykudGhlbigocmVzdWx0OmFueSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIHRoaXMuc2VuZEludm9pY2UocmVzdWx0LmtleSlcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc0ludm9pY2VzKEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKSk7ICAgIFxuICAgICAgICAgICAgXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIHNlbmRJbnZvaWNlKGludm9pY2VfaWQsIGludm9pY2U/LCByZXNlbmRpbmc/KSB7XG4gICAgICAgIGxldCBodG1sID0gdGhpcy5idWlsZEludm9pY2VIdG1sKGludm9pY2VfaWQsIGludm9pY2UpO1xuICAgICAgICBsZXQgbWVzc2FnZSA9IHRoaXMudXNlci5maXJzdF9uYW1lICsgJyAnICsgdGhpcy51c2VyLmxhc3RfbmFtZSArICcgY3JlYXRlZCB0aGUgaW52b2ljZSBiZWxvdywgc2VuZCBwYXltZW50IGFzIHNvb24gYXMgeW91IGNhbi4nO1xuICAgICAgICBsZXQgc3ViamVjdCA9IHRoaXMudXNlci5maXJzdF9uYW1lICsgJyAnICsgdGhpcy51c2VyLmxhc3RfbmFtZSArICcgaGFzIHNlbnQgeW91IGFuIGludm9pY2UuJztcbiAgICAgICAgaWYgKHJlc2VuZGluZykge1xuICAgICAgICAgICAgbWVzc2FnZSA9IHRoaXMudXNlci5maXJzdF9uYW1lICsgJyAnICsgdGhpcy51c2VyLmxhc3RfbmFtZSArICcgcHJldmlvdXNseSBzZW50IHRoZSBpbnZvaWNlIGJlbG93LCBoZXJlXFwncyBhIGZyaWVuZGx5IHJlbWluZGVyIHRvIHNlbmQgcGF5bWVudCBhcyBzb29uIGFzIHlvdSBjYW4uJ1xuICAgICAgICAgICAgc3ViamVjdCA9IHRoaXMudXNlci5maXJzdF9uYW1lICsgJyAnICsgdGhpcy51c2VyLmxhc3RfbmFtZSArICcgaXMgc2VuZGluZyB5b3UgYSBmcmllbmRseSByZW1pbmRlciBhYm91dCBhbiB1bnBhaWQgaW52b2ljZS4nXG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFpbnZvaWNlKSB7XG4gICAgICAgICAgICB1c2VyU2VydmljZS5zZW5kRW1haWwodGhpcy5zZWxlY3RlZEZhbWlseVRvSW52b2ljZSwge2VtYWlsOiB0aGlzLnVzZXIuZW1haWwsIG5hbWU6IHRoaXMudXNlci5maXJzdF9uYW1lICsgJyAnICsgdGhpcy51c2VyLmxhc3RfbmFtZX0sIG1lc3NhZ2UsIGh0bWwsIHN1YmplY3QpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGZhbWlseVRvSW52b2ljZSA9IHRoaXMuZmFtaWxpZXNNYXBbaW52b2ljZS5mYW1pbHlfaWRdO1xuICAgICAgICAgICAgdXNlclNlcnZpY2Uuc2VuZEVtYWlsKGZhbWlseVRvSW52b2ljZSwge2VtYWlsOiB0aGlzLnVzZXIuZW1haWwsIG5hbWU6IHRoaXMudXNlci5maXJzdF9uYW1lICsgJyAnICsgdGhpcy51c2VyLmxhc3RfbmFtZX0sIG1lc3NhZ2UsIGh0bWwsIHN1YmplY3QpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgIH1cblxuICAgIHByaXZhdGUgYnVpbGRJbnZvaWNlSHRtbChpbnZvaWNlX2lkLCBpbnZvaWNlPykge1xuICAgICAgICBsZXQgaHRtbCA9IGBcbiAgICAgICAgICAgIDxjZW50ZXI+PHNwYW4gc3R5bGU9XCJjb2xvcjogZ3JheTsgZm9udC1zaXplOiAxMXB4OyBjb2xvcjogZ3JheTtcIj5JbnZvaWNlIElEOiBgICsgaW52b2ljZV9pZCArIGA8L3NwYW4+PC9jZW50ZXI+XG4gICAgICAgICAgICA8dGFibGUgd2lkdGg9XCIxMDAlXCIgc3R5bGU9XCJmb250LWZhbWlseTogSGVsdmV0aWNhOyBmb250LXNpemU6IDEzcHg7XCIgY2VsbHBhZGRpbmc9XCIwXCIgY2VsbHNwYWNpbmc9XCIwXCI+XG4gICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICA8dGggYWxpZ249XCJsZWZ0XCIgd2lkdGg9XCIxMDAlXCIgc3R5bGU9XCJwYWRkaW5nOiA1OyBib3JkZXItYm90dG9tOiAycHggc29saWQgI0UwRTBFMDtcIj5TaGlmdHM8L3RoPlxuICAgICAgICAgICAgICAgICAgICA8dGggYWxpZ249XCJsZWZ0XCIgc3R5bGU9XCJwYWRkaW5nOiA1OyBib3JkZXItYm90dG9tOiAycHggc29saWQgI0UwRTBFMDtcIj5Db250cmlidXRpb248L3RoPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgIGBcbiAgICAgICAgaWYgKCFpbnZvaWNlKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgTXlNb2RlbC51bmludm9pY2VkU2hpZnRzLmxlbmd0aCA+IGk7IGkrKykge1xuICAgICAgICAgICAgICAgIGxldCBpdGVtID0gTXlNb2RlbC51bmludm9pY2VkU2hpZnRzW2ldO1xuICAgICAgICAgICAgICAgIGlmICghaXRlbS5kb19ub3RfaW52b2ljZSkge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgYWxpZ249XCJsZWZ0XCIgc3R5bGU9XCJwYWRkaW5nOiA1OyBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2Y1ZjVmNTtcIj5gKyBpdGVtLmRpc3BsYXlfZGF0ZSArYDxiciAvPjxzcGFuIHN0eWxlPVwiZm9udC1zaXplOiAxMXB4OyBjb2xvcjogZ3JheTtcIj5gICsgaXRlbS5kaXNwbGF5X3RpbWluZyArIGA8L3NwYW4+PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgYWxpZ249XCJsZWZ0XCIgc3R5bGU9XCJwYWRkaW5nOiA1OyBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2Y1ZjVmNTsgZm9udC13ZWlnaHQ6IGJvbGQ7XCI+JGAgKyBpdGVtLmNvbnRyaWJ1dGlvbnNbdGhpcy5zZWxlY3RlZEZhbWlseVRvSW52b2ljZS5pZF0gKyBgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSBgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgICAgICAgICAgPGNlbnRlcj48aDIgc3R5bGU9XCJmb250LWZhbWlseTogSGVsdmV0aWNhO1wiPkludm9pY2UgVG90YWw6IDxzcGFuIHN0eWxlPVwiY29sb3I6IGdyZWVuO1wiPiRgICsgdGhpcy5pbnZvaWNlVG90YWwgKyBgPC9zcGFuPjwvaDI+PC9jZW50ZXI+XG4gICAgICAgICAgICBgXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaW52b2ljZS5zaGlmdF9pZHMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IHNoaWZ0ID0gTXlNb2RlbC5hZGRlZFNoaWZ0c01hcFtpbnZvaWNlLnNoaWZ0X2lkc1tpXV07XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgXG4gICAgICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBhbGlnbj1cImxlZnRcIiBzdHlsZT1cInBhZGRpbmc6IDU7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZjVmNWY1O1wiPmArIHNoaWZ0LmRpc3BsYXlfZGF0ZSArYDxiciAvPjxzcGFuIHN0eWxlPVwiZm9udC1zaXplOiAxMXB4OyBjb2xvcjogZ3JheTtcIj5gICsgc2hpZnQuZGlzcGxheV90aW1pbmcgKyBgPC9zcGFuPjwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQgYWxpZ249XCJsZWZ0XCIgc3R5bGU9XCJwYWRkaW5nOiA1OyBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2Y1ZjVmNTsgZm9udC13ZWlnaHQ6IGJvbGQ7XCI+JGAgKyBzaGlmdC5jb250cmlidXRpb25zW2ludm9pY2UuZmFtaWx5X2lkXSArIGA8L3RkPlxuICAgICAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgPC90YWJsZT5cbiAgICAgICAgICAgICAgICA8Y2VudGVyPjxoMiBzdHlsZT1cImZvbnQtZmFtaWx5OiBIZWx2ZXRpY2E7XCI+SW52b2ljZSBUb3RhbDogPHNwYW4gc3R5bGU9XCJjb2xvcjogZ3JlZW47XCI+JGAgKyBpbnZvaWNlLnRvdGFsICsgYDwvc3Bhbj48L2gyPjwvY2VudGVyPlxuICAgICAgICAgICAgYFxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG4gICAgXG4gICAgLyoqKioqKioqKioqKioqKioqKiAvSU5WT0lDRSBGVU5DVElPTlMgKioqKioqKioqKioqKioqKioqL1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKiBTSElGVCBGVU5DVElPTlMgKioqKioqKioqKioqKioqKioqL1xuXG4gICAgcHVibGljIHNoaWZ0T3B0aW9ucyhhcmdzKSB7XG4gICAgICAgIGxldCBzaGlmdDtcbiAgICAgICAgaWYgKGFyZ3MuZXZlbnROYW1lICYmIGFyZ3MuZXZlbnROYW1lID09ICdpdGVtVGFwJykge1xuICAgICAgICAgICAgc2hpZnQgPSBNeU1vZGVsLmFkZGVkU2hpZnRzTWFwW3RoaXMuc2VjdGlvbmVkU2hpZnRzLmdldEl0ZW0oYXJncy5pbmRleCkuZ2V0KCdpZCcpXVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2hpZnQgPSBNeU1vZGVsLmFkZGVkU2hpZnRzTWFwW2FyZ3Mub2JqZWN0LmlkXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2hpZnQpIHtcbiAgICAgICAgICAgIGRpYWxvZ3MuYWN0aW9uKHNoaWZ0LnRpdGxlICsgJyBmcm9tICcgKyBzaGlmdC5kaXNwbGF5X2hvdXJzLCBcIkNhbmNlbFwiLCBbXCJFZGl0IFNoaWZ0XCIsIFwiRGVsZXRlIFNoaWZ0XCJdKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PSAnRWRpdCBTaGlmdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG93RWRpdFNoaWZ0KGZhbHNlLCBzaGlmdCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT0gJ0RlbGV0ZSBTaGlmdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgZGlhbG9ncy5hY3Rpb24oJ0FyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgdGhpcyBzaGlmdD8gVGhpcyBjYW5ub3QgYmUgdW5kb25lLicsIFwiQ2FuY2VsXCIsIFtcIkRvIGl0LlwiXSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PSAnRG8gaXQuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNoaWZ0U2VydmljZS5kZWxldGVTaGlmdChzaGlmdC5pZCkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTaGlmdHMoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9XG5cbiAgICBwdWJsaWMgc2hvd0VkaXRTaGlmdChhcmdzLCBzaGlmdCkge1xuICAgICAgICAvLyBgdGhpc2AgaXMgbm93IHJlZmVycmluZyB0byB0aGUgdGFwcGVkIHNoaWZ0IG9iamVjdCwgYW5kIG5vdCB0aGUgbW9kZWwgYW55bW9yZSwgXG4gICAgICAgIC8vIHNvIHdlIGhhdmUgdG8gdXNlIE15TW9kZWwgd2hpY2ggaXMgYSByZWZlcmVuY2UgdG8gSG9tZU1vZGVsLlxuICAgICAgICAvLyBjb25zb2xlLmRpcihhcmdzKTtcbiAgICAgICAgaWYgKGFyZ3MpIHtcbiAgICAgICAgICAgIGlmIChhcmdzLmV2ZW50TmFtZSAmJiBhcmdzLmV2ZW50TmFtZSA9PSAnaXRlbVRhcCcpIHtcbiAgICAgICAgICAgICAgICBzaGlmdCA9IE15TW9kZWwuYWRkZWRTaGlmdHNNYXBbdGhpcy5zZWN0aW9uZWRTaGlmdHMuZ2V0SXRlbShhcmdzLmluZGV4KS5nZXQoJ2lkJyldXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFyZ3Mub2JqZWN0LmlkKSB7XG4gICAgICAgICAgICAgICAgc2hpZnQgPSBNeU1vZGVsLmFkZGVkU2hpZnRzTWFwW2FyZ3Mub2JqZWN0LmlkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCFzaGlmdCkge1xuICAgICAgICAgICAgTXlNb2RlbC5zaG93U2V0dGluZ3MoJy92aWV3cy9jb21wb25lbnRzL2VuZHNoaWZ0L2VuZHNoaWZ0LnhtbCcpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NldHRpbmdzVGl0bGUnLCAnQWRkIFNoaWZ0Jyk7XG4gICAgICAgICAgICBlZGl0aW5nU2hpZnQgPSB7fTtcbiAgICAgICAgICAgIGxldCBzdGFydFRpbWUgPSBtb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKSArICcgMDk6MDA6MDAnO1xuICAgICAgICAgICAgbGV0IGVuZFRpbWUgPSBtb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKSArICcgMTc6MDA6MDAnO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdFN0YXJ0RGF0ZScsIG1vbWVudCgpLmZvcm1hdCgnTU1NIERvLCBZWVlZJykpXG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0U3RhcnRUaW1lJywgbW9tZW50KHN0YXJ0VGltZSkuZm9ybWF0KCdoOm1tYScpKVxuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NlbGVjdGVkU3RhcnREYXRlJywgbW9tZW50KCkuZm9ybWF0KCdZWVlZLU1NLUREJykpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NlbGVjdGVkU3RhcnRUaW1lJywgbW9tZW50KHN0YXJ0VGltZSkuZm9ybWF0KCdISDptbScpKVxuXG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0RW5kRGF0ZScsIG1vbWVudCgpLmZvcm1hdCgnTU1NIERvLCBZWVlZJykpXG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0RW5kVGltZScsIG1vbWVudChlbmRUaW1lKS5mb3JtYXQoJ2g6bW1hJykpXG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRFbmREYXRlJywgbW9tZW50KCkuZm9ybWF0KCdZWVlZLU1NLUREJykpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NlbGVjdGVkRW5kVGltZScsIG1vbWVudChlbmRUaW1lKS5mb3JtYXQoJ0hIOm1tJykpXG4gICAgICAgICAgICBlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSA9IG1vbWVudChzdGFydFRpbWUpLmZvcm1hdCgpO1xuICAgICAgICAgICAgZWRpdGluZ1NoaWZ0LmVuZF90aW1lID0gbW9tZW50KGVuZFRpbWUpLmZvcm1hdCgpO1xuICAgICAgICAgICAgbGV0IGNvbXBhcmVBID0gbW9tZW50KGVuZFRpbWUpO1xuICAgICAgICAgICAgdmFyIG1pbnV0ZXNXb3JrZWQgPSBjb21wYXJlQS5kaWZmKG1vbWVudChzdGFydFRpbWUpLCAnbWludXRlcycpXG4gICAgICAgICAgICB2YXIgaG91cnNXb3JrZWQgPSAobWludXRlc1dvcmtlZC82MCkudG9GaXhlZCgyKTtcbiAgICAgICAgICAgIGxldCBtaW51dGVSYXRlID0gcGFyc2VGbG9hdChNeU1vZGVsLnVzZXIuaG91cmx5UmF0ZSkvNjA7XG4gICAgICAgICAgICBsZXQgb3ZlcnRpbWVNaW51dGVSYXRlID0gcGFyc2VGbG9hdChNeU1vZGVsLnVzZXIub3ZlcnRpbWVSYXRlKS82MDtcblxuICAgICAgICAgICAgbGV0IHdvcmtlZCA9IHNoaWZ0U2VydmljZS5jYWxjdWxhdGVTaGlmdEhvdXJzV29ya2VkKGVkaXRpbmdTaGlmdC5zdGFydF90aW1lLCBlZGl0aW5nU2hpZnQuZW5kX3RpbWUpOztcbiAgICAgICAgICAgIE15TW9kZWwudXBkYXRlVG90YWxFYXJuZWQoKTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlbmRTaGlmdFRvdGFsV29ya2VkJywgd29ya2VkLnRpbWVfd29ya2VkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVkaXRpbmdTaGlmdCA9IE9iamVjdC5hc3NpZ24oe30sIHNoaWZ0KTtcbiAgICAgICAgICAgIE15TW9kZWwuc2hvd1NldHRpbmdzKCcvdmlld3MvY29tcG9uZW50cy9lbmRzaGlmdC9lbmRzaGlmdC54bWwnKTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZXR0aW5nc1RpdGxlJywgJ0VuZCBTaGlmdCcpO1xuICAgICAgICAgICAgaWYgKHNoaWZ0LmVuZF90aW1lKSB7XG4gICAgICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NldHRpbmdzVGl0bGUnLCAnRWRpdCBTaGlmdCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdFN0YXJ0RGF0ZScsIG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ01NTSBEbywgWVlZWScpKVxuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdFN0YXJ0VGltZScsIG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2g6bW1hJykpXG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRTdGFydERhdGUnLCBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdZWVlZLU1NLUREJykpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NlbGVjdGVkU3RhcnRUaW1lJywgbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnSEg6bW0nKSlcblxuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdEVuZERhdGUnLCBtb21lbnQoKS5mb3JtYXQoJ01NTSBEbywgWVlZWScpKVxuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdEVuZFRpbWUnLCBtb21lbnQoKS5mb3JtYXQoJ2g6bW1hJykpXG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRFbmREYXRlJywgbW9tZW50KCkuZm9ybWF0KCdZWVlZLU1NLUREJykpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NlbGVjdGVkRW5kVGltZScsIG1vbWVudCgpLmZvcm1hdCgnSEg6bW0nKSlcbiAgICAgICAgICAgIGVkaXRpbmdTaGlmdC5lbmRfdGltZSA9IG1vbWVudCgpLmZvcm1hdCgpO1xuICAgICAgICAgICAgaWYgKHNoaWZ0LmVuZF90aW1lKSB7XG4gICAgICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdEVuZERhdGUnLCBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnTU1NIERvLCBZWVlZJykpXG4gICAgICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdEVuZFRpbWUnLCBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnaDptbWEnKSlcbiAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRFbmREYXRlJywgbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ1lZWVktTU0tREQnKSk7XG4gICAgICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NlbGVjdGVkRW5kVGltZScsIG1vbWVudChzaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdISDptbScpKVxuICAgICAgICAgICAgICAgIGVkaXRpbmdTaGlmdC5lbmRfdGltZSA9IG1vbWVudChzaGlmdC5lbmRfdGltZSkuZm9ybWF0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGNvbnNvbGUuZGlyKHNoaWZ0LmNvbnRyaWJ1dGlvbnMpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBjb21wYXJlQSA9IG1vbWVudCgpO1xuICAgICAgICAgICAgaWYgKHNoaWZ0LmVuZF90aW1lKSBjb21wYXJlQSA9IG1vbWVudChzaGlmdC5lbmRfdGltZSk7XG4gICAgICAgICAgICB2YXIgbWludXRlc1dvcmtlZCA9IGNvbXBhcmVBLmRpZmYobW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLCAnbWludXRlcycpXG4gICAgICAgICAgICB2YXIgaG91cnNXb3JrZWQgPSAobWludXRlc1dvcmtlZC82MCkudG9GaXhlZCgyKTtcbiAgICAgICAgICAgIGxldCBtaW51dGVSYXRlID0gcGFyc2VGbG9hdChNeU1vZGVsLnVzZXIuaG91cmx5UmF0ZSkvNjA7XG4gICAgICAgICAgICBsZXQgb3ZlcnRpbWVNaW51dGVSYXRlID0gcGFyc2VGbG9hdChNeU1vZGVsLnVzZXIub3ZlcnRpbWVSYXRlKS82MDtcblxuXG4gICAgICAgICAgICBsZXQgd29ya2VkID0gc2hpZnRTZXJ2aWNlLmNhbGN1bGF0ZVNoaWZ0SG91cnNXb3JrZWQoZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUsIGVkaXRpbmdTaGlmdC5lbmRfdGltZSk7O1xuICAgICAgICAgICAgTXlNb2RlbC51cGRhdGVUb3RhbEVhcm5lZCgpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0VG90YWxXb3JrZWQnLCB3b3JrZWQudGltZV93b3JrZWQpO1xuICAgICAgICB9ICAgICAgICBcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0UHJldmlvdXNTaGlmdHNUb3RhbE1pbnV0ZXMoc2hpZnQpIHtcbiAgICAgICAgLy8gdGhpcyBmdW5jdGlvbiBnZXRzIHRoZSB0b3RhbCBtaW51dGVzIHdvcmtlZCB1cCB0byB0aGF0IHNoaWZ0IHRoYXQgd2VlayB0byBkZXRlcm1pbmUgaWYgXG4gICAgICAgIC8vIGFueSBvdmVydGltZSBwYXkgc2hvdWxkIGJlIGF0dHJpYnV0ZWQgdG8gdGhpcyBzaGlmdC5cbiAgICAgICAgdmFyIGJlZ2lubmluZ09mV2VlayA9IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5pc29XZWVrZGF5KDApLmZvcm1hdCgnZGRkZCBNTU1NIERvIFlZWVknKTtcbiAgICAgICAgaWYgKG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5pc29XZWVrZGF5KCkgPT0gMCB8fCBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuaXNvV2Vla2RheSgpID09IDcpIHsgLy9pcyBhIHN1bmRheS5cbiAgICAgICAgICAgIGJlZ2lubmluZ09mV2VlayA9IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2RkZGQgTU1NTSBEbyBZWVlZJyk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHRvdGFsTWludXRlcyA9IDA7XG4gICAgICAgIGxldCByZXZlcnNlU2hpZnRzID0gdGhpcy53ZWVrc1tiZWdpbm5pbmdPZldlZWtdLnNoaWZ0cy5zbGljZSgwKS5yZXZlcnNlKCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyByZXZlcnNlU2hpZnRzLmxlbmd0aCA+IGk7IGkrKykge1xuICAgICAgICAgICAgbGV0IG15U2hpZnQgPSByZXZlcnNlU2hpZnRzW2ldO1xuICAgICAgICAgICAgLy8gY29uc29sZS5kaXIobXlTaGlmdCk7XG4gICAgICAgICAgICBpZiAobXlTaGlmdC5pZCAhPSBzaGlmdC5pZCkge1xuICAgICAgICAgICAgICAgIHRvdGFsTWludXRlcyArPSBteVNoaWZ0Lm1pbnV0ZXNfd29ya2VkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBjb25zb2xlLmxvZygndG90YWwgbWludXRlczogJyArIHRvdGFsTWludXRlcyk7XG4gICAgICAgIHJldHVybiB0b3RhbE1pbnV0ZXM7XG4gICAgfVxuXG4gICAgcHVibGljIGRpc21pc3NTb2Z0SW5wdXRzKCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgdGhpcy5mYW1pbGllcy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgICAgIGxldCB0ZXh0RmllbGQ6VGV4dEZpZWxkID0gPFRleHRGaWVsZD50aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ2NvbnRyaWJ1dGlvbl8nICsgdGhpcy5mYW1pbGllcy5nZXRJdGVtKGkpLmdldCgnaWQnKSk7XG4gICAgICAgICAgICBpZiAodGV4dEZpZWxkICYmIHRleHRGaWVsZC5kaXNtaXNzU29mdElucHV0KSB0ZXh0RmllbGQuZGlzbWlzc1NvZnRJbnB1dCgpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHVwZGF0ZVRvdGFsRWFybmVkKCkge1xuICAgICAgICBsZXQgd29ya2VkT2JqID0gc2hpZnRTZXJ2aWNlLmNhbGN1bGF0ZVNoaWZ0SG91cnNXb3JrZWQoZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUsIGVkaXRpbmdTaGlmdC5lbmRfdGltZSk7XG4gICAgICAgIHRoaXMuc2V0KCdlbmRTaGlmdFRvdGFsV29ya2VkJywgd29ya2VkT2JqLnRpbWVfd29ya2VkKTtcbiAgICAgICAgbGV0IGVhcm5lZCA9IHNoaWZ0U2VydmljZS5jYWxjdWxhdGVTaGlmdEVhcm5lZCh3b3JrZWRPYmoubWludXRlc193b3JrZWQsIHRoaXMuZ2V0UHJldmlvdXNTaGlmdHNUb3RhbE1pbnV0ZXMoZWRpdGluZ1NoaWZ0KSk7XG4gICAgICAgIE15TW9kZWwuc2V0KCdlbmRTaGlmdFRvdGFsRWFybmVkJywgJyQnICsgZWFybmVkLnRvdGFsX2Vhcm5lZCk7XG4gICAgICAgIGlmIChlYXJuZWQub3ZlcnRpbWVfZWFybmVkICE9IDAuMDApIHtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlbmRTaGlmdE92ZXJ0aW1lRWFybmVkJywgZWFybmVkLm92ZXJ0aW1lX2Vhcm5lZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZW5kU2hpZnRPdmVydGltZUVhcm5lZCcsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgZmFtaWxpZXMgPSBNeU1vZGVsLmdldCgnZmFtaWxpZXMnKTtcbiAgICAgICAgbGV0IG5ld1RvdGFsOmFueSA9IChlYXJuZWQudG90YWxfZWFybmVkL2ZhbWlsaWVzLmxlbmd0aCkudG9GaXhlZCgyKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ2VhY2ggY29udHJpYnV0aW9uOiAnICsgbmV3VG90YWwpO1xuICAgICAgICBNeU1vZGVsLnNldCgnZW5kU2hpZnRGaW5hbFRvdGFsJywgJyQnICsgKG5ld1RvdGFsKmZhbWlsaWVzLmxlbmd0aCkudG9GaXhlZCgyKSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBmYW1pbGllcy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChlZGl0aW5nU2hpZnQuaWQgJiYgZWRpdGluZ1NoaWZ0LmNvbnRyaWJ1dGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgaWYgKGVkaXRpbmdTaGlmdC5jb250cmlidXRpb25zW2ZhbWlsaWVzLmdldEl0ZW0oaSkuaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIGZhbWlsaWVzLmdldEl0ZW0oaSkuc2V0KCdjb250cmlidXRpb24nLCBlZGl0aW5nU2hpZnQuY29udHJpYnV0aW9uc1tmYW1pbGllcy5nZXRJdGVtKGkpLmlkXSk7XG4gICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZhbWlsaWVzLmdldEl0ZW0oaSkuc2V0KCdjb250cmlidXRpb24nLCAnMC4wMCcpO1xuICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZhbWlsaWVzLmdldEl0ZW0oaSkuc2V0KCdjb250cmlidXRpb24nLCBuZXdUb3RhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZhbWlsaWVzLmdldEl0ZW0oaSkub24oT2JzZXJ2YWJsZS5wcm9wZXJ0eUNoYW5nZUV2ZW50LCAoYXJnczogUHJvcGVydHlDaGFuZ2VEYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MucHJvcGVydHlOYW1lID09ICdjb250cmlidXRpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBmaW5hbFRvdGFsOm51bWJlciA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGxldCBpbnZhbGlkTnVtYmVycyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciB4ID0gMDsgTXlNb2RlbC5mYW1pbGllcy5sZW5ndGggPiB4OyB4KyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghTXlNb2RlbC5mYW1pbGllcy5nZXRJdGVtKHgpLmdldCgnY29udHJpYnV0aW9uJykpIE15TW9kZWwuZmFtaWxpZXMuZ2V0SXRlbSh4KS5zZXQoJ2NvbnRyaWJ1dGlvbicsIDApXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNOYU4oTXlNb2RlbC5mYW1pbGllcy5nZXRJdGVtKHgpLmdldCgnY29udHJpYnV0aW9uJykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW52YWxpZE51bWJlcnMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbFRvdGFsICs9IHBhcnNlRmxvYXQoTXlNb2RlbC5mYW1pbGllcy5nZXRJdGVtKHgpLmdldCgnY29udHJpYnV0aW9uJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnZhbGlkTnVtYmVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0RmluYWxUb3RhbCcsICdFbnRlciB2YWxpZCBudW1iZXJzLicpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0RmluYWxUb3RhbCcsICckJyArIGZpbmFsVG90YWwudG9GaXhlZCgyKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGNoYW5nZVNoaWZ0RW5kVGltZSgpIHtcbiAgICAgICAgdGhpcy5kaXNtaXNzU29mdElucHV0cygpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VySG91cicsIG1vbWVudChlZGl0aW5nU2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnSCcpKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlck1pbnV0ZScsIG1vbWVudChlZGl0aW5nU2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnbScpKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlclRpdGxlJywgJ0NoYW5nZSBFbmQgVGltZScpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZVRleHQnLCAnRG9uZScpO1xuICAgICAgICB0aGlzLnNldCgncGlja2luZycsICd0aW1lJyk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJDYW5jZWwnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICB9KVxuICAgICAgICBwaWNrZXIuYW5pbWF0ZVNob3coKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICAgICAgbGV0IGhvdXIgPSB0aGlzLnBpY2tlckhvdXI7XG4gICAgICAgICAgICBpZiAoaG91ciA8IDEwKSBob3VyID0gJzAnICsgdGhpcy5waWNrZXJIb3VyO1xuICAgICAgICAgICAgbGV0IG1pbnV0ZSA9IHRoaXMucGlja2VyTWludXRlO1xuICAgICAgICAgICAgaWYgKG1pbnV0ZSA8IDEwKSBtaW51dGUgPSAnMCcgKyBtaW51dGU7XG4gICAgICAgICAgICB0aGlzLnNldCgnc2VsZWN0ZWRFbmRUaW1lJywgaG91ciArICc6JyArIG1pbnV0ZSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0RW5kVGltZScsIG1vbWVudCh0aGlzLmdldCgnc2VsZWN0ZWRFbmREYXRlJykgKyAnICcgKyB0aGlzLmdldCgnc2VsZWN0ZWRFbmRUaW1lJykgKyAnOjAwJykuZm9ybWF0KCdoOm1tYScpKVxuICAgICAgICAgICAgZWRpdGluZ1NoaWZ0LmVuZF90aW1lID0gbW9tZW50KHRoaXMuZ2V0KCdzZWxlY3RlZEVuZERhdGUnKSArICcgJyArIHRoaXMuZ2V0KCdzZWxlY3RlZEVuZFRpbWUnKSArICc6MDAnKS5mb3JtYXQoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVG90YWxFYXJuZWQoKVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBjaGFuZ2VTaGlmdEVuZERhdGUoKSB7XG4gICAgICAgIHRoaXMuZGlzbWlzc1NvZnRJbnB1dHMoKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tpbmcnLCAnZGF0ZScpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXQoJ2VuZERhdGVEYXknLCBtb21lbnQoZWRpdGluZ1NoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ0REJykpO1xuICAgICAgICB0aGlzLnNldCgnZW5kRGF0ZU1vbnRoJywgbW9tZW50KGVkaXRpbmdTaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdNTScpKTtcbiAgICAgICAgdGhpcy5zZXQoJ2VuZERhdGVZZWFyJywgbW9tZW50KGVkaXRpbmdTaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdZWVlZJykpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyVGl0bGUnLCAnQ2hhbmdlIEVuZCBEYXRlJyk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lVGV4dCcsICdEb25lJyk7XG4gICAgICAgIHBpY2tlci5hbmltYXRlU2hvdygpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyQ2FuY2VsJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgfSlcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICAgICAgbGV0IGRheSA9IHRoaXMuZW5kRGF0ZURheTsgXG4gICAgICAgICAgICBpZiAocGFyc2VJbnQodGhpcy5lbmREYXRlRGF5KSA8IDEwKSBkYXkgPSAnMCcgKyBwYXJzZUludCh0aGlzLmVuZERhdGVEYXkpO1xuICAgICAgICAgICAgbGV0IG1vbnRoID0gdGhpcy5lbmREYXRlTW9udGg7IFxuICAgICAgICAgICAgaWYgKHBhcnNlSW50KHRoaXMuZW5kRGF0ZU1vbnRoKSA8IDEwKSBtb250aCA9ICcwJyArIHBhcnNlSW50KHRoaXMuZW5kRGF0ZU1vbnRoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdzZWxlY3RlZEVuZERhdGUnLCB0aGlzLmVuZERhdGVZZWFyICsgJy0nICsgbW9udGggKyAnLScgKyBkYXkpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdEVuZERhdGUnLCBtb21lbnQodGhpcy5nZXQoJ3NlbGVjdGVkRW5kRGF0ZScpKS5mb3JtYXQoJ01NTSBEbywgWVlZWScpKVxuICAgICAgICAgICAgZWRpdGluZ1NoaWZ0LmVuZF90aW1lID0gbW9tZW50KHRoaXMuZ2V0KCdzZWxlY3RlZEVuZERhdGUnKSArICcgJyArIHRoaXMuZ2V0KCdzZWxlY3RlZEVuZFRpbWUnKSArICc6MDAnKS5mb3JtYXQoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVG90YWxFYXJuZWQoKVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBjaGFuZ2VTaGlmdFN0YXJ0VGltZSgpIHtcbiAgICAgICAgdGhpcy5kaXNtaXNzU29mdElucHV0cygpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VySG91cicsIG1vbWVudChlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdIJykpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyTWludXRlJywgbW9tZW50KGVkaXRpbmdTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ20nKSk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJUaXRsZScsICdDaGFuZ2UgU3RhcnQgVGltZScpO1xuICAgICAgICB0aGlzLnNldCgncGlja2luZycsICd0aW1lJyk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lVGV4dCcsICdEb25lJyk7XG4gICAgICAgIHBpY2tlci5hbmltYXRlU2hvdygpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyQ2FuY2VsJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgfSlcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICAgICAgbGV0IGhvdXIgPSB0aGlzLnBpY2tlckhvdXI7XG4gICAgICAgICAgICBpZiAoaG91ciA8IDEwKSBob3VyID0gJzAnICsgdGhpcy5waWNrZXJIb3VyO1xuICAgICAgICAgICAgbGV0IG1pbnV0ZSA9IHRoaXMucGlja2VyTWludXRlO1xuICAgICAgICAgICAgaWYgKG1pbnV0ZSA8IDEwKSBtaW51dGUgPSAnMCcgKyBtaW51dGU7XG4gICAgICAgICAgICB0aGlzLnNldCgnc2VsZWN0ZWRTdGFydFRpbWUnLCBob3VyICsgJzonICsgbWludXRlKTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRTdGFydFRpbWUnLCBtb21lbnQodGhpcy5nZXQoJ3NlbGVjdGVkU3RhcnREYXRlJykgKyAnICcgKyB0aGlzLmdldCgnc2VsZWN0ZWRTdGFydFRpbWUnKSArICc6MDAnKS5mb3JtYXQoJ2g6bW1hJykpXG4gICAgICAgICAgICBlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSA9IG1vbWVudCh0aGlzLmdldCgnc2VsZWN0ZWRTdGFydERhdGUnKSArICcgJyArIHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0VGltZScpICsgJzowMCcpLmZvcm1hdCgpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVUb3RhbEVhcm5lZCgpXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGNoYW5nZVNoaWZ0U3RhcnREYXRlKCkge1xuICAgICAgICB0aGlzLmRpc21pc3NTb2Z0SW5wdXRzKCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNraW5nJywgJ2RhdGUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ2VuZERhdGVEYXknLCBtb21lbnQoZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnREQnKSk7XG4gICAgICAgIHRoaXMuc2V0KCdlbmREYXRlTW9udGgnLCBtb21lbnQoZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnTU0nKSk7XG4gICAgICAgIHRoaXMuc2V0KCdlbmREYXRlWWVhcicsIG1vbWVudChlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdZWVlZJykpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyVGl0bGUnLCAnQ2hhbmdlIFN0YXJ0IERhdGUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmVUZXh0JywgJ0RvbmUnKTtcbiAgICAgICAgcGlja2VyLmFuaW1hdGVTaG93KCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJDYW5jZWwnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICB9KVxuICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgICAgICBsZXQgZGF5ID0gdGhpcy5lbmREYXRlRGF5OyBcbiAgICAgICAgICAgIGlmIChwYXJzZUludCh0aGlzLmVuZERhdGVEYXkpIDwgMTApIGRheSA9ICcwJyArIHBhcnNlSW50KHRoaXMuZW5kRGF0ZURheSk7XG4gICAgICAgICAgICBsZXQgbW9udGggPSB0aGlzLmVuZERhdGVNb250aDsgXG4gICAgICAgICAgICBpZiAocGFyc2VJbnQodGhpcy5lbmREYXRlTW9udGgpIDwgMTApIG1vbnRoID0gJzAnICsgcGFyc2VJbnQodGhpcy5lbmREYXRlTW9udGgpO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3NlbGVjdGVkU3RhcnREYXRlJywgdGhpcy5lbmREYXRlWWVhciArICctJyArIG1vbnRoICsgJy0nICsgZGF5KTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRTdGFydERhdGUnLCBtb21lbnQodGhpcy5nZXQoJ3NlbGVjdGVkU3RhcnREYXRlJykpLmZvcm1hdCgnTU1NIERvLCBZWVlZJykpXG4gICAgICAgICAgICBlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSA9IG1vbWVudCh0aGlzLmdldCgnc2VsZWN0ZWRTdGFydERhdGUnKSArICcgJyArIHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0VGltZScpICsgJzowMCcpLmZvcm1hdCgpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVUb3RhbEVhcm5lZCgpXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIHNhdmVTaGlmdCgpIHtcbiAgICAgICAgdGhpcy5kaXNtaXNzU29mdElucHV0cygpO1xuICAgICAgICBsZXQgZW5kX3RpbWUgPSB0aGlzLmdldCgnc2VsZWN0ZWRFbmREYXRlJykgKyAnICcgKyB0aGlzLmdldCgnc2VsZWN0ZWRFbmRUaW1lJykgKyAnOjAwJztcbiAgICAgICAgbGV0IHN0YXJ0X3RpbWUgPSB0aGlzLmdldCgnc2VsZWN0ZWRTdGFydERhdGUnKSArICcgJyArIHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0VGltZScpICsgJzowMCc7XG4gICAgICAgIGxldCBhcmdzOmFueSA9IHt9O1xuICAgICAgICBhcmdzLmVuZF90aW1lID0gbW9tZW50KGVuZF90aW1lKS5mb3JtYXQoKTtcbiAgICAgICAgYXJncy5zdGFydF90aW1lID0gbW9tZW50KHN0YXJ0X3RpbWUpLmZvcm1hdCgpO1xuICAgICAgICBhcmdzLmNvbnRyaWJ1dGlvbnMgPSB7fTtcbiAgICAgICAgbGV0IGNvbnRyaWJ1dGlvbnM6YW55ID0ge307XG4gICAgICAgIGxldCBmYW1pbGllcyA9IHRoaXMuZ2V0KCdmYW1pbGllcycpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgZmFtaWxpZXMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICBjb250cmlidXRpb25zW2ZhbWlsaWVzLmdldEl0ZW0oaSkuZ2V0KCdpZCcpXSA9IGZhbWlsaWVzLmdldEl0ZW0oaSkuZ2V0KCdjb250cmlidXRpb24nKTtcbiAgICAgICAgfVxuICAgICAgICBhcmdzLmNvbnRyaWJ1dGlvbnMgPSBjb250cmlidXRpb25zO1xuICAgICAgICBpZiAoZWRpdGluZ1NoaWZ0LmlkKSB7XG4gICAgICAgICAgICBzaGlmdFNlcnZpY2UudXBkYXRlU2hpZnQoZWRpdGluZ1NoaWZ0LmlkLCBhcmdzKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzU2hpZnRzKEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSkpO1xuICAgICAgICAgICAgICAgIGlmIChlZGl0aW5nU2hpZnQuaWQgPT0gTXlNb2RlbC5nZXQoJ2Nsb2NrZWRJbicpLmlkICYmIGFyZ3MuZW5kX3RpbWUpIE15TW9kZWwuc2V0KCdjbG9ja2VkSW4nLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzaGlmdFNlcnZpY2UuYWRkU2hpZnQoYXJncykudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1NoaWZ0cyhKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpKTtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVTZXR0aW5ncygpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9XG5cbiAgICBwdWJsaWMgc2hvd1N0YXJ0U2hpZnQoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJIb3VyJywgbW9tZW50KCkuZm9ybWF0KCdIJykpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyTWludXRlJywgbW9tZW50KCkuZm9ybWF0KCdtJykpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyVGl0bGUnLCAnU2V0IFN0YXJ0IFRpbWUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmVUZXh0JywgJ1N0YXJ0Jyk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNraW5nJywgJ3RpbWUnKTtcbiAgICAgICAgcGlja2VyLmFuaW1hdGVTaG93KCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJDYW5jZWwnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICB9KVxuICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgICAgICBsZXQgaG91ciA9IHRoaXMucGlja2VySG91cjtcbiAgICAgICAgICAgIGlmIChob3VyIDwgMTApIGhvdXIgPSAnMCcgKyB0aGlzLnBpY2tlckhvdXI7XG4gICAgICAgICAgICBsZXQgbWludXRlID0gdGhpcy5waWNrZXJNaW51dGU7XG4gICAgICAgICAgICBpZiAobWludXRlIDwgMTApIG1pbnV0ZSA9ICcwJyArIG1pbnV0ZTtcbiAgICAgICAgICAgIGxldCBhcmdzOmFueSA9IHtcbiAgICAgICAgICAgICAgICBzdGFydF90aW1lOiBtb21lbnQobW9tZW50KCkuZm9ybWF0KCdZWVlZLU1NLUREJykgKyAnICcgKyBob3VyICsgJzonICsgbWludXRlICsgJzowMCcpLmZvcm1hdCgpLFxuICAgICAgICAgICAgICAgIGVuZF90aW1lOiBudWxsLFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLnN0YXJ0U2hpZnQoYXJncykudGhlbigoc3RhcnRlZFNoaWZ0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAvL3RoaXMuc2hpZnRzLnVuc2hpZnQob2JzZXJ2YWJsZUZyb21PYmplY3Qoc3RhcnRlZFNoaWZ0KSk7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzU2hpZnRzKEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSkpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdjbG9ja2VkSW4nLCBhcmdzKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIFxuICAgIC8qKioqKioqKioqKioqKioqKiogL1NISUZUIEZVTkNUSU9OUyAqKioqKioqKioqKioqKioqKiovXG5cbiAgICBwdWJsaWMgb25TZWxlY3RlZEluZGV4Q2hhbmdlZChhcmdzOiBTZWxlY3RlZEluZGV4Q2hhbmdlZEV2ZW50RGF0YSkge1xuICAgICAgICBjb25zb2xlLmxvZyhhcmdzLm5ld0luZGV4KTtcbiAgICAgICAgaWYgKGFyZ3MubmV3SW5kZXggPT0gMCkge1xuICAgICAgICAgICAgdGhpcy5nZXRUaGlzV2Vla1NoaWZ0cygpO1xuICAgICAgICB9IGVsc2UgaWYgKGFyZ3MubmV3SW5kZXggPSAxKSB7XG4gICAgICAgICAgICBhbGVydCgnbWF5YmUgcHJvY2VzcyBzaGlmdHMgYWdhaW4/JylcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBraWxsKCkge1xuICAgICAgICBhcHBTZXR0aW5ncy5yZW1vdmUoJ3VzZXJEYXRhJyk7XG4gICAgICAgIGFwcFNldHRpbmdzLnJlbW92ZSgndWlkJyk7XG4gICAgICAgIGFwcFNldHRpbmdzLnJlbW92ZSgndXNlclJlY29yZElEJyk7XG4gICAgICAgIGZyYW1lLnRvcG1vc3QoKS5uYXZpZ2F0ZSgnL3ZpZXdzL2xvZ2luL2xvZ2luJyk7XG4gICAgfVxuXG4gICAgcHVibGljIHNldHRpbmdzU2Nyb2xsKGFyZ3M6IFNjcm9sbEV2ZW50RGF0YSkge1xuICAgICAgICBjb25zb2xlLmxvZygnc2Nyb2xsaW5nJyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzaG93U2V0dGluZ3Modmlld1BhdGgpIHtcbiAgICAgICAgdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdtYWluZ3JpZCcpLmFuaW1hdGUoPEFuaW1hdGlvbkRlZmluaXRpb24+e1xuICAgICAgICAgICAgc2NhbGU6IHt4OiAuOTIgICwgeTogLjkyfSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuY3ViaWNCZXppZXIoMC4xLCAwLjEsIDAuMSwgMSlcbiAgICAgICAgfSlcbiAgICAgICAgc2V0dGluZ3NDb250YWluZXIgPSA8U3RhY2tMYXlvdXQ+dGhpcy5wYWdlLmdldFZpZXdCeUlkKCdzZXR0aW5nc19jb250YWluZXInKTtcbiAgICAgICAgc2V0dGluZ3NPdmVybGF5Q29udGFpbmVyID0gdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdzZXR0aW5nc19vdmVybGF5X2NvbnRhaW5lcicpXG4gICAgICAgIGRpc21pc3NOb3RlID0gdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdkaXNtaXNzX25vdGUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3NldHRpbmdzU2hvd24nLCB0cnVlKTtcbiAgICAgICAgbGV0IGRldmljZUhlaWdodCA9IHNjcmVlbi5tYWluU2NyZWVuLmhlaWdodERJUHM7XG4gICAgICAgIHNldHRpbmdzQ29udGFpbmVyLnRyYW5zbGF0ZVkgPSBkZXZpY2VIZWlnaHQgKyAzMDtcbiAgICAgICAgc2V0dGluZ3NDb250YWluZXIuYW5pbWF0ZSg8QW5pbWF0aW9uRGVmaW5pdGlvbj57XG4gICAgICAgICAgICB0cmFuc2xhdGU6IHt4OiAwLCB5OiAwfSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuY3ViaWNCZXppZXIoMC4xLCAwLjEsIDAuMSwgMSlcbiAgICAgICAgfSlcbiAgICAgICAgc2V0dGluZ3NPdmVybGF5Q29udGFpbmVyLm9wYWNpdHkgPSAwO1xuICAgICAgICBzZXR0aW5nc092ZXJsYXlDb250YWluZXIuYW5pbWF0ZSh7XG4gICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgZHVyYXRpb246IDEwMFxuICAgICAgICB9KVxuICAgICAgICB2YXIgY29udGFpbmVyOiBTdGFja0xheW91dCA9IDxTdGFja0xheW91dD50aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ3NldHRpbmdzX3ZpZXcnKTtcbiAgICAgICAgY29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKCk7XG4gICAgICAgIGxldCBwYXRoID0gZnMua25vd25Gb2xkZXJzLmN1cnJlbnRBcHAoKS5wYXRoO1xuICAgICAgICBsZXQgY29tcG9uZW50ID0gYnVpbGRlci5sb2FkKHBhdGggKyB2aWV3UGF0aCk7XG4gICAgICAgIGNvbnRhaW5lci5hZGRDaGlsZChjb21wb25lbnQpO1xuICAgICAgICBsZXQgY29udGFpbmVyQm91bmRzID0gc2V0dGluZ3NDb250YWluZXIuaW9zLmJvdW5kcztcbiAgICAgICAgbGV0IGlvc1NldHRpbmdzQ29udGFpbmVyOiBVSVZpZXcgPSBzZXR0aW5nc0NvbnRhaW5lci5pb3M7XG4gICAgICAgIGlmIChibHVyVmlldyAmJiBibHVyVmlldy5yZW1vdmVGcm9tU3VwZXJ2aWV3KSBibHVyVmlldy5yZW1vdmVGcm9tU3VwZXJ2aWV3KCk7XG4gICAgICAgIGJsdXJWaWV3ID0gVUlWaXN1YWxFZmZlY3RWaWV3LmFsbG9jKCkuaW5pdFdpdGhFZmZlY3QoVUlCbHVyRWZmZWN0LmVmZmVjdFdpdGhTdHlsZShVSUJsdXJFZmZlY3RTdHlsZUxpZ2h0KSk7XG4gICAgICAgIGJsdXJWaWV3LmZyYW1lID0ge1xuICAgICAgICAgICAgb3JpZ2luOiB7IHg6IGNvbnRhaW5lckJvdW5kcy5vcmlnaW4ueCwgeTogY29udGFpbmVyQm91bmRzLm9yaWdpbi55IC0gMjAgfSxcbiAgICAgICAgICAgIHNpemU6IHsgd2lkdGg6IGNvbnRhaW5lckJvdW5kcy5zaXplLndpZHRoLCBoZWlnaHQ6IGNvbnRhaW5lckJvdW5kcy5zaXplLmhlaWdodCArIDIwIH1cbiAgICAgICAgfTtcbiAgICAgICAgYmx1clZpZXcuYXV0b3Jlc2l6aW5nTWFzayA9IFVJVmlld0F1dG9yZXNpemluZ0ZsZXhpYmxlV2lkdGggfCBVSVZpZXdBdXRvcmVzaXppbmdGbGV4aWJsZUhlaWdodDtcbiAgICAgICAgaW9zU2V0dGluZ3NDb250YWluZXIuYWRkU3VidmlldyhibHVyVmlldylcbiAgICAgICAgaW9zU2V0dGluZ3NDb250YWluZXIuc2VuZFN1YnZpZXdUb0JhY2soYmx1clZpZXcpO1xuICAgICAgICBsZXQgYnV6eiA9IFVJU2VsZWN0aW9uRmVlZGJhY2tHZW5lcmF0b3IubmV3KCk7XG4gICAgICAgIGxldCBwYW5uZXIgPSB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ3NldHRpbmdzX2NvbnRhaW5lcicpO1xuICAgICAgICBsZXQgc2Nyb2xsZXI6U2Nyb2xsVmlldyA9IDxTY3JvbGxWaWV3PnRoaXMucGFnZS5nZXRWaWV3QnlJZCgnc2V0dGluZ3Nfc2Nyb2xsZXInKTtcbiAgICAgICAgaWYgKHNjcm9sbGVyKSB7XG4gICAgICAgICAgICBsZXQgcmVhZHlUb0Ryb3AgPSBmYWxzZTtcbiAgICAgICAgICAgIHBhbm5lci5vZmYoJ3BhbicpO1xuICAgICAgICAgICAgcGFubmVyLm9uKCdwYW4nLCAoYXJnczpQYW5HZXN0dXJlRXZlbnREYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3Muc3RhdGUgPT0gMyAmJiByZWFkeVRvRHJvcCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmhpZGVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2Nyb2xsZXIub24oJ3Njcm9sbCcsIChzY3JvbGxBcmdzOlNjcm9sbEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChzY3JvbGxBcmdzLnNjcm9sbFkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzQ29udGFpbmVyLnRyYW5zbGF0ZVkgPSBzY3JvbGxBcmdzLnNjcm9sbFkqLTEuODtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbEFyZ3Muc2Nyb2xsWSotMS44ID4gMTUwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkeVRvRHJvcCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGlzbWlzc05vdGUub3BhY2l0eSA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnV6ei5zZWxlY3Rpb25DaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzbWlzc05vdGUuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAyNTBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZHlUb0Ryb3AgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkaXNtaXNzTm90ZS5vcGFjaXR5ID09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNtaXNzTm90ZS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDI1MFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYW5uZXIub2ZmKCdwYW4nKTtcbiAgICAgICAgICAgIHBhbm5lci5vbigncGFuJywgKGFyZ3M6UGFuR2VzdHVyZUV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzQ29udGFpbmVyLnRyYW5zbGF0ZVkgPSBhcmdzLmRlbHRhWTtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5kZWx0YVkgPiAxNTApIHtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChkaXNtaXNzTm90ZS5vcGFjaXR5ID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1enouc2VsZWN0aW9uQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlzbWlzc05vdGUuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogMjUwXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpc21pc3NOb3RlLm9wYWNpdHkgPT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlzbWlzc05vdGUuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogMjUwXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChhcmdzLnN0YXRlID09IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MuZGVsdGFZID4gMTUwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhpZGVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3NDb250YWluZXIuYW5pbWF0ZSg8QW5pbWF0aW9uRGVmaW5pdGlvbj57XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDogMCwgeTogMH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDIwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuY3ViaWNCZXppZXIoMC4xLCAwLjEsIDAuMSwgMSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGhpZGVTZXR0aW5ncygpIHtcbiAgICAgICAgdGhpcy5kaXNtaXNzU29mdElucHV0cygpO1xuICAgICAgICBlZGl0aW5nU2hpZnQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdtYWluZ3JpZCcpLmFuaW1hdGUoPEFuaW1hdGlvbkRlZmluaXRpb24+e1xuICAgICAgICAgICAgc2NhbGU6IHt4OiAxLCB5OiAxfSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuY3ViaWNCZXppZXIoMC4xLCAwLjEsIDAuMSwgMSlcbiAgICAgICAgfSlcbiAgICAgICAgbGV0IGRldmljZUhlaWdodCA9IHNjcmVlbi5tYWluU2NyZWVuLmhlaWdodERJUHM7XG4gICAgICAgIHNldHRpbmdzQ29udGFpbmVyLmFuaW1hdGUoPEFuaW1hdGlvbkRlZmluaXRpb24+e1xuICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDogMCwgeTogZGV2aWNlSGVpZ2h0IC0gMzB9LFxuICAgICAgICAgICAgZHVyYXRpb246IDMwMCxcbiAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5jdWJpY0JlemllcigwLjEsIDAuMSwgMC4xLCAxKVxuICAgICAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdzZXR0aW5nc1Nob3duJywgZmFsc2UpO1xuICAgICAgICB9KVxuICAgICAgICBzZXR0aW5nc092ZXJsYXlDb250YWluZXIuYW5pbWF0ZSh7XG4gICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgZHVyYXRpb246IDMwMFxuICAgICAgICB9KVxuICAgIH0gXG5cbiAgICBwdWJsaWMgcmVtb3ZlU2VjdGlvbmVkU2hpZnQoYXJncykge1xuICAgICAgICBjb25zb2xlLmRpcihhcmdzKTtcbiAgICAgICAgLy90aGlzLnNlY3Rpb25lZFNoaWZ0cy5nZXRJdGVtKGFyZ3MuaW5kZXgpO1xuICAgICAgICBjb25zb2xlLmxvZyhhcmdzLmluZGV4KTtcbiAgICAgICAgdGhpcy5zZWN0aW9uZWRTaGlmdHMuc3BsaWNlKGFyZ3MuaW5kZXgsIDEpO1xuICAgIH1cblxuICAgIHB1YmxpYyBwcm9jZXNzU2hpZnRzKHNoaWZ0cykge1xuICAgICAgICBsZXQgc2hpZnRzQXJyYXkgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBzaGlmdHMpIHtcbiAgICAgICAgICAgIGxldCBteVNoaWZ0ID0gc2hpZnRTZXJ2aWNlLmJ1aWxkU2hpZnREYXRhKHNoaWZ0c1tpXSk7XG4gICAgICAgICAgICBteVNoaWZ0LmlkID0gaTtcbiAgICAgICAgICAgIGlmICghbXlTaGlmdC5lbmRfdGltZSkgdGhpcy5zZXQoJ2Nsb2NrZWRJbicsIHNoaWZ0c1tpXSk7XG4gICAgICAgICAgICBzaGlmdHNBcnJheS5wdXNoKG15U2hpZnQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdzaGlmdHMgYXJyYXkgbGVuZ3RoICcgKyBzaGlmdHNBcnJheS5sZW5ndGgpO1xuXG4gICAgICAgIHNoaWZ0c0FycmF5LnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgIGlmIChtb21lbnQoYS5zdGFydF90aW1lKSA8IG1vbWVudChiLnN0YXJ0X3RpbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vbWVudChhLnN0YXJ0X3RpbWUpID4gbW9tZW50KGIuc3RhcnRfdGltZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgbGV0IHdlZWtzID0ge307XG5cblxuICAgICAgICAvLyBjYWxjdWxhdGUgaG91cnMgd29ya2VkIGFuZCBtb25leSBlYXJuZWQuXG4gICAgICAgIGxldCB0aGlzV2Vla01pbnV0ZXNXb3JrZWQgPSAwO1xuICAgICAgICBmb3IgKHZhciBzID0gMDsgc2hpZnRzQXJyYXkubGVuZ3RoID4gczsgcysrKSB7XG4gICAgICAgICAgICAvLyBhZGQgdGhlIHNoaWZ0IGlmIGl0IGhhc250IGJlZW4gYWRkZWQgYWxyZWFkeSBhbmQgaWYgaXQgaXMgaW4gdGhlIGN1cnJlbnQgd2Vlay4gT1IgaWYgdGhlIHNoaWZ0IGhhcyBub3QgYmVlbiBlbmRlZC5cbiAgICAgICAgICAgIGlmICghdGhpcy5hZGRlZFNoaWZ0c01hcFtzaGlmdHNBcnJheVtzXS5pZF0pIHtcbiAgICAgICAgICAgICAgICBsZXQgc2hpZnQgPSBvYnNlcnZhYmxlRnJvbU9iamVjdChzaGlmdHNBcnJheVtzXSk7XG4gICAgICAgICAgICAgICAgdGhpcy5zaGlmdHMucHVzaChzaGlmdClcbiAgICAgICAgICAgICAgICBpZiAoc2hpZnRzQXJyYXlbc10uZW5kX3RpbWUgJiYgbW9tZW50KHNoaWZ0c0FycmF5W3NdLnN0YXJ0X3RpbWUpID4gbW9tZW50KCkuc3RhcnRPZignd2VlaycpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGhpc1dlZWsucHVzaChzaGlmdClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgc2hpZnQgdGhhdHMgc3RpbGwgcnVubmluZyBzbyB0aGUgdGltZXMgYW5kIHRoZSBtb25leSBlYXJuZWQgdXBkYXRlc1xuICAgICAgICAgICAgLy8gb3IgdXBkYXRlIGEgc2hpZnQgdGhhdCB3YXMgcmVjZW50bHkgdXBkYXRlZC5cbiAgICAgICAgICAgIGlmICghc2hpZnRzQXJyYXlbc10uZW5kX3RpbWUgfHwgc2hpZnRzQXJyYXlbc10ucmVjZW50bHlVcGRhdGVkKSB7XG4gICAgICAgICAgICAgICAgbGV0IHVwZGF0ZUluZGV4O1xuICAgICAgICAgICAgICAgIHRoaXMuc2hpZnRzLmZvckVhY2goKGVsZW1lbnQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnaWQnKSA9PSBzaGlmdHNBcnJheVtzXS5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlSW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuc2hpZnRzLnNldEl0ZW0odXBkYXRlSW5kZXgsIG9ic2VydmFibGVGcm9tT2JqZWN0KHNoaWZ0c0FycmF5W3NdKSk7XG5cbiAgICAgICAgICAgICAgICAvLyB1cGRhdGUgdGhlIGVudGl0eSBpbiB0aGUgdGhpc1dlZWsgb2JzZXJ2YWJsZS5cbiAgICAgICAgICAgICAgICBsZXQgdGhpc1dlZWtVcGRhdGVJbmRleDtcbiAgICAgICAgICAgICAgICB0aGlzLnRoaXNXZWVrLmZvckVhY2goKGVsZW1lbnQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnaWQnKSA9PSBzaGlmdHNBcnJheVtzXS5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1dlZWtVcGRhdGVJbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy50aGlzV2Vlay5zZXRJdGVtKHRoaXNXZWVrVXBkYXRlSW5kZXgsIG9ic2VydmFibGVGcm9tT2JqZWN0KHNoaWZ0c0FycmF5W3NdKSk7XG4gICAgICAgICAgICAgICAgc2hpZnRzQXJyYXlbc10ucmVjZW50bHlVcGRhdGVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuYWRkZWRTaGlmdHNNYXBbc2hpZnRzQXJyYXlbc10uaWRdID0gc2hpZnRzQXJyYXlbc107XG4gICAgICAgICAgICBpZiAoIXNoaWZ0c0FycmF5W3NdLmVuZF90aW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbXBhcmVBID0gbW9tZW50KCk7XG4gICAgICAgICAgICAgICAgdmFyIG1pbnV0ZXNXb3JrZWQgPSBjb21wYXJlQS5kaWZmKG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKSwgJ21pbnV0ZXMnKVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRoaXNXZWVrLmxlbmd0aCAmJiB0aGlzLnRoaXNXZWVrLmdldEl0ZW0oMCkuZ2V0KCdpZCcpID09IHNoaWZ0c0FycmF5W3NdLmlkKSB0aGlzLnRoaXNXZWVrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy50aGlzV2Vlay51bnNoaWZ0KG9ic2VydmFibGVGcm9tT2JqZWN0KHNoaWZ0c0FycmF5W3NdKSkgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vc2V0IHVwIHdlZWsgZGF0YS5cbiAgICAgICAgICAgIC8vIHZhciBiZWdpbm5pbmdPZldlZWtNb21lbnQgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuaXNvV2Vla2RheSgwKTtcbiAgICAgICAgICAgIC8vIHZhciBiZWdpbm5pbmdPZldlZWsgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuaXNvV2Vla2RheSgwKS5mb3JtYXQoJ2RkZGQgTU1NTSBEbyBZWVlZJyk7XG5cbiAgICAgICAgICAgIHZhciBiZWdpbm5pbmdPZldlZWtNb21lbnQgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuaXNvV2Vla2RheSgwKTtcbiAgICAgICAgICAgIHZhciBiZWdpbm5pbmdPZldlZWsgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuaXNvV2Vla2RheSgwKS5mb3JtYXQoJ2RkZGQgTU1NTSBEbyBZWVlZJyk7XG4gICAgICAgICAgICBpZiAobW9tZW50KHNoaWZ0c0FycmF5W3NdLnN0YXJ0X3RpbWUpLmlzb1dlZWtkYXkoKSA9PSAwIHx8IG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKS5pc29XZWVrZGF5KCkgPT0gNykge1xuICAgICAgICAgICAgICAgIGJlZ2lubmluZ09mV2Vla01vbWVudCA9IG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKTtcbiAgICAgICAgICAgICAgICBiZWdpbm5pbmdPZldlZWsgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuZm9ybWF0KCdkZGRkIE1NTU0gRG8gWVlZWScpO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCF3ZWVrc1tiZWdpbm5pbmdPZldlZWtdKSB7XG4gICAgICAgICAgICAgICAgd2Vla3NbYmVnaW5uaW5nT2ZXZWVrXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgdG90YWxfbWludXRlczogMCxcbiAgICAgICAgICAgICAgICAgICAgcmVndWxhcl9taW51dGVzOiAwLFxuICAgICAgICAgICAgICAgICAgICBvdmVydGltZV9taW51dGVzOiAwLFxuICAgICAgICAgICAgICAgICAgICBob3Vyc193b3JrZWQ6IDAsXG4gICAgICAgICAgICAgICAgICAgIHJlZ3VsYXJfZWFybmVkOiAwLFxuICAgICAgICAgICAgICAgICAgICBvdmVydGltZV9lYXJuZWQ6IDAsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBiZWdpbm5pbmdPZldlZWtNb21lbnQuZm9ybWF0KCdbV2VlayBvZl0gTU1NIERvJyksXG4gICAgICAgICAgICAgICAgICAgIHdlZWtfc3RhcnQ6IGJlZ2lubmluZ09mV2Vla01vbWVudC5mb3JtYXQoJ1lZWVktTU0tREQnKSxcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRzOiBbXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgY29tcGFyZUEgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIGlmIChzaGlmdHNBcnJheVtzXS5lbmRfdGltZSkgY29tcGFyZUEgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uZW5kX3RpbWUpO1xuICAgICAgICAgICAgdmFyIG1pbnV0ZXNXb3JrZWQgPSBjb21wYXJlQS5kaWZmKG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKSwgJ21pbnV0ZXMnKVxuICAgICAgICAgICAgd2Vla3NbYmVnaW5uaW5nT2ZXZWVrXS50b3RhbF9taW51dGVzICs9IG1pbnV0ZXNXb3JrZWQ7XG4gICAgICAgICAgICB2YXIgc2hpZnQgPSBzaGlmdFNlcnZpY2UuYnVpbGRTaGlmdERhdGEoc2hpZnRzQXJyYXlbc10pO1xuICAgICAgICAgICAgd2Vla3NbYmVnaW5uaW5nT2ZXZWVrXS5zaGlmdHMucHVzaChzaGlmdCk7XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAodGhpcy5zZWN0aW9uZWRTaGlmdHMubGVuZ3RoKSB0aGlzLnNlY3Rpb25lZFNoaWZ0cy5wb3AoKTtcblxuICAgICAgICBmb3IgKHZhciB3IGluIHdlZWtzKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKHdlZWtzW3ddLnRpdGxlKTtcbiAgICAgICAgICAgIGZvciAodmFyIGl3ID0gMDsgd2Vla3Nbd10uc2hpZnRzLmxlbmd0aCA+IGl3OyBpdysrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG15U2hpZnQgPSB3ZWVrc1t3XS5zaGlmdHNbaXddXG4gICAgICAgICAgICAgICAgaWYgKGl3ID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5taW51dGVzX2FjY3J1ZWQgPSBteVNoaWZ0Lm1pbnV0ZXNfd29ya2VkO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQubWludXRlc19hY2NydWVkID0gbXlTaGlmdC5taW51dGVzX3dvcmtlZCArIHdlZWtzW3ddLnNoaWZ0c1tpdy0xXS5taW51dGVzX2FjY3J1ZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChteVNoaWZ0Lm1pbnV0ZXNfYWNjcnVlZCA+IDI0MDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBzaGlmdCBoYXMgb3ZlcnRpbWUgbWludXRlcy5cbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5vdmVydGltZV9taW51dGVzID0gbXlTaGlmdC5taW51dGVzX2FjY3J1ZWQgLSAyNDAwO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgbGluZSB3aWxsIGVuc3VyZSB0aGF0IHlvdSBhcmVudCBleHBvbmVudGlhbGx5IGFjY3J1aW5nIG92ZXJ0aW1lIG1pbnV0ZXMuXG4gICAgICAgICAgICAgICAgICAgIGlmIChteVNoaWZ0Lm92ZXJ0aW1lX21pbnV0ZXMgPiBteVNoaWZ0Lm1pbnV0ZXNfd29ya2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBteVNoaWZ0Lm92ZXJ0aW1lX21pbnV0ZXMgPSBteVNoaWZ0Lm1pbnV0ZXNfd29ya2VkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWd1bGFyX21pbnV0ZXNfd29ya2VkID0gbXlTaGlmdC5taW51dGVzX3dvcmtlZC1teVNoaWZ0Lm92ZXJ0aW1lX21pbnV0ZXM7XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQucmVndWxhcl9lYXJuZWQgPSAocmVndWxhcl9taW51dGVzX3dvcmtlZCAqICh0aGlzLmdldCgndXNlcicpLmhvdXJseVJhdGUvNjApKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0Lm92ZXJ0aW1lX2Vhcm5lZCA9IChteVNoaWZ0Lm92ZXJ0aW1lX21pbnV0ZXMgKiAodGhpcy5nZXQoJ3VzZXInKS5vdmVydGltZVJhdGUvNjApKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQucmVndWxhcl9lYXJuZWQgPSAobXlTaGlmdC5taW51dGVzX3dvcmtlZCoodGhpcy5nZXQoJ3VzZXInKS5ob3VybHlSYXRlLzYwKSkudG9GaXhlZCgyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB3ZWVrc1t3XS5yZWd1bGFyX2Vhcm5lZCArPSBteVNoaWZ0LnJlZ3VsYXJfZWFybmVkLTA7XG4gICAgICAgICAgICAgICAgaWYgKG15U2hpZnQub3ZlcnRpbWVfZWFybmVkKSB3ZWVrc1t3XS5vdmVydGltZV9lYXJuZWQgKz0gbXlTaGlmdC5vdmVydGltZV9lYXJuZWQtMDtcbiAgICAgICAgICAgICAgICBteVNoaWZ0LnRvdGFsX2Vhcm5lZCA9ICgobXlTaGlmdC5yZWd1bGFyX2Vhcm5lZC0wKSArIChteVNoaWZ0Lm92ZXJ0aW1lX2Vhcm5lZC0wIHx8IDApKS50b0ZpeGVkKDIpXG5cbiAgICAgICAgICAgICAgICBteVNoaWZ0LmRpc3BsYXlfZGF0ZSA9IG1vbWVudChteVNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnZGRkZCBNTU0gREQsIFlZWVknKTtcbiAgICAgICAgICAgICAgICBteVNoaWZ0LmRpc3BsYXlfdGltaW5nID0gbW9tZW50KG15U2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdoOm1tYScpICsgJyB0byAnICsgbW9tZW50KG15U2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnaDptbWEnKTtcbiAgICAgICAgICAgICAgICBpZiAobW9tZW50KG15U2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdZWVlZTU1ERCcpIDwgbW9tZW50KG15U2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnWVlZWU1NREQnKSkge1xuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0LmRpc3BsYXlfdGltaW5nID0gbW9tZW50KG15U2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdoOm1tYScpICsgJyB0byAnICsgbW9tZW50KG15U2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnTU1NIEREIFthdF0gaDptbWEnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFteVNoaWZ0LmVuZF90aW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQuZGlzcGxheV9kYXRlID0gbXlTaGlmdC5kaXNwbGF5X2RhdGUgPSBtb21lbnQoKS5mb3JtYXQoJ1tUT0RBWV0gTU1NIERELCBZWVlZJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5kaXNwbGF5X3RpbWluZyA9ICdTaGlmdCBzdGFydGVkIGF0ICcgKyBtb21lbnQobXlTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2g6bW1hJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb21lbnQobXlTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ1lZWVlNTUREJykgPCBtb21lbnQoKS5mb3JtYXQoJ1lZWVlNTUREJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG15U2hpZnQuZGlzcGxheV90aW1pbmcgPSAnU2hpZnQgc3RhcnRlZCBvbiAnICsgbW9tZW50KG15U2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdNTU0gREQgW2F0XSBoOm1tYScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB3ZWVrc1t3XS50b3RhbF9lYXJuZWQgPSAod2Vla3Nbd10ucmVndWxhcl9lYXJuZWQgKyAod2Vla3Nbd10ub3ZlcnRpbWVfZWFybmVkIHx8IDApKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgd2Vla3Nbd10ucmVndWxhcl9lYXJuZWQgPSB3ZWVrc1t3XS5yZWd1bGFyX2Vhcm5lZC50b0ZpeGVkKDIpXG4gICAgICAgICAgICBpZiAod2Vla3Nbd10ub3ZlcnRpbWVfZWFybmVkKSB3ZWVrc1t3XS5vdmVydGltZV9lYXJuZWQgPSB3ZWVrc1t3XS5vdmVydGltZV9lYXJuZWQudG9GaXhlZCgyKVxuICAgICAgICAgICAgd2Vla3Nbd10uaG91cnNfd29ya2VkID0gKHdlZWtzW3ddLnRvdGFsX21pbnV0ZXMvNjApLnRvRml4ZWQoMik7XG4gICAgICAgICAgICBpZiAod2Vla3Nbd10udG90YWxfbWludXRlcyA+IDI0MDApIHtcbiAgICAgICAgICAgICAgICB3ZWVrc1t3XS5yZWd1bGFyX21pbnV0ZXMgPSAyNDAwO1xuICAgICAgICAgICAgICAgIHdlZWtzW3ddLm92ZXJ0aW1lX21pbnV0ZXMgPSB3ZWVrc1t3XS50b3RhbF9taW51dGVzLTI0MDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHdlZWtzW3ddLnJlZ3VsYXJfbWludXRlcyA9IHdlZWtzW3ddLnRvdGFsX21pbnV0ZXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gc2V0dXAgc2VjdGlvbmVkIGFycmF5LlxuICAgICAgICAgICAgdmFyIGhlYWRlck9iaiA9IHtcbiAgICAgICAgICAgICAgICBcImlkXCI6IHdlZWtzW3ddLnRpdGxlLFxuICAgICAgICAgICAgICAgIFwic3RhcnRfdGltZVwiOiBtb21lbnQod2Vla3Nbd10uc2hpZnRzW3dlZWtzW3ddLnNoaWZ0cy5sZW5ndGgtMV0uc3RhcnRfdGltZSkuYWRkKCcxMCcsICdtaW51dGVzJykuZm9ybWF0KCdZWVlZLU1NLUREIEhIOm1tOnNzJyksXG4gICAgICAgICAgICAgICAgXCJoZWFkZXJcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBcInRpdGxlXCI6IHdlZWtzW3ddLnRpdGxlLFxuICAgICAgICAgICAgICAgIFwiaG91cnNfd29ya2VkXCI6IHdlZWtzW3ddLmhvdXJzX3dvcmtlZCxcbiAgICAgICAgICAgICAgICBcInJlZ3VsYXJfZWFybmVkXCI6IHdlZWtzW3ddLnJlZ3VsYXJfZWFybmVkLFxuICAgICAgICAgICAgICAgIFwib3ZlcnRpbWVfZWFybmVkXCI6IHdlZWtzW3ddLm92ZXJ0aW1lX2Vhcm5lZCxcbiAgICAgICAgICAgICAgICBcInRpbWVfd29ya2VkXCI6IHNoaWZ0U2VydmljZS5jYWxjdWxhdGVTaGlmdEhvdXJzV29ya2VkKGZhbHNlLCBmYWxzZSwgd2Vla3Nbd10udG90YWxfbWludXRlcykudGltZV93b3JrZWQsXG4gICAgICAgICAgICAgICAgXCJ0b3RhbF9lYXJuZWRcIjogd2Vla3Nbd10udG90YWxfZWFybmVkXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL2NvbnNvbGUuZGlyKGhlYWRlck9iaik7XG4gICAgICAgICAgICB0aGlzLnNlY3Rpb25lZFNoaWZ0cy5wdXNoKG9ic2VydmFibGVGcm9tT2JqZWN0KGhlYWRlck9iaikpO1xuXG4gICAgICAgICAgICB2YXIgaGFzT3BlblNoaWZ0ID0gZmFsc2U7XG4gICAgICAgICAgICBmb3IgKHZhciBpeCA9IDA7IHdlZWtzW3ddLnNoaWZ0cy5sZW5ndGggPiBpeDsgaXgrKykge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5kaXIod2Vla3Nbd10uc2hpZnRzW2l4XSk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWN0aW9uZWRTaGlmdHMucHVzaChvYnNlcnZhYmxlRnJvbU9iamVjdCh3ZWVrc1t3XS5zaGlmdHNbaXhdKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy9jb25zb2xlLmxvZyh0aGlzLnNlY3Rpb25lZFNoaWZ0cy5sZW5ndGgpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGhpcy5zZWN0aW9uZWRTaGlmdHMucG9wKCk7XG4gICAgICAgIC8vIHdoaWxlICh0aGlzLnNlY3Rpb25lZFNoaWZ0cy5sZW5ndGgpIHRoaXMuc2VjdGlvbmVkU2hpZnRzLnBvcCgpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy53ZWVrcyA9IHdlZWtzO1xuXG4gICAgICAgIHRoaXMudGhpc1dlZWsuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgIHZhciBjb21wYXJlQSA9IG1vbWVudCgpO1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQuZ2V0KCdlbmRfdGltZScpKSBjb21wYXJlQSA9IG1vbWVudChlbGVtZW50LmdldCgnZW5kX3RpbWUnKSk7XG4gICAgICAgICAgICB2YXIgbWludXRlc1dvcmtlZCA9IGNvbXBhcmVBLmRpZmYobW9tZW50KGVsZW1lbnQuZ2V0KCdzdGFydF90aW1lJykpLCAnbWludXRlcycpXG4gICAgICAgICAgICB0aGlzV2Vla01pbnV0ZXNXb3JrZWQgKz0gbWludXRlc1dvcmtlZDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGV0IG1pbnV0ZVJhdGUgPSBwYXJzZUZsb2F0KHRoaXMudXNlci5ob3VybHlSYXRlKS82MDtcbiAgICAgICAgbGV0IG92ZXJ0aW1lTWludXRlUmF0ZSA9IHBhcnNlRmxvYXQodGhpcy51c2VyLm92ZXJ0aW1lUmF0ZSkvNjA7XG4gICAgICAgIGlmICh0aGlzV2Vla01pbnV0ZXNXb3JrZWQgPiAyNDAwKSB7XG4gICAgICAgICAgICBsZXQgcmVndWxhckVhcm5lZCA9IDI0MDAqbWludXRlUmF0ZTtcbiAgICAgICAgICAgIGxldCBvdmVydGltZUVhcm5lZCA9ICh0aGlzV2Vla01pbnV0ZXNXb3JrZWQtMjQwMCkqb3ZlcnRpbWVNaW51dGVSYXRlO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3JlZ3VsYXJfZWFybmVkJywgcmVndWxhckVhcm5lZCk7XG4gICAgICAgICAgICB0aGlzLnNldCgnb3ZlcnRpbWVfZWFybmVkJywgb3ZlcnRpbWVFYXJuZWQpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuc2V0KCd0b3RhbF9lYXJuZWQnLCAocmVndWxhckVhcm5lZCtvdmVydGltZUVhcm5lZCkudG9GaXhlZCgyKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldCgncmVndWxhcl9lYXJuZWQnLCB0aGlzV2Vla01pbnV0ZXNXb3JrZWQqbWludXRlUmF0ZSk7XG4gICAgICAgICAgICB0aGlzLnNldCgndG90YWxfZWFybmVkJywgKHRoaXNXZWVrTWludXRlc1dvcmtlZCptaW51dGVSYXRlKS50b0ZpeGVkKDIpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNldCgndGhpc1dlZWtNaW51dGVzV29ya2VkJywgdGhpc1dlZWtNaW51dGVzV29ya2VkKTtcbiAgICAgICAgY29uc29sZS5sb2codGhpc1dlZWtNaW51dGVzV29ya2VkKTtcbiAgICAgICAgbGV0IHRpbWVXb3JrZWQgPSAnMCBIT1VSUyc7XG4gICAgICAgIGlmICh0aGlzV2Vla01pbnV0ZXNXb3JrZWQpIHRpbWVXb3JrZWQgPSBzaGlmdFNlcnZpY2UuY2FsY3VsYXRlU2hpZnRIb3Vyc1dvcmtlZChmYWxzZSwgZmFsc2UsIHRoaXNXZWVrTWludXRlc1dvcmtlZCkudGltZV93b3JrZWQ7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldCgnaG91cnNfd29ya2VkJywgdGltZVdvcmtlZCk7XG4gICAgfVxuXG4gICAgcHVibGljIHByb2Nlc3NJbnZvaWNlcyhpbnZvaWNlcykge1xuICAgICAgICBjb25zb2xlLmxvZygnaW4gcHJvY2VzcyBpbnZvaWNlcycpO1xuICAgICAgICB3aGlsZSAodGhpcy5pbnZvaWNlcy5sZW5ndGgpIHRoaXMuaW52b2ljZXMucG9wKCk7XG4gICAgICAgIGxldCB1c2VyID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpO1xuICAgICAgICAvL2xldCBpbnZvaWNlc0FycmF5ID0gbmV3IE9ic2VydmFibGVBcnJheSgpO1xuICAgICAgICBmb3IgKHZhciBpIGluIGludm9pY2VzKSB7XG4gICAgICAgICAgICBpbnZvaWNlc1tpXS5pZCA9IGk7XG4gICAgICAgICAgICBpbnZvaWNlc1tpXS5zaGlmdHMgPSBbXTtcbiAgICAgICAgICAgIGludm9pY2VzW2ldLmZhbWlseV9uYW1lID0gdXNlci5mYW1pbGllc1tpbnZvaWNlc1tpXS5mYW1pbHlfaWRdLm5hbWU7XG4gICAgICAgICAgICBpbnZvaWNlc1tpXS5kYXRlX2NyZWF0ZWRfcHJldHR5ID0gbW9tZW50KGludm9pY2VzW2ldLmRhdGVfY3JlYXRlZCkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKTtcbiAgICAgICAgICAgIGZvciAodmFyIHMgPSAwOyBpbnZvaWNlc1tpXS5zaGlmdF9pZHMubGVuZ3RoID4gczsgcysrKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXBbaW52b2ljZXNbaV0uZmFtaWx5X2lkXSkgdGhpcy5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ludm9pY2VzW2ldLmZhbWlseV9pZF0gPSB7fTtcbiAgICAgICAgICAgICAgICB0aGlzLmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXBbaW52b2ljZXNbaV0uZmFtaWx5X2lkXVtpbnZvaWNlc1tpXS5zaGlmdF9pZHNbc11dID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBsZXQgc2hpZnQgPSB0aGlzLmFkZGVkU2hpZnRzTWFwW2ludm9pY2VzW2ldLnNoaWZ0X2lkc1tzXV07XG4gICAgICAgICAgICAgICAgc2hpZnQuY29udHJpYnV0aW9uID0gc2hpZnQuY29udHJpYnV0aW9uc1tpbnZvaWNlc1tpXS5mYW1pbHlfaWRdO1xuICAgICAgICAgICAgICAgIHNoaWZ0Lmludm9pY2VfdGl0bGVfZGlzcGxheSA9IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ00vRC9ZWScpICsgJzogJyArIHNoaWZ0LmRpc3BsYXlfaG91cnM7XG4gICAgICAgICAgICAgICAgc2hpZnQuaW52b2ljZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGludm9pY2VzW2ldLnNoaWZ0cy5wdXNoKHNoaWZ0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHRoaXMgaXMgcmVxdWlyZWQgdG8gbWFrZSB0aGUgVUkgcmVzcGVjdCB0aGUgbG9hZGluZyBpbmRpY2F0b3IuXG4gICAgICAgICAgICBpbnZvaWNlc1tpXS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoIWludm9pY2VzW2ldLnNlbnQpIGludm9pY2VzW2ldLnNlbnQgPSBmYWxzZTtcblxuICAgICAgICAgICAgdGhpcy5pbnZvaWNlTWFwW2ldID0gaW52b2ljZXNbaV07XG4gICAgICAgICAgICBsZXQgaXNBZGRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgLy9pbnZvaWNlc0FycmF5LnB1c2goaW52b2ljZXNbaV0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLmludm9pY2VzLnB1c2gob2JzZXJ2YWJsZUZyb21PYmplY3QoaW52b2ljZXNbaV0pKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy90aGlzLmludm9pY2VzLnB1c2gob2JzZXJ2YWJsZUZyb21PYmplY3QoaW52b2ljZXNbaV0pKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmludm9pY2VzLnNvcnQoKGE6YW55LCBiOmFueSkgPT4ge1xuICAgICAgICAgICAgaWYgKG1vbWVudChhLmRhdGVfY3JlYXRlZCkgPCBtb21lbnQoYi5kYXRlX2NyZWF0ZWQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vbWVudChhLmRhdGVfY3JlYXRlZCkgPiBtb21lbnQoYi5kYXRlX2NyZWF0ZWQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMuaW52b2ljZXMubGVuZ3RoKVxuICAgICAgICAvLyBjb25zb2xlLmxvZygnaW52b2ljZXNBcnJheSBsZW5naHQgJyArIGludm9pY2VzQXJyYXkubGVuZ3RoKTtcbiAgICAgICAgLy8gdGhpcy5zZXQoJ2ludm9pY2VzJywgaW52b2ljZXNBcnJheSk7XG4gICAgICAgIC8vIGVtcHR5IHRoaXMgYW5kIHJlcG9wdWxhdGUgaXQuXG4gICAgICAgIHRoaXMuc2V0KCd1bmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXAnLCB7fSk7XG4gICAgICAgIGZvciAobGV0IHNoaWZ0X2lkIGluIHRoaXMuYWRkZWRTaGlmdHNNYXApIHtcbiAgICAgICAgICAgIGZvciAobGV0IGZhbWlseV9pZCBpbiB0aGlzLmZhbWlsaWVzTWFwKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnVuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcFtmYW1pbHlfaWRdKSB0aGlzLnVuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcFtmYW1pbHlfaWRdID0ge307XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXBbZmFtaWx5X2lkXSB8fCAhdGhpcy5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ZhbWlseV9pZF1bc2hpZnRfaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBteVNoaWZ0ID0gdGhpcy5hZGRlZFNoaWZ0c01hcFtzaGlmdF9pZF07XG4gICAgICAgICAgICAgICAgICAgIGxldCBjb250cmlidXRpb246YW55ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlmIChteVNoaWZ0LmNvbnRyaWJ1dGlvbnMpIGNvbnRyaWJ1dGlvbiA9IG15U2hpZnQuY29udHJpYnV0aW9uc1tmYW1pbHlfaWRdO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjb250cmlidXRpb24pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJpYnV0aW9uICYmIGNvbnRyaWJ1dGlvbiAhPSAnMCcpIHRoaXMudW5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ZhbWlseV9pZF1bc2hpZnRfaWRdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ0lOVk9JQ0VEIFNISUZUUyBCWSBGQU1JTFknKVxuICAgICAgICAvLyBjb25zb2xlLmRpcihKU09OLnN0cmluZ2lmeSh0aGlzLmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXApKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJVTklOVk9JQ0VEIFNISUZUUyBCWSBGQU1JTFlcIilcbiAgICAgICAgLy8gY29uc29sZS5kaXIoSlNPTi5zdHJpbmdpZnkodGhpcy51bmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXApKTtcbiAgICB9XG4gICAgXG59Il19