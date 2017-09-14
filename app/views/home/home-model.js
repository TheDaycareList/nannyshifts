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
            var invoices = [];
            if (appSettings.getString('invoices'))
                invoices = JSON.parse(appSettings.getString('invoices'));
            _this.processInvoices(invoices);
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
                var invoices = [];
                if (appSettings.getString('invoices'))
                    invoices = JSON.parse(appSettings.getString('invoices'));
                _this.processInvoices(invoices);
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
                    var shifts = {};
                    if (appSettings.getString('shifts'))
                        shifts = JSON.parse(appSettings.getString('shifts'));
                    _this.processShifts(shifts);
                }, 10);
            }
        });
        var tabView = this.page.getViewById('tabview');
        this.selectedIndex = tabView.selectedIndex;
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
        console.dir(this.get('user'));
        var data = {
            hourlyRate: this.page.getViewById('hourly_rate').text,
            overtimeRate: this.page.getViewById('overtime_rate').text,
            first_name: this.page.getViewById('first_name').text,
            last_name: this.page.getViewById('last_name').text,
            email: this.page.getViewById('email').text
        };
        if (!data.hourlyRate || !data.overtimeRate || !data.first_name || !data.last_name || !data.email) {
            alert('Please fill out all the fields.');
            return;
        }
        userService.updateUser(data).then(function (result) {
            console.log(result);
            for (var x in data) {
                _this.get('user')[x] = data[x];
            }
            _this.hideSettings();
        });
    };
    HomeModel.prototype.refreshData = function (args) {
        var _this = this;
        var pullRefresh = args.object;
        shiftService.buildAppData(true).then(function (result) {
            _this.getThisWeekShifts();
            _this.set('isLoading', false);
            var invoices = [];
            if (appSettings.getString('invoices'))
                invoices = JSON.parse(appSettings.getString('invoices'));
            _this.processInvoices(invoices);
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
            var shifts = {};
            if (appSettings.getString('shifts'))
                shifts = JSON.parse(appSettings.getString('shifts'));
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
                            invoice.set('loading', true);
                            shiftService.deleteInvoice(invoice.get('id')).then(function (result) {
                                var invoices = [];
                                if (appSettings.getString('invoices'))
                                    invoices = JSON.parse(appSettings.getString('invoices'));
                                _this.processInvoices(invoices);
                                invoice.set('loading', false);
                            });
                        }
                    });
                }
                else if (result == 'Mark As Paid') {
                    invoice.set('loading', true);
                    shiftService.updateInvoice(invoice.get('id'), { paid: true }).then(function (result) {
                        invoice.set('loading', false);
                        invoice.set('paid', true);
                        var total = parseFloat(invoice.get('total'));
                        var currentUnpaidTotal = parseFloat(_this.get('totalUnpaid'));
                        var newUnpaidTotal = (currentUnpaidTotal - total).toFixed(2);
                        _this.set('totalUnpaid', newUnpaidTotal);
                        _this.set('totalUnpaidString', 'You have $' + newUnpaidTotal + ' in unpaid invoices.');
                        if (!newUnpaidTotal || newUnpaidTotal == '0.00')
                            _this.set('totalUnpaidString', 'You\'re all paid up!');
                        var invoiceListView = _this.page.getViewById('invoices_listview');
                        invoiceListView.refresh();
                        //this.invoices.setItem(args.index, invoice);
                    });
                }
                else if (result == 'Unmark As Paid') {
                    invoice.set('loading', true);
                    shiftService.updateInvoice(invoice.get('id'), { paid: false }).then(function (result) {
                        invoice.set('loading', false);
                        invoice.set('paid', false);
                        var total = parseFloat(invoice.get('total'));
                        var currentUnpaidTotal = parseFloat(_this.get('totalUnpaid'));
                        var newUnpaidTotal = (currentUnpaidTotal + total).toFixed(2);
                        _this.set('totalUnpaid', newUnpaidTotal);
                        _this.set('totalUnpaidString', 'You have $' + newUnpaidTotal + ' in unpaid invoices.');
                        if (!newUnpaidTotal || newUnpaidTotal == '0.00')
                            _this.set('totalUnpaidString', 'You\'re all paid up!');
                        var invoiceListView = _this.page.getViewById('invoices_listview');
                        invoiceListView.refresh();
                    });
                }
                else if (result == 'View') {
                    _this.invoiceMap[invoice.get('id')].family = _this.familiesMap[invoice.get('family_id')];
                    var navigationEntry = {
                        moduleName: "/views/invoice/invoice",
                        context: _this.invoiceMap[invoice.get('id')],
                        animated: true,
                        backstackVisible: true,
                        clearHistory: false
                    };
                    frame.topmost().navigate(navigationEntry);
                    //frame.topmost().navigate('/views/invoice/invoice');
                }
                else if (result == 'Send to ' + _this.familiesMap[invoice.get('family_id')].name) {
                    invoice.set('loading', true);
                    _this.sendInvoice(invoice.get('id'), invoice);
                    var sentTimes = [moment().format()];
                    console.dir(sentTimes);
                    shiftService.updateInvoice(invoice.get('id'), { sent: true, sent_times: sentTimes }).then(function (result) {
                        invoice.set('sent', true);
                        alert('The invoice has been sent!');
                        invoice.set('loading', false);
                    });
                }
                else if (result == 'Re-send to ' + _this.familiesMap[invoice.get('family_id')].name) {
                    var sentTimes_1 = [moment().format()];
                    if (invoice.get('sent_times') && invoice.get('sent_times').length) {
                        sentTimes_1 = invoice.get('sent_times');
                        sentTimes_1.push(moment().format());
                    }
                    console.dir(sentTimes_1);
                    invoice.set('loading', true);
                    _this.sendInvoice(invoice.get('id'), invoice, true);
                    shiftService.updateInvoice(invoice.get('id'), { sent: true, sent_times: sentTimes_1 }).then(function (result) {
                        console.log('');
                        invoice.set('sent', true);
                        invoice.set('sent_times', sentTimes_1);
                        alert('The invoice has been sent!');
                        invoice.set('loading', false);
                    });
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
        if (this.families.length == 1) {
            while (this.uninvoicedShifts.length)
                this.uninvoicedShifts.pop();
            var uninvoicedShiftsArray = [];
            var family = this.familiesMap[this.families.getItem(0).get('id')];
            var invoiceTotal = 0;
            for (var i in this.uninvoicedShiftsByFamilyMap[family.id]) {
                if (this.addedShiftsMap[i].end_time && this.addedShiftsMap[i].contributions[family.id]) {
                    var familyContribution = this.addedShiftsMap[i].contributions[family.id];
                    this.addedShiftsMap[i].selected_family_contribution = familyContribution;
                    uninvoicedShiftsArray.push(this.addedShiftsMap[i]);
                    invoiceTotal += +this.addedShiftsMap[i].selected_family_contribution;
                }
            }
            if (uninvoicedShiftsArray.length) {
                this.selectedFamilyToInvoice = family;
                this.set('invoiceTotal', invoiceTotal.toFixed(2));
                this.set('uninvoicedShifts', uninvoicedShiftsArray);
            }
            else {
                this.selectedFamilyToInvoice = false;
                alert('The family you chose does not have any uninvoiced shifts, they\'re all paid up!');
            }
        }
    };
    HomeModel.prototype.chooseFamilyToInvoice = function () {
        if (this.families.length > 1) {
            this.dismissSoftInputs();
            this.set('picking', 'list');
            this.set('pickerTitle', 'Choose Family');
            var pickerItems_1 = [];
            this.families.forEach(function (item) {
                pickerItems_1.push(item.get('name'));
            });
            this.set('pickerItems', pickerItems_1);
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
                var invoiceTotal = 0;
                for (var i in this.uninvoicedShiftsByFamilyMap[family.id]) {
                    if (this.addedShiftsMap[i].end_time && this.addedShiftsMap[i].contributions[family.id]) {
                        var familyContribution = this.addedShiftsMap[i].contributions[family.id];
                        this.addedShiftsMap[i].selected_family_contribution = familyContribution;
                        uninvoicedShiftsArray.push(this.addedShiftsMap[i]);
                        invoiceTotal += +this.addedShiftsMap[i].selected_family_contribution;
                    }
                }
                if (uninvoicedShiftsArray.length) {
                    this.selectedFamilyToInvoice = family;
                    this.set('invoiceTotal', invoiceTotal.toFixed(2));
                    this.set('uninvoicedShifts', uninvoicedShiftsArray);
                }
                else {
                    this.selectedFamilyToInvoice = false;
                    alert('The family you chose does not have any uninvoiced shifts, they\'re all paid up!');
                }
                picker.animateHide().then(function () { return _this.set('picking', false); });
            });
        }
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
                var invoices = [];
                if (appSettings.getString('invoices'))
                    invoices = JSON.parse(appSettings.getString('invoices'));
                _this.processInvoices(invoices);
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
            sent: true,
            sent_times: [moment().format()]
        };
        if (!args.shift_ids || !args.shift_ids.length) {
            alert('Please select one or more shifts to include in this invoice.');
        }
        else {
            shiftService.createInvoice(args).then(function (result) {
                _this.hideSettings();
                _this.sendInvoice(result.key);
                var invoices = [];
                if (appSettings.getString('invoices'))
                    invoices = JSON.parse(appSettings.getString('invoices'));
                _this.processInvoices(invoices);
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
                if (shift) {
                    html += "\n                        <tr>\n                            <td align=\"left\" style=\"padding: 5; border-bottom: 1px solid #f5f5f5;\">" + shift.display_date + "<br /><span style=\"font-size: 11px; color: gray;\">" + shift.display_timing + "</span></td>\n                            <td align=\"left\" style=\"padding: 5; border-bottom: 1px solid #f5f5f5; font-weight: bold;\">$" + shift.contributions[invoice.family_id] + "</td>\n                        </tr>\n                    ";
                }
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
                    console.dir(JSON.stringify(shift.invoiced));
                    if (shift.invoiced) {
                        var msg_2 = 'This shift is included in invoices for the following familes: ' + shift.invoiced_families_string + '. If you edit the contributions for a family, you\'ll need to delete the invoice this shift is associated with and create a new one. Also, make sure you reach out to the family and inform them to ignore the previous invoice.';
                        if (_this.families.length == 1)
                            msg_2 = 'This shift is included in an invoice already. If you edit the hours worked, you\'ll need to delete the invoice this shift is associated with and create a new one. Also, make sure you reach out to the family and inform them to ignore the previous invoice.';
                        dialogs.confirm({
                            title: "This shift has already been invoiced!",
                            message: msg_2,
                            okButtonText: "Ok.",
                            cancelButtonText: "Cancel"
                        }).then(function (result) {
                            // result argument is boolean
                            console.dir(result);
                            if (result) {
                                _this.showEditShift(false, shift);
                            }
                        });
                    }
                    else {
                        _this.showEditShift(false, shift);
                    }
                }
                else if (result == 'Delete Shift') {
                    var msg_3 = 'Are you sure you want to delete this shift? This cannot be undone.';
                    if (shift.invoiced) {
                        msg_3 = 'This shift is included in invoices for the following familes: ' + shift.invoiced_families_string + '. Deleting this shift will remove it from that invoice, but not adjust the invoice\'s total. Are you sure you want to delete this shift? It cannot be undone.';
                        if (_this.families.length == 1)
                            msg_3 = 'This shift is included in an invoice. Deleting this shift will remove it from that invoice, but not adjust the invoice\'s total. Are you sure you want to delete this shift? It cannot be undone.';
                    }
                    dialogs.action(msg_3, "Cancel", ["Do it."]).then(function (result) {
                        if (result == 'Do it.') {
                            shiftService.deleteShift(shift.id).then(function (result) {
                                _this.processShifts(JSON.parse(appSettings.getString('shifts')));
                                var invoices = [];
                                if (appSettings.getString('invoices'))
                                    invoices = JSON.parse(appSettings.getString('invoices'));
                                _this.processInvoices(invoices);
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
        var reverseShifts = [];
        if (this.weeks[beginningOfWeek])
            reverseShifts = this.weeks[beginningOfWeek].shifts.slice(0).reverse();
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
        if (families.length > 1) {
            for (var i = 0; families.length > i; i++) {
                if (editingShift.id && editingShift.contributions) {
                    // we are editing a shift, so dont update the contributions automatically. make the user do it.
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
        }
        else {
            // theres only one family, so always update the contributions.
            families.getItem(0).set('contribution', newTotal);
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
                var invoices = [];
                if (appSettings.getString('invoices'))
                    invoices = JSON.parse(appSettings.getString('invoices'));
                _this.processInvoices(invoices);
                if (editingShift.id == MyModel.get('clockedIn').id && args.end_time)
                    MyModel.set('clockedIn', false);
                _this.hideSettings();
            });
        }
        else {
            shiftService.addShift(args).then(function (result) {
                _this.processShifts(JSON.parse(appSettings.getString('shifts')));
                var invoices = [];
                if (appSettings.getString('invoices'))
                    invoices = JSON.parse(appSettings.getString('invoices'));
                _this.processInvoices(invoices);
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
        appSettings.remove('invoices');
        appSettings.remove('shifts');
        var navigationEntry = {
            moduleName: "/views/login/login",
            animated: false,
        };
        frame.topmost().navigate(navigationEntry);
    };
    HomeModel.prototype.settingsScroll = function (args) {
    };
    HomeModel.prototype.showSettings = function (viewPath) {
        var _this = this;
        var maingrid = this.page.getViewById('maingrid');
        maingrid.animate({
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
        var maingrid = this.page.getViewById('maingrid');
        maingrid.animate({
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
        while (this.thisWeek.length)
            this.thisWeek.pop();
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
        var total_unpaid = 0;
        for (var i in invoices) {
            invoices[i].id = i;
            invoices[i].shifts = [];
            invoices[i].family_name = user.families[invoices[i].family_id].name;
            invoices[i].date_created_pretty = moment(invoices[i].date_created).format('MMM Do, YYYY');
            for (var s = 0; invoices[i].shift_ids.length > s; s++) {
                if (this.addedShiftsMap[invoices[i].shift_ids[s]]) {
                    // if this conditional isnt satisfied, it probably means the user deleted the shift after it was invoiced.
                    if (!this.invoicedShiftsByFamilyMap[invoices[i].family_id])
                        this.invoicedShiftsByFamilyMap[invoices[i].family_id] = {};
                    this.invoicedShiftsByFamilyMap[invoices[i].family_id][invoices[i].shift_ids[s]] = true;
                    var shift = this.addedShiftsMap[invoices[i].shift_ids[s]];
                    shift.contribution = shift.contributions[invoices[i].family_id];
                    shift.invoice_title_display = moment(shift.start_time).format('M/D/YY') + ': ' + shift.display_hours;
                    shift.invoiced = true;
                    invoices[i].shifts.push(shift);
                }
            }
            // this is required to make the UI respect the loading indicator.
            invoices[i].loading = false;
            if (!invoices[i].sent)
                invoices[i].sent = false;
            if (!invoices[i].paid)
                total_unpaid += invoices[i].total - 0;
            this.invoiceMap[i] = invoices[i];
            var isAdded = false;
            //invoicesArray.push(invoices[i]);
            this.invoices.push(observable_1.fromObject(invoices[i]));
            //this.invoices.push(observableFromObject(invoices[i]));
        }
        this.set('totalUnpaidString', 'You have $' + total_unpaid.toFixed(2) + ' in unpaid invoices.');
        this.set('totalUnpaid', total_unpaid.toFixed(2));
        if (!total_unpaid)
            this.set('totalUnpaidString', 'You\'re all paid up!');
        this.invoices.sort(function (a, b) {
            if (moment(a.date_created) < moment(b.date_created)) {
                return 1;
            }
            else if (moment(a.date_created) > moment(b.date_created)) {
                return -1;
            }
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9tZS1tb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvbWUtbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSw4Q0FBOEc7QUFDOUcsMERBQXNEO0FBR3RELG9DQUFzQztBQUN0QyxrREFBb0Q7QUFDcEQsK0JBQWlDO0FBQ2pDLGdDQUFrQztBQUNsQyxnQ0FBa0M7QUFFbEMsa0NBQTBDO0FBQzFDLG9DQUFzQztBQUN0QyxxQ0FBa0M7QUFPbEMsdURBQTJEO0FBQzNELHlEQUF1RDtBQUt2RCxvREFBc0Q7QUFDdEQsSUFBSSxXQUF3QixDQUFDO0FBQzdCLElBQUksWUFBMEIsQ0FBQztBQUMvQixJQUFJLGlCQUE4QixDQUFDO0FBQ25DLElBQUksd0JBQXdCLENBQUM7QUFDN0IsSUFBSSxXQUFXLENBQUM7QUFDaEIsSUFBSSxRQUFnQixDQUFDO0FBQ3JCLElBQUksT0FBa0IsQ0FBQztBQUN2QixJQUFJLGFBQTRCLENBQUM7QUFDakMsSUFBSSxZQUFZLENBQUM7QUFFakI7SUFBK0IsNkJBQVU7SUFDckM7UUFBQSxZQUNJLGlCQUFPLFNBMEJWO1FBR00saUJBQVcsR0FBVyxVQUFVLEdBQUcsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwRixVQUFJLEdBQVMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDM0Qsa0JBQVksR0FBVyxDQUFDLENBQUM7UUFDekIsMkJBQXFCLEdBQVcsQ0FBQyxDQUFDO1FBQ2xDLGtCQUFZLEdBQVcsSUFBSSxDQUFDO1FBQzVCLG9CQUFjLEdBQVcsQ0FBQyxDQUFDO1FBQzNCLHFCQUFlLEdBQVUsQ0FBQyxDQUFDO1FBQzNCLG1CQUFhLEdBQVcsVUFBVSxDQUFDO1FBQ25DLGNBQVEsR0FBZ0MsSUFBSSxrQ0FBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hF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USxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNyRyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUM1QyxJQUFJLFlBQVksR0FBTyxLQUFLLENBQUM7b0JBQzdCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7d0JBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQzNFLEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxZQUFZLElBQUksR0FBRyxDQUFDO3dCQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzFHLENBQUM7WUFDTCxDQUFDO1FBQ0wsQ0FBQztRQUNELDJDQUEyQztRQUMzQywrREFBK0Q7UUFDL0QsNkNBQTZDO1FBQzdDLGlFQUFpRTtJQUNyRSxDQUFDO0lBRUwsZ0JBQUM7QUFBRCxDQUFDLEFBcjRDRCxDQUErQix1QkFBVSxHQXE0Q3hDO0FBcjRDWSw4QkFBUyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBhZ2UgfSBmcm9tICd1aS9wYWdlJztcbmltcG9ydCB7RXZlbnREYXRhLCBPYnNlcnZhYmxlLCBQcm9wZXJ0eUNoYW5nZURhdGEsIGZyb21PYmplY3QgYXMgb2JzZXJ2YWJsZUZyb21PYmplY3R9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSc7XG5pbXBvcnQge09ic2VydmFibGVBcnJheX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlLWFycmF5JztcbmltcG9ydCB7IEdlc3R1cmVUeXBlcywgUGFuR2VzdHVyZUV2ZW50RGF0YSB9IGZyb20gXCJ1aS9nZXN0dXJlc1wiO1xuaW1wb3J0ICogYXMgZmlyZWJhc2UgZnJvbSAnbmF0aXZlc2NyaXB0LXBsdWdpbi1maXJlYmFzZSc7XG5pbXBvcnQgKiBhcyBkaWFsb2dzIGZyb20gJ3VpL2RpYWxvZ3MnO1xuaW1wb3J0ICogYXMgYXBwU2V0dGluZ3MgZnJvbSAnYXBwbGljYXRpb24tc2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgKiBhcyBmcmFtZSBmcm9tICd1aS9mcmFtZSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmaWxlLXN5c3RlbSc7XG5pbXBvcnQgeyBBbmltYXRpb25EZWZpbml0aW9uIH0gZnJvbSBcInVpL2FuaW1hdGlvblwiO1xuaW1wb3J0IHsgQW5pbWF0aW9uQ3VydmUgfSBmcm9tIFwidWkvZW51bXNcIjtcbmltcG9ydCAqIGFzIGJ1aWxkZXIgZnJvbSAndWkvYnVpbGRlcic7XG5pbXBvcnQgeyBzY3JlZW4gfSBmcm9tIFwicGxhdGZvcm1cIjtcbmltcG9ydCB7IFN0YWNrTGF5b3V0IH0gZnJvbSAndWkvbGF5b3V0cy9zdGFjay1sYXlvdXQnO1xuaW1wb3J0IHsgR3JpZExheW91dCB9IGZyb20gJ3VpL2xheW91dHMvZ3JpZC1sYXlvdXQnO1xuaW1wb3J0IHsgTGlzdFZpZXcgfSBmcm9tICd1aS9saXN0LXZpZXcnO1xuaW1wb3J0IHsgU2Nyb2xsVmlldywgU2Nyb2xsRXZlbnREYXRhIH0gZnJvbSAndWkvc2Nyb2xsLXZpZXcnO1xuaW1wb3J0IHsgVGV4dEZpZWxkIH0gZnJvbSAndWkvdGV4dC1maWVsZCc7XG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gJ3VpL2xhYmVsJztcbmltcG9ydCB7IFVzZXJTZXJ2aWNlLCBVc2VyIH0gZnJvbSAnLi4vc2hhcmVkL3VzZXIuc2VydmljZSc7XG5pbXBvcnQgeyBTaGlmdFNlcnZpY2UgfSBmcm9tICcuLi9zaGFyZWQvc2hpZnQuc2VydmljZSc7XG5pbXBvcnQgeyBSYWRTaWRlRHJhd2VyIH0gZnJvbSBcIm5hdGl2ZXNjcmlwdC10ZWxlcmlrLXVpL3NpZGVkcmF3ZXJcIjtcbmltcG9ydCB7IFNldHRpbmdzTW9kZWwgfSBmcm9tICcuLi9tb2RhbHMvc2V0dGluZ3Mvc2V0dGluZ3MtbW9kZWwnO1xuaW1wb3J0IHsgU2VsZWN0ZWRJbmRleENoYW5nZWRFdmVudERhdGEsIFRhYlZpZXcgfSBmcm9tIFwidWkvdGFiLXZpZXdcIjtcbmltcG9ydCB7IFNsaWRlciB9IGZyb20gXCJ1aS9zbGlkZXJcIjtcbmltcG9ydCAqIGFzIHBpY2tlciBmcm9tIFwiLi4vY29tcG9uZW50cy9waWNrZXIvcGlja2VyXCI7XG5sZXQgdXNlclNlcnZpY2U6IFVzZXJTZXJ2aWNlO1xubGV0IHNoaWZ0U2VydmljZTogU2hpZnRTZXJ2aWNlO1xubGV0IHNldHRpbmdzQ29udGFpbmVyOiBTdGFja0xheW91dDtcbmxldCBzZXR0aW5nc092ZXJsYXlDb250YWluZXI7XG5sZXQgZGlzbWlzc05vdGU7XG5sZXQgYmx1clZpZXc6IFVJVmlldztcbmxldCBNeU1vZGVsOiBIb21lTW9kZWw7XG5sZXQgc2V0dGluZ3NNb2RlbDogU2V0dGluZ3NNb2RlbDtcbmxldCBlZGl0aW5nU2hpZnQ7XG5kZWNsYXJlIHZhciBVSVZpc3VhbEVmZmVjdFZpZXc6YW55LCBVSUJsdXJFZmZlY3Q6YW55LCBVSVZpZXdBdXRvcmVzaXppbmdGbGV4aWJsZUhlaWdodDphbnksIFVJVmlld0F1dG9yZXNpemluZ0ZsZXhpYmxlV2lkdGg6YW55LCBVSUJsdXJFZmZlY3RTdHlsZUxpZ2h0OmFueTtcbmV4cG9ydCBjbGFzcyBIb21lTW9kZWwgZXh0ZW5kcyBPYnNlcnZhYmxlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgTXlNb2RlbCA9IHRoaXM7XG4gICAgICAgIC8vYWxsU2hpZnRzTW9kZWwgPSBuZXcgQWxsU2hpZnRzTW9kZWwoKTtcbiAgICAgICAgdXNlclNlcnZpY2UgPSBuZXcgVXNlclNlcnZpY2UoKTtcbiAgICAgICAgc2hpZnRTZXJ2aWNlID0gbmV3IFNoaWZ0U2VydmljZSgpO1xuICAgICAgICBsZXQgdXNlciA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1c2VyRGF0YScpKTtcbiAgICAgICAgZm9yIChsZXQgaSBpbiB1c2VyLmZhbWlsaWVzKSB7XG4gICAgICAgICAgICB1c2VyLmZhbWlsaWVzW2ldLmlkID0gaTtcbiAgICAgICAgICAgIGlmICghdXNlci5mYW1pbGllc1tpXS5kZWxldGVkKSB0aGlzLmZhbWlsaWVzTWFwW2ldID0gdXNlci5mYW1pbGllc1tpXTtcblxuICAgICAgICAgICAgbGV0IGZhbWlseSA9IG9ic2VydmFibGVGcm9tT2JqZWN0KHVzZXIuZmFtaWxpZXNbaV0pO1xuICAgICAgICAgICAgaWYgKCF1c2VyLmZhbWlsaWVzW2ldLmRlbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZhbWlsaWVzLnB1c2goZmFtaWx5KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5mYW1pbGllcy5sZW5ndGggPT0gMSkgdGhpcy5mYW1pbGllcy5nZXRJdGVtKDApLnNldCgnanVzdE9uZUZhbWlseScsIHRydWUpO1xuICAgICAgICB0aGlzLmZhbWlsaWVzLmdldEl0ZW0oMCkuc2V0KCdpc0ZpcnN0JywgdHJ1ZSk7IFxuICAgICAgICB0aGlzLnNldCgnaXNMb2FkaW5nJywgdHJ1ZSk7XG4gICAgICAgIHNoaWZ0U2VydmljZS5idWlsZEFwcERhdGEodHJ1ZSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgdGhpcy5nZXRUaGlzV2Vla1NoaWZ0cygpO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ2lzTG9hZGluZycsIGZhbHNlKTtcbiAgICAgICAgICAgIGxldCBpbnZvaWNlcyA9IFtdO1xuICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkgaW52b2ljZXMgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSk7XG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NJbnZvaWNlcyhpbnZvaWNlcyk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIHBhZ2U6IFBhZ2U7XG4gICAgcHVibGljIGhlYWRlcl90ZXh0OiBzdHJpbmcgPSAnV2VlayBvZiAnICsgbW9tZW50KCkuc3RhcnRPZignd2VlaycpLmZvcm1hdCgnZGRkZCBbdGhlXSBEbycpO1xuICAgIHB1YmxpYyB1c2VyOiBVc2VyID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpO1xuICAgIHB1YmxpYyBob3Vyc193b3JrZWQ6IG51bWJlciA9IDA7XG4gICAgcHVibGljIHRoaXNXZWVrTWludXRlc1dvcmtlZDogbnVtYmVyID0gMDtcbiAgICBwdWJsaWMgdG90YWxfZWFybmVkOiBudW1iZXIgPSAwLjAwO1xuICAgIHB1YmxpYyByZWd1bGFyX2Vhcm5lZDogbnVtYmVyID0gMDtcbiAgICBwdWJsaWMgb3ZlcnRpbWVfZWFybmVkOiBudW1iZXI9IDA7XG4gICAgcHVibGljIHNldHRpbmdzVGl0bGU6IHN0cmluZyA9ICdTZXR0aW5ncyc7XG4gICAgcHVibGljIGZhbWlsaWVzOiBPYnNlcnZhYmxlQXJyYXk8T2JzZXJ2YWJsZT4gPSBuZXcgT2JzZXJ2YWJsZUFycmF5KFtdKTtcbiAgICBwdWJsaWMgZmFtaWxpZXNNYXA6IGFueSA9IHt9O1xuICAgIHB1YmxpYyBlZGl0aW5nRmFtaWx5OiBPYnNlcnZhYmxlID0gb2JzZXJ2YWJsZUZyb21PYmplY3Qoe30pXG4gICAgcHVibGljIGNsb2NrZWRJbjogYW55ID0gZmFsc2U7XG4gICAgcHVibGljIHRoaXNXZWVrOiBPYnNlcnZhYmxlQXJyYXk8T2JzZXJ2YWJsZT4gPSBuZXcgT2JzZXJ2YWJsZUFycmF5KFtdKTtcbiAgICBwdWJsaWMgc2hpZnRzOiBPYnNlcnZhYmxlQXJyYXk8T2JzZXJ2YWJsZT4gPSBuZXcgT2JzZXJ2YWJsZUFycmF5KFtdKTtcbiAgICBwdWJsaWMgYWRkZWRTaGlmdHNNYXAgPSB7fTtcbiAgICBwdWJsaWMgaXNMb2FkaW5nOiBib29sZWFuID0gZmFsc2U7XG4gICAgcHVibGljIHNlbGVjdGVkSW5kZXg6IG51bWJlciA9IDA7XG4gICAgcHVibGljIG15QXJyYXkgPSBbJ2hpJywgJ3dvcmxkJywgJ3dvdWxkIHlvdSBsaWtlJywgJ3BlYXMnXTtcbiAgICBwdWJsaWMgc2VjdGlvbmVkU2hpZnRzOiBPYnNlcnZhYmxlQXJyYXk8T2JzZXJ2YWJsZT4gPSBuZXcgT2JzZXJ2YWJsZUFycmF5KFtdKTtcblxuICAgIHB1YmxpYyBzZWxlY3RlZEZhbWlseVRvSW52b2ljZTogYW55ID0gZmFsc2U7XG4gICAgcHVibGljIHVuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcDogYW55ID0ge307XG4gICAgcHVibGljIGludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXA6IGFueSA9IHt9O1xuICAgIHB1YmxpYyB1bmludm9pY2VkU2hpZnRzOiBBcnJheTxhbnk+ID0gW107XG4gICAgcHVibGljIGludm9pY2VUb3RhbDogbnVtYmVyO1xuICAgIHB1YmxpYyBpbnZvaWNlczogT2JzZXJ2YWJsZUFycmF5PE9ic2VydmFibGU+ID0gbmV3IE9ic2VydmFibGVBcnJheShbXSk7XG4gICAgcHVibGljIGludm9pY2VNYXAgPSB7fTtcbiAgICBwdWJsaWMgdG90YWxVbnBhaWRTdHJpbmc6IHN0cmluZztcbiAgICBwdWJsaWMgdG90YWxVbnBhaWQ6IG51bWJlcjtcblxuICAgIHB1YmxpYyBhbGxTaGlmdHM6IE9ic2VydmFibGVBcnJheTxPYnNlcnZhYmxlPiA9IG5ldyBPYnNlcnZhYmxlQXJyYXkoW10pO1xuICAgIHB1YmxpYyBhbGxTaGlmdHNNYXA6IGFueSA9IHt9O1xuICAgIHB1YmxpYyB3ZWVrcyA9IHt9O1xuXG4gICAgXG5cbiAgICBwdWJsaWMgcmVidWlsZEFsbERhdGEoKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBzaGlmdFNlcnZpY2UuYnVpbGRBcHBEYXRhKHRydWUpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmdldFRoaXNXZWVrU2hpZnRzKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2lzTG9hZGluZycsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZnJlc2ggaW52b2ljZXMgbGVuZ3RoICcgKyBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBpbnZvaWNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpIGludm9pY2VzID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpO1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0ludm9pY2VzKGludm9pY2VzKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICBcbiAgICB9XG5cbiAgICBwdWJsaWMgcGFnZUxvYWRlZChteVBhZ2U6IFBhZ2UpIHtcbiAgICAgICAgdGhpcy5wYWdlID0gbXlQYWdlO1xuICAgICAgICB0aGlzLnBhZ2UuYmluZGluZ0NvbnRleHQgPSB0aGlzO1xuICAgICAgICB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ3RhYnZpZXcnKS5vbignc2VsZWN0ZWRJbmRleENoYW5nZWQnLCAoYXJnczpTZWxlY3RlZEluZGV4Q2hhbmdlZEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3NlbGVjdGVkSW5kZXgnLCBhcmdzLm5ld0luZGV4KTtcbiAgICAgICAgICAgIGlmIChhcmdzLm5ld0luZGV4ID09IDApIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRUaGlzV2Vla1NoaWZ0cygpXG4gICAgICAgICAgICAgICAgfSwgMTApXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgc2hpZnRzID0ge307XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKSBzaGlmdHMgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTaGlmdHMoc2hpZnRzKTtcbiAgICAgICAgICAgICAgICB9LCAxMClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgbGV0IHRhYlZpZXc6IFRhYlZpZXcgPSB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ3RhYnZpZXcnKVxuICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSB0YWJWaWV3LnNlbGVjdGVkSW5kZXg7XG4gICAgfVxuXG4gICAgcHVibGljIHNob3dNZW51KCkge1xuICAgICAgICBsZXQgc2lkZURyYXdlcjogUmFkU2lkZURyYXdlciA9IDxSYWRTaWRlRHJhd2VyPiggZnJhbWUudG9wbW9zdCgpLmdldFZpZXdCeUlkKFwiZHJhd2VyXCIpKTtcbiAgICAgICAgc2lkZURyYXdlci5zaG93RHJhd2VyKCk7XG4gICAgfSAgXG5cbiAgICBwdWJsaWMgbG9nVXNlcigpIHtcbiAgICAgICAgY29uc29sZS5kaXIoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpKTtcbiAgICAgICAgY29uc29sZS5sb2coSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VpZCcpKSlcbiAgICB9XG5cbiAgICBwdWJsaWMgZWRpdFJhdGVzKCkge1xuICAgICAgICB0aGlzLnNob3dTZXR0aW5ncygnL3ZpZXdzL2NvbXBvbmVudHMvZWRpdHJhdGVzL2VkaXRyYXRlcy54bWwnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3NldHRpbmdzVGl0bGUnLCAnRWRpdCBSYXRlcycpO1xuICAgIH1cblxuICAgIHB1YmxpYyBzYXZlUmF0ZXMoKSB7XG4gICAgICAgIGNvbnNvbGUuZGlyKHRoaXMuZ2V0KCd1c2VyJykpO1xuICAgICAgICBsZXQgZGF0YSA9IHtcbiAgICAgICAgICAgIGhvdXJseVJhdGU6IHRoaXMucGFnZS5nZXRWaWV3QnlJZCgnaG91cmx5X3JhdGUnKS50ZXh0LFxuICAgICAgICAgICAgb3ZlcnRpbWVSYXRlOiB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ292ZXJ0aW1lX3JhdGUnKS50ZXh0LFxuICAgICAgICAgICAgZmlyc3RfbmFtZTogdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdmaXJzdF9uYW1lJykudGV4dCxcbiAgICAgICAgICAgIGxhc3RfbmFtZTogdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdsYXN0X25hbWUnKS50ZXh0LFxuICAgICAgICAgICAgZW1haWw6IHRoaXMucGFnZS5nZXRWaWV3QnlJZCgnZW1haWwnKS50ZXh0XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFkYXRhLmhvdXJseVJhdGUgfHwgIWRhdGEub3ZlcnRpbWVSYXRlIHx8ICFkYXRhLmZpcnN0X25hbWUgfHwgIWRhdGEubGFzdF9uYW1lIHx8ICFkYXRhLmVtYWlsKSB7XG4gICAgICAgICAgICBhbGVydCgnUGxlYXNlIGZpbGwgb3V0IGFsbCB0aGUgZmllbGRzLicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHVzZXJTZXJ2aWNlLnVwZGF0ZVVzZXIoZGF0YSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gZGF0YSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2V0KCd1c2VyJylbeF0gPSBkYXRhW3hdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVmcmVzaERhdGEoYXJncykge1xuICAgICAgICB2YXIgcHVsbFJlZnJlc2ggPSBhcmdzLm9iamVjdDtcbiAgICAgICAgc2hpZnRTZXJ2aWNlLmJ1aWxkQXBwRGF0YSh0cnVlKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICB0aGlzLmdldFRoaXNXZWVrU2hpZnRzKCk7XG4gICAgICAgICAgICB0aGlzLnNldCgnaXNMb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgbGV0IGludm9pY2VzID0gW107XG4gICAgICAgICAgICBpZiAoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKSBpbnZvaWNlcyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKTtcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc0ludm9pY2VzKGludm9pY2VzKTtcbiAgICAgICAgICAgIHB1bGxSZWZyZXNoLnJlZnJlc2hpbmcgPSBmYWxzZTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgZWRpdEZhbWlseShhcmdzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdmYW1pbGllcz8nKVxuICAgICAgICAvLyAndGhpcycgaXMgbm93IHRoZSBmYW1pbHkgeW91IHRhcHBlZCBmcm9tIHRoZSByZXBlYXRlclxuICAgICAgICBsZXQgZmFtaWxpZXMgPSBNeU1vZGVsLmZhbWlsaWVzO1xuXG4gICAgICAgIGxldCBmYW1pbHkgPSBmYW1pbGllcy5maWx0ZXIoaXRlbSA9PiBpdGVtLmdldCgnaWQnKSA9PT0gYXJncy5vYmplY3QuaWQpWzBdO1xuICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ0ZhbWlseScsIGZhbWlseSk7XG4gICAgICAgIE15TW9kZWwuc2hvd1NldHRpbmdzKCcvdmlld3MvY29tcG9uZW50cy9lZGl0ZmFtaWx5L2VkaXRmYW1pbHkueG1sJyk7XG4gICAgICAgIE15TW9kZWwuc2V0KCdzZXR0aW5nc1RpdGxlJywgJ0VkaXQgRmFtaWx5Jyk7XG4gICAgICAgIE15TW9kZWwucGFnZS5nZXRWaWV3QnlJZCgnZWRpdGluZ19mYW1pbHlfdmlldycpLmJpbmRpbmdDb250ZXh0ID0gTXlNb2RlbC5lZGl0aW5nRmFtaWx5O1xuICAgIH1cblxuICAgIHB1YmxpYyBhZGRGYW1pbHkoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdlZGl0aW5nRmFtaWx5Jywgb2JzZXJ2YWJsZUZyb21PYmplY3Qoe30pKTtcbiAgICAgICAgdGhpcy5zaG93U2V0dGluZ3MoJy92aWV3cy9jb21wb25lbnRzL2VkaXRmYW1pbHkvZWRpdGZhbWlseS54bWwnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3NldHRpbmdzVGl0bGUnLCAnQWRkIEZhbWlseScpO1xuICAgICAgICBNeU1vZGVsLnBhZ2UuZ2V0Vmlld0J5SWQoJ2VkaXRpbmdfZmFtaWx5X3ZpZXcnKS5iaW5kaW5nQ29udGV4dCA9IE15TW9kZWwuZWRpdGluZ0ZhbWlseTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2F2ZUZhbWlseSgpIHtcbiAgICAgICAgbGV0IGRhdGE6YW55ID0ge1xuICAgICAgICAgICAgbmFtZTogdGhpcy5nZXQoJ2VkaXRpbmdGYW1pbHknKS5nZXQoJ25hbWUnKSxcbiAgICAgICAgICAgIGVtYWlsOiB0aGlzLmdldCgnZWRpdGluZ0ZhbWlseScpLmdldCgnZW1haWwnKVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5lZGl0aW5nRmFtaWx5LmdldCgnaWQnKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2VkaXRpbmcgYSBmYW1pbHknKTtcbiAgICAgICAgICAgIHVzZXJTZXJ2aWNlLnNhdmVGYW1pbHkodGhpcy5lZGl0aW5nRmFtaWx5LmdldCgnaWQnKSwgZGF0YSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGZhbWlsaWVzID0gdGhpcy5mYW1pbGllc1xuICAgICAgICAgICAgICAgIGZhbWlsaWVzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnaWQnKSA9PSB0aGlzLmVkaXRpbmdGYW1pbHkuZ2V0KCdpZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnNldCgnbmFtZScsIGRhdGEubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnNldCgnZW1haWwnLCBkYXRhLmVtYWlsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZVNldHRpbmdzKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2FkZGluZyBhIGZhbWlseScpO1xuICAgICAgICAgICAgbGV0IGZhbWlsaWVzID0gdGhpcy5mYW1pbGllcztcbiAgICAgICAgICAgIHVzZXJTZXJ2aWNlLmFkZEZhbWlseShkYXRhKS50aGVuKChyZXN1bHQ6YW55KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGZhbWlsaWVzID0gdGhpcy5mYW1pbGllcztcbiAgICAgICAgICAgICAgICBkYXRhLmlkID0gcmVzdWx0LmtleTtcbiAgICAgICAgICAgICAgICBmYW1pbGllcy5wdXNoKG9ic2VydmFibGVGcm9tT2JqZWN0KGRhdGEpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnZmFtaWxpZXNDb3VudCcsIGZhbWlsaWVzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgaWYgKGZhbWlsaWVzLmxlbmd0aCA+IDEpIHRoaXMuZmFtaWxpZXMuZ2V0SXRlbSgwKS5zZXQoJ2p1c3RPbmVGYW1pbHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgcmVtb3ZlRmFtaWx5KGFyZ3MpIHtcbiAgICAgICAgbGV0IGZhbUlkID0gYXJncy5vYmplY3QuaWQ7XG4gICAgICAgIGRpYWxvZ3MuY29uZmlybSgnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHJlbW92ZSB0aGlzIGZhbWlseT8nKS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICB1c2VyU2VydmljZS51cGRhdGVGYW1pbHkoZmFtSWQsIHtkZWxldGVkOiB0cnVlfSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBmYW1pbGllcyA9IE15TW9kZWwuZmFtaWxpZXM7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZWxldGVJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgZmFtaWxpZXMuZm9yRWFjaCgoZWxlbWVudCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnaWQnKSA9PSBmYW1JZCkgZGVsZXRlSW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGZhbWlsaWVzLnNwbGljZShkZWxldGVJbmRleCwgMSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZhbWlsaWVzLmxlbmd0aCA9PSAxKSBNeU1vZGVsLmZhbWlsaWVzLmdldEl0ZW0oMCkuc2V0KCdqdXN0T25lRmFtaWx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdmYW1pbGllcycsIGZhbWlsaWVzKTtcbiAgICAgICAgICAgICAgICAgICAgTXlNb2RlbC5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBnZXRUaGlzV2Vla1NoaWZ0cyhyZWZyZXNoRGF0YT8pIHtcbiAgICAgICAgaWYgKHJlZnJlc2hEYXRhKSB7XG4gICAgICAgICAgICB0aGlzLnNldCgnaXNMb2FkaW5nJywgdHJ1ZSk7XG4gICAgICAgICAgICBzaGlmdFNlcnZpY2UuZ2V0U2hpZnRzKDE1LCB0cnVlKS50aGVuKHNoaWZ0cyA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2lzTG9hZGluZycsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTaGlmdHMoc2hpZnRzKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgc2hpZnRzID0ge307XG4gICAgICAgICAgICBpZiAoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSkgc2hpZnRzID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKTtcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc1NoaWZ0cyhzaGlmdHMpO1xuXG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9XG5cbiAgICAvKioqKioqKioqKioqKioqKioqIElOVk9JQ0UgRlVOQ1RJT05TICoqKioqKioqKioqKioqKioqKi9cblxuICAgIHB1YmxpYyBpbnZvaWNlT3B0aW9ucyhhcmdzKSB7XG4gICAgICAgIGxldCBpbnZvaWNlID0gdGhpcy5pbnZvaWNlcy5nZXRJdGVtKGFyZ3MuaW5kZXgpO1xuICAgICAgICBpZiAoaW52b2ljZSkge1xuICAgICAgICAgICAgbGV0IGFjdGlvbnMgPSBbXTtcbiAgICAgICAgICAgIGlmICghaW52b2ljZS5nZXQoJ3BhaWQnKSkge1xuICAgICAgICAgICAgICAgIGFjdGlvbnMucHVzaCgnTWFyayBBcyBQYWlkJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFjdGlvbnMucHVzaCgnVW5tYXJrIEFzIFBhaWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghaW52b2ljZS5nZXQoJ3NlbnQnKSkge1xuICAgICAgICAgICAgICAgIGFjdGlvbnMucHVzaCgnU2VuZCB0byAnICsgdGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmdldCgnZmFtaWx5X2lkJyldLm5hbWUpO1xuICAgICAgICAgICAgICAgIGFjdGlvbnMucHVzaCgnRWRpdCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIWludm9pY2UuZ2V0KCdwYWlkJykpIGFjdGlvbnMucHVzaCgnUmUtc2VuZCB0byAnICsgdGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmdldCgnZmFtaWx5X2lkJyldLm5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCdWaWV3Jyk7XG4gICAgICAgICAgICBhY3Rpb25zLnB1c2goJ0RlbGV0ZScpO1xuXG4gICAgICAgICAgICBkaWFsb2dzLmFjdGlvbih0aGlzLmZhbWlsaWVzTWFwW2ludm9pY2UuZ2V0KCdmYW1pbHlfaWQnKV0ubmFtZSArICcgZm9yICQnICsgaW52b2ljZS5nZXQoJ3RvdGFsJyksIFwiQ2FuY2VsXCIsIGFjdGlvbnMpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0ID09ICdFZGl0Jykge1xuICAgICAgICAgICAgICAgICAgICAvL3RoaXMuc2hvd0VkaXRTaGlmdChmYWxzZSwgc2hpZnQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09ICdEZWxldGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBtc2cgPSAnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSB0aGlzIGludm9pY2U/JztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGludm9pY2UuZ2V0KCdwYWlkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSAnIFlvdVxcJ3ZlIG1hcmtlZCB0aGlzIGludm9pY2UgYXMgcGFpZCwgc28gcmVtZW1iZXIgdG8gYWRqdXN0IHlvdXIgcmVjb3JkcyBhY2NvcmRpbmdseS4nOyBcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbnZvaWNlLmdldCgnc2VudCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gJyBZb3VcXCd2ZSBhbHJlYWR5IHNlbnQgdGhpcyBpbnZvaWNlIHRvICcgKyB0aGlzLmZhbWlsaWVzTWFwW2ludm9pY2UuZ2V0KCdmYW1pbHlfaWQnKV0ubmFtZSArICcsIHNvIHBsZWFzZSByZWFjaCBvdXQgdG8gdGhlbSBkaXJlY3RseSBpbmZvcm1pbmcgdGhlbSB0aGF0IHRoZXkgY2FuIGRpc2NhcmQgdGhpcyBpbnZvaWNlLic7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBkaWFsb2dzLmFjdGlvbihtc2csIFwiQ2FuY2VsXCIsIFtcIkRvIGl0LlwiXSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ID09ICdEbyBpdC4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaGlmdFNlcnZpY2UuZGVsZXRlSW52b2ljZShpbnZvaWNlLmdldCgnaWQnKSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW52b2ljZXMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkgaW52b2ljZXMgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0ludm9pY2VzKGludm9pY2VzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PSAnTWFyayBBcyBQYWlkJykge1xuICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgnbG9hZGluZycsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBzaGlmdFNlcnZpY2UudXBkYXRlSW52b2ljZShpbnZvaWNlLmdldCgnaWQnKSwge3BhaWQ6IHRydWV9KS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgnbG9hZGluZycsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdwYWlkJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdG90YWwgPSBwYXJzZUZsb2F0KGludm9pY2UuZ2V0KCd0b3RhbCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjdXJyZW50VW5wYWlkVG90YWwgPSBwYXJzZUZsb2F0KHRoaXMuZ2V0KCd0b3RhbFVucGFpZCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdVbnBhaWRUb3RhbCA9IChjdXJyZW50VW5wYWlkVG90YWwgLSB0b3RhbCkudG9GaXhlZCgyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCd0b3RhbFVucGFpZCcsIG5ld1VucGFpZFRvdGFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCd0b3RhbFVucGFpZFN0cmluZycsICdZb3UgaGF2ZSAkJyArIG5ld1VucGFpZFRvdGFsICsgJyBpbiB1bnBhaWQgaW52b2ljZXMuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW5ld1VucGFpZFRvdGFsIHx8IG5ld1VucGFpZFRvdGFsID09ICcwLjAwJykgdGhpcy5zZXQoJ3RvdGFsVW5wYWlkU3RyaW5nJywgJ1lvdVxcJ3JlIGFsbCBwYWlkIHVwIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGludm9pY2VMaXN0VmlldzogTGlzdFZpZXcgPSB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ2ludm9pY2VzX2xpc3R2aWV3Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlTGlzdFZpZXcucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy90aGlzLmludm9pY2VzLnNldEl0ZW0oYXJncy5pbmRleCwgaW52b2ljZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT0gJ1VubWFyayBBcyBQYWlkJykge1xuICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgnbG9hZGluZycsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBzaGlmdFNlcnZpY2UudXBkYXRlSW52b2ljZShpbnZvaWNlLmdldCgnaWQnKSwge3BhaWQ6IGZhbHNlfSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgncGFpZCcsIGZhbHNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRvdGFsID0gcGFyc2VGbG9hdChpbnZvaWNlLmdldCgndG90YWwnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY3VycmVudFVucGFpZFRvdGFsID0gcGFyc2VGbG9hdCh0aGlzLmdldCgndG90YWxVbnBhaWQnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3VW5wYWlkVG90YWwgPSAoY3VycmVudFVucGFpZFRvdGFsICsgdG90YWwpLnRvRml4ZWQoMik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCgndG90YWxVbnBhaWQnLCBuZXdVbnBhaWRUb3RhbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCgndG90YWxVbnBhaWRTdHJpbmcnLCAnWW91IGhhdmUgJCcgKyBuZXdVbnBhaWRUb3RhbCArICcgaW4gdW5wYWlkIGludm9pY2VzLicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFuZXdVbnBhaWRUb3RhbCB8fCBuZXdVbnBhaWRUb3RhbCA9PSAnMC4wMCcpIHRoaXMuc2V0KCd0b3RhbFVucGFpZFN0cmluZycsICdZb3VcXCdyZSBhbGwgcGFpZCB1cCEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnZvaWNlTGlzdFZpZXc6IExpc3RWaWV3ID0gdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdpbnZvaWNlc19saXN0dmlldycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZUxpc3RWaWV3LnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PSAnVmlldycpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnZvaWNlTWFwW2ludm9pY2UuZ2V0KCdpZCcpXS5mYW1pbHkgPSB0aGlzLmZhbWlsaWVzTWFwW2ludm9pY2UuZ2V0KCdmYW1pbHlfaWQnKV07XG4gICAgICAgICAgICAgICAgICAgIGxldCBuYXZpZ2F0aW9uRW50cnk6ZnJhbWUuTmF2aWdhdGlvbkVudHJ5ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbW9kdWxlTmFtZTogXCIvdmlld3MvaW52b2ljZS9pbnZvaWNlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0OiB0aGlzLmludm9pY2VNYXBbaW52b2ljZS5nZXQoJ2lkJyldLFxuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBiYWNrc3RhY2tWaXNpYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJIaXN0b3J5OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBmcmFtZS50b3Btb3N0KCkubmF2aWdhdGUobmF2aWdhdGlvbkVudHJ5KTtcbiAgICAgICAgICAgICAgICAgICAgLy9mcmFtZS50b3Btb3N0KCkubmF2aWdhdGUoJy92aWV3cy9pbnZvaWNlL2ludm9pY2UnKTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09ICdTZW5kIHRvICcgKyB0aGlzLmZhbWlsaWVzTWFwW2ludm9pY2UuZ2V0KCdmYW1pbHlfaWQnKV0ubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgnbG9hZGluZycsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbmRJbnZvaWNlKGludm9pY2UuZ2V0KCdpZCcpLCBpbnZvaWNlKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNlbnRUaW1lcyA9IFttb21lbnQoKS5mb3JtYXQoKV07XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGlyKHNlbnRUaW1lcyk7XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0U2VydmljZS51cGRhdGVJbnZvaWNlKGludm9pY2UuZ2V0KCdpZCcpLCB7c2VudDogdHJ1ZSwgc2VudF90aW1lczogc2VudFRpbWVzfSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ3NlbnQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KCdUaGUgaW52b2ljZSBoYXMgYmVlbiBzZW50IScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT0gJ1JlLXNlbmQgdG8gJyArIHRoaXMuZmFtaWxpZXNNYXBbaW52b2ljZS5nZXQoJ2ZhbWlseV9pZCcpXS5uYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBzZW50VGltZXMgPSBbbW9tZW50KCkuZm9ybWF0KCldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW52b2ljZS5nZXQoJ3NlbnRfdGltZXMnKSAmJiBpbnZvaWNlLmdldCgnc2VudF90aW1lcycpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VudFRpbWVzID0gaW52b2ljZS5nZXQoJ3NlbnRfdGltZXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbnRUaW1lcy5wdXNoKG1vbWVudCgpLmZvcm1hdCgpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRpcihzZW50VGltZXMpO1xuICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgnbG9hZGluZycsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbmRJbnZvaWNlKGludm9pY2UuZ2V0KCdpZCcpLCBpbnZvaWNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0U2VydmljZS51cGRhdGVJbnZvaWNlKGludm9pY2UuZ2V0KCdpZCcpLCB7c2VudDogdHJ1ZSwgc2VudF90aW1lczogc2VudFRpbWVzfSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJycpXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgnc2VudCcsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ3NlbnRfdGltZXMnLCBzZW50VGltZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ1RoZSBpbnZvaWNlIGhhcyBiZWVuIHNlbnQhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgnbG9hZGluZycsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ1dlIHNlbnQgYSBmcmllbmRseSByZW1pbmRlciB0byAnICsgdGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmdldCgnZmFtaWx5X2lkJyldLm5hbWUpXG4gICAgICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgc2hvd0NyZWF0ZUludm9pY2UoKSB7XG4gICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZEZhbWlseVRvSW52b2ljZScsIGZhbHNlKTtcbiAgICAgICAgXG4gICAgICAgIE15TW9kZWwuc2V0KCd1bmludm9pY2VkU2hpZnRzJywgW10pO1xuICAgICAgICBNeU1vZGVsLnNob3dTZXR0aW5ncygnL3ZpZXdzL2NvbXBvbmVudHMvZWRpdGludm9pY2UvZWRpdGludm9pY2UueG1sJyk7XG4gICAgICAgIE15TW9kZWwuc2V0KCdzZXR0aW5nc1RpdGxlJywgJ0NyZWF0ZSBJbnZvaWNlJyk7XG5cbiAgICAgICAgaWYgKHRoaXMuZmFtaWxpZXMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnVuaW52b2ljZWRTaGlmdHMubGVuZ3RoKSB0aGlzLnVuaW52b2ljZWRTaGlmdHMucG9wKCk7XG4gICAgICAgICAgICBsZXQgdW5pbnZvaWNlZFNoaWZ0c0FycmF5ID0gW107XG4gICAgICAgICAgICBsZXQgZmFtaWx5ID0gdGhpcy5mYW1pbGllc01hcFt0aGlzLmZhbWlsaWVzLmdldEl0ZW0oMCkuZ2V0KCdpZCcpXTtcbiAgICAgICAgICAgIGxldCBpbnZvaWNlVG90YWwgPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLnVuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcFtmYW1pbHkuaWRdKSB7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYWRkZWRTaGlmdHNNYXBbaV0uZW5kX3RpbWUgJiYgdGhpcy5hZGRlZFNoaWZ0c01hcFtpXS5jb250cmlidXRpb25zW2ZhbWlseS5pZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZhbWlseUNvbnRyaWJ1dGlvbiA9IHRoaXMuYWRkZWRTaGlmdHNNYXBbaV0uY29udHJpYnV0aW9uc1tmYW1pbHkuaWRdO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZGVkU2hpZnRzTWFwW2ldLnNlbGVjdGVkX2ZhbWlseV9jb250cmlidXRpb24gPSBmYW1pbHlDb250cmlidXRpb247XG4gICAgICAgICAgICAgICAgICAgIHVuaW52b2ljZWRTaGlmdHNBcnJheS5wdXNoKHRoaXMuYWRkZWRTaGlmdHNNYXBbaV0pO1xuICAgICAgICAgICAgICAgICAgICBpbnZvaWNlVG90YWwgKz0gK3RoaXMuYWRkZWRTaGlmdHNNYXBbaV0uc2VsZWN0ZWRfZmFtaWx5X2NvbnRyaWJ1dGlvbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodW5pbnZvaWNlZFNoaWZ0c0FycmF5Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRGYW1pbHlUb0ludm9pY2UgPSBmYW1pbHk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2ludm9pY2VUb3RhbCcsIGludm9pY2VUb3RhbC50b0ZpeGVkKDIpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgndW5pbnZvaWNlZFNoaWZ0cycsIHVuaW52b2ljZWRTaGlmdHNBcnJheSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRGYW1pbHlUb0ludm9pY2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBhbGVydCgnVGhlIGZhbWlseSB5b3UgY2hvc2UgZG9lcyBub3QgaGF2ZSBhbnkgdW5pbnZvaWNlZCBzaGlmdHMsIHRoZXlcXCdyZSBhbGwgcGFpZCB1cCEnKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGNob29zZUZhbWlseVRvSW52b2ljZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuZmFtaWxpZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgdGhpcy5kaXNtaXNzU29mdElucHV0cygpO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3BpY2tpbmcnLCAnbGlzdCcpO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3BpY2tlclRpdGxlJywgJ0Nob29zZSBGYW1pbHknKTtcbiAgICAgICAgICAgIGxldCBwaWNrZXJJdGVtcyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5mYW1pbGllcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIHBpY2tlckl0ZW1zLnB1c2goaXRlbS5nZXQoJ25hbWUnKSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckl0ZW1zJywgcGlja2VySXRlbXMpO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmVUZXh0JywgJ0RvbmUnKTtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlU2hvdygpO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckNhbmNlbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC8vIGVtcHR5IHRoZSB1bmludm9pY2VkU2hpZnRzIGFycmF5IGlmIHRoZXJlcyBhbnl0aGluZyBpbiBpdC5cbiAgICAgICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHRoaXMudW5pbnZvaWNlZFNoaWZ0cy5sZW5ndGgpIHRoaXMudW5pbnZvaWNlZFNoaWZ0cy5wb3AoKTtcbiAgICAgICAgICAgICAgICBsZXQgdW5pbnZvaWNlZFNoaWZ0c0FycmF5ID0gW107XG4gICAgICAgICAgICAgICAgbGV0IGZhbWlseSA9IHRoaXMuZmFtaWxpZXNNYXBbdGhpcy5mYW1pbGllcy5nZXRJdGVtKHRoaXMucGFnZS5nZXRWaWV3QnlJZCgnbGlzdHBpY2tlcicpLnNlbGVjdGVkSW5kZXgpLmdldCgnaWQnKV07XG4gICAgICAgICAgICAgICAgbGV0IGludm9pY2VUb3RhbCA9IDA7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLnVuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcFtmYW1pbHkuaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5hZGRlZFNoaWZ0c01hcFtpXS5lbmRfdGltZSAmJiB0aGlzLmFkZGVkU2hpZnRzTWFwW2ldLmNvbnRyaWJ1dGlvbnNbZmFtaWx5LmlkXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZhbWlseUNvbnRyaWJ1dGlvbiA9IHRoaXMuYWRkZWRTaGlmdHNNYXBbaV0uY29udHJpYnV0aW9uc1tmYW1pbHkuaWRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRlZFNoaWZ0c01hcFtpXS5zZWxlY3RlZF9mYW1pbHlfY29udHJpYnV0aW9uID0gZmFtaWx5Q29udHJpYnV0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgdW5pbnZvaWNlZFNoaWZ0c0FycmF5LnB1c2godGhpcy5hZGRlZFNoaWZ0c01hcFtpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlVG90YWwgKz0gK3RoaXMuYWRkZWRTaGlmdHNNYXBbaV0uc2VsZWN0ZWRfZmFtaWx5X2NvbnRyaWJ1dGlvbjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodW5pbnZvaWNlZFNoaWZ0c0FycmF5Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkRmFtaWx5VG9JbnZvaWNlID0gZmFtaWx5O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCgnaW52b2ljZVRvdGFsJywgaW52b2ljZVRvdGFsLnRvRml4ZWQoMikpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCgndW5pbnZvaWNlZFNoaWZ0cycsIHVuaW52b2ljZWRTaGlmdHNBcnJheSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEZhbWlseVRvSW52b2ljZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBhbGVydCgnVGhlIGZhbWlseSB5b3UgY2hvc2UgZG9lcyBub3QgaGF2ZSBhbnkgdW5pbnZvaWNlZCBzaGlmdHMsIHRoZXlcXCdyZSBhbGwgcGFpZCB1cCEnKVxuICAgICAgICAgICAgICAgIH0gICAgICAgXG4gICAgICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIHVuc2VsZWN0VW5pbnZvaWNlZFNoaWZ0KGFyZ3MpIHtcbiAgICAgICAgaWYgKGFyZ3Mub2JqZWN0LmlkKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgTXlNb2RlbC51bmludm9pY2VkU2hpZnRzLmxlbmd0aCA+IGk7IGkrKykge1xuICAgICAgICAgICAgICAgIGxldCBpdGVtID0gTXlNb2RlbC51bmludm9pY2VkU2hpZnRzW2ldO1xuICAgICAgICAgICAgICAgIGlmIChpdGVtLmlkID09IGFyZ3Mub2JqZWN0LmlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB0YXBwZWRJdGVtOiBHcmlkTGF5b3V0ID0gYXJncy5vYmplY3Q7XG4gICAgICAgICAgICAgICAgICAgIGxldCBuZXdJbnZvaWNlVG90YWwgPSBwYXJzZUZsb2F0KE15TW9kZWwuZ2V0KCdpbnZvaWNlVG90YWwnKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkaXNwbGF5ZWQgaW52b2ljZSB0b3RhbCAnICsgbmV3SW52b2ljZVRvdGFsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhcHBlZEl0ZW0uY2xhc3NOYW1lID09ICd1bmludm9pY2VkX3NoaWZ0IHNlbGVjdGVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFwcGVkSXRlbS5jbGFzc05hbWUgPSAndW5pbnZvaWNlZF9zaGlmdCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmRvX25vdF9pbnZvaWNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0ludm9pY2VUb3RhbCAtPSBwYXJzZUZsb2F0KGl0ZW0uc2VsZWN0ZWRfZmFtaWx5X2NvbnRyaWJ1dGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXBwZWRJdGVtLmNsYXNzTmFtZSA9ICd1bmludm9pY2VkX3NoaWZ0IHNlbGVjdGVkJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uZG9fbm90X2ludm9pY2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0ludm9pY2VUb3RhbCArPSBwYXJzZUZsb2F0KGl0ZW0uc2VsZWN0ZWRfZmFtaWx5X2NvbnRyaWJ1dGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2ludm9pY2VUb3RhbCcsIG5ld0ludm9pY2VUb3RhbC50b0ZpeGVkKDIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgc2F2ZUludm9pY2UoKSB7XG4gICAgICAgIGxldCBzaGlmdF9pZHMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IE15TW9kZWwudW5pbnZvaWNlZFNoaWZ0cy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBpdGVtID0gTXlNb2RlbC51bmludm9pY2VkU2hpZnRzW2ldO1xuXG4gICAgICAgICAgICBpZiAoIWl0ZW0uZG9fbm90X2ludm9pY2UpIHNoaWZ0X2lkcy5wdXNoKGl0ZW0uaWQpO1xuICAgICAgICB9XG4gICAgICAgIGxldCBhcmdzID0ge1xuICAgICAgICAgICAgc2hpZnRfaWRzOiBzaGlmdF9pZHMsXG4gICAgICAgICAgICBmYW1pbHlfaWQ6IHRoaXMuZ2V0KCdzZWxlY3RlZEZhbWlseVRvSW52b2ljZScpLmlkLFxuICAgICAgICAgICAgdG90YWw6IHRoaXMuZ2V0KCdpbnZvaWNlVG90YWwnKSxcbiAgICAgICAgICAgIHBhaWQ6IGZhbHNlLFxuICAgICAgICAgICAgZGF0ZV9jcmVhdGVkOiBtb21lbnQoKS5mb3JtYXQoKVxuICAgICAgICB9XG4gICAgICAgIGlmICghYXJncy5zaGlmdF9pZHMgfHwgIWFyZ3Muc2hpZnRfaWRzLmxlbmd0aCkge1xuICAgICAgICAgICAgYWxlcnQoJ1BsZWFzZSBzZWxlY3Qgb25lIG9yIG1vcmUgc2hpZnRzIHRvIGluY2x1ZGUgaW4gdGhpcyBpbnZvaWNlLicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLmNyZWF0ZUludm9pY2UoYXJncykudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZVNldHRpbmdzKCk7ICAgIFxuICAgICAgICAgICAgICAgIGxldCBpbnZvaWNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpIGludm9pY2VzID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpO1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0ludm9pY2VzKGludm9pY2VzKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfVxuXG4gICAgcHVibGljIHNhdmVBbmRTZW5kSW52b2ljZSgpIHtcbiAgICAgICAgbGV0IHNoaWZ0X2lkcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgTXlNb2RlbC51bmludm9pY2VkU2hpZnRzLmxlbmd0aCA+IGk7IGkrKykge1xuICAgICAgICAgICAgbGV0IGl0ZW0gPSBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHNbaV07XG5cbiAgICAgICAgICAgIGlmICghaXRlbS5kb19ub3RfaW52b2ljZSkgc2hpZnRfaWRzLnB1c2goaXRlbS5pZCk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGFyZ3MgPSB7XG4gICAgICAgICAgICBzaGlmdF9pZHM6IHNoaWZ0X2lkcyxcbiAgICAgICAgICAgIGZhbWlseV9pZDogdGhpcy5nZXQoJ3NlbGVjdGVkRmFtaWx5VG9JbnZvaWNlJykuaWQsXG4gICAgICAgICAgICB0b3RhbDogdGhpcy5nZXQoJ2ludm9pY2VUb3RhbCcpLFxuICAgICAgICAgICAgcGFpZDogZmFsc2UsXG4gICAgICAgICAgICBkYXRlX2NyZWF0ZWQ6IG1vbWVudCgpLmZvcm1hdCgpLFxuICAgICAgICAgICAgc2VudDogdHJ1ZSxcbiAgICAgICAgICAgIHNlbnRfdGltZXM6IFttb21lbnQoKS5mb3JtYXQoKV1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIWFyZ3Muc2hpZnRfaWRzIHx8ICFhcmdzLnNoaWZ0X2lkcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFsZXJ0KCdQbGVhc2Ugc2VsZWN0IG9uZSBvciBtb3JlIHNoaWZ0cyB0byBpbmNsdWRlIGluIHRoaXMgaW52b2ljZS4nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNoaWZ0U2VydmljZS5jcmVhdGVJbnZvaWNlKGFyZ3MpLnRoZW4oKHJlc3VsdDphbnkpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VuZEludm9pY2UocmVzdWx0LmtleSlcbiAgICAgICAgICAgICAgICBsZXQgaW52b2ljZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKSBpbnZvaWNlcyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NJbnZvaWNlcyhpbnZvaWNlcyk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIFxuICAgIH1cblxuICAgIHB1YmxpYyBzZW5kSW52b2ljZShpbnZvaWNlX2lkLCBpbnZvaWNlPywgcmVzZW5kaW5nPykge1xuICAgICAgICBsZXQgaHRtbCA9IHRoaXMuYnVpbGRJbnZvaWNlSHRtbChpbnZvaWNlX2lkLCBpbnZvaWNlKTtcbiAgICAgICAgbGV0IG1lc3NhZ2UgPSB0aGlzLnVzZXIuZmlyc3RfbmFtZSArICcgJyArIHRoaXMudXNlci5sYXN0X25hbWUgKyAnIGNyZWF0ZWQgdGhlIGludm9pY2UgYmVsb3csIHNlbmQgcGF5bWVudCBhcyBzb29uIGFzIHlvdSBjYW4uJztcbiAgICAgICAgbGV0IHN1YmplY3QgPSB0aGlzLnVzZXIuZmlyc3RfbmFtZSArICcgJyArIHRoaXMudXNlci5sYXN0X25hbWUgKyAnIGhhcyBzZW50IHlvdSBhbiBpbnZvaWNlLic7XG4gICAgICAgIGlmIChyZXNlbmRpbmcpIHtcbiAgICAgICAgICAgIG1lc3NhZ2UgPSB0aGlzLnVzZXIuZmlyc3RfbmFtZSArICcgJyArIHRoaXMudXNlci5sYXN0X25hbWUgKyAnIHByZXZpb3VzbHkgc2VudCB0aGUgaW52b2ljZSBiZWxvdywgaGVyZVxcJ3MgYSBmcmllbmRseSByZW1pbmRlciB0byBzZW5kIHBheW1lbnQgYXMgc29vbiBhcyB5b3UgY2FuLidcbiAgICAgICAgICAgIHN1YmplY3QgPSB0aGlzLnVzZXIuZmlyc3RfbmFtZSArICcgJyArIHRoaXMudXNlci5sYXN0X25hbWUgKyAnIGlzIHNlbmRpbmcgeW91IGEgZnJpZW5kbHkgcmVtaW5kZXIgYWJvdXQgYW4gdW5wYWlkIGludm9pY2UuJ1xuICAgICAgICB9XG4gICAgICAgIGlmICghaW52b2ljZSkge1xuICAgICAgICAgICAgdXNlclNlcnZpY2Uuc2VuZEVtYWlsKHRoaXMuc2VsZWN0ZWRGYW1pbHlUb0ludm9pY2UsIHtlbWFpbDogdGhpcy51c2VyLmVtYWlsLCBuYW1lOiB0aGlzLnVzZXIuZmlyc3RfbmFtZSArICcgJyArIHRoaXMudXNlci5sYXN0X25hbWV9LCBtZXNzYWdlLCBodG1sLCBzdWJqZWN0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBmYW1pbHlUb0ludm9pY2UgPSB0aGlzLmZhbWlsaWVzTWFwW2ludm9pY2UuZmFtaWx5X2lkXTtcbiAgICAgICAgICAgIHVzZXJTZXJ2aWNlLnNlbmRFbWFpbChmYW1pbHlUb0ludm9pY2UsIHtlbWFpbDogdGhpcy51c2VyLmVtYWlsLCBuYW1lOiB0aGlzLnVzZXIuZmlyc3RfbmFtZSArICcgJyArIHRoaXMudXNlci5sYXN0X25hbWV9LCBtZXNzYWdlLCBodG1sLCBzdWJqZWN0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9XG5cbiAgICBwcml2YXRlIGJ1aWxkSW52b2ljZUh0bWwoaW52b2ljZV9pZCwgaW52b2ljZT8pIHtcbiAgICAgICAgbGV0IGh0bWwgPSBgXG4gICAgICAgICAgICA8Y2VudGVyPjxzcGFuIHN0eWxlPVwiY29sb3I6IGdyYXk7IGZvbnQtc2l6ZTogMTFweDsgY29sb3I6IGdyYXk7XCI+SW52b2ljZSBJRDogYCArIGludm9pY2VfaWQgKyBgPC9zcGFuPjwvY2VudGVyPlxuICAgICAgICAgICAgPHRhYmxlIHdpZHRoPVwiMTAwJVwiIHN0eWxlPVwiZm9udC1mYW1pbHk6IEhlbHZldGljYTsgZm9udC1zaXplOiAxM3B4O1wiIGNlbGxwYWRkaW5nPVwiMFwiIGNlbGxzcGFjaW5nPVwiMFwiPlxuICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgPHRoIGFsaWduPVwibGVmdFwiIHdpZHRoPVwiMTAwJVwiIHN0eWxlPVwicGFkZGluZzogNTsgYm9yZGVyLWJvdHRvbTogMnB4IHNvbGlkICNFMEUwRTA7XCI+U2hpZnRzPC90aD5cbiAgICAgICAgICAgICAgICAgICAgPHRoIGFsaWduPVwibGVmdFwiIHN0eWxlPVwicGFkZGluZzogNTsgYm9yZGVyLWJvdHRvbTogMnB4IHNvbGlkICNFMEUwRTA7XCI+Q29udHJpYnV0aW9uPC90aD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICBgXG4gICAgICAgIGlmICghaW52b2ljZSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IE15TW9kZWwudW5pbnZvaWNlZFNoaWZ0cy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgaXRlbSA9IE15TW9kZWwudW5pbnZvaWNlZFNoaWZ0c1tpXTtcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW0uZG9fbm90X2ludm9pY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8dHI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGFsaWduPVwibGVmdFwiIHN0eWxlPVwicGFkZGluZzogNTsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNmNWY1ZjU7XCI+YCsgaXRlbS5kaXNwbGF5X2RhdGUgK2A8YnIgLz48c3BhbiBzdHlsZT1cImZvbnQtc2l6ZTogMTFweDsgY29sb3I6IGdyYXk7XCI+YCArIGl0ZW0uZGlzcGxheV90aW1pbmcgKyBgPC9zcGFuPjwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGFsaWduPVwibGVmdFwiIHN0eWxlPVwicGFkZGluZzogNTsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNmNWY1ZjU7IGZvbnQtd2VpZ2h0OiBib2xkO1wiPiRgICsgaXRlbS5jb250cmlidXRpb25zW3RoaXMuc2VsZWN0ZWRGYW1pbHlUb0ludm9pY2UuaWRdICsgYDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICA8L3RhYmxlPlxuICAgICAgICAgICAgICAgIDxjZW50ZXI+PGgyIHN0eWxlPVwiZm9udC1mYW1pbHk6IEhlbHZldGljYTtcIj5JbnZvaWNlIFRvdGFsOiA8c3BhbiBzdHlsZT1cImNvbG9yOiBncmVlbjtcIj4kYCArIHRoaXMuaW52b2ljZVRvdGFsICsgYDwvc3Bhbj48L2gyPjwvY2VudGVyPlxuICAgICAgICAgICAgYFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGludm9pY2Uuc2hpZnRfaWRzLmxlbmd0aCA+IGk7IGkrKykge1xuICAgICAgICAgICAgICAgIGxldCBzaGlmdCA9IE15TW9kZWwuYWRkZWRTaGlmdHNNYXBbaW52b2ljZS5zaGlmdF9pZHNbaV1dO1xuICAgICAgICAgICAgICAgIGlmIChzaGlmdCkge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgYWxpZ249XCJsZWZ0XCIgc3R5bGU9XCJwYWRkaW5nOiA1OyBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2Y1ZjVmNTtcIj5gKyBzaGlmdC5kaXNwbGF5X2RhdGUgK2A8YnIgLz48c3BhbiBzdHlsZT1cImZvbnQtc2l6ZTogMTFweDsgY29sb3I6IGdyYXk7XCI+YCArIHNoaWZ0LmRpc3BsYXlfdGltaW5nICsgYDwvc3Bhbj48L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBhbGlnbj1cImxlZnRcIiBzdHlsZT1cInBhZGRpbmc6IDU7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZjVmNWY1OyBmb250LXdlaWdodDogYm9sZDtcIj4kYCArIHNoaWZ0LmNvbnRyaWJ1dGlvbnNbaW52b2ljZS5mYW1pbHlfaWRdICsgYDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICA8L3RhYmxlPlxuICAgICAgICAgICAgICAgIDxjZW50ZXI+PGgyIHN0eWxlPVwiZm9udC1mYW1pbHk6IEhlbHZldGljYTtcIj5JbnZvaWNlIFRvdGFsOiA8c3BhbiBzdHlsZT1cImNvbG9yOiBncmVlbjtcIj4kYCArIGludm9pY2UudG90YWwgKyBgPC9zcGFuPjwvaDI+PC9jZW50ZXI+XG4gICAgICAgICAgICBgXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbiAgICBcbiAgICAvKioqKioqKioqKioqKioqKioqIC9JTlZPSUNFIEZVTkNUSU9OUyAqKioqKioqKioqKioqKioqKiovXG5cbiAgICAvKioqKioqKioqKioqKioqKioqIFNISUZUIEZVTkNUSU9OUyAqKioqKioqKioqKioqKioqKiovXG5cbiAgICBwdWJsaWMgc2hpZnRPcHRpb25zKGFyZ3MpIHtcbiAgICAgICAgbGV0IHNoaWZ0O1xuICAgICAgICBpZiAoYXJncy5ldmVudE5hbWUgJiYgYXJncy5ldmVudE5hbWUgPT0gJ2l0ZW1UYXAnKSB7XG4gICAgICAgICAgICBzaGlmdCA9IE15TW9kZWwuYWRkZWRTaGlmdHNNYXBbdGhpcy5zZWN0aW9uZWRTaGlmdHMuZ2V0SXRlbShhcmdzLmluZGV4KS5nZXQoJ2lkJyldXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzaGlmdCA9IE15TW9kZWwuYWRkZWRTaGlmdHNNYXBbYXJncy5vYmplY3QuaWRdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzaGlmdCkge1xuICAgICAgICAgICAgZGlhbG9ncy5hY3Rpb24oc2hpZnQudGl0bGUgKyAnIGZyb20gJyArIHNoaWZ0LmRpc3BsYXlfaG91cnMsIFwiQ2FuY2VsXCIsIFtcIkVkaXQgU2hpZnRcIiwgXCJEZWxldGUgU2hpZnRcIl0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0ID09ICdFZGl0IFNoaWZ0Jykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRpcihKU09OLnN0cmluZ2lmeShzaGlmdC5pbnZvaWNlZCkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2hpZnQuaW52b2ljZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBtc2cgPSAnVGhpcyBzaGlmdCBpcyBpbmNsdWRlZCBpbiBpbnZvaWNlcyBmb3IgdGhlIGZvbGxvd2luZyBmYW1pbGVzOiAnICsgc2hpZnQuaW52b2ljZWRfZmFtaWxpZXNfc3RyaW5nICsgJy4gSWYgeW91IGVkaXQgdGhlIGNvbnRyaWJ1dGlvbnMgZm9yIGEgZmFtaWx5LCB5b3VcXCdsbCBuZWVkIHRvIGRlbGV0ZSB0aGUgaW52b2ljZSB0aGlzIHNoaWZ0IGlzIGFzc29jaWF0ZWQgd2l0aCBhbmQgY3JlYXRlIGEgbmV3IG9uZS4gQWxzbywgbWFrZSBzdXJlIHlvdSByZWFjaCBvdXQgdG8gdGhlIGZhbWlseSBhbmQgaW5mb3JtIHRoZW0gdG8gaWdub3JlIHRoZSBwcmV2aW91cyBpbnZvaWNlLic7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5mYW1pbGllcy5sZW5ndGggPT0gMSkgbXNnID0gJ1RoaXMgc2hpZnQgaXMgaW5jbHVkZWQgaW4gYW4gaW52b2ljZSBhbHJlYWR5LiBJZiB5b3UgZWRpdCB0aGUgaG91cnMgd29ya2VkLCB5b3VcXCdsbCBuZWVkIHRvIGRlbGV0ZSB0aGUgaW52b2ljZSB0aGlzIHNoaWZ0IGlzIGFzc29jaWF0ZWQgd2l0aCBhbmQgY3JlYXRlIGEgbmV3IG9uZS4gQWxzbywgbWFrZSBzdXJlIHlvdSByZWFjaCBvdXQgdG8gdGhlIGZhbWlseSBhbmQgaW5mb3JtIHRoZW0gdG8gaWdub3JlIHRoZSBwcmV2aW91cyBpbnZvaWNlLidcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpYWxvZ3MuY29uZmlybSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IFwiVGhpcyBzaGlmdCBoYXMgYWxyZWFkeSBiZWVuIGludm9pY2VkIVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG1zZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBva0J1dHRvblRleHQ6IFwiT2suXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FuY2VsQnV0dG9uVGV4dDogXCJDYW5jZWxcIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVzdWx0IGFyZ3VtZW50IGlzIGJvb2xlYW5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRpcihyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG93RWRpdFNoaWZ0KGZhbHNlLCBzaGlmdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNob3dFZGl0U2hpZnQoZmFsc2UsIHNoaWZ0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PSAnRGVsZXRlIFNoaWZ0Jykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbXNnID0gJ0FyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgdGhpcyBzaGlmdD8gVGhpcyBjYW5ub3QgYmUgdW5kb25lLic7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzaGlmdC5pbnZvaWNlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXNnID0gJ1RoaXMgc2hpZnQgaXMgaW5jbHVkZWQgaW4gaW52b2ljZXMgZm9yIHRoZSBmb2xsb3dpbmcgZmFtaWxlczogJyArIHNoaWZ0Lmludm9pY2VkX2ZhbWlsaWVzX3N0cmluZyArICcuIERlbGV0aW5nIHRoaXMgc2hpZnQgd2lsbCByZW1vdmUgaXQgZnJvbSB0aGF0IGludm9pY2UsIGJ1dCBub3QgYWRqdXN0IHRoZSBpbnZvaWNlXFwncyB0b3RhbC4gQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSB0aGlzIHNoaWZ0PyBJdCBjYW5ub3QgYmUgdW5kb25lLic7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5mYW1pbGllcy5sZW5ndGggPT0gMSkgbXNnID0gJ1RoaXMgc2hpZnQgaXMgaW5jbHVkZWQgaW4gYW4gaW52b2ljZS4gRGVsZXRpbmcgdGhpcyBzaGlmdCB3aWxsIHJlbW92ZSBpdCBmcm9tIHRoYXQgaW52b2ljZSwgYnV0IG5vdCBhZGp1c3QgdGhlIGludm9pY2VcXCdzIHRvdGFsLiBBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoaXMgc2hpZnQ/IEl0IGNhbm5vdCBiZSB1bmRvbmUuJztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWN0aW9uKG1zZywgXCJDYW5jZWxcIiwgW1wiRG8gaXQuXCJdKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ID09ICdEbyBpdC4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLmRlbGV0ZVNoaWZ0KHNoaWZ0LmlkKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1NoaWZ0cyhKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGludm9pY2VzID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpIGludm9pY2VzID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NJbnZvaWNlcyhpbnZvaWNlcyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIFxuICAgIH1cblxuICAgIHB1YmxpYyBzaG93RWRpdFNoaWZ0KGFyZ3MsIHNoaWZ0KSB7XG4gICAgICAgIC8vIGB0aGlzYCBpcyBub3cgcmVmZXJyaW5nIHRvIHRoZSB0YXBwZWQgc2hpZnQgb2JqZWN0LCBhbmQgbm90IHRoZSBtb2RlbCBhbnltb3JlLCBcbiAgICAgICAgLy8gc28gd2UgaGF2ZSB0byB1c2UgTXlNb2RlbCB3aGljaCBpcyBhIHJlZmVyZW5jZSB0byBIb21lTW9kZWwuXG4gICAgICAgIC8vIGNvbnNvbGUuZGlyKGFyZ3MpO1xuICAgICAgICBpZiAoYXJncykge1xuICAgICAgICAgICAgaWYgKGFyZ3MuZXZlbnROYW1lICYmIGFyZ3MuZXZlbnROYW1lID09ICdpdGVtVGFwJykge1xuICAgICAgICAgICAgICAgIHNoaWZ0ID0gTXlNb2RlbC5hZGRlZFNoaWZ0c01hcFt0aGlzLnNlY3Rpb25lZFNoaWZ0cy5nZXRJdGVtKGFyZ3MuaW5kZXgpLmdldCgnaWQnKV1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYXJncy5vYmplY3QuaWQpIHtcbiAgICAgICAgICAgICAgICBzaGlmdCA9IE15TW9kZWwuYWRkZWRTaGlmdHNNYXBbYXJncy5vYmplY3QuaWRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoIXNoaWZ0KSB7XG4gICAgICAgICAgICBNeU1vZGVsLnNob3dTZXR0aW5ncygnL3ZpZXdzL2NvbXBvbmVudHMvZW5kc2hpZnQvZW5kc2hpZnQueG1sJyk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2V0dGluZ3NUaXRsZScsICdBZGQgU2hpZnQnKTtcbiAgICAgICAgICAgIGVkaXRpbmdTaGlmdCA9IHt9O1xuICAgICAgICAgICAgbGV0IHN0YXJ0VGltZSA9IG1vbWVudCgpLmZvcm1hdCgnWVlZWS1NTS1ERCcpICsgJyAwOTowMDowMCc7XG4gICAgICAgICAgICBsZXQgZW5kVGltZSA9IG1vbWVudCgpLmZvcm1hdCgnWVlZWS1NTS1ERCcpICsgJyAxNzowMDowMCc7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0U3RhcnREYXRlJywgbW9tZW50KCkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKSlcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRTdGFydFRpbWUnLCBtb21lbnQoc3RhcnRUaW1lKS5mb3JtYXQoJ2g6bW1hJykpXG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRTdGFydERhdGUnLCBtb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRTdGFydFRpbWUnLCBtb21lbnQoc3RhcnRUaW1lKS5mb3JtYXQoJ0hIOm1tJykpXG5cbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRFbmREYXRlJywgbW9tZW50KCkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKSlcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRFbmRUaW1lJywgbW9tZW50KGVuZFRpbWUpLmZvcm1hdCgnaDptbWEnKSlcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZEVuZERhdGUnLCBtb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRFbmRUaW1lJywgbW9tZW50KGVuZFRpbWUpLmZvcm1hdCgnSEg6bW0nKSlcbiAgICAgICAgICAgIGVkaXRpbmdTaGlmdC5zdGFydF90aW1lID0gbW9tZW50KHN0YXJ0VGltZSkuZm9ybWF0KCk7XG4gICAgICAgICAgICBlZGl0aW5nU2hpZnQuZW5kX3RpbWUgPSBtb21lbnQoZW5kVGltZSkuZm9ybWF0KCk7XG4gICAgICAgICAgICBsZXQgY29tcGFyZUEgPSBtb21lbnQoZW5kVGltZSk7XG4gICAgICAgICAgICB2YXIgbWludXRlc1dvcmtlZCA9IGNvbXBhcmVBLmRpZmYobW9tZW50KHN0YXJ0VGltZSksICdtaW51dGVzJylcbiAgICAgICAgICAgIHZhciBob3Vyc1dvcmtlZCA9IChtaW51dGVzV29ya2VkLzYwKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgbGV0IG1pbnV0ZVJhdGUgPSBwYXJzZUZsb2F0KE15TW9kZWwudXNlci5ob3VybHlSYXRlKS82MDtcbiAgICAgICAgICAgIGxldCBvdmVydGltZU1pbnV0ZVJhdGUgPSBwYXJzZUZsb2F0KE15TW9kZWwudXNlci5vdmVydGltZVJhdGUpLzYwO1xuXG4gICAgICAgICAgICBsZXQgd29ya2VkID0gc2hpZnRTZXJ2aWNlLmNhbGN1bGF0ZVNoaWZ0SG91cnNXb3JrZWQoZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUsIGVkaXRpbmdTaGlmdC5lbmRfdGltZSk7O1xuICAgICAgICAgICAgTXlNb2RlbC51cGRhdGVUb3RhbEVhcm5lZCgpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0VG90YWxXb3JrZWQnLCB3b3JrZWQudGltZV93b3JrZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWRpdGluZ1NoaWZ0ID0gT2JqZWN0LmFzc2lnbih7fSwgc2hpZnQpO1xuICAgICAgICAgICAgTXlNb2RlbC5zaG93U2V0dGluZ3MoJy92aWV3cy9jb21wb25lbnRzL2VuZHNoaWZ0L2VuZHNoaWZ0LnhtbCcpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NldHRpbmdzVGl0bGUnLCAnRW5kIFNoaWZ0Jyk7XG4gICAgICAgICAgICBpZiAoc2hpZnQuZW5kX3RpbWUpIHtcbiAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnc2V0dGluZ3NUaXRsZScsICdFZGl0IFNoaWZ0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0U3RhcnREYXRlJywgbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnTU1NIERvLCBZWVlZJykpXG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0U3RhcnRUaW1lJywgbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnaDptbWEnKSlcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZFN0YXJ0RGF0ZScsIG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ1lZWVktTU0tREQnKSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRTdGFydFRpbWUnLCBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdISDptbScpKVxuXG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0RW5kRGF0ZScsIG1vbWVudCgpLmZvcm1hdCgnTU1NIERvLCBZWVlZJykpXG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0RW5kVGltZScsIG1vbWVudCgpLmZvcm1hdCgnaDptbWEnKSlcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZEVuZERhdGUnLCBtb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRFbmRUaW1lJywgbW9tZW50KCkuZm9ybWF0KCdISDptbScpKVxuICAgICAgICAgICAgZWRpdGluZ1NoaWZ0LmVuZF90aW1lID0gbW9tZW50KCkuZm9ybWF0KCk7XG4gICAgICAgICAgICBpZiAoc2hpZnQuZW5kX3RpbWUpIHtcbiAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0RW5kRGF0ZScsIG1vbWVudChzaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKSlcbiAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0RW5kVGltZScsIG1vbWVudChzaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdoOm1tYScpKVxuICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZEVuZERhdGUnLCBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnWVlZWS1NTS1ERCcpKTtcbiAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRFbmRUaW1lJywgbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ0hIOm1tJykpXG4gICAgICAgICAgICAgICAgZWRpdGluZ1NoaWZ0LmVuZF90aW1lID0gbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gY29uc29sZS5kaXIoc2hpZnQuY29udHJpYnV0aW9ucyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGNvbXBhcmVBID0gbW9tZW50KCk7XG4gICAgICAgICAgICBpZiAoc2hpZnQuZW5kX3RpbWUpIGNvbXBhcmVBID0gbW9tZW50KHNoaWZ0LmVuZF90aW1lKTtcbiAgICAgICAgICAgIHZhciBtaW51dGVzV29ya2VkID0gY29tcGFyZUEuZGlmZihtb21lbnQoc2hpZnQuc3RhcnRfdGltZSksICdtaW51dGVzJylcbiAgICAgICAgICAgIHZhciBob3Vyc1dvcmtlZCA9IChtaW51dGVzV29ya2VkLzYwKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgbGV0IG1pbnV0ZVJhdGUgPSBwYXJzZUZsb2F0KE15TW9kZWwudXNlci5ob3VybHlSYXRlKS82MDtcbiAgICAgICAgICAgIGxldCBvdmVydGltZU1pbnV0ZVJhdGUgPSBwYXJzZUZsb2F0KE15TW9kZWwudXNlci5vdmVydGltZVJhdGUpLzYwO1xuXG5cbiAgICAgICAgICAgIGxldCB3b3JrZWQgPSBzaGlmdFNlcnZpY2UuY2FsY3VsYXRlU2hpZnRIb3Vyc1dvcmtlZChlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSwgZWRpdGluZ1NoaWZ0LmVuZF90aW1lKTs7XG4gICAgICAgICAgICBNeU1vZGVsLnVwZGF0ZVRvdGFsRWFybmVkKCk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZW5kU2hpZnRUb3RhbFdvcmtlZCcsIHdvcmtlZC50aW1lX3dvcmtlZCk7XG4gICAgICAgIH0gICAgICAgIFxuICAgIH1cblxuICAgIHB1YmxpYyBnZXRQcmV2aW91c1NoaWZ0c1RvdGFsTWludXRlcyhzaGlmdCkge1xuICAgICAgICAvLyB0aGlzIGZ1bmN0aW9uIGdldHMgdGhlIHRvdGFsIG1pbnV0ZXMgd29ya2VkIHVwIHRvIHRoYXQgc2hpZnQgdGhhdCB3ZWVrIHRvIGRldGVybWluZSBpZiBcbiAgICAgICAgLy8gYW55IG92ZXJ0aW1lIHBheSBzaG91bGQgYmUgYXR0cmlidXRlZCB0byB0aGlzIHNoaWZ0LlxuICAgICAgICB2YXIgYmVnaW5uaW5nT2ZXZWVrID0gbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmlzb1dlZWtkYXkoMCkuZm9ybWF0KCdkZGRkIE1NTU0gRG8gWVlZWScpO1xuICAgICAgICBpZiAobW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmlzb1dlZWtkYXkoKSA9PSAwIHx8IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5pc29XZWVrZGF5KCkgPT0gNykgeyAvL2lzIGEgc3VuZGF5LlxuICAgICAgICAgICAgYmVnaW5uaW5nT2ZXZWVrID0gbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnZGRkZCBNTU1NIERvIFlZWVknKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgdG90YWxNaW51dGVzID0gMDtcbiAgICAgICAgbGV0IHJldmVyc2VTaGlmdHMgPSBbXTtcbiAgICAgICAgaWYgKHRoaXMud2Vla3NbYmVnaW5uaW5nT2ZXZWVrXSkgcmV2ZXJzZVNoaWZ0cyA9IHRoaXMud2Vla3NbYmVnaW5uaW5nT2ZXZWVrXS5zaGlmdHMuc2xpY2UoMCkucmV2ZXJzZSgpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgcmV2ZXJzZVNoaWZ0cy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBteVNoaWZ0ID0gcmV2ZXJzZVNoaWZ0c1tpXTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUuZGlyKG15U2hpZnQpO1xuICAgICAgICAgICAgaWYgKG15U2hpZnQuaWQgIT0gc2hpZnQuaWQpIHtcbiAgICAgICAgICAgICAgICB0b3RhbE1pbnV0ZXMgKz0gbXlTaGlmdC5taW51dGVzX3dvcmtlZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ3RvdGFsIG1pbnV0ZXM6ICcgKyB0b3RhbE1pbnV0ZXMpO1xuICAgICAgICByZXR1cm4gdG90YWxNaW51dGVzO1xuICAgIH1cblxuICAgIHB1YmxpYyBkaXNtaXNzU29mdElucHV0cygpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IHRoaXMuZmFtaWxpZXMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgdGV4dEZpZWxkOlRleHRGaWVsZCA9IDxUZXh0RmllbGQ+dGhpcy5wYWdlLmdldFZpZXdCeUlkKCdjb250cmlidXRpb25fJyArIHRoaXMuZmFtaWxpZXMuZ2V0SXRlbShpKS5nZXQoJ2lkJykpO1xuICAgICAgICAgICAgaWYgKHRleHRGaWVsZCAmJiB0ZXh0RmllbGQuZGlzbWlzc1NvZnRJbnB1dCkgdGV4dEZpZWxkLmRpc21pc3NTb2Z0SW5wdXQoKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB1cGRhdGVUb3RhbEVhcm5lZCgpIHtcbiAgICAgICAgbGV0IHdvcmtlZE9iaiA9IHNoaWZ0U2VydmljZS5jYWxjdWxhdGVTaGlmdEhvdXJzV29ya2VkKGVkaXRpbmdTaGlmdC5zdGFydF90aW1lLCBlZGl0aW5nU2hpZnQuZW5kX3RpbWUpO1xuICAgICAgICB0aGlzLnNldCgnZW5kU2hpZnRUb3RhbFdvcmtlZCcsIHdvcmtlZE9iai50aW1lX3dvcmtlZCk7XG4gICAgICAgIGxldCBlYXJuZWQgPSBzaGlmdFNlcnZpY2UuY2FsY3VsYXRlU2hpZnRFYXJuZWQod29ya2VkT2JqLm1pbnV0ZXNfd29ya2VkLCB0aGlzLmdldFByZXZpb3VzU2hpZnRzVG90YWxNaW51dGVzKGVkaXRpbmdTaGlmdCkpO1xuICAgICAgICBNeU1vZGVsLnNldCgnZW5kU2hpZnRUb3RhbEVhcm5lZCcsICckJyArIGVhcm5lZC50b3RhbF9lYXJuZWQpO1xuICAgICAgICBpZiAoZWFybmVkLm92ZXJ0aW1lX2Vhcm5lZCAhPSAwLjAwKSB7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZW5kU2hpZnRPdmVydGltZUVhcm5lZCcsIGVhcm5lZC5vdmVydGltZV9lYXJuZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0T3ZlcnRpbWVFYXJuZWQnLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGZhbWlsaWVzID0gTXlNb2RlbC5nZXQoJ2ZhbWlsaWVzJyk7XG4gICAgICAgIGxldCBuZXdUb3RhbDphbnkgPSAoZWFybmVkLnRvdGFsX2Vhcm5lZC9mYW1pbGllcy5sZW5ndGgpLnRvRml4ZWQoMik7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdlYWNoIGNvbnRyaWJ1dGlvbjogJyArIG5ld1RvdGFsKTtcbiAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0RmluYWxUb3RhbCcsICckJyArIChuZXdUb3RhbCpmYW1pbGllcy5sZW5ndGgpLnRvRml4ZWQoMikpO1xuXG4gICAgICAgIGlmIChmYW1pbGllcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgZmFtaWxpZXMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVkaXRpbmdTaGlmdC5pZCAmJiBlZGl0aW5nU2hpZnQuY29udHJpYnV0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICAvLyB3ZSBhcmUgZWRpdGluZyBhIHNoaWZ0LCBzbyBkb250IHVwZGF0ZSB0aGUgY29udHJpYnV0aW9ucyBhdXRvbWF0aWNhbGx5LiBtYWtlIHRoZSB1c2VyIGRvIGl0LlxuICAgICAgICAgICAgICAgICAgICBpZiAoZWRpdGluZ1NoaWZ0LmNvbnRyaWJ1dGlvbnNbZmFtaWxpZXMuZ2V0SXRlbShpKS5pZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhbWlsaWVzLmdldEl0ZW0oaSkuc2V0KCdjb250cmlidXRpb24nLCBlZGl0aW5nU2hpZnQuY29udHJpYnV0aW9uc1tmYW1pbGllcy5nZXRJdGVtKGkpLmlkXSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmYW1pbGllcy5nZXRJdGVtKGkpLnNldCgnY29udHJpYnV0aW9uJywgJzAuMDAnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZhbWlsaWVzLmdldEl0ZW0oaSkuc2V0KCdjb250cmlidXRpb24nLCBuZXdUb3RhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZhbWlsaWVzLmdldEl0ZW0oaSkub24oT2JzZXJ2YWJsZS5wcm9wZXJ0eUNoYW5nZUV2ZW50LCAoYXJnczogUHJvcGVydHlDaGFuZ2VEYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLnByb3BlcnR5TmFtZSA9PSAnY29udHJpYnV0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZpbmFsVG90YWw6bnVtYmVyID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnZhbGlkTnVtYmVycyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgeCA9IDA7IE15TW9kZWwuZmFtaWxpZXMubGVuZ3RoID4geDsgeCsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFNeU1vZGVsLmZhbWlsaWVzLmdldEl0ZW0oeCkuZ2V0KCdjb250cmlidXRpb24nKSkgTXlNb2RlbC5mYW1pbGllcy5nZXRJdGVtKHgpLnNldCgnY29udHJpYnV0aW9uJywgMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNOYU4oTXlNb2RlbC5mYW1pbGllcy5nZXRJdGVtKHgpLmdldCgnY29udHJpYnV0aW9uJykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludmFsaWROdW1iZXJzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbFRvdGFsICs9IHBhcnNlRmxvYXQoTXlNb2RlbC5mYW1pbGllcy5nZXRJdGVtKHgpLmdldCgnY29udHJpYnV0aW9uJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnZhbGlkTnVtYmVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlbmRTaGlmdEZpbmFsVG90YWwnLCAnRW50ZXIgdmFsaWQgbnVtYmVycy4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0RmluYWxUb3RhbCcsICckJyArIGZpbmFsVG90YWwudG9GaXhlZCgyKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyB0aGVyZXMgb25seSBvbmUgZmFtaWx5LCBzbyBhbHdheXMgdXBkYXRlIHRoZSBjb250cmlidXRpb25zLlxuICAgICAgICAgICAgZmFtaWxpZXMuZ2V0SXRlbSgwKS5zZXQoJ2NvbnRyaWJ1dGlvbicsIG5ld1RvdGFsKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9XG5cbiAgICBwdWJsaWMgY2hhbmdlU2hpZnRFbmRUaW1lKCkge1xuICAgICAgICB0aGlzLmRpc21pc3NTb2Z0SW5wdXRzKCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJIb3VyJywgbW9tZW50KGVkaXRpbmdTaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdIJykpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyTWludXRlJywgbW9tZW50KGVkaXRpbmdTaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdtJykpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyVGl0bGUnLCAnQ2hhbmdlIEVuZCBUaW1lJyk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lVGV4dCcsICdEb25lJyk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNraW5nJywgJ3RpbWUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckNhbmNlbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgIH0pXG4gICAgICAgIHBpY2tlci5hbmltYXRlU2hvdygpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgICAgICBsZXQgaG91ciA9IHRoaXMucGlja2VySG91cjtcbiAgICAgICAgICAgIGlmIChob3VyIDwgMTApIGhvdXIgPSAnMCcgKyB0aGlzLnBpY2tlckhvdXI7XG4gICAgICAgICAgICBsZXQgbWludXRlID0gdGhpcy5waWNrZXJNaW51dGU7XG4gICAgICAgICAgICBpZiAobWludXRlIDwgMTApIG1pbnV0ZSA9ICcwJyArIG1pbnV0ZTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdzZWxlY3RlZEVuZFRpbWUnLCBob3VyICsgJzonICsgbWludXRlKTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRFbmRUaW1lJywgbW9tZW50KHRoaXMuZ2V0KCdzZWxlY3RlZEVuZERhdGUnKSArICcgJyArIHRoaXMuZ2V0KCdzZWxlY3RlZEVuZFRpbWUnKSArICc6MDAnKS5mb3JtYXQoJ2g6bW1hJykpXG4gICAgICAgICAgICBlZGl0aW5nU2hpZnQuZW5kX3RpbWUgPSBtb21lbnQodGhpcy5nZXQoJ3NlbGVjdGVkRW5kRGF0ZScpICsgJyAnICsgdGhpcy5nZXQoJ3NlbGVjdGVkRW5kVGltZScpICsgJzowMCcpLmZvcm1hdCgpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVUb3RhbEVhcm5lZCgpXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGNoYW5nZVNoaWZ0RW5kRGF0ZSgpIHtcbiAgICAgICAgdGhpcy5kaXNtaXNzU29mdElucHV0cygpO1xuICAgICAgICB0aGlzLnNldCgncGlja2luZycsICdkYXRlJyk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldCgnZW5kRGF0ZURheScsIG1vbWVudChlZGl0aW5nU2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnREQnKSk7XG4gICAgICAgIHRoaXMuc2V0KCdlbmREYXRlTW9udGgnLCBtb21lbnQoZWRpdGluZ1NoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ01NJykpO1xuICAgICAgICB0aGlzLnNldCgnZW5kRGF0ZVllYXInLCBtb21lbnQoZWRpdGluZ1NoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ1lZWVknKSk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJUaXRsZScsICdDaGFuZ2UgRW5kIERhdGUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmVUZXh0JywgJ0RvbmUnKTtcbiAgICAgICAgcGlja2VyLmFuaW1hdGVTaG93KCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJDYW5jZWwnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICB9KVxuICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgICAgICBsZXQgZGF5ID0gdGhpcy5lbmREYXRlRGF5OyBcbiAgICAgICAgICAgIGlmIChwYXJzZUludCh0aGlzLmVuZERhdGVEYXkpIDwgMTApIGRheSA9ICcwJyArIHBhcnNlSW50KHRoaXMuZW5kRGF0ZURheSk7XG4gICAgICAgICAgICBsZXQgbW9udGggPSB0aGlzLmVuZERhdGVNb250aDsgXG4gICAgICAgICAgICBpZiAocGFyc2VJbnQodGhpcy5lbmREYXRlTW9udGgpIDwgMTApIG1vbnRoID0gJzAnICsgcGFyc2VJbnQodGhpcy5lbmREYXRlTW9udGgpO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3NlbGVjdGVkRW5kRGF0ZScsIHRoaXMuZW5kRGF0ZVllYXIgKyAnLScgKyBtb250aCArICctJyArIGRheSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0RW5kRGF0ZScsIG1vbWVudCh0aGlzLmdldCgnc2VsZWN0ZWRFbmREYXRlJykpLmZvcm1hdCgnTU1NIERvLCBZWVlZJykpXG4gICAgICAgICAgICBlZGl0aW5nU2hpZnQuZW5kX3RpbWUgPSBtb21lbnQodGhpcy5nZXQoJ3NlbGVjdGVkRW5kRGF0ZScpICsgJyAnICsgdGhpcy5nZXQoJ3NlbGVjdGVkRW5kVGltZScpICsgJzowMCcpLmZvcm1hdCgpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVUb3RhbEVhcm5lZCgpXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGNoYW5nZVNoaWZ0U3RhcnRUaW1lKCkge1xuICAgICAgICB0aGlzLmRpc21pc3NTb2Z0SW5wdXRzKCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJIb3VyJywgbW9tZW50KGVkaXRpbmdTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ0gnKSk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJNaW51dGUnLCBtb21lbnQoZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnbScpKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlclRpdGxlJywgJ0NoYW5nZSBTdGFydCBUaW1lJyk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNraW5nJywgJ3RpbWUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmVUZXh0JywgJ0RvbmUnKTtcbiAgICAgICAgcGlja2VyLmFuaW1hdGVTaG93KCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJDYW5jZWwnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICB9KVxuICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgICAgICBsZXQgaG91ciA9IHRoaXMucGlja2VySG91cjtcbiAgICAgICAgICAgIGlmIChob3VyIDwgMTApIGhvdXIgPSAnMCcgKyB0aGlzLnBpY2tlckhvdXI7XG4gICAgICAgICAgICBsZXQgbWludXRlID0gdGhpcy5waWNrZXJNaW51dGU7XG4gICAgICAgICAgICBpZiAobWludXRlIDwgMTApIG1pbnV0ZSA9ICcwJyArIG1pbnV0ZTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdzZWxlY3RlZFN0YXJ0VGltZScsIGhvdXIgKyAnOicgKyBtaW51dGUpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdFN0YXJ0VGltZScsIG1vbWVudCh0aGlzLmdldCgnc2VsZWN0ZWRTdGFydERhdGUnKSArICcgJyArIHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0VGltZScpICsgJzowMCcpLmZvcm1hdCgnaDptbWEnKSlcbiAgICAgICAgICAgIGVkaXRpbmdTaGlmdC5zdGFydF90aW1lID0gbW9tZW50KHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0RGF0ZScpICsgJyAnICsgdGhpcy5nZXQoJ3NlbGVjdGVkU3RhcnRUaW1lJykgKyAnOjAwJykuZm9ybWF0KCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVRvdGFsRWFybmVkKClcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgY2hhbmdlU2hpZnRTdGFydERhdGUoKSB7XG4gICAgICAgIHRoaXMuZGlzbWlzc1NvZnRJbnB1dHMoKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tpbmcnLCAnZGF0ZScpO1xuICAgICAgICB0aGlzLnNldCgnZW5kRGF0ZURheScsIG1vbWVudChlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdERCcpKTtcbiAgICAgICAgdGhpcy5zZXQoJ2VuZERhdGVNb250aCcsIG1vbWVudChlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdNTScpKTtcbiAgICAgICAgdGhpcy5zZXQoJ2VuZERhdGVZZWFyJywgbW9tZW50KGVkaXRpbmdTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ1lZWVknKSk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJUaXRsZScsICdDaGFuZ2UgU3RhcnQgRGF0ZScpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZVRleHQnLCAnRG9uZScpO1xuICAgICAgICBwaWNrZXIuYW5pbWF0ZVNob3coKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckNhbmNlbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgIH0pXG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgICAgIGxldCBkYXkgPSB0aGlzLmVuZERhdGVEYXk7IFxuICAgICAgICAgICAgaWYgKHBhcnNlSW50KHRoaXMuZW5kRGF0ZURheSkgPCAxMCkgZGF5ID0gJzAnICsgcGFyc2VJbnQodGhpcy5lbmREYXRlRGF5KTtcbiAgICAgICAgICAgIGxldCBtb250aCA9IHRoaXMuZW5kRGF0ZU1vbnRoOyBcbiAgICAgICAgICAgIGlmIChwYXJzZUludCh0aGlzLmVuZERhdGVNb250aCkgPCAxMCkgbW9udGggPSAnMCcgKyBwYXJzZUludCh0aGlzLmVuZERhdGVNb250aCk7XG4gICAgICAgICAgICB0aGlzLnNldCgnc2VsZWN0ZWRTdGFydERhdGUnLCB0aGlzLmVuZERhdGVZZWFyICsgJy0nICsgbW9udGggKyAnLScgKyBkYXkpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdFN0YXJ0RGF0ZScsIG1vbWVudCh0aGlzLmdldCgnc2VsZWN0ZWRTdGFydERhdGUnKSkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKSlcbiAgICAgICAgICAgIGVkaXRpbmdTaGlmdC5zdGFydF90aW1lID0gbW9tZW50KHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0RGF0ZScpICsgJyAnICsgdGhpcy5nZXQoJ3NlbGVjdGVkU3RhcnRUaW1lJykgKyAnOjAwJykuZm9ybWF0KCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVRvdGFsRWFybmVkKClcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgc2F2ZVNoaWZ0KCkge1xuICAgICAgICB0aGlzLmRpc21pc3NTb2Z0SW5wdXRzKCk7XG4gICAgICAgIGxldCBlbmRfdGltZSA9IHRoaXMuZ2V0KCdzZWxlY3RlZEVuZERhdGUnKSArICcgJyArIHRoaXMuZ2V0KCdzZWxlY3RlZEVuZFRpbWUnKSArICc6MDAnO1xuICAgICAgICBsZXQgc3RhcnRfdGltZSA9IHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0RGF0ZScpICsgJyAnICsgdGhpcy5nZXQoJ3NlbGVjdGVkU3RhcnRUaW1lJykgKyAnOjAwJztcbiAgICAgICAgbGV0IGFyZ3M6YW55ID0ge307XG4gICAgICAgIGFyZ3MuZW5kX3RpbWUgPSBtb21lbnQoZW5kX3RpbWUpLmZvcm1hdCgpO1xuICAgICAgICBhcmdzLnN0YXJ0X3RpbWUgPSBtb21lbnQoc3RhcnRfdGltZSkuZm9ybWF0KCk7XG4gICAgICAgIGFyZ3MuY29udHJpYnV0aW9ucyA9IHt9O1xuICAgICAgICBsZXQgY29udHJpYnV0aW9uczphbnkgPSB7fTtcbiAgICAgICAgbGV0IGZhbWlsaWVzID0gdGhpcy5nZXQoJ2ZhbWlsaWVzJyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBmYW1pbGllcy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnRyaWJ1dGlvbnNbZmFtaWxpZXMuZ2V0SXRlbShpKS5nZXQoJ2lkJyldID0gZmFtaWxpZXMuZ2V0SXRlbShpKS5nZXQoJ2NvbnRyaWJ1dGlvbicpO1xuICAgICAgICB9XG4gICAgICAgIGFyZ3MuY29udHJpYnV0aW9ucyA9IGNvbnRyaWJ1dGlvbnM7XG4gICAgICAgIGlmIChlZGl0aW5nU2hpZnQuaWQpIHtcbiAgICAgICAgICAgIHNoaWZ0U2VydmljZS51cGRhdGVTaGlmdChlZGl0aW5nU2hpZnQuaWQsIGFyZ3MpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTaGlmdHMoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKSk7XG4gICAgICAgICAgICAgICAgbGV0IGludm9pY2VzID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkgaW52b2ljZXMgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoaW52b2ljZXMpO1xuICAgICAgICAgICAgICAgIGlmIChlZGl0aW5nU2hpZnQuaWQgPT0gTXlNb2RlbC5nZXQoJ2Nsb2NrZWRJbicpLmlkICYmIGFyZ3MuZW5kX3RpbWUpIE15TW9kZWwuc2V0KCdjbG9ja2VkSW4nLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzaGlmdFNlcnZpY2UuYWRkU2hpZnQoYXJncykudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1NoaWZ0cyhKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpKTtcbiAgICAgICAgICAgICAgICBsZXQgaW52b2ljZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKSBpbnZvaWNlcyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NJbnZvaWNlcyhpbnZvaWNlcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfVxuXG4gICAgcHVibGljIHNob3dTdGFydFNoaWZ0KCkge1xuICAgICAgICB0aGlzLnNldCgncGlja2VySG91cicsIG1vbWVudCgpLmZvcm1hdCgnSCcpKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlck1pbnV0ZScsIG1vbWVudCgpLmZvcm1hdCgnbScpKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlclRpdGxlJywgJ1NldCBTdGFydCBUaW1lJyk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lVGV4dCcsICdTdGFydCcpO1xuICAgICAgICB0aGlzLnNldCgncGlja2luZycsICd0aW1lJyk7XG4gICAgICAgIHBpY2tlci5hbmltYXRlU2hvdygpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyQ2FuY2VsJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgfSlcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICAgICAgbGV0IGhvdXIgPSB0aGlzLnBpY2tlckhvdXI7XG4gICAgICAgICAgICBpZiAoaG91ciA8IDEwKSBob3VyID0gJzAnICsgdGhpcy5waWNrZXJIb3VyO1xuICAgICAgICAgICAgbGV0IG1pbnV0ZSA9IHRoaXMucGlja2VyTWludXRlO1xuICAgICAgICAgICAgaWYgKG1pbnV0ZSA8IDEwKSBtaW51dGUgPSAnMCcgKyBtaW51dGU7XG4gICAgICAgICAgICBsZXQgYXJnczphbnkgPSB7XG4gICAgICAgICAgICAgICAgc3RhcnRfdGltZTogbW9tZW50KG1vbWVudCgpLmZvcm1hdCgnWVlZWS1NTS1ERCcpICsgJyAnICsgaG91ciArICc6JyArIG1pbnV0ZSArICc6MDAnKS5mb3JtYXQoKSxcbiAgICAgICAgICAgICAgICBlbmRfdGltZTogbnVsbCxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNoaWZ0U2VydmljZS5zdGFydFNoaWZ0KGFyZ3MpLnRoZW4oKHN0YXJ0ZWRTaGlmdDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgLy90aGlzLnNoaWZ0cy51bnNoaWZ0KG9ic2VydmFibGVGcm9tT2JqZWN0KHN0YXJ0ZWRTaGlmdCkpO1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1NoaWZ0cyhKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnY2xvY2tlZEluJywgYXJncyk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbiAgICBcbiAgICAvKioqKioqKioqKioqKioqKioqIC9TSElGVCBGVU5DVElPTlMgKioqKioqKioqKioqKioqKioqL1xuXG4gICAgcHVibGljIG9uU2VsZWN0ZWRJbmRleENoYW5nZWQoYXJnczogU2VsZWN0ZWRJbmRleENoYW5nZWRFdmVudERhdGEpIHtcbiAgICAgICAgaWYgKGFyZ3MubmV3SW5kZXggPT0gMCkge1xuICAgICAgICAgICAgdGhpcy5nZXRUaGlzV2Vla1NoaWZ0cygpO1xuICAgICAgICB9IGVsc2UgaWYgKGFyZ3MubmV3SW5kZXggPSAxKSB7XG4gICAgICAgICAgICBhbGVydCgnbWF5YmUgcHJvY2VzcyBzaGlmdHMgYWdhaW4/JylcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBraWxsKCkge1xuICAgICAgICBhcHBTZXR0aW5ncy5yZW1vdmUoJ3VzZXJEYXRhJyk7XG4gICAgICAgIGFwcFNldHRpbmdzLnJlbW92ZSgndWlkJyk7XG4gICAgICAgIGFwcFNldHRpbmdzLnJlbW92ZSgnaW52b2ljZXMnKTtcbiAgICAgICAgYXBwU2V0dGluZ3MucmVtb3ZlKCdzaGlmdHMnKTtcbiAgICAgICAgbGV0IG5hdmlnYXRpb25FbnRyeSA9IHtcbiAgICAgICAgICAgIG1vZHVsZU5hbWU6IFwiL3ZpZXdzL2xvZ2luL2xvZ2luXCIsXG4gICAgICAgICAgICBhbmltYXRlZDogZmFsc2UsXG4gICAgICAgIH07XG4gICAgICAgIGZyYW1lLnRvcG1vc3QoKS5uYXZpZ2F0ZShuYXZpZ2F0aW9uRW50cnkpO1xuICAgIH1cblxuICAgIHB1YmxpYyBzZXR0aW5nc1Njcm9sbChhcmdzOiBTY3JvbGxFdmVudERhdGEpIHtcblxuICAgIH1cblxuICAgIHByaXZhdGUgc2hvd1NldHRpbmdzKHZpZXdQYXRoKSB7XG4gICAgICAgIGxldCBtYWluZ3JpZDogR3JpZExheW91dCA9IHRoaXMucGFnZS5nZXRWaWV3QnlJZCgnbWFpbmdyaWQnKTtcbiAgICAgICAgbWFpbmdyaWQuYW5pbWF0ZSg8QW5pbWF0aW9uRGVmaW5pdGlvbj57XG4gICAgICAgICAgICBzY2FsZToge3g6IC45MiAgLCB5OiAuOTJ9LFxuICAgICAgICAgICAgZHVyYXRpb246IDMwMCxcbiAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5jdWJpY0JlemllcigwLjEsIDAuMSwgMC4xLCAxKVxuICAgICAgICB9KVxuICAgICAgICBzZXR0aW5nc0NvbnRhaW5lciA9IDxTdGFja0xheW91dD50aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ3NldHRpbmdzX2NvbnRhaW5lcicpO1xuICAgICAgICBzZXR0aW5nc092ZXJsYXlDb250YWluZXIgPSB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ3NldHRpbmdzX292ZXJsYXlfY29udGFpbmVyJylcbiAgICAgICAgZGlzbWlzc05vdGUgPSB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ2Rpc21pc3Nfbm90ZScpO1xuICAgICAgICB0aGlzLnNldCgnc2V0dGluZ3NTaG93bicsIHRydWUpO1xuICAgICAgICBsZXQgZGV2aWNlSGVpZ2h0ID0gc2NyZWVuLm1haW5TY3JlZW4uaGVpZ2h0RElQcztcbiAgICAgICAgc2V0dGluZ3NDb250YWluZXIudHJhbnNsYXRlWSA9IGRldmljZUhlaWdodCArIDMwO1xuICAgICAgICBzZXR0aW5nc0NvbnRhaW5lci5hbmltYXRlKDxBbmltYXRpb25EZWZpbml0aW9uPntcbiAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6IDAsIHk6IDB9LFxuICAgICAgICAgICAgZHVyYXRpb246IDMwMCxcbiAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5jdWJpY0JlemllcigwLjEsIDAuMSwgMC4xLCAxKVxuICAgICAgICB9KVxuICAgICAgICBzZXR0aW5nc092ZXJsYXlDb250YWluZXIub3BhY2l0eSA9IDA7XG4gICAgICAgIHNldHRpbmdzT3ZlcmxheUNvbnRhaW5lci5hbmltYXRlKHtcbiAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICBkdXJhdGlvbjogMTAwXG4gICAgICAgIH0pXG4gICAgICAgIHZhciBjb250YWluZXI6IFN0YWNrTGF5b3V0ID0gPFN0YWNrTGF5b3V0PnRoaXMucGFnZS5nZXRWaWV3QnlJZCgnc2V0dGluZ3NfdmlldycpO1xuICAgICAgICBjb250YWluZXIucmVtb3ZlQ2hpbGRyZW4oKTtcbiAgICAgICAgbGV0IHBhdGggPSBmcy5rbm93bkZvbGRlcnMuY3VycmVudEFwcCgpLnBhdGg7XG4gICAgICAgIGxldCBjb21wb25lbnQgPSBidWlsZGVyLmxvYWQocGF0aCArIHZpZXdQYXRoKTtcbiAgICAgICAgY29udGFpbmVyLmFkZENoaWxkKGNvbXBvbmVudCk7XG4gICAgICAgIGxldCBjb250YWluZXJCb3VuZHMgPSBzZXR0aW5nc0NvbnRhaW5lci5pb3MuYm91bmRzO1xuICAgICAgICBsZXQgaW9zU2V0dGluZ3NDb250YWluZXI6IFVJVmlldyA9IHNldHRpbmdzQ29udGFpbmVyLmlvcztcbiAgICAgICAgaWYgKGJsdXJWaWV3ICYmIGJsdXJWaWV3LnJlbW92ZUZyb21TdXBlcnZpZXcpIGJsdXJWaWV3LnJlbW92ZUZyb21TdXBlcnZpZXcoKTtcbiAgICAgICAgYmx1clZpZXcgPSBVSVZpc3VhbEVmZmVjdFZpZXcuYWxsb2MoKS5pbml0V2l0aEVmZmVjdChVSUJsdXJFZmZlY3QuZWZmZWN0V2l0aFN0eWxlKFVJQmx1ckVmZmVjdFN0eWxlTGlnaHQpKTtcbiAgICAgICAgYmx1clZpZXcuZnJhbWUgPSB7XG4gICAgICAgICAgICBvcmlnaW46IHsgeDogY29udGFpbmVyQm91bmRzLm9yaWdpbi54LCB5OiBjb250YWluZXJCb3VuZHMub3JpZ2luLnkgLSAyMCB9LFxuICAgICAgICAgICAgc2l6ZTogeyB3aWR0aDogY29udGFpbmVyQm91bmRzLnNpemUud2lkdGgsIGhlaWdodDogY29udGFpbmVyQm91bmRzLnNpemUuaGVpZ2h0ICsgMjAgfVxuICAgICAgICB9O1xuICAgICAgICBibHVyVmlldy5hdXRvcmVzaXppbmdNYXNrID0gVUlWaWV3QXV0b3Jlc2l6aW5nRmxleGlibGVXaWR0aCB8IFVJVmlld0F1dG9yZXNpemluZ0ZsZXhpYmxlSGVpZ2h0O1xuICAgICAgICBpb3NTZXR0aW5nc0NvbnRhaW5lci5hZGRTdWJ2aWV3KGJsdXJWaWV3KVxuICAgICAgICBpb3NTZXR0aW5nc0NvbnRhaW5lci5zZW5kU3Vidmlld1RvQmFjayhibHVyVmlldyk7XG4gICAgICAgIGxldCBidXp6ID0gVUlTZWxlY3Rpb25GZWVkYmFja0dlbmVyYXRvci5uZXcoKTtcbiAgICAgICAgbGV0IHBhbm5lciA9IHRoaXMucGFnZS5nZXRWaWV3QnlJZCgnc2V0dGluZ3NfY29udGFpbmVyJyk7XG4gICAgICAgIGxldCBzY3JvbGxlcjpTY3JvbGxWaWV3ID0gPFNjcm9sbFZpZXc+dGhpcy5wYWdlLmdldFZpZXdCeUlkKCdzZXR0aW5nc19zY3JvbGxlcicpO1xuICAgICAgICBpZiAoc2Nyb2xsZXIpIHtcbiAgICAgICAgICAgIGxldCByZWFkeVRvRHJvcCA9IGZhbHNlO1xuICAgICAgICAgICAgcGFubmVyLm9mZigncGFuJyk7XG4gICAgICAgICAgICBwYW5uZXIub24oJ3BhbicsIChhcmdzOlBhbkdlc3R1cmVFdmVudERhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5zdGF0ZSA9PSAzICYmIHJlYWR5VG9Ecm9wKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGlkZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzY3JvbGxlci5vbignc2Nyb2xsJywgKHNjcm9sbEFyZ3M6U2Nyb2xsRXZlbnREYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHNjcm9sbEFyZ3Muc2Nyb2xsWSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3NDb250YWluZXIudHJhbnNsYXRlWSA9IHNjcm9sbEFyZ3Muc2Nyb2xsWSotMS44O1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsQXJncy5zY3JvbGxZKi0xLjggPiAxNTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWR5VG9Ecm9wID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkaXNtaXNzTm90ZS5vcGFjaXR5ID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidXp6LnNlbGVjdGlvbkNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNtaXNzTm90ZS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDI1MFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkeVRvRHJvcCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRpc21pc3NOb3RlLm9wYWNpdHkgPT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc21pc3NOb3RlLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogMjUwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBhbm5lci5vZmYoJ3BhbicpO1xuICAgICAgICAgICAgcGFubmVyLm9uKCdwYW4nLCAoYXJnczpQYW5HZXN0dXJlRXZlbnREYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3NDb250YWluZXIudHJhbnNsYXRlWSA9IGFyZ3MuZGVsdGFZO1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLmRlbHRhWSA+IDE1MCkge1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpc21pc3NOb3RlLm9wYWNpdHkgPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnV6ei5zZWxlY3Rpb25DaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNtaXNzTm90ZS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAyNTBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlzbWlzc05vdGUub3BhY2l0eSA9PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNtaXNzTm90ZS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAyNTBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3Muc3RhdGUgPT0gMykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5kZWx0YVkgPiAxNTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGlkZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5nc0NvbnRhaW5lci5hbmltYXRlKDxBbmltYXRpb25EZWZpbml0aW9uPntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2xhdGU6IHt4OiAwLCB5OiAwfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogMjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5jdWJpY0JlemllcigwLjEsIDAuMSwgMC4xLCAxKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgaGlkZVNldHRpbmdzKCkge1xuICAgICAgICB0aGlzLmRpc21pc3NTb2Z0SW5wdXRzKCk7XG4gICAgICAgIGVkaXRpbmdTaGlmdCA9IGZhbHNlO1xuICAgICAgICBsZXQgbWFpbmdyaWQ6IEdyaWRMYXlvdXQgPSB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ21haW5ncmlkJyk7XG4gICAgICAgIG1haW5ncmlkLmFuaW1hdGUoPEFuaW1hdGlvbkRlZmluaXRpb24+e1xuICAgICAgICAgICAgc2NhbGU6IHt4OiAxLCB5OiAxfSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuY3ViaWNCZXppZXIoMC4xLCAwLjEsIDAuMSwgMSlcbiAgICAgICAgfSlcbiAgICAgICAgbGV0IGRldmljZUhlaWdodCA9IHNjcmVlbi5tYWluU2NyZWVuLmhlaWdodERJUHM7XG4gICAgICAgIHNldHRpbmdzQ29udGFpbmVyLmFuaW1hdGUoPEFuaW1hdGlvbkRlZmluaXRpb24+e1xuICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDogMCwgeTogZGV2aWNlSGVpZ2h0IC0gMzB9LFxuICAgICAgICAgICAgZHVyYXRpb246IDMwMCxcbiAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5jdWJpY0JlemllcigwLjEsIDAuMSwgMC4xLCAxKVxuICAgICAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdzZXR0aW5nc1Nob3duJywgZmFsc2UpO1xuICAgICAgICB9KVxuICAgICAgICBzZXR0aW5nc092ZXJsYXlDb250YWluZXIuYW5pbWF0ZSh7XG4gICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgZHVyYXRpb246IDMwMFxuICAgICAgICB9KVxuICAgIH0gXG5cbiAgICBwdWJsaWMgcmVtb3ZlU2VjdGlvbmVkU2hpZnQoYXJncykge1xuICAgICAgICBjb25zb2xlLmRpcihhcmdzKTtcbiAgICAgICAgLy90aGlzLnNlY3Rpb25lZFNoaWZ0cy5nZXRJdGVtKGFyZ3MuaW5kZXgpO1xuICAgICAgICB0aGlzLnNlY3Rpb25lZFNoaWZ0cy5zcGxpY2UoYXJncy5pbmRleCwgMSk7XG4gICAgfVxuXG4gICAgcHVibGljIHByb2Nlc3NTaGlmdHMoc2hpZnRzKSB7XG4gICAgICAgIGxldCBzaGlmdHNBcnJheSA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpIGluIHNoaWZ0cykge1xuICAgICAgICAgICAgbGV0IG15U2hpZnQgPSBzaGlmdFNlcnZpY2UuYnVpbGRTaGlmdERhdGEoc2hpZnRzW2ldKTtcbiAgICAgICAgICAgIG15U2hpZnQuaWQgPSBpO1xuICAgICAgICAgICAgaWYgKCFteVNoaWZ0LmVuZF90aW1lKSB0aGlzLnNldCgnY2xvY2tlZEluJywgc2hpZnRzW2ldKTtcbiAgICAgICAgICAgIHNoaWZ0c0FycmF5LnB1c2gobXlTaGlmdCk7XG4gICAgICAgIH1cblxuICAgICAgICBzaGlmdHNBcnJheS5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICBpZiAobW9tZW50KGEuc3RhcnRfdGltZSkgPCBtb21lbnQoYi5zdGFydF90aW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtb21lbnQoYS5zdGFydF90aW1lKSA+IG1vbWVudChiLnN0YXJ0X3RpbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGxldCB3ZWVrcyA9IHt9O1xuICAgICAgICB0aGlzLnNldCgnYWRkZWRTaGlmdHNNYXAnLCB7fSk7XG5cbiAgICAgICAgd2hpbGUgKHRoaXMudGhpc1dlZWsubGVuZ3RoKSB0aGlzLnRoaXNXZWVrLnBvcCgpO1xuICAgICAgICAvLyBjYWxjdWxhdGUgaG91cnMgd29ya2VkIGFuZCBtb25leSBlYXJuZWQuXG4gICAgICAgIGxldCB0aGlzV2Vla01pbnV0ZXNXb3JrZWQgPSAwO1xuICAgICAgICBmb3IgKHZhciBzID0gMDsgc2hpZnRzQXJyYXkubGVuZ3RoID4gczsgcysrKSB7XG4gICAgICAgICAgICAvLyBhZGQgdGhlIHNoaWZ0IGlmIGl0IGhhc250IGJlZW4gYWRkZWQgYWxyZWFkeSBhbmQgaWYgaXQgaXMgaW4gdGhlIGN1cnJlbnQgd2Vlay4gT1IgaWYgdGhlIHNoaWZ0IGhhcyBub3QgYmVlbiBlbmRlZC5cbiAgICAgICAgICAgIGlmICghdGhpcy5hZGRlZFNoaWZ0c01hcFtzaGlmdHNBcnJheVtzXS5pZF0pIHtcbiAgICAgICAgICAgICAgICBsZXQgc2hpZnQgPSBvYnNlcnZhYmxlRnJvbU9iamVjdChzaGlmdHNBcnJheVtzXSk7XG4gICAgICAgICAgICAgICAgdGhpcy5zaGlmdHMucHVzaChzaGlmdClcbiAgICAgICAgICAgICAgICBpZiAoc2hpZnRzQXJyYXlbc10uZW5kX3RpbWUgJiYgbW9tZW50KHNoaWZ0c0FycmF5W3NdLnN0YXJ0X3RpbWUpID4gbW9tZW50KCkuc3RhcnRPZignd2VlaycpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGhpc1dlZWsucHVzaChzaGlmdClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgc2hpZnQgdGhhdHMgc3RpbGwgcnVubmluZyBzbyB0aGUgdGltZXMgYW5kIHRoZSBtb25leSBlYXJuZWQgdXBkYXRlc1xuICAgICAgICAgICAgLy8gb3IgdXBkYXRlIGEgc2hpZnQgdGhhdCB3YXMgcmVjZW50bHkgdXBkYXRlZC5cbiAgICAgICAgICAgIGlmICghc2hpZnRzQXJyYXlbc10uZW5kX3RpbWUgfHwgc2hpZnRzQXJyYXlbc10ucmVjZW50bHlVcGRhdGVkKSB7XG4gICAgICAgICAgICAgICAgbGV0IHVwZGF0ZUluZGV4O1xuICAgICAgICAgICAgICAgIHRoaXMuc2hpZnRzLmZvckVhY2goKGVsZW1lbnQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnaWQnKSA9PSBzaGlmdHNBcnJheVtzXS5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlSW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuc2hpZnRzLnNldEl0ZW0odXBkYXRlSW5kZXgsIG9ic2VydmFibGVGcm9tT2JqZWN0KHNoaWZ0c0FycmF5W3NdKSk7XG5cbiAgICAgICAgICAgICAgICAvLyB1cGRhdGUgdGhlIGVudGl0eSBpbiB0aGUgdGhpc1dlZWsgb2JzZXJ2YWJsZS5cbiAgICAgICAgICAgICAgICBsZXQgdGhpc1dlZWtVcGRhdGVJbmRleDtcbiAgICAgICAgICAgICAgICB0aGlzLnRoaXNXZWVrLmZvckVhY2goKGVsZW1lbnQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnaWQnKSA9PSBzaGlmdHNBcnJheVtzXS5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1dlZWtVcGRhdGVJbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy50aGlzV2Vlay5zZXRJdGVtKHRoaXNXZWVrVXBkYXRlSW5kZXgsIG9ic2VydmFibGVGcm9tT2JqZWN0KHNoaWZ0c0FycmF5W3NdKSk7XG4gICAgICAgICAgICAgICAgc2hpZnRzQXJyYXlbc10ucmVjZW50bHlVcGRhdGVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuYWRkZWRTaGlmdHNNYXBbc2hpZnRzQXJyYXlbc10uaWRdID0gc2hpZnRzQXJyYXlbc107XG4gICAgICAgICAgICBpZiAoIXNoaWZ0c0FycmF5W3NdLmVuZF90aW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbXBhcmVBID0gbW9tZW50KCk7XG4gICAgICAgICAgICAgICAgdmFyIG1pbnV0ZXNXb3JrZWQgPSBjb21wYXJlQS5kaWZmKG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKSwgJ21pbnV0ZXMnKVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRoaXNXZWVrLmxlbmd0aCAmJiB0aGlzLnRoaXNXZWVrLmdldEl0ZW0oMCkuZ2V0KCdpZCcpID09IHNoaWZ0c0FycmF5W3NdLmlkKSB0aGlzLnRoaXNXZWVrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy50aGlzV2Vlay51bnNoaWZ0KG9ic2VydmFibGVGcm9tT2JqZWN0KHNoaWZ0c0FycmF5W3NdKSkgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vc2V0IHVwIHdlZWsgZGF0YS5cbiAgICAgICAgICAgIC8vIHZhciBiZWdpbm5pbmdPZldlZWtNb21lbnQgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuaXNvV2Vla2RheSgwKTtcbiAgICAgICAgICAgIC8vIHZhciBiZWdpbm5pbmdPZldlZWsgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuaXNvV2Vla2RheSgwKS5mb3JtYXQoJ2RkZGQgTU1NTSBEbyBZWVlZJyk7XG5cbiAgICAgICAgICAgIHZhciBiZWdpbm5pbmdPZldlZWtNb21lbnQgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuaXNvV2Vla2RheSgwKTtcbiAgICAgICAgICAgIHZhciBiZWdpbm5pbmdPZldlZWsgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuaXNvV2Vla2RheSgwKS5mb3JtYXQoJ2RkZGQgTU1NTSBEbyBZWVlZJyk7XG4gICAgICAgICAgICBpZiAobW9tZW50KHNoaWZ0c0FycmF5W3NdLnN0YXJ0X3RpbWUpLmlzb1dlZWtkYXkoKSA9PSAwIHx8IG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKS5pc29XZWVrZGF5KCkgPT0gNykge1xuICAgICAgICAgICAgICAgIGJlZ2lubmluZ09mV2Vla01vbWVudCA9IG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKTtcbiAgICAgICAgICAgICAgICBiZWdpbm5pbmdPZldlZWsgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuZm9ybWF0KCdkZGRkIE1NTU0gRG8gWVlZWScpO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCF3ZWVrc1tiZWdpbm5pbmdPZldlZWtdKSB7XG4gICAgICAgICAgICAgICAgd2Vla3NbYmVnaW5uaW5nT2ZXZWVrXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgdG90YWxfbWludXRlczogMCxcbiAgICAgICAgICAgICAgICAgICAgcmVndWxhcl9taW51dGVzOiAwLFxuICAgICAgICAgICAgICAgICAgICBvdmVydGltZV9taW51dGVzOiAwLFxuICAgICAgICAgICAgICAgICAgICBob3Vyc193b3JrZWQ6IDAsXG4gICAgICAgICAgICAgICAgICAgIHJlZ3VsYXJfZWFybmVkOiAwLFxuICAgICAgICAgICAgICAgICAgICBvdmVydGltZV9lYXJuZWQ6IDAsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBiZWdpbm5pbmdPZldlZWtNb21lbnQuZm9ybWF0KCdbV2VlayBvZl0gTU1NIERvJyksXG4gICAgICAgICAgICAgICAgICAgIHdlZWtfc3RhcnQ6IGJlZ2lubmluZ09mV2Vla01vbWVudC5mb3JtYXQoJ1lZWVktTU0tREQnKSxcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRzOiBbXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgY29tcGFyZUEgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIGlmIChzaGlmdHNBcnJheVtzXS5lbmRfdGltZSkgY29tcGFyZUEgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uZW5kX3RpbWUpO1xuICAgICAgICAgICAgdmFyIG1pbnV0ZXNXb3JrZWQgPSBjb21wYXJlQS5kaWZmKG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKSwgJ21pbnV0ZXMnKVxuICAgICAgICAgICAgd2Vla3NbYmVnaW5uaW5nT2ZXZWVrXS50b3RhbF9taW51dGVzICs9IG1pbnV0ZXNXb3JrZWQ7XG4gICAgICAgICAgICB2YXIgc2hpZnQgPSBzaGlmdFNlcnZpY2UuYnVpbGRTaGlmdERhdGEoc2hpZnRzQXJyYXlbc10pO1xuICAgICAgICAgICAgd2Vla3NbYmVnaW5uaW5nT2ZXZWVrXS5zaGlmdHMucHVzaChzaGlmdCk7XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAodGhpcy5zZWN0aW9uZWRTaGlmdHMubGVuZ3RoKSB0aGlzLnNlY3Rpb25lZFNoaWZ0cy5wb3AoKTtcblxuICAgICAgICBmb3IgKHZhciB3IGluIHdlZWtzKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpdyA9IDA7IHdlZWtzW3ddLnNoaWZ0cy5sZW5ndGggPiBpdzsgaXcrKykge1xuICAgICAgICAgICAgICAgIHZhciBteVNoaWZ0ID0gd2Vla3Nbd10uc2hpZnRzW2l3XVxuICAgICAgICAgICAgICAgIGlmIChpdyA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQubWludXRlc19hY2NydWVkID0gbXlTaGlmdC5taW51dGVzX3dvcmtlZDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0Lm1pbnV0ZXNfYWNjcnVlZCA9IG15U2hpZnQubWludXRlc193b3JrZWQgKyB3ZWVrc1t3XS5zaGlmdHNbaXctMV0ubWludXRlc19hY2NydWVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobXlTaGlmdC5taW51dGVzX2FjY3J1ZWQgPiAyNDAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgc2hpZnQgaGFzIG92ZXJ0aW1lIG1pbnV0ZXMuXG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQub3ZlcnRpbWVfbWludXRlcyA9IG15U2hpZnQubWludXRlc19hY2NydWVkIC0gMjQwMDtcblxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIGxpbmUgd2lsbCBlbnN1cmUgdGhhdCB5b3UgYXJlbnQgZXhwb25lbnRpYWxseSBhY2NydWluZyBvdmVydGltZSBtaW51dGVzLlxuICAgICAgICAgICAgICAgICAgICBpZiAobXlTaGlmdC5vdmVydGltZV9taW51dGVzID4gbXlTaGlmdC5taW51dGVzX3dvcmtlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5vdmVydGltZV9taW51dGVzID0gbXlTaGlmdC5taW51dGVzX3dvcmtlZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVndWxhcl9taW51dGVzX3dvcmtlZCA9IG15U2hpZnQubWludXRlc193b3JrZWQtbXlTaGlmdC5vdmVydGltZV9taW51dGVzO1xuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0LnJlZ3VsYXJfZWFybmVkID0gKHJlZ3VsYXJfbWludXRlc193b3JrZWQgKiAodGhpcy5nZXQoJ3VzZXInKS5ob3VybHlSYXRlLzYwKSkudG9GaXhlZCgyKTtcbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5vdmVydGltZV9lYXJuZWQgPSAobXlTaGlmdC5vdmVydGltZV9taW51dGVzICogKHRoaXMuZ2V0KCd1c2VyJykub3ZlcnRpbWVSYXRlLzYwKSkudG9GaXhlZCgyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0LnJlZ3VsYXJfZWFybmVkID0gKG15U2hpZnQubWludXRlc193b3JrZWQqKHRoaXMuZ2V0KCd1c2VyJykuaG91cmx5UmF0ZS82MCkpLnRvRml4ZWQoMik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgd2Vla3Nbd10ucmVndWxhcl9lYXJuZWQgKz0gbXlTaGlmdC5yZWd1bGFyX2Vhcm5lZC0wO1xuICAgICAgICAgICAgICAgIGlmIChteVNoaWZ0Lm92ZXJ0aW1lX2Vhcm5lZCkgd2Vla3Nbd10ub3ZlcnRpbWVfZWFybmVkICs9IG15U2hpZnQub3ZlcnRpbWVfZWFybmVkLTA7XG4gICAgICAgICAgICAgICAgbXlTaGlmdC50b3RhbF9lYXJuZWQgPSAoKG15U2hpZnQucmVndWxhcl9lYXJuZWQtMCkgKyAobXlTaGlmdC5vdmVydGltZV9lYXJuZWQtMCB8fCAwKSkudG9GaXhlZCgyKVxuXG4gICAgICAgICAgICAgICAgbXlTaGlmdC5kaXNwbGF5X2RhdGUgPSBtb21lbnQobXlTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2RkZGQgTU1NIERELCBZWVlZJyk7XG4gICAgICAgICAgICAgICAgbXlTaGlmdC5kaXNwbGF5X3RpbWluZyA9IG1vbWVudChteVNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnaDptbWEnKSArICcgdG8gJyArIG1vbWVudChteVNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ2g6bW1hJyk7XG4gICAgICAgICAgICAgICAgaWYgKG1vbWVudChteVNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnWVlZWU1NREQnKSA8IG1vbWVudChteVNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ1lZWVlNTUREJykpIHtcbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5kaXNwbGF5X3RpbWluZyA9IG1vbWVudChteVNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnaDptbWEnKSArICcgdG8gJyArIG1vbWVudChteVNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ01NTSBERCBbYXRdIGg6bW1hJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghbXlTaGlmdC5lbmRfdGltZSkge1xuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0LmRpc3BsYXlfZGF0ZSA9IG15U2hpZnQuZGlzcGxheV9kYXRlID0gbW9tZW50KCkuZm9ybWF0KCdbVE9EQVldIE1NTSBERCwgWVlZWScpO1xuXG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQuZGlzcGxheV90aW1pbmcgPSAnU2hpZnQgc3RhcnRlZCBhdCAnICsgbW9tZW50KG15U2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdoOm1tYScpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobW9tZW50KG15U2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdZWVlZTU1ERCcpIDwgbW9tZW50KCkuZm9ybWF0KCdZWVlZTU1ERCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBteVNoaWZ0LmRpc3BsYXlfdGltaW5nID0gJ1NoaWZ0IHN0YXJ0ZWQgb24gJyArIG1vbWVudChteVNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnTU1NIEREIFthdF0gaDptbWEnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd2Vla3Nbd10udG90YWxfZWFybmVkID0gKHdlZWtzW3ddLnJlZ3VsYXJfZWFybmVkICsgKHdlZWtzW3ddLm92ZXJ0aW1lX2Vhcm5lZCB8fCAwKSkudG9GaXhlZCgyKTtcbiAgICAgICAgICAgIHdlZWtzW3ddLnJlZ3VsYXJfZWFybmVkID0gd2Vla3Nbd10ucmVndWxhcl9lYXJuZWQudG9GaXhlZCgyKVxuICAgICAgICAgICAgaWYgKHdlZWtzW3ddLm92ZXJ0aW1lX2Vhcm5lZCkgd2Vla3Nbd10ub3ZlcnRpbWVfZWFybmVkID0gd2Vla3Nbd10ub3ZlcnRpbWVfZWFybmVkLnRvRml4ZWQoMilcbiAgICAgICAgICAgIHdlZWtzW3ddLmhvdXJzX3dvcmtlZCA9ICh3ZWVrc1t3XS50b3RhbF9taW51dGVzLzYwKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgaWYgKHdlZWtzW3ddLnRvdGFsX21pbnV0ZXMgPiAyNDAwKSB7XG4gICAgICAgICAgICAgICAgd2Vla3Nbd10ucmVndWxhcl9taW51dGVzID0gMjQwMDtcbiAgICAgICAgICAgICAgICB3ZWVrc1t3XS5vdmVydGltZV9taW51dGVzID0gd2Vla3Nbd10udG90YWxfbWludXRlcy0yNDAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB3ZWVrc1t3XS5yZWd1bGFyX21pbnV0ZXMgPSB3ZWVrc1t3XS50b3RhbF9taW51dGVzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHNldHVwIHNlY3Rpb25lZCBhcnJheS5cbiAgICAgICAgICAgIHZhciBoZWFkZXJPYmogPSB7XG4gICAgICAgICAgICAgICAgXCJpZFwiOiB3ZWVrc1t3XS50aXRsZSxcbiAgICAgICAgICAgICAgICBcInN0YXJ0X3RpbWVcIjogbW9tZW50KHdlZWtzW3ddLnNoaWZ0c1t3ZWVrc1t3XS5zaGlmdHMubGVuZ3RoLTFdLnN0YXJ0X3RpbWUpLmFkZCgnMTAnLCAnbWludXRlcycpLmZvcm1hdCgnWVlZWS1NTS1ERCBISDptbTpzcycpLFxuICAgICAgICAgICAgICAgIFwiaGVhZGVyXCI6IHRydWUsXG4gICAgICAgICAgICAgICAgXCJ0aXRsZVwiOiB3ZWVrc1t3XS50aXRsZSxcbiAgICAgICAgICAgICAgICBcImhvdXJzX3dvcmtlZFwiOiB3ZWVrc1t3XS5ob3Vyc193b3JrZWQsXG4gICAgICAgICAgICAgICAgXCJyZWd1bGFyX2Vhcm5lZFwiOiB3ZWVrc1t3XS5yZWd1bGFyX2Vhcm5lZCxcbiAgICAgICAgICAgICAgICBcIm92ZXJ0aW1lX2Vhcm5lZFwiOiB3ZWVrc1t3XS5vdmVydGltZV9lYXJuZWQsXG4gICAgICAgICAgICAgICAgXCJ0aW1lX3dvcmtlZFwiOiBzaGlmdFNlcnZpY2UuY2FsY3VsYXRlU2hpZnRIb3Vyc1dvcmtlZChmYWxzZSwgZmFsc2UsIHdlZWtzW3ddLnRvdGFsX21pbnV0ZXMpLnRpbWVfd29ya2VkLFxuICAgICAgICAgICAgICAgIFwidG90YWxfZWFybmVkXCI6IHdlZWtzW3ddLnRvdGFsX2Vhcm5lZFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9jb25zb2xlLmRpcihoZWFkZXJPYmopO1xuICAgICAgICAgICAgdGhpcy5zZWN0aW9uZWRTaGlmdHMucHVzaChvYnNlcnZhYmxlRnJvbU9iamVjdChoZWFkZXJPYmopKTtcblxuICAgICAgICAgICAgdmFyIGhhc09wZW5TaGlmdCA9IGZhbHNlO1xuICAgICAgICAgICAgZm9yICh2YXIgaXggPSAwOyB3ZWVrc1t3XS5zaGlmdHMubGVuZ3RoID4gaXg7IGl4KyspIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUuZGlyKHdlZWtzW3ddLnNoaWZ0c1tpeF0pO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VjdGlvbmVkU2hpZnRzLnB1c2gob2JzZXJ2YWJsZUZyb21PYmplY3Qod2Vla3Nbd10uc2hpZnRzW2l4XSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vY29uc29sZS5sb2codGhpcy5zZWN0aW9uZWRTaGlmdHMubGVuZ3RoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRoaXMuc2VjdGlvbmVkU2hpZnRzLnBvcCgpO1xuICAgICAgICAvLyB3aGlsZSAodGhpcy5zZWN0aW9uZWRTaGlmdHMubGVuZ3RoKSB0aGlzLnNlY3Rpb25lZFNoaWZ0cy5wb3AoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMud2Vla3MgPSB3ZWVrcztcblxuICAgICAgICB0aGlzLnRoaXNXZWVrLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgICB2YXIgY29tcGFyZUEgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnZW5kX3RpbWUnKSkgY29tcGFyZUEgPSBtb21lbnQoZWxlbWVudC5nZXQoJ2VuZF90aW1lJykpO1xuICAgICAgICAgICAgdmFyIG1pbnV0ZXNXb3JrZWQgPSBjb21wYXJlQS5kaWZmKG1vbWVudChlbGVtZW50LmdldCgnc3RhcnRfdGltZScpKSwgJ21pbnV0ZXMnKVxuICAgICAgICAgICAgdGhpc1dlZWtNaW51dGVzV29ya2VkICs9IG1pbnV0ZXNXb3JrZWQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxldCBtaW51dGVSYXRlID0gcGFyc2VGbG9hdCh0aGlzLnVzZXIuaG91cmx5UmF0ZSkvNjA7XG4gICAgICAgIGxldCBvdmVydGltZU1pbnV0ZVJhdGUgPSBwYXJzZUZsb2F0KHRoaXMudXNlci5vdmVydGltZVJhdGUpLzYwO1xuICAgICAgICBpZiAodGhpc1dlZWtNaW51dGVzV29ya2VkID4gMjQwMCkge1xuICAgICAgICAgICAgbGV0IHJlZ3VsYXJFYXJuZWQgPSAyNDAwKm1pbnV0ZVJhdGU7XG4gICAgICAgICAgICBsZXQgb3ZlcnRpbWVFYXJuZWQgPSAodGhpc1dlZWtNaW51dGVzV29ya2VkLTI0MDApKm92ZXJ0aW1lTWludXRlUmF0ZTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdyZWd1bGFyX2Vhcm5lZCcsIHJlZ3VsYXJFYXJuZWQpO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ292ZXJ0aW1lX2Vhcm5lZCcsIG92ZXJ0aW1lRWFybmVkKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldCgndG90YWxfZWFybmVkJywgKHJlZ3VsYXJFYXJuZWQrb3ZlcnRpbWVFYXJuZWQpLnRvRml4ZWQoMikpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3JlZ3VsYXJfZWFybmVkJywgdGhpc1dlZWtNaW51dGVzV29ya2VkKm1pbnV0ZVJhdGUpO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3RvdGFsX2Vhcm5lZCcsICh0aGlzV2Vla01pbnV0ZXNXb3JrZWQqbWludXRlUmF0ZSkudG9GaXhlZCgyKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZXQoJ3RoaXNXZWVrTWludXRlc1dvcmtlZCcsIHRoaXNXZWVrTWludXRlc1dvcmtlZCk7XG4gICAgICAgIGxldCB0aW1lV29ya2VkID0gJzAgSE9VUlMnO1xuICAgICAgICBpZiAodGhpc1dlZWtNaW51dGVzV29ya2VkKSB0aW1lV29ya2VkID0gc2hpZnRTZXJ2aWNlLmNhbGN1bGF0ZVNoaWZ0SG91cnNXb3JrZWQoZmFsc2UsIGZhbHNlLCB0aGlzV2Vla01pbnV0ZXNXb3JrZWQpLnRpbWVfd29ya2VkO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXQoJ2hvdXJzX3dvcmtlZCcsIHRpbWVXb3JrZWQpO1xuICAgIH1cblxuICAgIHB1YmxpYyBwcm9jZXNzSW52b2ljZXMoaW52b2ljZXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2luIHByb2Nlc3MgaW52b2ljZXMnKTtcbiAgICAgICAgd2hpbGUgKHRoaXMuaW52b2ljZXMubGVuZ3RoKSB0aGlzLmludm9pY2VzLnBvcCgpO1xuICAgICAgICBsZXQgdXNlciA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1c2VyRGF0YScpKTtcbiAgICAgICAgLy9sZXQgaW52b2ljZXNBcnJheSA9IG5ldyBPYnNlcnZhYmxlQXJyYXkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ2ludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXAnLCB7fSk7XG4gICAgICAgIGxldCB0b3RhbF91bnBhaWQgPSAwO1xuICAgICAgICBmb3IgKHZhciBpIGluIGludm9pY2VzKSB7XG4gICAgICAgICAgICBpbnZvaWNlc1tpXS5pZCA9IGk7XG4gICAgICAgICAgICBpbnZvaWNlc1tpXS5zaGlmdHMgPSBbXTtcbiAgICAgICAgICAgIGludm9pY2VzW2ldLmZhbWlseV9uYW1lID0gdXNlci5mYW1pbGllc1tpbnZvaWNlc1tpXS5mYW1pbHlfaWRdLm5hbWU7XG4gICAgICAgICAgICBpbnZvaWNlc1tpXS5kYXRlX2NyZWF0ZWRfcHJldHR5ID0gbW9tZW50KGludm9pY2VzW2ldLmRhdGVfY3JlYXRlZCkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKTtcbiAgICAgICAgICAgIGZvciAodmFyIHMgPSAwOyBpbnZvaWNlc1tpXS5zaGlmdF9pZHMubGVuZ3RoID4gczsgcysrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYWRkZWRTaGlmdHNNYXBbaW52b2ljZXNbaV0uc2hpZnRfaWRzW3NdXSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiB0aGlzIGNvbmRpdGlvbmFsIGlzbnQgc2F0aXNmaWVkLCBpdCBwcm9iYWJseSBtZWFucyB0aGUgdXNlciBkZWxldGVkIHRoZSBzaGlmdCBhZnRlciBpdCB3YXMgaW52b2ljZWQuXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ludm9pY2VzW2ldLmZhbWlseV9pZF0pIHRoaXMuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcFtpbnZvaWNlc1tpXS5mYW1pbHlfaWRdID0ge307XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcFtpbnZvaWNlc1tpXS5mYW1pbHlfaWRdW2ludm9pY2VzW2ldLnNoaWZ0X2lkc1tzXV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBsZXQgc2hpZnQgPSB0aGlzLmFkZGVkU2hpZnRzTWFwW2ludm9pY2VzW2ldLnNoaWZ0X2lkc1tzXV07XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0LmNvbnRyaWJ1dGlvbiA9IHNoaWZ0LmNvbnRyaWJ1dGlvbnNbaW52b2ljZXNbaV0uZmFtaWx5X2lkXTtcbiAgICAgICAgICAgICAgICAgICAgc2hpZnQuaW52b2ljZV90aXRsZV9kaXNwbGF5ID0gbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnTS9EL1lZJykgKyAnOiAnICsgc2hpZnQuZGlzcGxheV9ob3VycztcbiAgICAgICAgICAgICAgICAgICAgc2hpZnQuaW52b2ljZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpbnZvaWNlc1tpXS5zaGlmdHMucHVzaChzaGlmdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gdGhpcyBpcyByZXF1aXJlZCB0byBtYWtlIHRoZSBVSSByZXNwZWN0IHRoZSBsb2FkaW5nIGluZGljYXRvci5cbiAgICAgICAgICAgIGludm9pY2VzW2ldLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICghaW52b2ljZXNbaV0uc2VudCkgaW52b2ljZXNbaV0uc2VudCA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKCFpbnZvaWNlc1tpXS5wYWlkKSB0b3RhbF91bnBhaWQgKz0gaW52b2ljZXNbaV0udG90YWwtMDtcbiAgICAgICAgICAgIFxuXG4gICAgICAgICAgICB0aGlzLmludm9pY2VNYXBbaV0gPSBpbnZvaWNlc1tpXTtcbiAgICAgICAgICAgIGxldCBpc0FkZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAvL2ludm9pY2VzQXJyYXkucHVzaChpbnZvaWNlc1tpXSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuaW52b2ljZXMucHVzaChvYnNlcnZhYmxlRnJvbU9iamVjdChpbnZvaWNlc1tpXSkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvL3RoaXMuaW52b2ljZXMucHVzaChvYnNlcnZhYmxlRnJvbU9iamVjdChpbnZvaWNlc1tpXSkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2V0KCd0b3RhbFVucGFpZFN0cmluZycsICdZb3UgaGF2ZSAkJyArIHRvdGFsX3VucGFpZC50b0ZpeGVkKDIpICsgJyBpbiB1bnBhaWQgaW52b2ljZXMuJyk7XG4gICAgICAgIHRoaXMuc2V0KCd0b3RhbFVucGFpZCcsIHRvdGFsX3VucGFpZC50b0ZpeGVkKDIpKTtcbiAgICAgICAgaWYgKCF0b3RhbF91bnBhaWQpIHRoaXMuc2V0KCd0b3RhbFVucGFpZFN0cmluZycsICdZb3VcXCdyZSBhbGwgcGFpZCB1cCEnKTtcbiAgICAgICAgdGhpcy5pbnZvaWNlcy5zb3J0KChhOmFueSwgYjphbnkpID0+IHtcbiAgICAgICAgICAgIGlmIChtb21lbnQoYS5kYXRlX2NyZWF0ZWQpIDwgbW9tZW50KGIuZGF0ZV9jcmVhdGVkKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtb21lbnQoYS5kYXRlX2NyZWF0ZWQpID4gbW9tZW50KGIuZGF0ZV9jcmVhdGVkKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICAvLyBjb25zb2xlLmxvZygnaW52b2ljZXNBcnJheSBsZW5naHQgJyArIGludm9pY2VzQXJyYXkubGVuZ3RoKTtcbiAgICAgICAgLy8gdGhpcy5zZXQoJ2ludm9pY2VzJywgaW52b2ljZXNBcnJheSk7XG4gICAgICAgIC8vIGVtcHR5IHRoaXMgYW5kIHJlcG9wdWxhdGUgaXQuXG4gICAgICAgIHRoaXMuc2V0KCd1bmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXAnLCB7fSk7XG4gICAgICAgIGZvciAobGV0IHNoaWZ0X2lkIGluIHRoaXMuYWRkZWRTaGlmdHNNYXApIHtcbiAgICAgICAgICAgIGZvciAobGV0IGZhbWlseV9pZCBpbiB0aGlzLmZhbWlsaWVzTWFwKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnVuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcFtmYW1pbHlfaWRdKSB0aGlzLnVuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcFtmYW1pbHlfaWRdID0ge307XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXBbZmFtaWx5X2lkXSB8fCAhdGhpcy5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ZhbWlseV9pZF1bc2hpZnRfaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBteVNoaWZ0ID0gdGhpcy5hZGRlZFNoaWZ0c01hcFtzaGlmdF9pZF07XG4gICAgICAgICAgICAgICAgICAgIGxldCBjb250cmlidXRpb246YW55ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlmIChteVNoaWZ0LmNvbnRyaWJ1dGlvbnMpIGNvbnRyaWJ1dGlvbiA9IG15U2hpZnQuY29udHJpYnV0aW9uc1tmYW1pbHlfaWRdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJpYnV0aW9uICYmIGNvbnRyaWJ1dGlvbiAhPSAnMCcpIHRoaXMudW5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ZhbWlseV9pZF1bc2hpZnRfaWRdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ0lOVk9JQ0VEIFNISUZUUyBCWSBGQU1JTFknKVxuICAgICAgICAvLyBjb25zb2xlLmRpcihKU09OLnN0cmluZ2lmeSh0aGlzLmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXApKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJVTklOVk9JQ0VEIFNISUZUUyBCWSBGQU1JTFlcIilcbiAgICAgICAgLy8gY29uc29sZS5kaXIoSlNPTi5zdHJpbmdpZnkodGhpcy51bmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXApKTtcbiAgICB9XG4gICAgXG59Il19