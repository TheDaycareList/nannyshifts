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
        _this.display_earned = 0;
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
        dialogs.confirm('Are you sure you want to remove this family? If they have contributed to any shifts, they will no longer display in the shift details, but the total amount received will not change.').then(function (result) {
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
                MyModel.showSettings('/views/components/editinvoice/editinvoice.xml');
                MyModel.set('settingsTitle', 'Create Invoice');
            }
            else {
                this.selectedFamilyToInvoice = false;
                alert('You don\'t have any uninvoiced shifts, so you can\'t create an invoice right now.');
            }
        }
        else {
            MyModel.showSettings('/views/components/editinvoice/editinvoice.xml');
            MyModel.set('settingsTitle', 'Create Invoice');
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
        var contributionTotal = 0;
        if (editingShift.id && editingShift.contributions) {
            var contributionTotal_1 = 0;
            for (var x in editingShift.contributions) {
                contributionTotal_1 += parseFloat(editingShift.contributions[x]);
            }
            MyModel.set('endShiftFinalTotal', '$' + contributionTotal_1.toFixed(2));
        }
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
            if (editingShift.id && editingShift.contributions) {
                if (editingShift.contributions[families.getItem(0).id]) {
                    families.getItem(0).set('contribution', editingShift.contributions[families.getItem(0).id]);
                }
                else {
                    families.getItem(0).set('contribution', '0.00');
                }
            }
            else {
                families.getItem(0).set('contribution', newTotal);
            }
            families.getItem(0).on(observable_1.Observable.propertyChangeEvent, function (args) {
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
        var thisWeekTotalEarned = 0;
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
            var weekContributionTotal = 0;
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
                console.dir(JSON.stringify(myShift.contributions));
                // If contributions are set, display what they set as contributions as it may be
                // different from what they earned based on time worked and hourly rates.
                myShift.total_contributions = 0;
                myShift.display_earned = myShift.total_earned;
                if (myShift.contributions) {
                    for (var x in myShift.contributions) {
                        myShift.total_contributions += parseFloat(myShift.contributions[x]);
                        weekContributionTotal += parseFloat(myShift.contributions[x]);
                    }
                    myShift.display_earned = myShift.total_contributions.toFixed(2);
                }
                else {
                    weekContributionTotal += parseFloat(myShift.total_earned);
                }
                //let percentageOf: number = parseFloat(((myShift.display_earned*100)/myShift.total_earned).toFixed(0));
                // if (percentageOf > 100) {
                //     myShift.earned_difference = percentageOf-100;
                // } else if (percentageOf < 100) {
                //     myShift.earned_difference = 100 - percentageOf;
                // } else {
                //     myShift.earned_difference = false;
                // }
                if (parseFloat(myShift.total_earned) > parseFloat(myShift.display_earned)) {
                    myShift.earned_difference = '$' + (myShift.total_earned - myShift.display_earned).toFixed(2) + ' Under';
                }
                else if (parseFloat(myShift.total_earned) < parseFloat(myShift.display_earned)) {
                    myShift.earned_difference = '$' + (myShift.display_earned - myShift.total_earned).toFixed(2) + ' Over';
                }
                else {
                    myShift.earned_difference = false;
                }
                //myShift.earned_difference
                console.log(myShift.title + ' from ' + myShift.display_hours);
                console.log('total earned: ' + myShift.total_earned);
                console.log('display earned: ' + myShift.display_earned);
                console.log('difference: ' + myShift.earned_difference);
                console.log(myShift.total_contributions);
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
            console.log('week contribution total: ' + weekContributionTotal);
            var headerObj = {
                "id": weeks[w].title,
                "start_time": moment(weeks[w].shifts[weeks[w].shifts.length - 1].start_time).add('10', 'minutes').format('YYYY-MM-DD HH:mm:ss'),
                "header": true,
                "title": weeks[w].title,
                "hours_worked": weeks[w].hours_worked,
                "regular_earned": weeks[w].regular_earned,
                "overtime_earned": weeks[w].overtime_earned,
                "total_contributions": weekContributionTotal.toFixed(2),
                "time_worked": shiftService.calculateShiftHoursWorked(false, false, weeks[w].total_minutes).time_worked,
                "total_earned": weeks[w].total_earned
            };
            if (weeks[w].total_minutes > 2400) {
                if (weeks[w].overtime_minutes / 60 < 1) {
                    headerObj.overtime_hours = weeks[w].overtime_minutes + ' MINUTES';
                }
                else if ((weeks[w].overtime_minutes / 60) % 1 === 0) {
                    headerObj.overtime_hours = Math.floor(weeks[w].overtime_minutes / 60) + ' HOURS';
                }
                else {
                    var minutesOnHour = weeks[w].overtime_hours - (Math.floor(weeks[w].overtime_hours / 60) * 60);
                    headerObj.overtime_hours = Math.floor(weeks[w].overtime_hours / 60) + ' HOUR' + (Math.floor(weeks[w].overtime_hours / 60) == 1 ? '' : 'S') + ' ' + minutesOnHour + ' MINUTE' + (minutesOnHour == 1 ? '' : 'S');
                }
            }
            //console.dir(headerObj);
            this.sectionedShifts.push(observable_1.fromObject(headerObj));
            for (var ix = 0; weeks[w].shifts.length > ix; ix++) {
                //console.dir(weeks[w].shifts[ix]);
                this.sectionedShifts.push(observable_1.fromObject(weeks[w].shifts[ix]));
            }
        }
        //console.log(this.sectionedShifts.length);
        // this.sectionedShifts.pop();
        // while (this.sectionedShifts.length) this.sectionedShifts.pop();
        this.weeks = weeks;
        var noEndTimeMinutesWorked = 0;
        var hasOpenShift = false;
        this.thisWeek.forEach(function (element) {
            var compareA = moment();
            if (element.get('end_time'))
                compareA = moment(element.get('end_time'));
            var minutesWorked = compareA.diff(moment(element.get('start_time')), 'minutes');
            thisWeekMinutesWorked += minutesWorked;
            if (element.get('end_time')) {
                if (element.get('contributions')) {
                    for (var x in element.get('contributions')) {
                        thisWeekTotalEarned += parseFloat(element.get('contributions')[x]);
                    }
                }
            }
            else {
                hasOpenShift = true;
                var compareA_2 = moment();
                noEndTimeMinutesWorked += compareA_2.diff(moment(element.get('start_time')), 'minutes');
            }
        });
        console.log('no end time minutes worked: ' + noEndTimeMinutesWorked);
        console.log('this week total earned: ' + thisWeekTotalEarned);
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
        if (hasOpenShift) {
            var completedShiftsMinutesWorked = thisWeekMinutesWorked - noEndTimeMinutesWorked;
            var openShiftEarned = (noEndTimeMinutesWorked * minuteRate);
            console.log('open shift earned: ' + openShiftEarned);
            this.set('display_earned', (thisWeekTotalEarned + openShiftEarned).toFixed(2));
        }
        else {
            this.set('display_earned', thisWeekTotalEarned);
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9tZS1tb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvbWUtbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSw4Q0FBOEc7QUFDOUcsMERBQXNEO0FBR3RELG9DQUFzQztBQUN0QyxrREFBb0Q7QUFDcEQsK0JBQWlDO0FBQ2pDLGdDQUFrQztBQUNsQyxnQ0FBa0M7QUFFbEMsa0NBQTBDO0FBQzFDLG9DQUFzQztBQUN0QyxxQ0FBa0M7QUFPbEMsdURBQTJEO0FBQzNELHlEQUF1RDtBQUt2RCxvREFBc0Q7QUFDdEQsSUFBSSxXQUF3QixDQUFDO0FBQzdCLElBQUksWUFBMEIsQ0FBQztBQUMvQixJQUFJLGlCQUE4QixDQUFDO0FBQ25DLElBQUksd0JBQXdCLENBQUM7QUFDN0IsSUFBSSxXQUFXLENBQUM7QUFDaEIsSUFBSSxRQUFnQixDQUFDO0FBQ3JCLElBQUksT0FBa0IsQ0FBQztBQUN2QixJQUFJLGFBQTRCLENBQUM7QUFDakMsSUFBSSxZQUFZLENBQUM7QUFFakI7SUFBK0IsNkJBQVU7SUFDckM7UUFBQSxZQUNJLGlCQUFPLFNBMEJWO1FBR00saUJBQVcsR0FBVyxVQUFVLEdBQUcsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwRixVQUFJLEdBQVMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDM0Qsa0JBQVksR0FBVyxDQUFDLENBQUM7UUFDekIsMkJBQXFCLEdBQVcsQ0FBQyxDQUFDO1FBQ2xDLGtCQUFZLEdBQVcsSUFBSSxDQUFDO1FBQzVCLG9CQUFjLEdBQVcsQ0FBQyxDQUFDO1FBQzNCLHFCQUFlLEdBQVUsQ0FBQyxDQUFDO1FBQzNCLG9CQUFjLEdBQVUsQ0FBQyxDQUFDO1FBQzFCLG1CQUFhLEdBQVcsVUFBVSxDQUFDO1FBQ25DLGNBQVEsR0FBZ0MsSUFBSSxrQ0FB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RDtRQUMvRCw2Q0FBNkM7UUFDN0MsaUVBQWlFO0lBQ3JFLENBQUM7SUFFTCxnQkFBQztBQUFELENBQUMsQUFoZ0RELENBQStCLHVCQUFVLEdBZ2dEeEM7QUFoZ0RZLDhCQUFTIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGFnZSB9IGZyb20gJ3VpL3BhZ2UnO1xuaW1wb3J0IHtFdmVudERhdGEsIE9ic2VydmFibGUsIFByb3BlcnR5Q2hhbmdlRGF0YSwgZnJvbU9iamVjdCBhcyBvYnNlcnZhYmxlRnJvbU9iamVjdH0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJztcbmltcG9ydCB7T2JzZXJ2YWJsZUFycmF5fSBmcm9tICdkYXRhL29ic2VydmFibGUtYXJyYXknO1xuaW1wb3J0IHsgR2VzdHVyZVR5cGVzLCBQYW5HZXN0dXJlRXZlbnREYXRhIH0gZnJvbSBcInVpL2dlc3R1cmVzXCI7XG5pbXBvcnQgKiBhcyBmaXJlYmFzZSBmcm9tICduYXRpdmVzY3JpcHQtcGx1Z2luLWZpcmViYXNlJztcbmltcG9ydCAqIGFzIGRpYWxvZ3MgZnJvbSAndWkvZGlhbG9ncyc7XG5pbXBvcnQgKiBhcyBhcHBTZXR0aW5ncyBmcm9tICdhcHBsaWNhdGlvbi1zZXR0aW5ncyc7XG5pbXBvcnQgKiBhcyBtb21lbnQgZnJvbSAnbW9tZW50JztcbmltcG9ydCAqIGFzIGZyYW1lIGZyb20gJ3VpL2ZyYW1lJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZpbGUtc3lzdGVtJztcbmltcG9ydCB7IEFuaW1hdGlvbkRlZmluaXRpb24gfSBmcm9tIFwidWkvYW5pbWF0aW9uXCI7XG5pbXBvcnQgeyBBbmltYXRpb25DdXJ2ZSB9IGZyb20gXCJ1aS9lbnVtc1wiO1xuaW1wb3J0ICogYXMgYnVpbGRlciBmcm9tICd1aS9idWlsZGVyJztcbmltcG9ydCB7IHNjcmVlbiB9IGZyb20gXCJwbGF0Zm9ybVwiO1xuaW1wb3J0IHsgU3RhY2tMYXlvdXQgfSBmcm9tICd1aS9sYXlvdXRzL3N0YWNrLWxheW91dCc7XG5pbXBvcnQgeyBHcmlkTGF5b3V0IH0gZnJvbSAndWkvbGF5b3V0cy9ncmlkLWxheW91dCc7XG5pbXBvcnQgeyBMaXN0VmlldyB9IGZyb20gJ3VpL2xpc3Qtdmlldyc7XG5pbXBvcnQgeyBTY3JvbGxWaWV3LCBTY3JvbGxFdmVudERhdGEgfSBmcm9tICd1aS9zY3JvbGwtdmlldyc7XG5pbXBvcnQgeyBUZXh0RmllbGQgfSBmcm9tICd1aS90ZXh0LWZpZWxkJztcbmltcG9ydCB7IExhYmVsIH0gZnJvbSAndWkvbGFiZWwnO1xuaW1wb3J0IHsgVXNlclNlcnZpY2UsIFVzZXIgfSBmcm9tICcuLi9zaGFyZWQvdXNlci5zZXJ2aWNlJztcbmltcG9ydCB7IFNoaWZ0U2VydmljZSB9IGZyb20gJy4uL3NoYXJlZC9zaGlmdC5zZXJ2aWNlJztcbmltcG9ydCB7IFJhZFNpZGVEcmF3ZXIgfSBmcm9tIFwibmF0aXZlc2NyaXB0LXRlbGVyaWstdWkvc2lkZWRyYXdlclwiO1xuaW1wb3J0IHsgU2V0dGluZ3NNb2RlbCB9IGZyb20gJy4uL21vZGFscy9zZXR0aW5ncy9zZXR0aW5ncy1tb2RlbCc7XG5pbXBvcnQgeyBTZWxlY3RlZEluZGV4Q2hhbmdlZEV2ZW50RGF0YSwgVGFiVmlldyB9IGZyb20gXCJ1aS90YWItdmlld1wiO1xuaW1wb3J0IHsgU2xpZGVyIH0gZnJvbSBcInVpL3NsaWRlclwiO1xuaW1wb3J0ICogYXMgcGlja2VyIGZyb20gXCIuLi9jb21wb25lbnRzL3BpY2tlci9waWNrZXJcIjtcbmxldCB1c2VyU2VydmljZTogVXNlclNlcnZpY2U7XG5sZXQgc2hpZnRTZXJ2aWNlOiBTaGlmdFNlcnZpY2U7XG5sZXQgc2V0dGluZ3NDb250YWluZXI6IFN0YWNrTGF5b3V0O1xubGV0IHNldHRpbmdzT3ZlcmxheUNvbnRhaW5lcjtcbmxldCBkaXNtaXNzTm90ZTtcbmxldCBibHVyVmlldzogVUlWaWV3O1xubGV0IE15TW9kZWw6IEhvbWVNb2RlbDtcbmxldCBzZXR0aW5nc01vZGVsOiBTZXR0aW5nc01vZGVsO1xubGV0IGVkaXRpbmdTaGlmdDtcbmRlY2xhcmUgdmFyIFVJVmlzdWFsRWZmZWN0VmlldzphbnksIFVJQmx1ckVmZmVjdDphbnksIFVJVmlld0F1dG9yZXNpemluZ0ZsZXhpYmxlSGVpZ2h0OmFueSwgVUlWaWV3QXV0b3Jlc2l6aW5nRmxleGlibGVXaWR0aDphbnksIFVJQmx1ckVmZmVjdFN0eWxlTGlnaHQ6YW55O1xuZXhwb3J0IGNsYXNzIEhvbWVNb2RlbCBleHRlbmRzIE9ic2VydmFibGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICBNeU1vZGVsID0gdGhpcztcbiAgICAgICAgLy9hbGxTaGlmdHNNb2RlbCA9IG5ldyBBbGxTaGlmdHNNb2RlbCgpO1xuICAgICAgICB1c2VyU2VydmljZSA9IG5ldyBVc2VyU2VydmljZSgpO1xuICAgICAgICBzaGlmdFNlcnZpY2UgPSBuZXcgU2hpZnRTZXJ2aWNlKCk7XG4gICAgICAgIGxldCB1c2VyID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpO1xuICAgICAgICBmb3IgKGxldCBpIGluIHVzZXIuZmFtaWxpZXMpIHtcbiAgICAgICAgICAgIHVzZXIuZmFtaWxpZXNbaV0uaWQgPSBpO1xuICAgICAgICAgICAgaWYgKCF1c2VyLmZhbWlsaWVzW2ldLmRlbGV0ZWQpIHRoaXMuZmFtaWxpZXNNYXBbaV0gPSB1c2VyLmZhbWlsaWVzW2ldO1xuXG4gICAgICAgICAgICBsZXQgZmFtaWx5ID0gb2JzZXJ2YWJsZUZyb21PYmplY3QodXNlci5mYW1pbGllc1tpXSk7XG4gICAgICAgICAgICBpZiAoIXVzZXIuZmFtaWxpZXNbaV0uZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZmFtaWxpZXMucHVzaChmYW1pbHkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmZhbWlsaWVzLmxlbmd0aCA9PSAxKSB0aGlzLmZhbWlsaWVzLmdldEl0ZW0oMCkuc2V0KCdqdXN0T25lRmFtaWx5JywgdHJ1ZSk7XG4gICAgICAgIHRoaXMuZmFtaWxpZXMuZ2V0SXRlbSgwKS5zZXQoJ2lzRmlyc3QnLCB0cnVlKTsgXG4gICAgICAgIHRoaXMuc2V0KCdpc0xvYWRpbmcnLCB0cnVlKTtcbiAgICAgICAgc2hpZnRTZXJ2aWNlLmJ1aWxkQXBwRGF0YSh0cnVlKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICB0aGlzLmdldFRoaXNXZWVrU2hpZnRzKCk7XG4gICAgICAgICAgICB0aGlzLnNldCgnaXNMb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgbGV0IGludm9pY2VzID0gW107XG4gICAgICAgICAgICBpZiAoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKSBpbnZvaWNlcyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKTtcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc0ludm9pY2VzKGludm9pY2VzKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgcGFnZTogUGFnZTtcbiAgICBwdWJsaWMgaGVhZGVyX3RleHQ6IHN0cmluZyA9ICdXZWVrIG9mICcgKyBtb21lbnQoKS5zdGFydE9mKCd3ZWVrJykuZm9ybWF0KCdkZGRkIFt0aGVdIERvJyk7XG4gICAgcHVibGljIHVzZXI6IFVzZXIgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndXNlckRhdGEnKSk7XG4gICAgcHVibGljIGhvdXJzX3dvcmtlZDogbnVtYmVyID0gMDtcbiAgICBwdWJsaWMgdGhpc1dlZWtNaW51dGVzV29ya2VkOiBudW1iZXIgPSAwO1xuICAgIHB1YmxpYyB0b3RhbF9lYXJuZWQ6IG51bWJlciA9IDAuMDA7XG4gICAgcHVibGljIHJlZ3VsYXJfZWFybmVkOiBudW1iZXIgPSAwO1xuICAgIHB1YmxpYyBvdmVydGltZV9lYXJuZWQ6IG51bWJlcj0gMDtcbiAgICBwdWJsaWMgZGlzcGxheV9lYXJuZWQ6IG51bWJlcj0gMDtcbiAgICBwdWJsaWMgc2V0dGluZ3NUaXRsZTogc3RyaW5nID0gJ1NldHRpbmdzJztcbiAgICBwdWJsaWMgZmFtaWxpZXM6IE9ic2VydmFibGVBcnJheTxPYnNlcnZhYmxlPiA9IG5ldyBPYnNlcnZhYmxlQXJyYXkoW10pO1xuICAgIHB1YmxpYyBmYW1pbGllc01hcDogYW55ID0ge307XG4gICAgcHVibGljIGVkaXRpbmdGYW1pbHk6IE9ic2VydmFibGUgPSBvYnNlcnZhYmxlRnJvbU9iamVjdCh7fSlcbiAgICBwdWJsaWMgY2xvY2tlZEluOiBhbnkgPSBmYWxzZTtcbiAgICBwdWJsaWMgdGhpc1dlZWs6IE9ic2VydmFibGVBcnJheTxPYnNlcnZhYmxlPiA9IG5ldyBPYnNlcnZhYmxlQXJyYXkoW10pO1xuICAgIHB1YmxpYyBzaGlmdHM6IE9ic2VydmFibGVBcnJheTxPYnNlcnZhYmxlPiA9IG5ldyBPYnNlcnZhYmxlQXJyYXkoW10pO1xuICAgIHB1YmxpYyBhZGRlZFNoaWZ0c01hcCA9IHt9O1xuICAgIHB1YmxpYyBpc0xvYWRpbmc6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBwdWJsaWMgc2VsZWN0ZWRJbmRleDogbnVtYmVyID0gMDtcbiAgICBwdWJsaWMgbXlBcnJheSA9IFsnaGknLCAnd29ybGQnLCAnd291bGQgeW91IGxpa2UnLCAncGVhcyddO1xuICAgIHB1YmxpYyBzZWN0aW9uZWRTaGlmdHM6IE9ic2VydmFibGVBcnJheTxPYnNlcnZhYmxlPiA9IG5ldyBPYnNlcnZhYmxlQXJyYXkoW10pO1xuXG4gICAgcHVibGljIHNlbGVjdGVkRmFtaWx5VG9JbnZvaWNlOiBhbnkgPSBmYWxzZTtcbiAgICBwdWJsaWMgdW5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwOiBhbnkgPSB7fTtcbiAgICBwdWJsaWMgaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcDogYW55ID0ge307XG4gICAgcHVibGljIHVuaW52b2ljZWRTaGlmdHM6IEFycmF5PGFueT4gPSBbXTtcbiAgICBwdWJsaWMgaW52b2ljZVRvdGFsOiBudW1iZXI7XG4gICAgcHVibGljIGludm9pY2VzOiBPYnNlcnZhYmxlQXJyYXk8T2JzZXJ2YWJsZT4gPSBuZXcgT2JzZXJ2YWJsZUFycmF5KFtdKTtcbiAgICBwdWJsaWMgaW52b2ljZU1hcCA9IHt9O1xuICAgIHB1YmxpYyB0b3RhbFVucGFpZFN0cmluZzogc3RyaW5nO1xuICAgIHB1YmxpYyB0b3RhbFVucGFpZDogbnVtYmVyO1xuXG4gICAgcHVibGljIGFsbFNoaWZ0czogT2JzZXJ2YWJsZUFycmF5PE9ic2VydmFibGU+ID0gbmV3IE9ic2VydmFibGVBcnJheShbXSk7XG4gICAgcHVibGljIGFsbFNoaWZ0c01hcDogYW55ID0ge307XG4gICAgcHVibGljIHdlZWtzID0ge307XG5cbiAgICBcblxuICAgIHB1YmxpYyByZWJ1aWxkQWxsRGF0YSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHNoaWZ0U2VydmljZS5idWlsZEFwcERhdGEodHJ1ZSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2V0VGhpc1dlZWtTaGlmdHMoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnaXNMb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmcmVzaCBpbnZvaWNlcyBsZW5ndGggJyArIEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGludm9pY2VzID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkgaW52b2ljZXMgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoaW52b2ljZXMpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgIH1cblxuICAgIHB1YmxpYyBwYWdlTG9hZGVkKG15UGFnZTogUGFnZSkge1xuICAgICAgICB0aGlzLnBhZ2UgPSBteVBhZ2U7XG4gICAgICAgIHRoaXMucGFnZS5iaW5kaW5nQ29udGV4dCA9IHRoaXM7XG4gICAgICAgIHRoaXMucGFnZS5nZXRWaWV3QnlJZCgndGFidmlldycpLm9uKCdzZWxlY3RlZEluZGV4Q2hhbmdlZCcsIChhcmdzOlNlbGVjdGVkSW5kZXhDaGFuZ2VkRXZlbnREYXRhKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNldCgnc2VsZWN0ZWRJbmRleCcsIGFyZ3MubmV3SW5kZXgpO1xuICAgICAgICAgICAgaWYgKGFyZ3MubmV3SW5kZXggPT0gMCkge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmdldFRoaXNXZWVrU2hpZnRzKClcbiAgICAgICAgICAgICAgICB9LCAxMClcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBzaGlmdHMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpIHNoaWZ0cyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1NoaWZ0cyhzaGlmdHMpO1xuICAgICAgICAgICAgICAgIH0sIDEwKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICBsZXQgdGFiVmlldzogVGFiVmlldyA9IHRoaXMucGFnZS5nZXRWaWV3QnlJZCgndGFidmlldycpXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJbmRleCA9IHRhYlZpZXcuc2VsZWN0ZWRJbmRleDtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2hvd01lbnUoKSB7XG4gICAgICAgIGxldCBzaWRlRHJhd2VyOiBSYWRTaWRlRHJhd2VyID0gPFJhZFNpZGVEcmF3ZXI+KCBmcmFtZS50b3Btb3N0KCkuZ2V0Vmlld0J5SWQoXCJkcmF3ZXJcIikpO1xuICAgICAgICBzaWRlRHJhd2VyLnNob3dEcmF3ZXIoKTtcbiAgICB9ICBcblxuICAgIHB1YmxpYyBsb2dVc2VyKCkge1xuICAgICAgICBjb25zb2xlLmRpcihKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndXNlckRhdGEnKSkpO1xuICAgICAgICBjb25zb2xlLmxvZyhKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndWlkJykpKVxuICAgIH1cblxuICAgIHB1YmxpYyBlZGl0UmF0ZXMoKSB7XG4gICAgICAgIHRoaXMuc2hvd1NldHRpbmdzKCcvdmlld3MvY29tcG9uZW50cy9lZGl0cmF0ZXMvZWRpdHJhdGVzLnhtbCcpO1xuICAgICAgICB0aGlzLnNldCgnc2V0dGluZ3NUaXRsZScsICdFZGl0IFJhdGVzJyk7XG4gICAgfVxuXG4gICAgcHVibGljIHNhdmVSYXRlcygpIHtcbiAgICAgICAgY29uc29sZS5kaXIodGhpcy5nZXQoJ3VzZXInKSk7XG4gICAgICAgIGxldCBkYXRhID0ge1xuICAgICAgICAgICAgaG91cmx5UmF0ZTogdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdob3VybHlfcmF0ZScpLnRleHQsXG4gICAgICAgICAgICBvdmVydGltZVJhdGU6IHRoaXMucGFnZS5nZXRWaWV3QnlJZCgnb3ZlcnRpbWVfcmF0ZScpLnRleHQsXG4gICAgICAgICAgICBmaXJzdF9uYW1lOiB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ2ZpcnN0X25hbWUnKS50ZXh0LFxuICAgICAgICAgICAgbGFzdF9uYW1lOiB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ2xhc3RfbmFtZScpLnRleHQsXG4gICAgICAgICAgICBlbWFpbDogdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdlbWFpbCcpLnRleHRcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWRhdGEuaG91cmx5UmF0ZSB8fCAhZGF0YS5vdmVydGltZVJhdGUgfHwgIWRhdGEuZmlyc3RfbmFtZSB8fCAhZGF0YS5sYXN0X25hbWUgfHwgIWRhdGEuZW1haWwpIHtcbiAgICAgICAgICAgIGFsZXJ0KCdQbGVhc2UgZmlsbCBvdXQgYWxsIHRoZSBmaWVsZHMuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdXNlclNlcnZpY2UudXBkYXRlVXNlcihkYXRhKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQpO1xuICAgICAgICAgICAgZm9yICh2YXIgeCBpbiBkYXRhKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5nZXQoJ3VzZXInKVt4XSA9IGRhdGFbeF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmhpZGVTZXR0aW5ncygpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyByZWZyZXNoRGF0YShhcmdzKSB7XG4gICAgICAgIHZhciBwdWxsUmVmcmVzaCA9IGFyZ3Mub2JqZWN0O1xuICAgICAgICBzaGlmdFNlcnZpY2UuYnVpbGRBcHBEYXRhKHRydWUpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgIHRoaXMuZ2V0VGhpc1dlZWtTaGlmdHMoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdpc0xvYWRpbmcnLCBmYWxzZSk7XG4gICAgICAgICAgICBsZXQgaW52b2ljZXMgPSBbXTtcbiAgICAgICAgICAgIGlmIChhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpIGludm9pY2VzID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpO1xuICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoaW52b2ljZXMpO1xuICAgICAgICAgICAgcHVsbFJlZnJlc2gucmVmcmVzaGluZyA9IGZhbHNlO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBlZGl0RmFtaWx5KGFyZ3MpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2ZhbWlsaWVzPycpXG4gICAgICAgIC8vICd0aGlzJyBpcyBub3cgdGhlIGZhbWlseSB5b3UgdGFwcGVkIGZyb20gdGhlIHJlcGVhdGVyXG4gICAgICAgIGxldCBmYW1pbGllcyA9IE15TW9kZWwuZmFtaWxpZXM7XG5cbiAgICAgICAgbGV0IGZhbWlseSA9IGZhbWlsaWVzLmZpbHRlcihpdGVtID0+IGl0ZW0uZ2V0KCdpZCcpID09PSBhcmdzLm9iamVjdC5pZClbMF07XG4gICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nRmFtaWx5JywgZmFtaWx5KTtcbiAgICAgICAgTXlNb2RlbC5zaG93U2V0dGluZ3MoJy92aWV3cy9jb21wb25lbnRzL2VkaXRmYW1pbHkvZWRpdGZhbWlseS54bWwnKTtcbiAgICAgICAgTXlNb2RlbC5zZXQoJ3NldHRpbmdzVGl0bGUnLCAnRWRpdCBGYW1pbHknKTtcbiAgICAgICAgTXlNb2RlbC5wYWdlLmdldFZpZXdCeUlkKCdlZGl0aW5nX2ZhbWlseV92aWV3JykuYmluZGluZ0NvbnRleHQgPSBNeU1vZGVsLmVkaXRpbmdGYW1pbHk7XG4gICAgfVxuXG4gICAgcHVibGljIGFkZEZhbWlseSgpIHtcbiAgICAgICAgdGhpcy5zZXQoJ2VkaXRpbmdGYW1pbHknLCBvYnNlcnZhYmxlRnJvbU9iamVjdCh7fSkpO1xuICAgICAgICB0aGlzLnNob3dTZXR0aW5ncygnL3ZpZXdzL2NvbXBvbmVudHMvZWRpdGZhbWlseS9lZGl0ZmFtaWx5LnhtbCcpO1xuICAgICAgICB0aGlzLnNldCgnc2V0dGluZ3NUaXRsZScsICdBZGQgRmFtaWx5Jyk7XG4gICAgICAgIE15TW9kZWwucGFnZS5nZXRWaWV3QnlJZCgnZWRpdGluZ19mYW1pbHlfdmlldycpLmJpbmRpbmdDb250ZXh0ID0gTXlNb2RlbC5lZGl0aW5nRmFtaWx5O1xuICAgIH1cblxuICAgIHB1YmxpYyBzYXZlRmFtaWx5KCkge1xuICAgICAgICBsZXQgZGF0YTphbnkgPSB7XG4gICAgICAgICAgICBuYW1lOiB0aGlzLmdldCgnZWRpdGluZ0ZhbWlseScpLmdldCgnbmFtZScpLFxuICAgICAgICAgICAgZW1haWw6IHRoaXMuZ2V0KCdlZGl0aW5nRmFtaWx5JykuZ2V0KCdlbWFpbCcpXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmVkaXRpbmdGYW1pbHkuZ2V0KCdpZCcpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZWRpdGluZyBhIGZhbWlseScpO1xuICAgICAgICAgICAgdXNlclNlcnZpY2Uuc2F2ZUZhbWlseSh0aGlzLmVkaXRpbmdGYW1pbHkuZ2V0KCdpZCcpLCBkYXRhKS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZmFtaWxpZXMgPSB0aGlzLmZhbWlsaWVzXG4gICAgICAgICAgICAgICAgZmFtaWxpZXMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuZ2V0KCdpZCcpID09IHRoaXMuZWRpdGluZ0ZhbWlseS5nZXQoJ2lkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0KCduYW1lJywgZGF0YS5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0KCdlbWFpbCcsIGRhdGEuZW1haWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYWRkaW5nIGEgZmFtaWx5Jyk7XG4gICAgICAgICAgICBsZXQgZmFtaWxpZXMgPSB0aGlzLmZhbWlsaWVzO1xuICAgICAgICAgICAgdXNlclNlcnZpY2UuYWRkRmFtaWx5KGRhdGEpLnRoZW4oKHJlc3VsdDphbnkpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZmFtaWxpZXMgPSB0aGlzLmZhbWlsaWVzO1xuICAgICAgICAgICAgICAgIGRhdGEuaWQgPSByZXN1bHQua2V5O1xuICAgICAgICAgICAgICAgIGZhbWlsaWVzLnB1c2gob2JzZXJ2YWJsZUZyb21PYmplY3QoZGF0YSkpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdmYW1pbGllc0NvdW50JywgZmFtaWxpZXMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBpZiAoZmFtaWxpZXMubGVuZ3RoID4gMSkgdGhpcy5mYW1pbGllcy5nZXRJdGVtKDApLnNldCgnanVzdE9uZUZhbWlseScsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVTZXR0aW5ncygpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyByZW1vdmVGYW1pbHkoYXJncykge1xuICAgICAgICBsZXQgZmFtSWQgPSBhcmdzLm9iamVjdC5pZDtcbiAgICAgICAgZGlhbG9ncy5jb25maXJtKCdBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gcmVtb3ZlIHRoaXMgZmFtaWx5PyBJZiB0aGV5IGhhdmUgY29udHJpYnV0ZWQgdG8gYW55IHNoaWZ0cywgdGhleSB3aWxsIG5vIGxvbmdlciBkaXNwbGF5IGluIHRoZSBzaGlmdCBkZXRhaWxzLCBidXQgdGhlIHRvdGFsIGFtb3VudCByZWNlaXZlZCB3aWxsIG5vdCBjaGFuZ2UuJykudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgdXNlclNlcnZpY2UudXBkYXRlRmFtaWx5KGZhbUlkLCB7ZGVsZXRlZDogdHJ1ZX0pLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmFtaWxpZXMgPSBNeU1vZGVsLmZhbWlsaWVzO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZGVsZXRlSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGZhbWlsaWVzLmZvckVhY2goKGVsZW1lbnQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5nZXQoJ2lkJykgPT0gZmFtSWQpIGRlbGV0ZUluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBmYW1pbGllcy5zcGxpY2UoZGVsZXRlSW5kZXgsIDEpXG4gICAgICAgICAgICAgICAgICAgIGlmIChmYW1pbGllcy5sZW5ndGggPT0gMSkgTXlNb2RlbC5mYW1pbGllcy5nZXRJdGVtKDApLnNldCgnanVzdE9uZUZhbWlseScsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnZmFtaWxpZXMnLCBmYW1pbGllcyk7XG4gICAgICAgICAgICAgICAgICAgIE15TW9kZWwuaGlkZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0VGhpc1dlZWtTaGlmdHMocmVmcmVzaERhdGE/KSB7XG4gICAgICAgIGlmIChyZWZyZXNoRGF0YSkge1xuICAgICAgICAgICAgdGhpcy5zZXQoJ2lzTG9hZGluZycsIHRydWUpO1xuICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLmdldFNoaWZ0cygxNSwgdHJ1ZSkudGhlbihzaGlmdHMgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdpc0xvYWRpbmcnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzU2hpZnRzKHNoaWZ0cyk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IHNoaWZ0cyA9IHt9O1xuICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpIHNoaWZ0cyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSk7XG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NTaGlmdHMoc2hpZnRzKTtcblxuICAgICAgICAgICAgXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfVxuXG4gICAgLyoqKioqKioqKioqKioqKioqKiBJTlZPSUNFIEZVTkNUSU9OUyAqKioqKioqKioqKioqKioqKiovXG5cbiAgICBwdWJsaWMgaW52b2ljZU9wdGlvbnMoYXJncykge1xuICAgICAgICBsZXQgaW52b2ljZSA9IHRoaXMuaW52b2ljZXMuZ2V0SXRlbShhcmdzLmluZGV4KTtcbiAgICAgICAgaWYgKGludm9pY2UpIHtcbiAgICAgICAgICAgIGxldCBhY3Rpb25zID0gW107XG4gICAgICAgICAgICBpZiAoIWludm9pY2UuZ2V0KCdwYWlkJykpIHtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnB1c2goJ01hcmsgQXMgUGFpZCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnB1c2goJ1VubWFyayBBcyBQYWlkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWludm9pY2UuZ2V0KCdzZW50JykpIHtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnB1c2goJ1NlbmQgdG8gJyArIHRoaXMuZmFtaWxpZXNNYXBbaW52b2ljZS5nZXQoJ2ZhbWlseV9pZCcpXS5uYW1lKTtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnB1c2goJ0VkaXQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpbnZvaWNlLmdldCgncGFpZCcpKSBhY3Rpb25zLnB1c2goJ1JlLXNlbmQgdG8gJyArIHRoaXMuZmFtaWxpZXNNYXBbaW52b2ljZS5nZXQoJ2ZhbWlseV9pZCcpXS5uYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFjdGlvbnMucHVzaCgnVmlldycpO1xuICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCdEZWxldGUnKTtcblxuICAgICAgICAgICAgZGlhbG9ncy5hY3Rpb24odGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmdldCgnZmFtaWx5X2lkJyldLm5hbWUgKyAnIGZvciAkJyArIGludm9pY2UuZ2V0KCd0b3RhbCcpLCBcIkNhbmNlbFwiLCBhY3Rpb25zKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PSAnRWRpdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy90aGlzLnNob3dFZGl0U2hpZnQoZmFsc2UsIHNoaWZ0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PSAnRGVsZXRlJykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbXNnID0gJ0FyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgdGhpcyBpbnZvaWNlPyc7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnZvaWNlLmdldCgncGFpZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtc2cgKz0gJyBZb3VcXCd2ZSBtYXJrZWQgdGhpcyBpbnZvaWNlIGFzIHBhaWQsIHNvIHJlbWVtYmVyIHRvIGFkanVzdCB5b3VyIHJlY29yZHMgYWNjb3JkaW5nbHkuJzsgXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW52b2ljZS5nZXQoJ3NlbnQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9ICcgWW91XFwndmUgYWxyZWFkeSBzZW50IHRoaXMgaW52b2ljZSB0byAnICsgdGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmdldCgnZmFtaWx5X2lkJyldLm5hbWUgKyAnLCBzbyBwbGVhc2UgcmVhY2ggb3V0IHRvIHRoZW0gZGlyZWN0bHkgaW5mb3JtaW5nIHRoZW0gdGhhdCB0aGV5IGNhbiBkaXNjYXJkIHRoaXMgaW52b2ljZS4nO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZGlhbG9ncy5hY3Rpb24obXNnLCBcIkNhbmNlbFwiLCBbXCJEbyBpdC5cIl0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PSAnRG8gaXQuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdsb2FkaW5nJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLmRlbGV0ZUludm9pY2UoaW52b2ljZS5nZXQoJ2lkJykpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGludm9pY2VzID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpIGludm9pY2VzID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NJbnZvaWNlcyhpbnZvaWNlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdsb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT0gJ01hcmsgQXMgUGFpZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLnVwZGF0ZUludm9pY2UoaW52b2ljZS5nZXQoJ2lkJyksIHtwYWlkOiB0cnVlfSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgncGFpZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRvdGFsID0gcGFyc2VGbG9hdChpbnZvaWNlLmdldCgndG90YWwnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY3VycmVudFVucGFpZFRvdGFsID0gcGFyc2VGbG9hdCh0aGlzLmdldCgndG90YWxVbnBhaWQnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3VW5wYWlkVG90YWwgPSAoY3VycmVudFVucGFpZFRvdGFsIC0gdG90YWwpLnRvRml4ZWQoMik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCgndG90YWxVbnBhaWQnLCBuZXdVbnBhaWRUb3RhbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCgndG90YWxVbnBhaWRTdHJpbmcnLCAnWW91IGhhdmUgJCcgKyBuZXdVbnBhaWRUb3RhbCArICcgaW4gdW5wYWlkIGludm9pY2VzLicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFuZXdVbnBhaWRUb3RhbCB8fCBuZXdVbnBhaWRUb3RhbCA9PSAnMC4wMCcpIHRoaXMuc2V0KCd0b3RhbFVucGFpZFN0cmluZycsICdZb3VcXCdyZSBhbGwgcGFpZCB1cCEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnZvaWNlTGlzdFZpZXc6IExpc3RWaWV3ID0gdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdpbnZvaWNlc19saXN0dmlldycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZUxpc3RWaWV3LnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdGhpcy5pbnZvaWNlcy5zZXRJdGVtKGFyZ3MuaW5kZXgsIGludm9pY2UpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09ICdVbm1hcmsgQXMgUGFpZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLnVwZGF0ZUludm9pY2UoaW52b2ljZS5nZXQoJ2lkJyksIHtwYWlkOiBmYWxzZX0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdsb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ3BhaWQnLCBmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0b3RhbCA9IHBhcnNlRmxvYXQoaW52b2ljZS5nZXQoJ3RvdGFsJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRVbnBhaWRUb3RhbCA9IHBhcnNlRmxvYXQodGhpcy5nZXQoJ3RvdGFsVW5wYWlkJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld1VucGFpZFRvdGFsID0gKGN1cnJlbnRVbnBhaWRUb3RhbCArIHRvdGFsKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ3RvdGFsVW5wYWlkJywgbmV3VW5wYWlkVG90YWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ3RvdGFsVW5wYWlkU3RyaW5nJywgJ1lvdSBoYXZlICQnICsgbmV3VW5wYWlkVG90YWwgKyAnIGluIHVucGFpZCBpbnZvaWNlcy4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbmV3VW5wYWlkVG90YWwgfHwgbmV3VW5wYWlkVG90YWwgPT0gJzAuMDAnKSB0aGlzLnNldCgndG90YWxVbnBhaWRTdHJpbmcnLCAnWW91XFwncmUgYWxsIHBhaWQgdXAhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW52b2ljZUxpc3RWaWV3OiBMaXN0VmlldyA9IHRoaXMucGFnZS5nZXRWaWV3QnlJZCgnaW52b2ljZXNfbGlzdHZpZXcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2VMaXN0Vmlldy5yZWZyZXNoKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT0gJ1ZpZXcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW52b2ljZU1hcFtpbnZvaWNlLmdldCgnaWQnKV0uZmFtaWx5ID0gdGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmdldCgnZmFtaWx5X2lkJyldO1xuICAgICAgICAgICAgICAgICAgICBsZXQgbmF2aWdhdGlvbkVudHJ5OmZyYW1lLk5hdmlnYXRpb25FbnRyeSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZHVsZU5hbWU6IFwiL3ZpZXdzL2ludm9pY2UvaW52b2ljZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dDogdGhpcy5pbnZvaWNlTWFwW2ludm9pY2UuZ2V0KCdpZCcpXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFja3N0YWNrVmlzaWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySGlzdG9yeTogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgZnJhbWUudG9wbW9zdCgpLm5hdmlnYXRlKG5hdmlnYXRpb25FbnRyeSk7XG4gICAgICAgICAgICAgICAgICAgIC8vZnJhbWUudG9wbW9zdCgpLm5hdmlnYXRlKCcvdmlld3MvaW52b2ljZS9pbnZvaWNlJyk7XG5cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PSAnU2VuZCB0byAnICsgdGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmdldCgnZmFtaWx5X2lkJyldLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZW5kSW52b2ljZShpbnZvaWNlLmdldCgnaWQnKSwgaW52b2ljZSk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBzZW50VGltZXMgPSBbbW9tZW50KCkuZm9ybWF0KCldO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRpcihzZW50VGltZXMpO1xuICAgICAgICAgICAgICAgICAgICBzaGlmdFNlcnZpY2UudXBkYXRlSW52b2ljZShpbnZvaWNlLmdldCgnaWQnKSwge3NlbnQ6IHRydWUsIHNlbnRfdGltZXM6IHNlbnRUaW1lc30pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdzZW50JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydCgnVGhlIGludm9pY2UgaGFzIGJlZW4gc2VudCEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdsb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09ICdSZS1zZW5kIHRvICcgKyB0aGlzLmZhbWlsaWVzTWFwW2ludm9pY2UuZ2V0KCdmYW1pbHlfaWQnKV0ubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgc2VudFRpbWVzID0gW21vbWVudCgpLmZvcm1hdCgpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGludm9pY2UuZ2V0KCdzZW50X3RpbWVzJykgJiYgaW52b2ljZS5nZXQoJ3NlbnRfdGltZXMnKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbnRUaW1lcyA9IGludm9pY2UuZ2V0KCdzZW50X3RpbWVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZW50VGltZXMucHVzaChtb21lbnQoKS5mb3JtYXQoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kaXIoc2VudFRpbWVzKTtcbiAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZW5kSW52b2ljZShpbnZvaWNlLmdldCgnaWQnKSwgaW52b2ljZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBzaGlmdFNlcnZpY2UudXBkYXRlSW52b2ljZShpbnZvaWNlLmdldCgnaWQnKSwge3NlbnQ6IHRydWUsIHNlbnRfdGltZXM6IHNlbnRUaW1lc30pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ3NlbnQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdzZW50X3RpbWVzJywgc2VudFRpbWVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0KCdUaGUgaW52b2ljZSBoYXMgYmVlbiBzZW50IScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ2xvYWRpbmcnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KCdXZSBzZW50IGEgZnJpZW5kbHkgcmVtaW5kZXIgdG8gJyArIHRoaXMuZmFtaWxpZXNNYXBbaW52b2ljZS5nZXQoJ2ZhbWlseV9pZCcpXS5uYW1lKVxuICAgICAgICAgICAgICAgIH0gXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIHNob3dDcmVhdGVJbnZvaWNlKCkge1xuICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRGYW1pbHlUb0ludm9pY2UnLCBmYWxzZSk7XG4gICAgICAgIFxuICAgICAgICBNeU1vZGVsLnNldCgndW5pbnZvaWNlZFNoaWZ0cycsIFtdKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmZhbWlsaWVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICB3aGlsZSAodGhpcy51bmludm9pY2VkU2hpZnRzLmxlbmd0aCkgdGhpcy51bmludm9pY2VkU2hpZnRzLnBvcCgpO1xuICAgICAgICAgICAgbGV0IHVuaW52b2ljZWRTaGlmdHNBcnJheSA9IFtdO1xuICAgICAgICAgICAgbGV0IGZhbWlseSA9IHRoaXMuZmFtaWxpZXNNYXBbdGhpcy5mYW1pbGllcy5nZXRJdGVtKDApLmdldCgnaWQnKV07XG4gICAgICAgICAgICBsZXQgaW52b2ljZVRvdGFsID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGkgaW4gdGhpcy51bmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXBbZmFtaWx5LmlkXSkge1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFkZGVkU2hpZnRzTWFwW2ldLmVuZF90aW1lICYmIHRoaXMuYWRkZWRTaGlmdHNNYXBbaV0uY29udHJpYnV0aW9uc1tmYW1pbHkuaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBmYW1pbHlDb250cmlidXRpb24gPSB0aGlzLmFkZGVkU2hpZnRzTWFwW2ldLmNvbnRyaWJ1dGlvbnNbZmFtaWx5LmlkXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRlZFNoaWZ0c01hcFtpXS5zZWxlY3RlZF9mYW1pbHlfY29udHJpYnV0aW9uID0gZmFtaWx5Q29udHJpYnV0aW9uO1xuICAgICAgICAgICAgICAgICAgICB1bmludm9pY2VkU2hpZnRzQXJyYXkucHVzaCh0aGlzLmFkZGVkU2hpZnRzTWFwW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgaW52b2ljZVRvdGFsICs9ICt0aGlzLmFkZGVkU2hpZnRzTWFwW2ldLnNlbGVjdGVkX2ZhbWlseV9jb250cmlidXRpb247XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHVuaW52b2ljZWRTaGlmdHNBcnJheS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkRmFtaWx5VG9JbnZvaWNlID0gZmFtaWx5O1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdpbnZvaWNlVG90YWwnLCBpbnZvaWNlVG90YWwudG9GaXhlZCgyKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXQoJ3VuaW52b2ljZWRTaGlmdHMnLCB1bmludm9pY2VkU2hpZnRzQXJyYXkpO1xuXG4gICAgICAgICAgICAgICAgTXlNb2RlbC5zaG93U2V0dGluZ3MoJy92aWV3cy9jb21wb25lbnRzL2VkaXRpbnZvaWNlL2VkaXRpbnZvaWNlLnhtbCcpO1xuICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZXR0aW5nc1RpdGxlJywgJ0NyZWF0ZSBJbnZvaWNlJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRGYW1pbHlUb0ludm9pY2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBhbGVydCgnWW91IGRvblxcJ3QgaGF2ZSBhbnkgdW5pbnZvaWNlZCBzaGlmdHMsIHNvIHlvdSBjYW5cXCd0IGNyZWF0ZSBhbiBpbnZvaWNlIHJpZ2h0IG5vdy4nKVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgTXlNb2RlbC5zaG93U2V0dGluZ3MoJy92aWV3cy9jb21wb25lbnRzL2VkaXRpbnZvaWNlL2VkaXRpbnZvaWNlLnhtbCcpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NldHRpbmdzVGl0bGUnLCAnQ3JlYXRlIEludm9pY2UnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBjaG9vc2VGYW1pbHlUb0ludm9pY2UoKSB7XG4gICAgICAgIGlmICh0aGlzLmZhbWlsaWVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzbWlzc1NvZnRJbnB1dHMoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdwaWNraW5nJywgJ2xpc3QnKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdwaWNrZXJUaXRsZScsICdDaG9vc2UgRmFtaWx5Jyk7XG4gICAgICAgICAgICBsZXQgcGlja2VySXRlbXMgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuZmFtaWxpZXMuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBwaWNrZXJJdGVtcy5wdXNoKGl0ZW0uZ2V0KCduYW1lJykpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHRoaXMuc2V0KCdwaWNrZXJJdGVtcycsIHBpY2tlckl0ZW1zKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lVGV4dCcsICdEb25lJyk7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZVNob3coKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdwaWNrZXJDYW5jZWwnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAvLyBlbXB0eSB0aGUgdW5pbnZvaWNlZFNoaWZ0cyBhcnJheSBpZiB0aGVyZXMgYW55dGhpbmcgaW4gaXQuXG4gICAgICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHdoaWxlICh0aGlzLnVuaW52b2ljZWRTaGlmdHMubGVuZ3RoKSB0aGlzLnVuaW52b2ljZWRTaGlmdHMucG9wKCk7XG4gICAgICAgICAgICAgICAgbGV0IHVuaW52b2ljZWRTaGlmdHNBcnJheSA9IFtdO1xuICAgICAgICAgICAgICAgIGxldCBmYW1pbHkgPSB0aGlzLmZhbWlsaWVzTWFwW3RoaXMuZmFtaWxpZXMuZ2V0SXRlbSh0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ2xpc3RwaWNrZXInKS5zZWxlY3RlZEluZGV4KS5nZXQoJ2lkJyldO1xuICAgICAgICAgICAgICAgIGxldCBpbnZvaWNlVG90YWwgPSAwO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gdGhpcy51bmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXBbZmFtaWx5LmlkXSkge1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuYWRkZWRTaGlmdHNNYXBbaV0uZW5kX3RpbWUgJiYgdGhpcy5hZGRlZFNoaWZ0c01hcFtpXS5jb250cmlidXRpb25zW2ZhbWlseS5pZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBmYW1pbHlDb250cmlidXRpb24gPSB0aGlzLmFkZGVkU2hpZnRzTWFwW2ldLmNvbnRyaWJ1dGlvbnNbZmFtaWx5LmlkXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkZWRTaGlmdHNNYXBbaV0uc2VsZWN0ZWRfZmFtaWx5X2NvbnRyaWJ1dGlvbiA9IGZhbWlseUNvbnRyaWJ1dGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuaW52b2ljZWRTaGlmdHNBcnJheS5wdXNoKHRoaXMuYWRkZWRTaGlmdHNNYXBbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZVRvdGFsICs9ICt0aGlzLmFkZGVkU2hpZnRzTWFwW2ldLnNlbGVjdGVkX2ZhbWlseV9jb250cmlidXRpb247XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHVuaW52b2ljZWRTaGlmdHNBcnJheS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEZhbWlseVRvSW52b2ljZSA9IGZhbWlseTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2ludm9pY2VUb3RhbCcsIGludm9pY2VUb3RhbC50b0ZpeGVkKDIpKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ3VuaW52b2ljZWRTaGlmdHMnLCB1bmludm9pY2VkU2hpZnRzQXJyYXkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRGYW1pbHlUb0ludm9pY2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ1RoZSBmYW1pbHkgeW91IGNob3NlIGRvZXMgbm90IGhhdmUgYW55IHVuaW52b2ljZWQgc2hpZnRzLCB0aGV5XFwncmUgYWxsIHBhaWQgdXAhJylcbiAgICAgICAgICAgICAgICB9ICAgICAgIFxuICAgICAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyB1bnNlbGVjdFVuaW52b2ljZWRTaGlmdChhcmdzKSB7XG4gICAgICAgIGlmIChhcmdzLm9iamVjdC5pZCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IE15TW9kZWwudW5pbnZvaWNlZFNoaWZ0cy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgaXRlbSA9IE15TW9kZWwudW5pbnZvaWNlZFNoaWZ0c1tpXTtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS5pZCA9PSBhcmdzLm9iamVjdC5pZCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdGFwcGVkSXRlbTogR3JpZExheW91dCA9IGFyZ3Mub2JqZWN0O1xuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW52b2ljZVRvdGFsID0gcGFyc2VGbG9hdChNeU1vZGVsLmdldCgnaW52b2ljZVRvdGFsJykpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZGlzcGxheWVkIGludm9pY2UgdG90YWwgJyArIG5ld0ludm9pY2VUb3RhbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXBwZWRJdGVtLmNsYXNzTmFtZSA9PSAndW5pbnZvaWNlZF9zaGlmdCBzZWxlY3RlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcHBlZEl0ZW0uY2xhc3NOYW1lID0gJ3VuaW52b2ljZWRfc2hpZnQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5kb19ub3RfaW52b2ljZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJbnZvaWNlVG90YWwgLT0gcGFyc2VGbG9hdChpdGVtLnNlbGVjdGVkX2ZhbWlseV9jb250cmlidXRpb24pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFwcGVkSXRlbS5jbGFzc05hbWUgPSAndW5pbnZvaWNlZF9zaGlmdCBzZWxlY3RlZCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLmRvX25vdF9pbnZvaWNlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJbnZvaWNlVG90YWwgKz0gcGFyc2VGbG9hdChpdGVtLnNlbGVjdGVkX2ZhbWlseV9jb250cmlidXRpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdpbnZvaWNlVG90YWwnLCBuZXdJbnZvaWNlVG90YWwudG9GaXhlZCgyKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIHNhdmVJbnZvaWNlKCkge1xuICAgICAgICBsZXQgc2hpZnRfaWRzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgaXRlbSA9IE15TW9kZWwudW5pbnZvaWNlZFNoaWZ0c1tpXTtcblxuICAgICAgICAgICAgaWYgKCFpdGVtLmRvX25vdF9pbnZvaWNlKSBzaGlmdF9pZHMucHVzaChpdGVtLmlkKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgYXJncyA9IHtcbiAgICAgICAgICAgIHNoaWZ0X2lkczogc2hpZnRfaWRzLFxuICAgICAgICAgICAgZmFtaWx5X2lkOiB0aGlzLmdldCgnc2VsZWN0ZWRGYW1pbHlUb0ludm9pY2UnKS5pZCxcbiAgICAgICAgICAgIHRvdGFsOiB0aGlzLmdldCgnaW52b2ljZVRvdGFsJyksXG4gICAgICAgICAgICBwYWlkOiBmYWxzZSxcbiAgICAgICAgICAgIGRhdGVfY3JlYXRlZDogbW9tZW50KCkuZm9ybWF0KClcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWFyZ3Muc2hpZnRfaWRzIHx8ICFhcmdzLnNoaWZ0X2lkcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFsZXJ0KCdQbGVhc2Ugc2VsZWN0IG9uZSBvciBtb3JlIHNoaWZ0cyB0byBpbmNsdWRlIGluIHRoaXMgaW52b2ljZS4nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNoaWZ0U2VydmljZS5jcmVhdGVJbnZvaWNlKGFyZ3MpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVTZXR0aW5ncygpOyAgICBcbiAgICAgICAgICAgICAgICBsZXQgaW52b2ljZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKSBpbnZvaWNlcyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NJbnZvaWNlcyhpbnZvaWNlcyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIFxuICAgIH1cblxuICAgIHB1YmxpYyBzYXZlQW5kU2VuZEludm9pY2UoKSB7XG4gICAgICAgIGxldCBzaGlmdF9pZHMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IE15TW9kZWwudW5pbnZvaWNlZFNoaWZ0cy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBpdGVtID0gTXlNb2RlbC51bmludm9pY2VkU2hpZnRzW2ldO1xuXG4gICAgICAgICAgICBpZiAoIWl0ZW0uZG9fbm90X2ludm9pY2UpIHNoaWZ0X2lkcy5wdXNoKGl0ZW0uaWQpO1xuICAgICAgICB9XG4gICAgICAgIGxldCBhcmdzID0ge1xuICAgICAgICAgICAgc2hpZnRfaWRzOiBzaGlmdF9pZHMsXG4gICAgICAgICAgICBmYW1pbHlfaWQ6IHRoaXMuZ2V0KCdzZWxlY3RlZEZhbWlseVRvSW52b2ljZScpLmlkLFxuICAgICAgICAgICAgdG90YWw6IHRoaXMuZ2V0KCdpbnZvaWNlVG90YWwnKSxcbiAgICAgICAgICAgIHBhaWQ6IGZhbHNlLFxuICAgICAgICAgICAgZGF0ZV9jcmVhdGVkOiBtb21lbnQoKS5mb3JtYXQoKSxcbiAgICAgICAgICAgIHNlbnQ6IHRydWUsXG4gICAgICAgICAgICBzZW50X3RpbWVzOiBbbW9tZW50KCkuZm9ybWF0KCldXG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFhcmdzLnNoaWZ0X2lkcyB8fCAhYXJncy5zaGlmdF9pZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhbGVydCgnUGxlYXNlIHNlbGVjdCBvbmUgb3IgbW9yZSBzaGlmdHMgdG8gaW5jbHVkZSBpbiB0aGlzIGludm9pY2UuJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzaGlmdFNlcnZpY2UuY3JlYXRlSW52b2ljZShhcmdzKS50aGVuKChyZXN1bHQ6YW55KSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbmRJbnZvaWNlKHJlc3VsdC5rZXkpXG4gICAgICAgICAgICAgICAgbGV0IGludm9pY2VzID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkgaW52b2ljZXMgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoaW52b2ljZXMpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9XG5cbiAgICBwdWJsaWMgc2VuZEludm9pY2UoaW52b2ljZV9pZCwgaW52b2ljZT8sIHJlc2VuZGluZz8pIHtcbiAgICAgICAgbGV0IGh0bWwgPSB0aGlzLmJ1aWxkSW52b2ljZUh0bWwoaW52b2ljZV9pZCwgaW52b2ljZSk7XG4gICAgICAgIGxldCBtZXNzYWdlID0gdGhpcy51c2VyLmZpcnN0X25hbWUgKyAnICcgKyB0aGlzLnVzZXIubGFzdF9uYW1lICsgJyBjcmVhdGVkIHRoZSBpbnZvaWNlIGJlbG93LCBzZW5kIHBheW1lbnQgYXMgc29vbiBhcyB5b3UgY2FuLic7XG4gICAgICAgIGxldCBzdWJqZWN0ID0gdGhpcy51c2VyLmZpcnN0X25hbWUgKyAnICcgKyB0aGlzLnVzZXIubGFzdF9uYW1lICsgJyBoYXMgc2VudCB5b3UgYW4gaW52b2ljZS4nO1xuICAgICAgICBpZiAocmVzZW5kaW5nKSB7XG4gICAgICAgICAgICBtZXNzYWdlID0gdGhpcy51c2VyLmZpcnN0X25hbWUgKyAnICcgKyB0aGlzLnVzZXIubGFzdF9uYW1lICsgJyBwcmV2aW91c2x5IHNlbnQgdGhlIGludm9pY2UgYmVsb3csIGhlcmVcXCdzIGEgZnJpZW5kbHkgcmVtaW5kZXIgdG8gc2VuZCBwYXltZW50IGFzIHNvb24gYXMgeW91IGNhbi4nXG4gICAgICAgICAgICBzdWJqZWN0ID0gdGhpcy51c2VyLmZpcnN0X25hbWUgKyAnICcgKyB0aGlzLnVzZXIubGFzdF9uYW1lICsgJyBpcyBzZW5kaW5nIHlvdSBhIGZyaWVuZGx5IHJlbWluZGVyIGFib3V0IGFuIHVucGFpZCBpbnZvaWNlLidcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWludm9pY2UpIHtcbiAgICAgICAgICAgIHVzZXJTZXJ2aWNlLnNlbmRFbWFpbCh0aGlzLnNlbGVjdGVkRmFtaWx5VG9JbnZvaWNlLCB7ZW1haWw6IHRoaXMudXNlci5lbWFpbCwgbmFtZTogdGhpcy51c2VyLmZpcnN0X25hbWUgKyAnICcgKyB0aGlzLnVzZXIubGFzdF9uYW1lfSwgbWVzc2FnZSwgaHRtbCwgc3ViamVjdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgZmFtaWx5VG9JbnZvaWNlID0gdGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmZhbWlseV9pZF07XG4gICAgICAgICAgICB1c2VyU2VydmljZS5zZW5kRW1haWwoZmFtaWx5VG9JbnZvaWNlLCB7ZW1haWw6IHRoaXMudXNlci5lbWFpbCwgbmFtZTogdGhpcy51c2VyLmZpcnN0X25hbWUgKyAnICcgKyB0aGlzLnVzZXIubGFzdF9uYW1lfSwgbWVzc2FnZSwgaHRtbCwgc3ViamVjdCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfVxuXG4gICAgcHJpdmF0ZSBidWlsZEludm9pY2VIdG1sKGludm9pY2VfaWQsIGludm9pY2U/KSB7XG4gICAgICAgIGxldCBodG1sID0gYFxuICAgICAgICAgICAgPGNlbnRlcj48c3BhbiBzdHlsZT1cImNvbG9yOiBncmF5OyBmb250LXNpemU6IDExcHg7IGNvbG9yOiBncmF5O1wiPkludm9pY2UgSUQ6IGAgKyBpbnZvaWNlX2lkICsgYDwvc3Bhbj48L2NlbnRlcj5cbiAgICAgICAgICAgIDx0YWJsZSB3aWR0aD1cIjEwMCVcIiBzdHlsZT1cImZvbnQtZmFtaWx5OiBIZWx2ZXRpY2E7IGZvbnQtc2l6ZTogMTNweDtcIiBjZWxscGFkZGluZz1cIjBcIiBjZWxsc3BhY2luZz1cIjBcIj5cbiAgICAgICAgICAgICAgICA8dHI+XG4gICAgICAgICAgICAgICAgICAgIDx0aCBhbGlnbj1cImxlZnRcIiB3aWR0aD1cIjEwMCVcIiBzdHlsZT1cInBhZGRpbmc6IDU7IGJvcmRlci1ib3R0b206IDJweCBzb2xpZCAjRTBFMEUwO1wiPlNoaWZ0czwvdGg+XG4gICAgICAgICAgICAgICAgICAgIDx0aCBhbGlnbj1cImxlZnRcIiBzdHlsZT1cInBhZGRpbmc6IDU7IGJvcmRlci1ib3R0b206IDJweCBzb2xpZCAjRTBFMEUwO1wiPkNvbnRyaWJ1dGlvbjwvdGg+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgYFxuICAgICAgICBpZiAoIWludm9pY2UpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHNbaV07XG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtLmRvX25vdF9pbnZvaWNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBhbGlnbj1cImxlZnRcIiBzdHlsZT1cInBhZGRpbmc6IDU7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZjVmNWY1O1wiPmArIGl0ZW0uZGlzcGxheV9kYXRlICtgPGJyIC8+PHNwYW4gc3R5bGU9XCJmb250LXNpemU6IDExcHg7IGNvbG9yOiBncmF5O1wiPmAgKyBpdGVtLmRpc3BsYXlfdGltaW5nICsgYDwvc3Bhbj48L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBhbGlnbj1cImxlZnRcIiBzdHlsZT1cInBhZGRpbmc6IDU7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZjVmNWY1OyBmb250LXdlaWdodDogYm9sZDtcIj4kYCArIGl0ZW0uY29udHJpYnV0aW9uc1t0aGlzLnNlbGVjdGVkRmFtaWx5VG9JbnZvaWNlLmlkXSArIGA8L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgPC90YWJsZT5cbiAgICAgICAgICAgICAgICA8Y2VudGVyPjxoMiBzdHlsZT1cImZvbnQtZmFtaWx5OiBIZWx2ZXRpY2E7XCI+SW52b2ljZSBUb3RhbDogPHNwYW4gc3R5bGU9XCJjb2xvcjogZ3JlZW47XCI+JGAgKyB0aGlzLmludm9pY2VUb3RhbCArIGA8L3NwYW4+PC9oMj48L2NlbnRlcj5cbiAgICAgICAgICAgIGBcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpbnZvaWNlLnNoaWZ0X2lkcy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgc2hpZnQgPSBNeU1vZGVsLmFkZGVkU2hpZnRzTWFwW2ludm9pY2Uuc2hpZnRfaWRzW2ldXTtcbiAgICAgICAgICAgICAgICBpZiAoc2hpZnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8dHI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGFsaWduPVwibGVmdFwiIHN0eWxlPVwicGFkZGluZzogNTsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNmNWY1ZjU7XCI+YCsgc2hpZnQuZGlzcGxheV9kYXRlICtgPGJyIC8+PHNwYW4gc3R5bGU9XCJmb250LXNpemU6IDExcHg7IGNvbG9yOiBncmF5O1wiPmAgKyBzaGlmdC5kaXNwbGF5X3RpbWluZyArIGA8L3NwYW4+PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgYWxpZ249XCJsZWZ0XCIgc3R5bGU9XCJwYWRkaW5nOiA1OyBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2Y1ZjVmNTsgZm9udC13ZWlnaHQ6IGJvbGQ7XCI+JGAgKyBzaGlmdC5jb250cmlidXRpb25zW2ludm9pY2UuZmFtaWx5X2lkXSArIGA8L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgPC90YWJsZT5cbiAgICAgICAgICAgICAgICA8Y2VudGVyPjxoMiBzdHlsZT1cImZvbnQtZmFtaWx5OiBIZWx2ZXRpY2E7XCI+SW52b2ljZSBUb3RhbDogPHNwYW4gc3R5bGU9XCJjb2xvcjogZ3JlZW47XCI+JGAgKyBpbnZvaWNlLnRvdGFsICsgYDwvc3Bhbj48L2gyPjwvY2VudGVyPlxuICAgICAgICAgICAgYFxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG4gICAgXG4gICAgLyoqKioqKioqKioqKioqKioqKiAvSU5WT0lDRSBGVU5DVElPTlMgKioqKioqKioqKioqKioqKioqL1xuXG4gICAgLyoqKioqKioqKioqKioqKioqKiBTSElGVCBGVU5DVElPTlMgKioqKioqKioqKioqKioqKioqL1xuXG4gICAgcHVibGljIHNoaWZ0T3B0aW9ucyhhcmdzKSB7XG4gICAgICAgIGxldCBzaGlmdDtcbiAgICAgICAgaWYgKGFyZ3MuZXZlbnROYW1lICYmIGFyZ3MuZXZlbnROYW1lID09ICdpdGVtVGFwJykge1xuICAgICAgICAgICAgc2hpZnQgPSBNeU1vZGVsLmFkZGVkU2hpZnRzTWFwW3RoaXMuc2VjdGlvbmVkU2hpZnRzLmdldEl0ZW0oYXJncy5pbmRleCkuZ2V0KCdpZCcpXVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2hpZnQgPSBNeU1vZGVsLmFkZGVkU2hpZnRzTWFwW2FyZ3Mub2JqZWN0LmlkXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2hpZnQpIHtcbiAgICAgICAgICAgIGRpYWxvZ3MuYWN0aW9uKHNoaWZ0LnRpdGxlICsgJyBmcm9tICcgKyBzaGlmdC5kaXNwbGF5X2hvdXJzLCBcIkNhbmNlbFwiLCBbXCJFZGl0IFNoaWZ0XCIsIFwiRGVsZXRlIFNoaWZ0XCJdKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PSAnRWRpdCBTaGlmdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kaXIoSlNPTi5zdHJpbmdpZnkoc2hpZnQuaW52b2ljZWQpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNoaWZ0Lmludm9pY2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbXNnID0gJ1RoaXMgc2hpZnQgaXMgaW5jbHVkZWQgaW4gaW52b2ljZXMgZm9yIHRoZSBmb2xsb3dpbmcgZmFtaWxlczogJyArIHNoaWZ0Lmludm9pY2VkX2ZhbWlsaWVzX3N0cmluZyArICcuIElmIHlvdSBlZGl0IHRoZSBjb250cmlidXRpb25zIGZvciBhIGZhbWlseSwgeW91XFwnbGwgbmVlZCB0byBkZWxldGUgdGhlIGludm9pY2UgdGhpcyBzaGlmdCBpcyBhc3NvY2lhdGVkIHdpdGggYW5kIGNyZWF0ZSBhIG5ldyBvbmUuIEFsc28sIG1ha2Ugc3VyZSB5b3UgcmVhY2ggb3V0IHRvIHRoZSBmYW1pbHkgYW5kIGluZm9ybSB0aGVtIHRvIGlnbm9yZSB0aGUgcHJldmlvdXMgaW52b2ljZS4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZmFtaWxpZXMubGVuZ3RoID09IDEpIG1zZyA9ICdUaGlzIHNoaWZ0IGlzIGluY2x1ZGVkIGluIGFuIGludm9pY2UgYWxyZWFkeS4gSWYgeW91IGVkaXQgdGhlIGhvdXJzIHdvcmtlZCwgeW91XFwnbGwgbmVlZCB0byBkZWxldGUgdGhlIGludm9pY2UgdGhpcyBzaGlmdCBpcyBhc3NvY2lhdGVkIHdpdGggYW5kIGNyZWF0ZSBhIG5ldyBvbmUuIEFsc28sIG1ha2Ugc3VyZSB5b3UgcmVhY2ggb3V0IHRvIHRoZSBmYW1pbHkgYW5kIGluZm9ybSB0aGVtIHRvIGlnbm9yZSB0aGUgcHJldmlvdXMgaW52b2ljZS4nXG4gICAgICAgICAgICAgICAgICAgICAgICBkaWFsb2dzLmNvbmZpcm0oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiBcIlRoaXMgc2hpZnQgaGFzIGFscmVhZHkgYmVlbiBpbnZvaWNlZCFcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBtc2csXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2tCdXR0b25UZXh0OiBcIk9rLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbmNlbEJ1dHRvblRleHQ6IFwiQ2FuY2VsXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlc3VsdCBhcmd1bWVudCBpcyBib29sZWFuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kaXIocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvd0VkaXRTaGlmdChmYWxzZSwgc2hpZnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG93RWRpdFNoaWZ0KGZhbHNlLCBzaGlmdCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT0gJ0RlbGV0ZSBTaGlmdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1zZyA9ICdBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoaXMgc2hpZnQ/IFRoaXMgY2Fubm90IGJlIHVuZG9uZS4nO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2hpZnQuaW52b2ljZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zZyA9ICdUaGlzIHNoaWZ0IGlzIGluY2x1ZGVkIGluIGludm9pY2VzIGZvciB0aGUgZm9sbG93aW5nIGZhbWlsZXM6ICcgKyBzaGlmdC5pbnZvaWNlZF9mYW1pbGllc19zdHJpbmcgKyAnLiBEZWxldGluZyB0aGlzIHNoaWZ0IHdpbGwgcmVtb3ZlIGl0IGZyb20gdGhhdCBpbnZvaWNlLCBidXQgbm90IGFkanVzdCB0aGUgaW52b2ljZVxcJ3MgdG90YWwuIEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgdGhpcyBzaGlmdD8gSXQgY2Fubm90IGJlIHVuZG9uZS4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZmFtaWxpZXMubGVuZ3RoID09IDEpIG1zZyA9ICdUaGlzIHNoaWZ0IGlzIGluY2x1ZGVkIGluIGFuIGludm9pY2UuIERlbGV0aW5nIHRoaXMgc2hpZnQgd2lsbCByZW1vdmUgaXQgZnJvbSB0aGF0IGludm9pY2UsIGJ1dCBub3QgYWRqdXN0IHRoZSBpbnZvaWNlXFwncyB0b3RhbC4gQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSB0aGlzIHNoaWZ0PyBJdCBjYW5ub3QgYmUgdW5kb25lLic7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBkaWFsb2dzLmFjdGlvbihtc2csIFwiQ2FuY2VsXCIsIFtcIkRvIGl0LlwiXSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PSAnRG8gaXQuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNoaWZ0U2VydmljZS5kZWxldGVTaGlmdChzaGlmdC5pZCkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTaGlmdHMoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnZvaWNlcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKSBpbnZvaWNlcyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoaW52b2ljZXMpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9XG5cbiAgICBwdWJsaWMgc2hvd0VkaXRTaGlmdChhcmdzLCBzaGlmdCkge1xuICAgICAgICAvLyBgdGhpc2AgaXMgbm93IHJlZmVycmluZyB0byB0aGUgdGFwcGVkIHNoaWZ0IG9iamVjdCwgYW5kIG5vdCB0aGUgbW9kZWwgYW55bW9yZSwgXG4gICAgICAgIC8vIHNvIHdlIGhhdmUgdG8gdXNlIE15TW9kZWwgd2hpY2ggaXMgYSByZWZlcmVuY2UgdG8gSG9tZU1vZGVsLlxuICAgICAgICAvLyBjb25zb2xlLmRpcihhcmdzKTtcbiAgICAgICAgaWYgKGFyZ3MpIHtcbiAgICAgICAgICAgIGlmIChhcmdzLmV2ZW50TmFtZSAmJiBhcmdzLmV2ZW50TmFtZSA9PSAnaXRlbVRhcCcpIHtcbiAgICAgICAgICAgICAgICBzaGlmdCA9IE15TW9kZWwuYWRkZWRTaGlmdHNNYXBbdGhpcy5zZWN0aW9uZWRTaGlmdHMuZ2V0SXRlbShhcmdzLmluZGV4KS5nZXQoJ2lkJyldXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFyZ3Mub2JqZWN0LmlkKSB7XG4gICAgICAgICAgICAgICAgc2hpZnQgPSBNeU1vZGVsLmFkZGVkU2hpZnRzTWFwW2FyZ3Mub2JqZWN0LmlkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNoaWZ0KSB7XG4gICAgICAgICAgICBNeU1vZGVsLnNob3dTZXR0aW5ncygnL3ZpZXdzL2NvbXBvbmVudHMvZW5kc2hpZnQvZW5kc2hpZnQueG1sJyk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2V0dGluZ3NUaXRsZScsICdBZGQgU2hpZnQnKTtcbiAgICAgICAgICAgIGVkaXRpbmdTaGlmdCA9IHt9O1xuICAgICAgICAgICAgbGV0IHN0YXJ0VGltZSA9IG1vbWVudCgpLmZvcm1hdCgnWVlZWS1NTS1ERCcpICsgJyAwOTowMDowMCc7XG4gICAgICAgICAgICBsZXQgZW5kVGltZSA9IG1vbWVudCgpLmZvcm1hdCgnWVlZWS1NTS1ERCcpICsgJyAxNzowMDowMCc7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0U3RhcnREYXRlJywgbW9tZW50KCkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKSlcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRTdGFydFRpbWUnLCBtb21lbnQoc3RhcnRUaW1lKS5mb3JtYXQoJ2g6bW1hJykpXG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRTdGFydERhdGUnLCBtb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRTdGFydFRpbWUnLCBtb21lbnQoc3RhcnRUaW1lKS5mb3JtYXQoJ0hIOm1tJykpXG5cbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRFbmREYXRlJywgbW9tZW50KCkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKSlcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRFbmRUaW1lJywgbW9tZW50KGVuZFRpbWUpLmZvcm1hdCgnaDptbWEnKSlcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZEVuZERhdGUnLCBtb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRFbmRUaW1lJywgbW9tZW50KGVuZFRpbWUpLmZvcm1hdCgnSEg6bW0nKSlcbiAgICAgICAgICAgIGVkaXRpbmdTaGlmdC5zdGFydF90aW1lID0gbW9tZW50KHN0YXJ0VGltZSkuZm9ybWF0KCk7XG4gICAgICAgICAgICBlZGl0aW5nU2hpZnQuZW5kX3RpbWUgPSBtb21lbnQoZW5kVGltZSkuZm9ybWF0KCk7XG4gICAgICAgICAgICBsZXQgY29tcGFyZUEgPSBtb21lbnQoZW5kVGltZSk7XG4gICAgICAgICAgICB2YXIgbWludXRlc1dvcmtlZCA9IGNvbXBhcmVBLmRpZmYobW9tZW50KHN0YXJ0VGltZSksICdtaW51dGVzJylcbiAgICAgICAgICAgIHZhciBob3Vyc1dvcmtlZCA9IChtaW51dGVzV29ya2VkLzYwKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgbGV0IG1pbnV0ZVJhdGUgPSBwYXJzZUZsb2F0KE15TW9kZWwudXNlci5ob3VybHlSYXRlKS82MDtcbiAgICAgICAgICAgIGxldCBvdmVydGltZU1pbnV0ZVJhdGUgPSBwYXJzZUZsb2F0KE15TW9kZWwudXNlci5vdmVydGltZVJhdGUpLzYwO1xuXG4gICAgICAgICAgICBsZXQgd29ya2VkID0gc2hpZnRTZXJ2aWNlLmNhbGN1bGF0ZVNoaWZ0SG91cnNXb3JrZWQoZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUsIGVkaXRpbmdTaGlmdC5lbmRfdGltZSk7O1xuICAgICAgICAgICAgTXlNb2RlbC51cGRhdGVUb3RhbEVhcm5lZCgpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0VG90YWxXb3JrZWQnLCB3b3JrZWQudGltZV93b3JrZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWRpdGluZ1NoaWZ0ID0gT2JqZWN0LmFzc2lnbih7fSwgc2hpZnQpO1xuICAgICAgICAgICAgTXlNb2RlbC5zaG93U2V0dGluZ3MoJy92aWV3cy9jb21wb25lbnRzL2VuZHNoaWZ0L2VuZHNoaWZ0LnhtbCcpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NldHRpbmdzVGl0bGUnLCAnRW5kIFNoaWZ0Jyk7XG4gICAgICAgICAgICBpZiAoc2hpZnQuZW5kX3RpbWUpIHtcbiAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnc2V0dGluZ3NUaXRsZScsICdFZGl0IFNoaWZ0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0U3RhcnREYXRlJywgbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnTU1NIERvLCBZWVlZJykpXG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0U3RhcnRUaW1lJywgbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnaDptbWEnKSlcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZFN0YXJ0RGF0ZScsIG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ1lZWVktTU0tREQnKSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRTdGFydFRpbWUnLCBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdISDptbScpKVxuXG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0RW5kRGF0ZScsIG1vbWVudCgpLmZvcm1hdCgnTU1NIERvLCBZWVlZJykpXG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0RW5kVGltZScsIG1vbWVudCgpLmZvcm1hdCgnaDptbWEnKSlcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZEVuZERhdGUnLCBtb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRFbmRUaW1lJywgbW9tZW50KCkuZm9ybWF0KCdISDptbScpKVxuICAgICAgICAgICAgZWRpdGluZ1NoaWZ0LmVuZF90aW1lID0gbW9tZW50KCkuZm9ybWF0KCk7XG4gICAgICAgICAgICBpZiAoc2hpZnQuZW5kX3RpbWUpIHtcbiAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0RW5kRGF0ZScsIG1vbWVudChzaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKSlcbiAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0RW5kVGltZScsIG1vbWVudChzaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdoOm1tYScpKVxuICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZEVuZERhdGUnLCBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnWVlZWS1NTS1ERCcpKTtcbiAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRFbmRUaW1lJywgbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ0hIOm1tJykpXG4gICAgICAgICAgICAgICAgZWRpdGluZ1NoaWZ0LmVuZF90aW1lID0gbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gY29uc29sZS5kaXIoc2hpZnQuY29udHJpYnV0aW9ucyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGNvbXBhcmVBID0gbW9tZW50KCk7XG4gICAgICAgICAgICBpZiAoc2hpZnQuZW5kX3RpbWUpIGNvbXBhcmVBID0gbW9tZW50KHNoaWZ0LmVuZF90aW1lKTtcbiAgICAgICAgICAgIHZhciBtaW51dGVzV29ya2VkID0gY29tcGFyZUEuZGlmZihtb21lbnQoc2hpZnQuc3RhcnRfdGltZSksICdtaW51dGVzJylcbiAgICAgICAgICAgIHZhciBob3Vyc1dvcmtlZCA9IChtaW51dGVzV29ya2VkLzYwKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgbGV0IG1pbnV0ZVJhdGUgPSBwYXJzZUZsb2F0KE15TW9kZWwudXNlci5ob3VybHlSYXRlKS82MDtcbiAgICAgICAgICAgIGxldCBvdmVydGltZU1pbnV0ZVJhdGUgPSBwYXJzZUZsb2F0KE15TW9kZWwudXNlci5vdmVydGltZVJhdGUpLzYwO1xuXG5cbiAgICAgICAgICAgIGxldCB3b3JrZWQgPSBzaGlmdFNlcnZpY2UuY2FsY3VsYXRlU2hpZnRIb3Vyc1dvcmtlZChlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSwgZWRpdGluZ1NoaWZ0LmVuZF90aW1lKTs7XG4gICAgICAgICAgICBNeU1vZGVsLnVwZGF0ZVRvdGFsRWFybmVkKCk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZW5kU2hpZnRUb3RhbFdvcmtlZCcsIHdvcmtlZC50aW1lX3dvcmtlZCk7XG4gICAgICAgIH0gICAgICAgIFxuICAgIH1cblxuICAgIHB1YmxpYyBnZXRQcmV2aW91c1NoaWZ0c1RvdGFsTWludXRlcyhzaGlmdCkge1xuICAgICAgICAvLyB0aGlzIGZ1bmN0aW9uIGdldHMgdGhlIHRvdGFsIG1pbnV0ZXMgd29ya2VkIHVwIHRvIHRoYXQgc2hpZnQgdGhhdCB3ZWVrIHRvIGRldGVybWluZSBpZiBcbiAgICAgICAgLy8gYW55IG92ZXJ0aW1lIHBheSBzaG91bGQgYmUgYXR0cmlidXRlZCB0byB0aGlzIHNoaWZ0LlxuICAgICAgICB2YXIgYmVnaW5uaW5nT2ZXZWVrID0gbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmlzb1dlZWtkYXkoMCkuZm9ybWF0KCdkZGRkIE1NTU0gRG8gWVlZWScpO1xuICAgICAgICBpZiAobW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmlzb1dlZWtkYXkoKSA9PSAwIHx8IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5pc29XZWVrZGF5KCkgPT0gNykgeyAvL2lzIGEgc3VuZGF5LlxuICAgICAgICAgICAgYmVnaW5uaW5nT2ZXZWVrID0gbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnZGRkZCBNTU1NIERvIFlZWVknKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgdG90YWxNaW51dGVzID0gMDtcbiAgICAgICAgbGV0IHJldmVyc2VTaGlmdHMgPSBbXTtcbiAgICAgICAgaWYgKHRoaXMud2Vla3NbYmVnaW5uaW5nT2ZXZWVrXSkgcmV2ZXJzZVNoaWZ0cyA9IHRoaXMud2Vla3NbYmVnaW5uaW5nT2ZXZWVrXS5zaGlmdHMuc2xpY2UoMCkucmV2ZXJzZSgpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgcmV2ZXJzZVNoaWZ0cy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBteVNoaWZ0ID0gcmV2ZXJzZVNoaWZ0c1tpXTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUuZGlyKG15U2hpZnQpO1xuICAgICAgICAgICAgaWYgKG15U2hpZnQuaWQgIT0gc2hpZnQuaWQpIHtcbiAgICAgICAgICAgICAgICB0b3RhbE1pbnV0ZXMgKz0gbXlTaGlmdC5taW51dGVzX3dvcmtlZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ3RvdGFsIG1pbnV0ZXM6ICcgKyB0b3RhbE1pbnV0ZXMpO1xuICAgICAgICByZXR1cm4gdG90YWxNaW51dGVzO1xuICAgIH1cblxuICAgIHB1YmxpYyBkaXNtaXNzU29mdElucHV0cygpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IHRoaXMuZmFtaWxpZXMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgdGV4dEZpZWxkOlRleHRGaWVsZCA9IDxUZXh0RmllbGQ+dGhpcy5wYWdlLmdldFZpZXdCeUlkKCdjb250cmlidXRpb25fJyArIHRoaXMuZmFtaWxpZXMuZ2V0SXRlbShpKS5nZXQoJ2lkJykpO1xuICAgICAgICAgICAgaWYgKHRleHRGaWVsZCAmJiB0ZXh0RmllbGQuZGlzbWlzc1NvZnRJbnB1dCkgdGV4dEZpZWxkLmRpc21pc3NTb2Z0SW5wdXQoKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB1cGRhdGVUb3RhbEVhcm5lZCgpIHtcbiAgICAgICAgbGV0IHdvcmtlZE9iaiA9IHNoaWZ0U2VydmljZS5jYWxjdWxhdGVTaGlmdEhvdXJzV29ya2VkKGVkaXRpbmdTaGlmdC5zdGFydF90aW1lLCBlZGl0aW5nU2hpZnQuZW5kX3RpbWUpO1xuICAgICAgICB0aGlzLnNldCgnZW5kU2hpZnRUb3RhbFdvcmtlZCcsIHdvcmtlZE9iai50aW1lX3dvcmtlZCk7XG4gICAgICAgIGxldCBlYXJuZWQgPSBzaGlmdFNlcnZpY2UuY2FsY3VsYXRlU2hpZnRFYXJuZWQod29ya2VkT2JqLm1pbnV0ZXNfd29ya2VkLCB0aGlzLmdldFByZXZpb3VzU2hpZnRzVG90YWxNaW51dGVzKGVkaXRpbmdTaGlmdCkpO1xuICAgICAgICBNeU1vZGVsLnNldCgnZW5kU2hpZnRUb3RhbEVhcm5lZCcsICckJyArIGVhcm5lZC50b3RhbF9lYXJuZWQpO1xuICAgICAgICBpZiAoZWFybmVkLm92ZXJ0aW1lX2Vhcm5lZCAhPSAwLjAwKSB7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZW5kU2hpZnRPdmVydGltZUVhcm5lZCcsIGVhcm5lZC5vdmVydGltZV9lYXJuZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0T3ZlcnRpbWVFYXJuZWQnLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGZhbWlsaWVzID0gTXlNb2RlbC5nZXQoJ2ZhbWlsaWVzJyk7XG4gICAgICAgIGxldCBuZXdUb3RhbDphbnkgPSAoZWFybmVkLnRvdGFsX2Vhcm5lZC9mYW1pbGllcy5sZW5ndGgpLnRvRml4ZWQoMik7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdlYWNoIGNvbnRyaWJ1dGlvbjogJyArIG5ld1RvdGFsKTtcbiAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0RmluYWxUb3RhbCcsICckJyArIChuZXdUb3RhbCpmYW1pbGllcy5sZW5ndGgpLnRvRml4ZWQoMikpO1xuICAgICAgICBsZXQgY29udHJpYnV0aW9uVG90YWwgPSAwO1xuICAgICAgICBpZiAoZWRpdGluZ1NoaWZ0LmlkICYmIGVkaXRpbmdTaGlmdC5jb250cmlidXRpb25zKSB7XG4gICAgICAgICAgICBsZXQgY29udHJpYnV0aW9uVG90YWwgPSAwO1xuICAgICAgICAgICAgZm9yIChsZXQgeCBpbiBlZGl0aW5nU2hpZnQuY29udHJpYnV0aW9ucykge1xuICAgICAgICAgICAgICAgIGNvbnRyaWJ1dGlvblRvdGFsICs9IHBhcnNlRmxvYXQoZWRpdGluZ1NoaWZ0LmNvbnRyaWJ1dGlvbnNbeF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0RmluYWxUb3RhbCcsICckJyArIGNvbnRyaWJ1dGlvblRvdGFsLnRvRml4ZWQoMikpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZhbWlsaWVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBmYW1pbGllcy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoZWRpdGluZ1NoaWZ0LmlkICYmIGVkaXRpbmdTaGlmdC5jb250cmlidXRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHdlIGFyZSBlZGl0aW5nIGEgc2hpZnQsIHNvIGRvbnQgdXBkYXRlIHRoZSBjb250cmlidXRpb25zIGF1dG9tYXRpY2FsbHkuIG1ha2UgdGhlIHVzZXIgZG8gaXQuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlZGl0aW5nU2hpZnQuY29udHJpYnV0aW9uc1tmYW1pbGllcy5nZXRJdGVtKGkpLmlkXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmFtaWxpZXMuZ2V0SXRlbShpKS5zZXQoJ2NvbnRyaWJ1dGlvbicsIGVkaXRpbmdTaGlmdC5jb250cmlidXRpb25zW2ZhbWlsaWVzLmdldEl0ZW0oaSkuaWRdKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhbWlsaWVzLmdldEl0ZW0oaSkuc2V0KCdjb250cmlidXRpb24nLCAnMC4wMCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZmFtaWxpZXMuZ2V0SXRlbShpKS5zZXQoJ2NvbnRyaWJ1dGlvbicsIG5ld1RvdGFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZmFtaWxpZXMuZ2V0SXRlbShpKS5vbihPYnNlcnZhYmxlLnByb3BlcnR5Q2hhbmdlRXZlbnQsIChhcmdzOiBQcm9wZXJ0eUNoYW5nZURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MucHJvcGVydHlOYW1lID09ICdjb250cmlidXRpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZmluYWxUb3RhbDpudW1iZXIgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGludmFsaWROdW1iZXJzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCB4ID0gMDsgTXlNb2RlbC5mYW1pbGllcy5sZW5ndGggPiB4OyB4KyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIU15TW9kZWwuZmFtaWxpZXMuZ2V0SXRlbSh4KS5nZXQoJ2NvbnRyaWJ1dGlvbicpKSBNeU1vZGVsLmZhbWlsaWVzLmdldEl0ZW0oeCkuc2V0KCdjb250cmlidXRpb24nLCAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc05hTihNeU1vZGVsLmZhbWlsaWVzLmdldEl0ZW0oeCkuZ2V0KCdjb250cmlidXRpb24nKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW52YWxpZE51bWJlcnMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsVG90YWwgKz0gcGFyc2VGbG9hdChNeU1vZGVsLmZhbWlsaWVzLmdldEl0ZW0oeCkuZ2V0KCdjb250cmlidXRpb24nKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGludmFsaWROdW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0RmluYWxUb3RhbCcsICdFbnRlciB2YWxpZCBudW1iZXJzLicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnZW5kU2hpZnRGaW5hbFRvdGFsJywgJyQnICsgZmluYWxUb3RhbC50b0ZpeGVkKDIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHRoZXJlcyBvbmx5IG9uZSBmYW1pbHksIHNvIGFsd2F5cyB1cGRhdGUgdGhlIGNvbnRyaWJ1dGlvbnMuXG4gICAgICAgICAgICBpZiAoZWRpdGluZ1NoaWZ0LmlkICYmIGVkaXRpbmdTaGlmdC5jb250cmlidXRpb25zKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVkaXRpbmdTaGlmdC5jb250cmlidXRpb25zW2ZhbWlsaWVzLmdldEl0ZW0oMCkuaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIGZhbWlsaWVzLmdldEl0ZW0oMCkuc2V0KCdjb250cmlidXRpb24nLCBlZGl0aW5nU2hpZnQuY29udHJpYnV0aW9uc1tmYW1pbGllcy5nZXRJdGVtKDApLmlkXSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZmFtaWxpZXMuZ2V0SXRlbSgwKS5zZXQoJ2NvbnRyaWJ1dGlvbicsICcwLjAwJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmYW1pbGllcy5nZXRJdGVtKDApLnNldCgnY29udHJpYnV0aW9uJywgbmV3VG90YWwpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmYW1pbGllcy5nZXRJdGVtKDApLm9uKE9ic2VydmFibGUucHJvcGVydHlDaGFuZ2VFdmVudCwgKGFyZ3M6IFByb3BlcnR5Q2hhbmdlRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLnByb3BlcnR5TmFtZSA9PSAnY29udHJpYnV0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmluYWxUb3RhbDpudW1iZXIgPSAwO1xuICAgICAgICAgICAgICAgICAgICBsZXQgaW52YWxpZE51bWJlcnMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgeCA9IDA7IE15TW9kZWwuZmFtaWxpZXMubGVuZ3RoID4geDsgeCsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIU15TW9kZWwuZmFtaWxpZXMuZ2V0SXRlbSh4KS5nZXQoJ2NvbnRyaWJ1dGlvbicpKSBNeU1vZGVsLmZhbWlsaWVzLmdldEl0ZW0oeCkuc2V0KCdjb250cmlidXRpb24nLCAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzTmFOKE15TW9kZWwuZmFtaWxpZXMuZ2V0SXRlbSh4KS5nZXQoJ2NvbnRyaWJ1dGlvbicpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludmFsaWROdW1iZXJzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxUb3RhbCArPSBwYXJzZUZsb2F0KE15TW9kZWwuZmFtaWxpZXMuZ2V0SXRlbSh4KS5nZXQoJ2NvbnRyaWJ1dGlvbicpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoaW52YWxpZE51bWJlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlbmRTaGlmdEZpbmFsVG90YWwnLCAnRW50ZXIgdmFsaWQgbnVtYmVycy4nKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlbmRTaGlmdEZpbmFsVG90YWwnLCAnJCcgKyBmaW5hbFRvdGFsLnRvRml4ZWQoMikpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfVxuXG4gICAgcHVibGljIGNoYW5nZVNoaWZ0RW5kVGltZSgpIHtcbiAgICAgICAgdGhpcy5kaXNtaXNzU29mdElucHV0cygpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VySG91cicsIG1vbWVudChlZGl0aW5nU2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnSCcpKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlck1pbnV0ZScsIG1vbWVudChlZGl0aW5nU2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnbScpKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlclRpdGxlJywgJ0NoYW5nZSBFbmQgVGltZScpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZVRleHQnLCAnRG9uZScpO1xuICAgICAgICB0aGlzLnNldCgncGlja2luZycsICd0aW1lJyk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJDYW5jZWwnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICB9KVxuICAgICAgICBwaWNrZXIuYW5pbWF0ZVNob3coKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICAgICAgbGV0IGhvdXIgPSB0aGlzLnBpY2tlckhvdXI7XG4gICAgICAgICAgICBpZiAoaG91ciA8IDEwKSBob3VyID0gJzAnICsgdGhpcy5waWNrZXJIb3VyO1xuICAgICAgICAgICAgbGV0IG1pbnV0ZSA9IHRoaXMucGlja2VyTWludXRlO1xuICAgICAgICAgICAgaWYgKG1pbnV0ZSA8IDEwKSBtaW51dGUgPSAnMCcgKyBtaW51dGU7XG4gICAgICAgICAgICB0aGlzLnNldCgnc2VsZWN0ZWRFbmRUaW1lJywgaG91ciArICc6JyArIG1pbnV0ZSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0RW5kVGltZScsIG1vbWVudCh0aGlzLmdldCgnc2VsZWN0ZWRFbmREYXRlJykgKyAnICcgKyB0aGlzLmdldCgnc2VsZWN0ZWRFbmRUaW1lJykgKyAnOjAwJykuZm9ybWF0KCdoOm1tYScpKVxuICAgICAgICAgICAgZWRpdGluZ1NoaWZ0LmVuZF90aW1lID0gbW9tZW50KHRoaXMuZ2V0KCdzZWxlY3RlZEVuZERhdGUnKSArICcgJyArIHRoaXMuZ2V0KCdzZWxlY3RlZEVuZFRpbWUnKSArICc6MDAnKS5mb3JtYXQoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVG90YWxFYXJuZWQoKVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBjaGFuZ2VTaGlmdEVuZERhdGUoKSB7XG4gICAgICAgIHRoaXMuZGlzbWlzc1NvZnRJbnB1dHMoKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tpbmcnLCAnZGF0ZScpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXQoJ2VuZERhdGVEYXknLCBtb21lbnQoZWRpdGluZ1NoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ0REJykpO1xuICAgICAgICB0aGlzLnNldCgnZW5kRGF0ZU1vbnRoJywgbW9tZW50KGVkaXRpbmdTaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdNTScpKTtcbiAgICAgICAgdGhpcy5zZXQoJ2VuZERhdGVZZWFyJywgbW9tZW50KGVkaXRpbmdTaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdZWVlZJykpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyVGl0bGUnLCAnQ2hhbmdlIEVuZCBEYXRlJyk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lVGV4dCcsICdEb25lJyk7XG4gICAgICAgIHBpY2tlci5hbmltYXRlU2hvdygpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyQ2FuY2VsJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgfSlcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICAgICAgbGV0IGRheSA9IHRoaXMuZW5kRGF0ZURheTsgXG4gICAgICAgICAgICBpZiAocGFyc2VJbnQodGhpcy5lbmREYXRlRGF5KSA8IDEwKSBkYXkgPSAnMCcgKyBwYXJzZUludCh0aGlzLmVuZERhdGVEYXkpO1xuICAgICAgICAgICAgbGV0IG1vbnRoID0gdGhpcy5lbmREYXRlTW9udGg7IFxuICAgICAgICAgICAgaWYgKHBhcnNlSW50KHRoaXMuZW5kRGF0ZU1vbnRoKSA8IDEwKSBtb250aCA9ICcwJyArIHBhcnNlSW50KHRoaXMuZW5kRGF0ZU1vbnRoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdzZWxlY3RlZEVuZERhdGUnLCB0aGlzLmVuZERhdGVZZWFyICsgJy0nICsgbW9udGggKyAnLScgKyBkYXkpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdEVuZERhdGUnLCBtb21lbnQodGhpcy5nZXQoJ3NlbGVjdGVkRW5kRGF0ZScpKS5mb3JtYXQoJ01NTSBEbywgWVlZWScpKVxuICAgICAgICAgICAgZWRpdGluZ1NoaWZ0LmVuZF90aW1lID0gbW9tZW50KHRoaXMuZ2V0KCdzZWxlY3RlZEVuZERhdGUnKSArICcgJyArIHRoaXMuZ2V0KCdzZWxlY3RlZEVuZFRpbWUnKSArICc6MDAnKS5mb3JtYXQoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVG90YWxFYXJuZWQoKVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBjaGFuZ2VTaGlmdFN0YXJ0VGltZSgpIHtcbiAgICAgICAgdGhpcy5kaXNtaXNzU29mdElucHV0cygpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VySG91cicsIG1vbWVudChlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdIJykpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyTWludXRlJywgbW9tZW50KGVkaXRpbmdTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ20nKSk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJUaXRsZScsICdDaGFuZ2UgU3RhcnQgVGltZScpO1xuICAgICAgICB0aGlzLnNldCgncGlja2luZycsICd0aW1lJyk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lVGV4dCcsICdEb25lJyk7XG4gICAgICAgIHBpY2tlci5hbmltYXRlU2hvdygpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyQ2FuY2VsJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgfSlcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICAgICAgbGV0IGhvdXIgPSB0aGlzLnBpY2tlckhvdXI7XG4gICAgICAgICAgICBpZiAoaG91ciA8IDEwKSBob3VyID0gJzAnICsgdGhpcy5waWNrZXJIb3VyO1xuICAgICAgICAgICAgbGV0IG1pbnV0ZSA9IHRoaXMucGlja2VyTWludXRlO1xuICAgICAgICAgICAgaWYgKG1pbnV0ZSA8IDEwKSBtaW51dGUgPSAnMCcgKyBtaW51dGU7XG4gICAgICAgICAgICB0aGlzLnNldCgnc2VsZWN0ZWRTdGFydFRpbWUnLCBob3VyICsgJzonICsgbWludXRlKTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRTdGFydFRpbWUnLCBtb21lbnQodGhpcy5nZXQoJ3NlbGVjdGVkU3RhcnREYXRlJykgKyAnICcgKyB0aGlzLmdldCgnc2VsZWN0ZWRTdGFydFRpbWUnKSArICc6MDAnKS5mb3JtYXQoJ2g6bW1hJykpXG4gICAgICAgICAgICBlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSA9IG1vbWVudCh0aGlzLmdldCgnc2VsZWN0ZWRTdGFydERhdGUnKSArICcgJyArIHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0VGltZScpICsgJzowMCcpLmZvcm1hdCgpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVUb3RhbEVhcm5lZCgpXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGNoYW5nZVNoaWZ0U3RhcnREYXRlKCkge1xuICAgICAgICB0aGlzLmRpc21pc3NTb2Z0SW5wdXRzKCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNraW5nJywgJ2RhdGUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ2VuZERhdGVEYXknLCBtb21lbnQoZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnREQnKSk7XG4gICAgICAgIHRoaXMuc2V0KCdlbmREYXRlTW9udGgnLCBtb21lbnQoZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnTU0nKSk7XG4gICAgICAgIHRoaXMuc2V0KCdlbmREYXRlWWVhcicsIG1vbWVudChlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdZWVlZJykpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyVGl0bGUnLCAnQ2hhbmdlIFN0YXJ0IERhdGUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmVUZXh0JywgJ0RvbmUnKTtcbiAgICAgICAgcGlja2VyLmFuaW1hdGVTaG93KCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJDYW5jZWwnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICB9KVxuICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgICAgICBsZXQgZGF5ID0gdGhpcy5lbmREYXRlRGF5OyBcbiAgICAgICAgICAgIGlmIChwYXJzZUludCh0aGlzLmVuZERhdGVEYXkpIDwgMTApIGRheSA9ICcwJyArIHBhcnNlSW50KHRoaXMuZW5kRGF0ZURheSk7XG4gICAgICAgICAgICBsZXQgbW9udGggPSB0aGlzLmVuZERhdGVNb250aDsgXG4gICAgICAgICAgICBpZiAocGFyc2VJbnQodGhpcy5lbmREYXRlTW9udGgpIDwgMTApIG1vbnRoID0gJzAnICsgcGFyc2VJbnQodGhpcy5lbmREYXRlTW9udGgpO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3NlbGVjdGVkU3RhcnREYXRlJywgdGhpcy5lbmREYXRlWWVhciArICctJyArIG1vbnRoICsgJy0nICsgZGF5KTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRTdGFydERhdGUnLCBtb21lbnQodGhpcy5nZXQoJ3NlbGVjdGVkU3RhcnREYXRlJykpLmZvcm1hdCgnTU1NIERvLCBZWVlZJykpXG4gICAgICAgICAgICBlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSA9IG1vbWVudCh0aGlzLmdldCgnc2VsZWN0ZWRTdGFydERhdGUnKSArICcgJyArIHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0VGltZScpICsgJzowMCcpLmZvcm1hdCgpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVUb3RhbEVhcm5lZCgpXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIHNhdmVTaGlmdCgpIHtcbiAgICAgICAgdGhpcy5kaXNtaXNzU29mdElucHV0cygpO1xuICAgICAgICBsZXQgZW5kX3RpbWUgPSB0aGlzLmdldCgnc2VsZWN0ZWRFbmREYXRlJykgKyAnICcgKyB0aGlzLmdldCgnc2VsZWN0ZWRFbmRUaW1lJykgKyAnOjAwJztcbiAgICAgICAgbGV0IHN0YXJ0X3RpbWUgPSB0aGlzLmdldCgnc2VsZWN0ZWRTdGFydERhdGUnKSArICcgJyArIHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0VGltZScpICsgJzowMCc7XG4gICAgICAgIGxldCBhcmdzOmFueSA9IHt9O1xuICAgICAgICBhcmdzLmVuZF90aW1lID0gbW9tZW50KGVuZF90aW1lKS5mb3JtYXQoKTtcbiAgICAgICAgYXJncy5zdGFydF90aW1lID0gbW9tZW50KHN0YXJ0X3RpbWUpLmZvcm1hdCgpO1xuICAgICAgICBhcmdzLmNvbnRyaWJ1dGlvbnMgPSB7fTtcbiAgICAgICAgbGV0IGNvbnRyaWJ1dGlvbnM6YW55ID0ge307XG4gICAgICAgIGxldCBmYW1pbGllcyA9IHRoaXMuZ2V0KCdmYW1pbGllcycpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgZmFtaWxpZXMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICBjb250cmlidXRpb25zW2ZhbWlsaWVzLmdldEl0ZW0oaSkuZ2V0KCdpZCcpXSA9IGZhbWlsaWVzLmdldEl0ZW0oaSkuZ2V0KCdjb250cmlidXRpb24nKTtcbiAgICAgICAgfVxuICAgICAgICBhcmdzLmNvbnRyaWJ1dGlvbnMgPSBjb250cmlidXRpb25zO1xuICAgICAgICBpZiAoZWRpdGluZ1NoaWZ0LmlkKSB7XG4gICAgICAgICAgICBzaGlmdFNlcnZpY2UudXBkYXRlU2hpZnQoZWRpdGluZ1NoaWZ0LmlkLCBhcmdzKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzU2hpZnRzKEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSkpO1xuICAgICAgICAgICAgICAgIGxldCBpbnZvaWNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpIGludm9pY2VzID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpO1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0ludm9pY2VzKGludm9pY2VzKTtcbiAgICAgICAgICAgICAgICBpZiAoZWRpdGluZ1NoaWZ0LmlkID09IE15TW9kZWwuZ2V0KCdjbG9ja2VkSW4nKS5pZCAmJiBhcmdzLmVuZF90aW1lKSBNeU1vZGVsLnNldCgnY2xvY2tlZEluJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZVNldHRpbmdzKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLmFkZFNoaWZ0KGFyZ3MpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTaGlmdHMoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKSk7XG4gICAgICAgICAgICAgICAgbGV0IGludm9pY2VzID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkgaW52b2ljZXMgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoaW52b2ljZXMpO1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZVNldHRpbmdzKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIFxuICAgIH1cblxuICAgIHB1YmxpYyBzaG93U3RhcnRTaGlmdCgpIHtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckhvdXInLCBtb21lbnQoKS5mb3JtYXQoJ0gnKSk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJNaW51dGUnLCBtb21lbnQoKS5mb3JtYXQoJ20nKSk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJUaXRsZScsICdTZXQgU3RhcnQgVGltZScpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZVRleHQnLCAnU3RhcnQnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tpbmcnLCAndGltZScpO1xuICAgICAgICBwaWNrZXIuYW5pbWF0ZVNob3coKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckNhbmNlbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgIH0pXG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgICAgIGxldCBob3VyID0gdGhpcy5waWNrZXJIb3VyO1xuICAgICAgICAgICAgaWYgKGhvdXIgPCAxMCkgaG91ciA9ICcwJyArIHRoaXMucGlja2VySG91cjtcbiAgICAgICAgICAgIGxldCBtaW51dGUgPSB0aGlzLnBpY2tlck1pbnV0ZTtcbiAgICAgICAgICAgIGlmIChtaW51dGUgPCAxMCkgbWludXRlID0gJzAnICsgbWludXRlO1xuICAgICAgICAgICAgbGV0IGFyZ3M6YW55ID0ge1xuICAgICAgICAgICAgICAgIHN0YXJ0X3RpbWU6IG1vbWVudChtb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKSArICcgJyArIGhvdXIgKyAnOicgKyBtaW51dGUgKyAnOjAwJykuZm9ybWF0KCksXG4gICAgICAgICAgICAgICAgZW5kX3RpbWU6IG51bGwsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzaGlmdFNlcnZpY2Uuc3RhcnRTaGlmdChhcmdzKS50aGVuKChzdGFydGVkU2hpZnQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vdGhpcy5zaGlmdHMudW5zaGlmdChvYnNlcnZhYmxlRnJvbU9iamVjdChzdGFydGVkU2hpZnQpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTaGlmdHMoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2Nsb2NrZWRJbicsIGFyZ3MpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG4gICAgXG4gICAgLyoqKioqKioqKioqKioqKioqKiAvU0hJRlQgRlVOQ1RJT05TICoqKioqKioqKioqKioqKioqKi9cblxuICAgIHB1YmxpYyBvblNlbGVjdGVkSW5kZXhDaGFuZ2VkKGFyZ3M6IFNlbGVjdGVkSW5kZXhDaGFuZ2VkRXZlbnREYXRhKSB7XG4gICAgICAgIGlmIChhcmdzLm5ld0luZGV4ID09IDApIHtcbiAgICAgICAgICAgIHRoaXMuZ2V0VGhpc1dlZWtTaGlmdHMoKTtcbiAgICAgICAgfSBlbHNlIGlmIChhcmdzLm5ld0luZGV4ID0gMSkge1xuICAgICAgICAgICAgYWxlcnQoJ21heWJlIHByb2Nlc3Mgc2hpZnRzIGFnYWluPycpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMga2lsbCgpIHtcbiAgICAgICAgYXBwU2V0dGluZ3MucmVtb3ZlKCd1c2VyRGF0YScpO1xuICAgICAgICBhcHBTZXR0aW5ncy5yZW1vdmUoJ3VpZCcpO1xuICAgICAgICBhcHBTZXR0aW5ncy5yZW1vdmUoJ2ludm9pY2VzJyk7XG4gICAgICAgIGFwcFNldHRpbmdzLnJlbW92ZSgnc2hpZnRzJyk7XG4gICAgICAgIGxldCBuYXZpZ2F0aW9uRW50cnkgPSB7XG4gICAgICAgICAgICBtb2R1bGVOYW1lOiBcIi92aWV3cy9sb2dpbi9sb2dpblwiLFxuICAgICAgICAgICAgYW5pbWF0ZWQ6IGZhbHNlLFxuICAgICAgICB9O1xuICAgICAgICBmcmFtZS50b3Btb3N0KCkubmF2aWdhdGUobmF2aWdhdGlvbkVudHJ5KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0dGluZ3NTY3JvbGwoYXJnczogU2Nyb2xsRXZlbnREYXRhKSB7XG5cbiAgICB9XG5cbiAgICBwcml2YXRlIHNob3dTZXR0aW5ncyh2aWV3UGF0aCkge1xuICAgICAgICBsZXQgbWFpbmdyaWQ6IEdyaWRMYXlvdXQgPSB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ21haW5ncmlkJyk7XG4gICAgICAgIG1haW5ncmlkLmFuaW1hdGUoPEFuaW1hdGlvbkRlZmluaXRpb24+e1xuICAgICAgICAgICAgc2NhbGU6IHt4OiAuOTIgICwgeTogLjkyfSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuY3ViaWNCZXppZXIoMC4xLCAwLjEsIDAuMSwgMSlcbiAgICAgICAgfSlcbiAgICAgICAgc2V0dGluZ3NDb250YWluZXIgPSA8U3RhY2tMYXlvdXQ+dGhpcy5wYWdlLmdldFZpZXdCeUlkKCdzZXR0aW5nc19jb250YWluZXInKTtcbiAgICAgICAgc2V0dGluZ3NPdmVybGF5Q29udGFpbmVyID0gdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdzZXR0aW5nc19vdmVybGF5X2NvbnRhaW5lcicpXG4gICAgICAgIGRpc21pc3NOb3RlID0gdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdkaXNtaXNzX25vdGUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3NldHRpbmdzU2hvd24nLCB0cnVlKTtcbiAgICAgICAgbGV0IGRldmljZUhlaWdodCA9IHNjcmVlbi5tYWluU2NyZWVuLmhlaWdodERJUHM7XG4gICAgICAgIHNldHRpbmdzQ29udGFpbmVyLnRyYW5zbGF0ZVkgPSBkZXZpY2VIZWlnaHQgKyAzMDtcbiAgICAgICAgc2V0dGluZ3NDb250YWluZXIuYW5pbWF0ZSg8QW5pbWF0aW9uRGVmaW5pdGlvbj57XG4gICAgICAgICAgICB0cmFuc2xhdGU6IHt4OiAwLCB5OiAwfSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuY3ViaWNCZXppZXIoMC4xLCAwLjEsIDAuMSwgMSlcbiAgICAgICAgfSlcbiAgICAgICAgc2V0dGluZ3NPdmVybGF5Q29udGFpbmVyLm9wYWNpdHkgPSAwO1xuICAgICAgICBzZXR0aW5nc092ZXJsYXlDb250YWluZXIuYW5pbWF0ZSh7XG4gICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgZHVyYXRpb246IDEwMFxuICAgICAgICB9KVxuICAgICAgICB2YXIgY29udGFpbmVyOiBTdGFja0xheW91dCA9IDxTdGFja0xheW91dD50aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ3NldHRpbmdzX3ZpZXcnKTtcbiAgICAgICAgY29udGFpbmVyLnJlbW92ZUNoaWxkcmVuKCk7XG4gICAgICAgIGxldCBwYXRoID0gZnMua25vd25Gb2xkZXJzLmN1cnJlbnRBcHAoKS5wYXRoO1xuICAgICAgICBsZXQgY29tcG9uZW50ID0gYnVpbGRlci5sb2FkKHBhdGggKyB2aWV3UGF0aCk7XG4gICAgICAgIGNvbnRhaW5lci5hZGRDaGlsZChjb21wb25lbnQpO1xuICAgICAgICBsZXQgY29udGFpbmVyQm91bmRzID0gc2V0dGluZ3NDb250YWluZXIuaW9zLmJvdW5kcztcbiAgICAgICAgbGV0IGlvc1NldHRpbmdzQ29udGFpbmVyOiBVSVZpZXcgPSBzZXR0aW5nc0NvbnRhaW5lci5pb3M7XG4gICAgICAgIGlmIChibHVyVmlldyAmJiBibHVyVmlldy5yZW1vdmVGcm9tU3VwZXJ2aWV3KSBibHVyVmlldy5yZW1vdmVGcm9tU3VwZXJ2aWV3KCk7XG4gICAgICAgIGJsdXJWaWV3ID0gVUlWaXN1YWxFZmZlY3RWaWV3LmFsbG9jKCkuaW5pdFdpdGhFZmZlY3QoVUlCbHVyRWZmZWN0LmVmZmVjdFdpdGhTdHlsZShVSUJsdXJFZmZlY3RTdHlsZUxpZ2h0KSk7XG4gICAgICAgIGJsdXJWaWV3LmZyYW1lID0ge1xuICAgICAgICAgICAgb3JpZ2luOiB7IHg6IGNvbnRhaW5lckJvdW5kcy5vcmlnaW4ueCwgeTogY29udGFpbmVyQm91bmRzLm9yaWdpbi55IC0gMjAgfSxcbiAgICAgICAgICAgIHNpemU6IHsgd2lkdGg6IGNvbnRhaW5lckJvdW5kcy5zaXplLndpZHRoLCBoZWlnaHQ6IGNvbnRhaW5lckJvdW5kcy5zaXplLmhlaWdodCArIDIwIH1cbiAgICAgICAgfTtcbiAgICAgICAgYmx1clZpZXcuYXV0b3Jlc2l6aW5nTWFzayA9IFVJVmlld0F1dG9yZXNpemluZ0ZsZXhpYmxlV2lkdGggfCBVSVZpZXdBdXRvcmVzaXppbmdGbGV4aWJsZUhlaWdodDtcbiAgICAgICAgaW9zU2V0dGluZ3NDb250YWluZXIuYWRkU3VidmlldyhibHVyVmlldylcbiAgICAgICAgaW9zU2V0dGluZ3NDb250YWluZXIuc2VuZFN1YnZpZXdUb0JhY2soYmx1clZpZXcpO1xuICAgICAgICBsZXQgYnV6eiA9IFVJU2VsZWN0aW9uRmVlZGJhY2tHZW5lcmF0b3IubmV3KCk7XG4gICAgICAgIGxldCBwYW5uZXIgPSB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ3NldHRpbmdzX2NvbnRhaW5lcicpO1xuICAgICAgICBsZXQgc2Nyb2xsZXI6U2Nyb2xsVmlldyA9IDxTY3JvbGxWaWV3PnRoaXMucGFnZS5nZXRWaWV3QnlJZCgnc2V0dGluZ3Nfc2Nyb2xsZXInKTtcbiAgICAgICAgaWYgKHNjcm9sbGVyKSB7XG4gICAgICAgICAgICBsZXQgcmVhZHlUb0Ryb3AgPSBmYWxzZTtcbiAgICAgICAgICAgIHBhbm5lci5vZmYoJ3BhbicpO1xuICAgICAgICAgICAgcGFubmVyLm9uKCdwYW4nLCAoYXJnczpQYW5HZXN0dXJlRXZlbnREYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3Muc3RhdGUgPT0gMyAmJiByZWFkeVRvRHJvcCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmhpZGVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2Nyb2xsZXIub24oJ3Njcm9sbCcsIChzY3JvbGxBcmdzOlNjcm9sbEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChzY3JvbGxBcmdzLnNjcm9sbFkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzQ29udGFpbmVyLnRyYW5zbGF0ZVkgPSBzY3JvbGxBcmdzLnNjcm9sbFkqLTEuODtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjcm9sbEFyZ3Muc2Nyb2xsWSotMS44ID4gMTUwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkeVRvRHJvcCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGlzbWlzc05vdGUub3BhY2l0eSA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnV6ei5zZWxlY3Rpb25DaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzbWlzc05vdGUuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAyNTBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZHlUb0Ryb3AgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkaXNtaXNzTm90ZS5vcGFjaXR5ID09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNtaXNzTm90ZS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDI1MFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYW5uZXIub2ZmKCdwYW4nKTtcbiAgICAgICAgICAgIHBhbm5lci5vbigncGFuJywgKGFyZ3M6UGFuR2VzdHVyZUV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzQ29udGFpbmVyLnRyYW5zbGF0ZVkgPSBhcmdzLmRlbHRhWTtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5kZWx0YVkgPiAxNTApIHtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChkaXNtaXNzTm90ZS5vcGFjaXR5ID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1enouc2VsZWN0aW9uQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlzbWlzc05vdGUuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogMjUwXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpc21pc3NOb3RlLm9wYWNpdHkgPT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlzbWlzc05vdGUuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogMjUwXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChhcmdzLnN0YXRlID09IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MuZGVsdGFZID4gMTUwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhpZGVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3NDb250YWluZXIuYW5pbWF0ZSg8QW5pbWF0aW9uRGVmaW5pdGlvbj57XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDogMCwgeTogMH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDIwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuY3ViaWNCZXppZXIoMC4xLCAwLjEsIDAuMSwgMSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGhpZGVTZXR0aW5ncygpIHtcbiAgICAgICAgdGhpcy5kaXNtaXNzU29mdElucHV0cygpO1xuICAgICAgICBlZGl0aW5nU2hpZnQgPSBmYWxzZTtcbiAgICAgICAgbGV0IG1haW5ncmlkOiBHcmlkTGF5b3V0ID0gdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdtYWluZ3JpZCcpO1xuICAgICAgICBtYWluZ3JpZC5hbmltYXRlKDxBbmltYXRpb25EZWZpbml0aW9uPntcbiAgICAgICAgICAgIHNjYWxlOiB7eDogMSwgeTogMX0sXG4gICAgICAgICAgICBkdXJhdGlvbjogMzAwLFxuICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmN1YmljQmV6aWVyKDAuMSwgMC4xLCAwLjEsIDEpXG4gICAgICAgIH0pXG4gICAgICAgIGxldCBkZXZpY2VIZWlnaHQgPSBzY3JlZW4ubWFpblNjcmVlbi5oZWlnaHRESVBzO1xuICAgICAgICBzZXR0aW5nc0NvbnRhaW5lci5hbmltYXRlKDxBbmltYXRpb25EZWZpbml0aW9uPntcbiAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6IDAsIHk6IGRldmljZUhlaWdodCAtIDMwfSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICAgICAgICBjdXJ2ZTogQW5pbWF0aW9uQ3VydmUuY3ViaWNCZXppZXIoMC4xLCAwLjEsIDAuMSwgMSlcbiAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNldCgnc2V0dGluZ3NTaG93bicsIGZhbHNlKTtcbiAgICAgICAgfSlcbiAgICAgICAgc2V0dGluZ3NPdmVybGF5Q29udGFpbmVyLmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgIGR1cmF0aW9uOiAzMDBcbiAgICAgICAgfSlcbiAgICB9IFxuXG4gICAgcHVibGljIHJlbW92ZVNlY3Rpb25lZFNoaWZ0KGFyZ3MpIHtcbiAgICAgICAgY29uc29sZS5kaXIoYXJncyk7XG4gICAgICAgIC8vdGhpcy5zZWN0aW9uZWRTaGlmdHMuZ2V0SXRlbShhcmdzLmluZGV4KTtcbiAgICAgICAgdGhpcy5zZWN0aW9uZWRTaGlmdHMuc3BsaWNlKGFyZ3MuaW5kZXgsIDEpO1xuICAgIH1cblxuICAgIHB1YmxpYyBwcm9jZXNzU2hpZnRzKHNoaWZ0cykge1xuICAgICAgICBsZXQgc2hpZnRzQXJyYXkgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBzaGlmdHMpIHtcbiAgICAgICAgICAgIGxldCBteVNoaWZ0ID0gc2hpZnRTZXJ2aWNlLmJ1aWxkU2hpZnREYXRhKHNoaWZ0c1tpXSk7XG4gICAgICAgICAgICBteVNoaWZ0LmlkID0gaTtcbiAgICAgICAgICAgIGlmICghbXlTaGlmdC5lbmRfdGltZSkgdGhpcy5zZXQoJ2Nsb2NrZWRJbicsIHNoaWZ0c1tpXSk7XG4gICAgICAgICAgICBzaGlmdHNBcnJheS5wdXNoKG15U2hpZnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgc2hpZnRzQXJyYXkuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICAgICAgaWYgKG1vbWVudChhLnN0YXJ0X3RpbWUpIDwgbW9tZW50KGIuc3RhcnRfdGltZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobW9tZW50KGEuc3RhcnRfdGltZSkgPiBtb21lbnQoYi5zdGFydF90aW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICBsZXQgd2Vla3MgPSB7fTtcbiAgICAgICAgdGhpcy5zZXQoJ2FkZGVkU2hpZnRzTWFwJywge30pO1xuXG4gICAgICAgIHdoaWxlICh0aGlzLnRoaXNXZWVrLmxlbmd0aCkgdGhpcy50aGlzV2Vlay5wb3AoKTtcbiAgICAgICAgLy8gY2FsY3VsYXRlIGhvdXJzIHdvcmtlZCBhbmQgbW9uZXkgZWFybmVkLlxuICAgICAgICBsZXQgdGhpc1dlZWtNaW51dGVzV29ya2VkID0gMDtcbiAgICAgICAgbGV0IHRoaXNXZWVrVG90YWxFYXJuZWQgPSAwO1xuICAgICAgICBmb3IgKHZhciBzID0gMDsgc2hpZnRzQXJyYXkubGVuZ3RoID4gczsgcysrKSB7XG4gICAgICAgICAgICAvLyBhZGQgdGhlIHNoaWZ0IGlmIGl0IGhhc250IGJlZW4gYWRkZWQgYWxyZWFkeSBhbmQgaWYgaXQgaXMgaW4gdGhlIGN1cnJlbnQgd2Vlay4gT1IgaWYgdGhlIHNoaWZ0IGhhcyBub3QgYmVlbiBlbmRlZC5cbiAgICAgICAgICAgIGlmICghdGhpcy5hZGRlZFNoaWZ0c01hcFtzaGlmdHNBcnJheVtzXS5pZF0pIHtcbiAgICAgICAgICAgICAgICBsZXQgc2hpZnQgPSBvYnNlcnZhYmxlRnJvbU9iamVjdChzaGlmdHNBcnJheVtzXSk7XG4gICAgICAgICAgICAgICAgdGhpcy5zaGlmdHMucHVzaChzaGlmdClcbiAgICAgICAgICAgICAgICBpZiAoc2hpZnRzQXJyYXlbc10uZW5kX3RpbWUgJiYgbW9tZW50KHNoaWZ0c0FycmF5W3NdLnN0YXJ0X3RpbWUpID4gbW9tZW50KCkuc3RhcnRPZignd2VlaycpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGhpc1dlZWsucHVzaChzaGlmdClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgc2hpZnQgdGhhdHMgc3RpbGwgcnVubmluZyBzbyB0aGUgdGltZXMgYW5kIHRoZSBtb25leSBlYXJuZWQgdXBkYXRlc1xuICAgICAgICAgICAgLy8gb3IgdXBkYXRlIGEgc2hpZnQgdGhhdCB3YXMgcmVjZW50bHkgdXBkYXRlZC5cbiAgICAgICAgICAgIGlmICghc2hpZnRzQXJyYXlbc10uZW5kX3RpbWUgfHwgc2hpZnRzQXJyYXlbc10ucmVjZW50bHlVcGRhdGVkKSB7XG4gICAgICAgICAgICAgICAgbGV0IHVwZGF0ZUluZGV4O1xuICAgICAgICAgICAgICAgIHRoaXMuc2hpZnRzLmZvckVhY2goKGVsZW1lbnQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnaWQnKSA9PSBzaGlmdHNBcnJheVtzXS5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlSW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuc2hpZnRzLnNldEl0ZW0odXBkYXRlSW5kZXgsIG9ic2VydmFibGVGcm9tT2JqZWN0KHNoaWZ0c0FycmF5W3NdKSk7XG5cbiAgICAgICAgICAgICAgICAvLyB1cGRhdGUgdGhlIGVudGl0eSBpbiB0aGUgdGhpc1dlZWsgb2JzZXJ2YWJsZS5cbiAgICAgICAgICAgICAgICBsZXQgdGhpc1dlZWtVcGRhdGVJbmRleDtcbiAgICAgICAgICAgICAgICB0aGlzLnRoaXNXZWVrLmZvckVhY2goKGVsZW1lbnQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnaWQnKSA9PSBzaGlmdHNBcnJheVtzXS5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1dlZWtVcGRhdGVJbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy50aGlzV2Vlay5zZXRJdGVtKHRoaXNXZWVrVXBkYXRlSW5kZXgsIG9ic2VydmFibGVGcm9tT2JqZWN0KHNoaWZ0c0FycmF5W3NdKSk7XG4gICAgICAgICAgICAgICAgc2hpZnRzQXJyYXlbc10ucmVjZW50bHlVcGRhdGVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuYWRkZWRTaGlmdHNNYXBbc2hpZnRzQXJyYXlbc10uaWRdID0gc2hpZnRzQXJyYXlbc107XG4gICAgICAgICAgICBpZiAoIXNoaWZ0c0FycmF5W3NdLmVuZF90aW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbXBhcmVBID0gbW9tZW50KCk7XG4gICAgICAgICAgICAgICAgdmFyIG1pbnV0ZXNXb3JrZWQgPSBjb21wYXJlQS5kaWZmKG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKSwgJ21pbnV0ZXMnKVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRoaXNXZWVrLmxlbmd0aCAmJiB0aGlzLnRoaXNXZWVrLmdldEl0ZW0oMCkuZ2V0KCdpZCcpID09IHNoaWZ0c0FycmF5W3NdLmlkKSB0aGlzLnRoaXNXZWVrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy50aGlzV2Vlay51bnNoaWZ0KG9ic2VydmFibGVGcm9tT2JqZWN0KHNoaWZ0c0FycmF5W3NdKSkgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vc2V0IHVwIHdlZWsgZGF0YS5cbiAgICAgICAgICAgIC8vIHZhciBiZWdpbm5pbmdPZldlZWtNb21lbnQgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuaXNvV2Vla2RheSgwKTtcbiAgICAgICAgICAgIC8vIHZhciBiZWdpbm5pbmdPZldlZWsgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuaXNvV2Vla2RheSgwKS5mb3JtYXQoJ2RkZGQgTU1NTSBEbyBZWVlZJyk7XG5cbiAgICAgICAgICAgIHZhciBiZWdpbm5pbmdPZldlZWtNb21lbnQgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuaXNvV2Vla2RheSgwKTtcbiAgICAgICAgICAgIHZhciBiZWdpbm5pbmdPZldlZWsgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuaXNvV2Vla2RheSgwKS5mb3JtYXQoJ2RkZGQgTU1NTSBEbyBZWVlZJyk7XG4gICAgICAgICAgICBpZiAobW9tZW50KHNoaWZ0c0FycmF5W3NdLnN0YXJ0X3RpbWUpLmlzb1dlZWtkYXkoKSA9PSAwIHx8IG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKS5pc29XZWVrZGF5KCkgPT0gNykge1xuICAgICAgICAgICAgICAgIGJlZ2lubmluZ09mV2Vla01vbWVudCA9IG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKTtcbiAgICAgICAgICAgICAgICBiZWdpbm5pbmdPZldlZWsgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuZm9ybWF0KCdkZGRkIE1NTU0gRG8gWVlZWScpO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCF3ZWVrc1tiZWdpbm5pbmdPZldlZWtdKSB7XG4gICAgICAgICAgICAgICAgd2Vla3NbYmVnaW5uaW5nT2ZXZWVrXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgdG90YWxfbWludXRlczogMCxcbiAgICAgICAgICAgICAgICAgICAgcmVndWxhcl9taW51dGVzOiAwLFxuICAgICAgICAgICAgICAgICAgICBvdmVydGltZV9taW51dGVzOiAwLFxuICAgICAgICAgICAgICAgICAgICBob3Vyc193b3JrZWQ6IDAsXG4gICAgICAgICAgICAgICAgICAgIHJlZ3VsYXJfZWFybmVkOiAwLFxuICAgICAgICAgICAgICAgICAgICBvdmVydGltZV9lYXJuZWQ6IDAsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiBiZWdpbm5pbmdPZldlZWtNb21lbnQuZm9ybWF0KCdbV2VlayBvZl0gTU1NIERvJyksXG4gICAgICAgICAgICAgICAgICAgIHdlZWtfc3RhcnQ6IGJlZ2lubmluZ09mV2Vla01vbWVudC5mb3JtYXQoJ1lZWVktTU0tREQnKSxcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRzOiBbXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgY29tcGFyZUEgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIGlmIChzaGlmdHNBcnJheVtzXS5lbmRfdGltZSkgY29tcGFyZUEgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uZW5kX3RpbWUpO1xuICAgICAgICAgICAgdmFyIG1pbnV0ZXNXb3JrZWQgPSBjb21wYXJlQS5kaWZmKG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKSwgJ21pbnV0ZXMnKVxuICAgICAgICAgICAgd2Vla3NbYmVnaW5uaW5nT2ZXZWVrXS50b3RhbF9taW51dGVzICs9IG1pbnV0ZXNXb3JrZWQ7XG4gICAgICAgICAgICB2YXIgc2hpZnQgPSBzaGlmdFNlcnZpY2UuYnVpbGRTaGlmdERhdGEoc2hpZnRzQXJyYXlbc10pO1xuICAgICAgICAgICAgd2Vla3NbYmVnaW5uaW5nT2ZXZWVrXS5zaGlmdHMucHVzaChzaGlmdCk7XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAodGhpcy5zZWN0aW9uZWRTaGlmdHMubGVuZ3RoKSB0aGlzLnNlY3Rpb25lZFNoaWZ0cy5wb3AoKTtcblxuXG4gICAgICAgIGZvciAodmFyIHcgaW4gd2Vla3MpIHtcbiAgICAgICAgICAgIGxldCB3ZWVrQ29udHJpYnV0aW9uVG90YWwgPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgaXcgPSAwOyB3ZWVrc1t3XS5zaGlmdHMubGVuZ3RoID4gaXc7IGl3KyspIHtcbiAgICAgICAgICAgICAgICB2YXIgbXlTaGlmdCA9IHdlZWtzW3ddLnNoaWZ0c1tpd11cbiAgICAgICAgICAgICAgICBpZiAoaXcgPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0Lm1pbnV0ZXNfYWNjcnVlZCA9IG15U2hpZnQubWludXRlc193b3JrZWQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5taW51dGVzX2FjY3J1ZWQgPSBteVNoaWZ0Lm1pbnV0ZXNfd29ya2VkICsgd2Vla3Nbd10uc2hpZnRzW2l3LTFdLm1pbnV0ZXNfYWNjcnVlZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG15U2hpZnQubWludXRlc19hY2NydWVkID4gMjQwMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIHNoaWZ0IGhhcyBvdmVydGltZSBtaW51dGVzLlxuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0Lm92ZXJ0aW1lX21pbnV0ZXMgPSBteVNoaWZ0Lm1pbnV0ZXNfYWNjcnVlZCAtIDI0MDA7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBsaW5lIHdpbGwgZW5zdXJlIHRoYXQgeW91IGFyZW50IGV4cG9uZW50aWFsbHkgYWNjcnVpbmcgb3ZlcnRpbWUgbWludXRlcy5cbiAgICAgICAgICAgICAgICAgICAgaWYgKG15U2hpZnQub3ZlcnRpbWVfbWludXRlcyA+IG15U2hpZnQubWludXRlc193b3JrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG15U2hpZnQub3ZlcnRpbWVfbWludXRlcyA9IG15U2hpZnQubWludXRlc193b3JrZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlZ3VsYXJfbWludXRlc193b3JrZWQgPSBteVNoaWZ0Lm1pbnV0ZXNfd29ya2VkLW15U2hpZnQub3ZlcnRpbWVfbWludXRlcztcbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5yZWd1bGFyX2Vhcm5lZCA9IChyZWd1bGFyX21pbnV0ZXNfd29ya2VkICogKHRoaXMuZ2V0KCd1c2VyJykuaG91cmx5UmF0ZS82MCkpLnRvRml4ZWQoMik7XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQub3ZlcnRpbWVfZWFybmVkID0gKG15U2hpZnQub3ZlcnRpbWVfbWludXRlcyAqICh0aGlzLmdldCgndXNlcicpLm92ZXJ0aW1lUmF0ZS82MCkpLnRvRml4ZWQoMik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5yZWd1bGFyX2Vhcm5lZCA9IChteVNoaWZ0Lm1pbnV0ZXNfd29ya2VkKih0aGlzLmdldCgndXNlcicpLmhvdXJseVJhdGUvNjApKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHdlZWtzW3ddLnJlZ3VsYXJfZWFybmVkICs9IG15U2hpZnQucmVndWxhcl9lYXJuZWQtMDtcbiAgICAgICAgICAgICAgICBpZiAobXlTaGlmdC5vdmVydGltZV9lYXJuZWQpIHdlZWtzW3ddLm92ZXJ0aW1lX2Vhcm5lZCArPSBteVNoaWZ0Lm92ZXJ0aW1lX2Vhcm5lZC0wO1xuICAgICAgICAgICAgICAgIG15U2hpZnQudG90YWxfZWFybmVkID0gKChteVNoaWZ0LnJlZ3VsYXJfZWFybmVkLTApICsgKG15U2hpZnQub3ZlcnRpbWVfZWFybmVkLTAgfHwgMCkpLnRvRml4ZWQoMilcbiAgICAgICAgICAgICAgICBjb25zb2xlLmRpcihKU09OLnN0cmluZ2lmeShteVNoaWZ0LmNvbnRyaWJ1dGlvbnMpKTtcblxuICAgICAgICAgICAgICAgIC8vIElmIGNvbnRyaWJ1dGlvbnMgYXJlIHNldCwgZGlzcGxheSB3aGF0IHRoZXkgc2V0IGFzIGNvbnRyaWJ1dGlvbnMgYXMgaXQgbWF5IGJlXG4gICAgICAgICAgICAgICAgLy8gZGlmZmVyZW50IGZyb20gd2hhdCB0aGV5IGVhcm5lZCBiYXNlZCBvbiB0aW1lIHdvcmtlZCBhbmQgaG91cmx5IHJhdGVzLlxuICAgICAgICAgICAgICAgIG15U2hpZnQudG90YWxfY29udHJpYnV0aW9ucyA9IDA7XG4gICAgICAgICAgICAgICAgbXlTaGlmdC5kaXNwbGF5X2Vhcm5lZCA9IG15U2hpZnQudG90YWxfZWFybmVkO1xuICAgICAgICAgICAgICAgIGlmIChteVNoaWZ0LmNvbnRyaWJ1dGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgeCBpbiBteVNoaWZ0LmNvbnRyaWJ1dGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG15U2hpZnQudG90YWxfY29udHJpYnV0aW9ucyArPSBwYXJzZUZsb2F0KG15U2hpZnQuY29udHJpYnV0aW9uc1t4XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB3ZWVrQ29udHJpYnV0aW9uVG90YWwgKz0gcGFyc2VGbG9hdChteVNoaWZ0LmNvbnRyaWJ1dGlvbnNbeF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQuZGlzcGxheV9lYXJuZWQgPSBteVNoaWZ0LnRvdGFsX2NvbnRyaWJ1dGlvbnMudG9GaXhlZCgyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB3ZWVrQ29udHJpYnV0aW9uVG90YWwgKz0gcGFyc2VGbG9hdChteVNoaWZ0LnRvdGFsX2Vhcm5lZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vbGV0IHBlcmNlbnRhZ2VPZjogbnVtYmVyID0gcGFyc2VGbG9hdCgoKG15U2hpZnQuZGlzcGxheV9lYXJuZWQqMTAwKS9teVNoaWZ0LnRvdGFsX2Vhcm5lZCkudG9GaXhlZCgwKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gaWYgKHBlcmNlbnRhZ2VPZiA+IDEwMCkge1xuICAgICAgICAgICAgICAgIC8vICAgICBteVNoaWZ0LmVhcm5lZF9kaWZmZXJlbmNlID0gcGVyY2VudGFnZU9mLTEwMDtcbiAgICAgICAgICAgICAgICAvLyB9IGVsc2UgaWYgKHBlcmNlbnRhZ2VPZiA8IDEwMCkge1xuICAgICAgICAgICAgICAgIC8vICAgICBteVNoaWZ0LmVhcm5lZF9kaWZmZXJlbmNlID0gMTAwIC0gcGVyY2VudGFnZU9mO1xuICAgICAgICAgICAgICAgIC8vIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIG15U2hpZnQuZWFybmVkX2RpZmZlcmVuY2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAvLyB9XG5cbiAgICAgICAgICAgICAgICBpZiAocGFyc2VGbG9hdChteVNoaWZ0LnRvdGFsX2Vhcm5lZCkgPiBwYXJzZUZsb2F0KG15U2hpZnQuZGlzcGxheV9lYXJuZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQuZWFybmVkX2RpZmZlcmVuY2UgPSAnJCcgKyAobXlTaGlmdC50b3RhbF9lYXJuZWQgLSBteVNoaWZ0LmRpc3BsYXlfZWFybmVkKS50b0ZpeGVkKDIpICsgJyBVbmRlcic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwYXJzZUZsb2F0KG15U2hpZnQudG90YWxfZWFybmVkKSA8IHBhcnNlRmxvYXQobXlTaGlmdC5kaXNwbGF5X2Vhcm5lZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5lYXJuZWRfZGlmZmVyZW5jZSA9ICckJyArIChteVNoaWZ0LmRpc3BsYXlfZWFybmVkIC0gbXlTaGlmdC50b3RhbF9lYXJuZWQpLnRvRml4ZWQoMikgKyAnIE92ZXInO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQuZWFybmVkX2RpZmZlcmVuY2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy9teVNoaWZ0LmVhcm5lZF9kaWZmZXJlbmNlXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobXlTaGlmdC50aXRsZSArICcgZnJvbSAnICsgbXlTaGlmdC5kaXNwbGF5X2hvdXJzKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0b3RhbCBlYXJuZWQ6ICcgKyBteVNoaWZ0LnRvdGFsX2Vhcm5lZCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2Rpc3BsYXkgZWFybmVkOiAnICsgbXlTaGlmdC5kaXNwbGF5X2Vhcm5lZCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2RpZmZlcmVuY2U6ICcgKyBteVNoaWZ0LmVhcm5lZF9kaWZmZXJlbmNlKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhteVNoaWZ0LnRvdGFsX2NvbnRyaWJ1dGlvbnMpO1xuXG5cblxuICAgICAgICAgICAgICAgIG15U2hpZnQuZGlzcGxheV9kYXRlID0gbW9tZW50KG15U2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdkZGRkIE1NTSBERCwgWVlZWScpO1xuICAgICAgICAgICAgICAgIG15U2hpZnQuZGlzcGxheV90aW1pbmcgPSBtb21lbnQobXlTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2g6bW1hJykgKyAnIHRvICcgKyBtb21lbnQobXlTaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdoOm1tYScpO1xuICAgICAgICAgICAgICAgIGlmIChtb21lbnQobXlTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ1lZWVlNTUREJykgPCBtb21lbnQobXlTaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdZWVlZTU1ERCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQuZGlzcGxheV90aW1pbmcgPSBtb21lbnQobXlTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2g6bW1hJykgKyAnIHRvICcgKyBtb21lbnQobXlTaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdNTU0gREQgW2F0XSBoOm1tYScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIW15U2hpZnQuZW5kX3RpbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5kaXNwbGF5X2RhdGUgPSBteVNoaWZ0LmRpc3BsYXlfZGF0ZSA9IG1vbWVudCgpLmZvcm1hdCgnW1RPREFZXSBNTU0gREQsIFlZWVknKTtcblxuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0LmRpc3BsYXlfdGltaW5nID0gJ1NoaWZ0IHN0YXJ0ZWQgYXQgJyArIG1vbWVudChteVNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnaDptbWEnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1vbWVudChteVNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnWVlZWU1NREQnKSA8IG1vbWVudCgpLmZvcm1hdCgnWVlZWU1NREQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5kaXNwbGF5X3RpbWluZyA9ICdTaGlmdCBzdGFydGVkIG9uICcgKyBtb21lbnQobXlTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ01NTSBERCBbYXRdIGg6bW1hJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdlZWtzW3ddLnRvdGFsX2Vhcm5lZCA9ICh3ZWVrc1t3XS5yZWd1bGFyX2Vhcm5lZCArICh3ZWVrc1t3XS5vdmVydGltZV9lYXJuZWQgfHwgMCkpLnRvRml4ZWQoMik7XG4gICAgICAgICAgICB3ZWVrc1t3XS5yZWd1bGFyX2Vhcm5lZCA9IHdlZWtzW3ddLnJlZ3VsYXJfZWFybmVkLnRvRml4ZWQoMilcbiAgICAgICAgICAgIGlmICh3ZWVrc1t3XS5vdmVydGltZV9lYXJuZWQpIHdlZWtzW3ddLm92ZXJ0aW1lX2Vhcm5lZCA9IHdlZWtzW3ddLm92ZXJ0aW1lX2Vhcm5lZC50b0ZpeGVkKDIpXG4gICAgICAgICAgICB3ZWVrc1t3XS5ob3Vyc193b3JrZWQgPSAod2Vla3Nbd10udG90YWxfbWludXRlcy82MCkudG9GaXhlZCgyKTtcbiAgICAgICAgICAgIGlmICh3ZWVrc1t3XS50b3RhbF9taW51dGVzID4gMjQwMCkge1xuICAgICAgICAgICAgICAgIHdlZWtzW3ddLnJlZ3VsYXJfbWludXRlcyA9IDI0MDA7XG4gICAgICAgICAgICAgICAgd2Vla3Nbd10ub3ZlcnRpbWVfbWludXRlcyA9IHdlZWtzW3ddLnRvdGFsX21pbnV0ZXMtMjQwMDtcblxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB3ZWVrc1t3XS5yZWd1bGFyX21pbnV0ZXMgPSB3ZWVrc1t3XS50b3RhbF9taW51dGVzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHNldHVwIHNlY3Rpb25lZCBhcnJheS5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3ZWVrIGNvbnRyaWJ1dGlvbiB0b3RhbDogJyArIHdlZWtDb250cmlidXRpb25Ub3RhbClcbiAgICAgICAgICAgIHZhciBoZWFkZXJPYmo6IGFueSA9IHtcbiAgICAgICAgICAgICAgICBcImlkXCI6IHdlZWtzW3ddLnRpdGxlLFxuICAgICAgICAgICAgICAgIFwic3RhcnRfdGltZVwiOiBtb21lbnQod2Vla3Nbd10uc2hpZnRzW3dlZWtzW3ddLnNoaWZ0cy5sZW5ndGgtMV0uc3RhcnRfdGltZSkuYWRkKCcxMCcsICdtaW51dGVzJykuZm9ybWF0KCdZWVlZLU1NLUREIEhIOm1tOnNzJyksXG4gICAgICAgICAgICAgICAgXCJoZWFkZXJcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBcInRpdGxlXCI6IHdlZWtzW3ddLnRpdGxlLFxuICAgICAgICAgICAgICAgIFwiaG91cnNfd29ya2VkXCI6IHdlZWtzW3ddLmhvdXJzX3dvcmtlZCxcbiAgICAgICAgICAgICAgICBcInJlZ3VsYXJfZWFybmVkXCI6IHdlZWtzW3ddLnJlZ3VsYXJfZWFybmVkLFxuICAgICAgICAgICAgICAgIFwib3ZlcnRpbWVfZWFybmVkXCI6IHdlZWtzW3ddLm92ZXJ0aW1lX2Vhcm5lZCxcbiAgICAgICAgICAgICAgICBcInRvdGFsX2NvbnRyaWJ1dGlvbnNcIjogd2Vla0NvbnRyaWJ1dGlvblRvdGFsLnRvRml4ZWQoMiksXG4gICAgICAgICAgICAgICAgXCJ0aW1lX3dvcmtlZFwiOiBzaGlmdFNlcnZpY2UuY2FsY3VsYXRlU2hpZnRIb3Vyc1dvcmtlZChmYWxzZSwgZmFsc2UsIHdlZWtzW3ddLnRvdGFsX21pbnV0ZXMpLnRpbWVfd29ya2VkLFxuICAgICAgICAgICAgICAgIFwidG90YWxfZWFybmVkXCI6IHdlZWtzW3ddLnRvdGFsX2Vhcm5lZFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHdlZWtzW3ddLnRvdGFsX21pbnV0ZXMgPiAyNDAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdlZWtzW3ddLm92ZXJ0aW1lX21pbnV0ZXMgLzYwIDwgMSkge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXJPYmoub3ZlcnRpbWVfaG91cnMgPSB3ZWVrc1t3XS5vdmVydGltZV9taW51dGVzICsgJyBNSU5VVEVTJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCh3ZWVrc1t3XS5vdmVydGltZV9taW51dGVzLzYwKSAlIDEgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyT2JqLm92ZXJ0aW1lX2hvdXJzID0gTWF0aC5mbG9vcih3ZWVrc1t3XS5vdmVydGltZV9taW51dGVzLzYwKSArICcgSE9VUlMnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBtaW51dGVzT25Ib3VyID0gd2Vla3Nbd10ub3ZlcnRpbWVfaG91cnMgLSAoTWF0aC5mbG9vcih3ZWVrc1t3XS5vdmVydGltZV9ob3Vycy82MCkgKiA2MCk7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlck9iai5vdmVydGltZV9ob3VycyAgPSBNYXRoLmZsb29yKHdlZWtzW3ddLm92ZXJ0aW1lX2hvdXJzLzYwKSArICcgSE9VUicgKyAoTWF0aC5mbG9vcih3ZWVrc1t3XS5vdmVydGltZV9ob3Vycy82MCkgPT0gMSA/ICcnIDogJ1MnKSArICcgJyArIG1pbnV0ZXNPbkhvdXIgKyAnIE1JTlVURScgKyAobWludXRlc09uSG91ciA9PSAxID8gJycgOiAnUycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vY29uc29sZS5kaXIoaGVhZGVyT2JqKTtcbiAgICAgICAgICAgIHRoaXMuc2VjdGlvbmVkU2hpZnRzLnB1c2gob2JzZXJ2YWJsZUZyb21PYmplY3QoaGVhZGVyT2JqKSk7XG5cblxuICAgICAgICAgICAgZm9yICh2YXIgaXggPSAwOyB3ZWVrc1t3XS5zaGlmdHMubGVuZ3RoID4gaXg7IGl4KyspIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUuZGlyKHdlZWtzW3ddLnNoaWZ0c1tpeF0pO1xuICAgICAgICAgICAgICAgIHRoaXMuc2VjdGlvbmVkU2hpZnRzLnB1c2gob2JzZXJ2YWJsZUZyb21PYmplY3Qod2Vla3Nbd10uc2hpZnRzW2l4XSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vY29uc29sZS5sb2codGhpcy5zZWN0aW9uZWRTaGlmdHMubGVuZ3RoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRoaXMuc2VjdGlvbmVkU2hpZnRzLnBvcCgpO1xuICAgICAgICAvLyB3aGlsZSAodGhpcy5zZWN0aW9uZWRTaGlmdHMubGVuZ3RoKSB0aGlzLnNlY3Rpb25lZFNoaWZ0cy5wb3AoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMud2Vla3MgPSB3ZWVrcztcbiAgICAgICAgbGV0IG5vRW5kVGltZU1pbnV0ZXNXb3JrZWQgPSAwO1xuICAgICAgICBsZXQgaGFzT3BlblNoaWZ0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMudGhpc1dlZWsuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgIHZhciBjb21wYXJlQSA9IG1vbWVudCgpO1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQuZ2V0KCdlbmRfdGltZScpKSBjb21wYXJlQSA9IG1vbWVudChlbGVtZW50LmdldCgnZW5kX3RpbWUnKSk7XG4gICAgICAgICAgICB2YXIgbWludXRlc1dvcmtlZCA9IGNvbXBhcmVBLmRpZmYobW9tZW50KGVsZW1lbnQuZ2V0KCdzdGFydF90aW1lJykpLCAnbWludXRlcycpXG4gICAgICAgICAgICB0aGlzV2Vla01pbnV0ZXNXb3JrZWQgKz0gbWludXRlc1dvcmtlZDtcbiAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnZW5kX3RpbWUnKSkge1xuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnY29udHJpYnV0aW9ucycpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHggaW4gZWxlbWVudC5nZXQoJ2NvbnRyaWJ1dGlvbnMnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1dlZWtUb3RhbEVhcm5lZCArPSBwYXJzZUZsb2F0KGVsZW1lbnQuZ2V0KCdjb250cmlidXRpb25zJylbeF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBoYXNPcGVuU2hpZnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGxldCBjb21wYXJlQSA9IG1vbWVudCgpO1xuICAgICAgICAgICAgICAgIG5vRW5kVGltZU1pbnV0ZXNXb3JrZWQgKz0gY29tcGFyZUEuZGlmZihtb21lbnQoZWxlbWVudC5nZXQoJ3N0YXJ0X3RpbWUnKSksICdtaW51dGVzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBjb25zb2xlLmxvZygnbm8gZW5kIHRpbWUgbWludXRlcyB3b3JrZWQ6ICcgKyBub0VuZFRpbWVNaW51dGVzV29ya2VkKVxuICAgICAgICBjb25zb2xlLmxvZygndGhpcyB3ZWVrIHRvdGFsIGVhcm5lZDogJyArIHRoaXNXZWVrVG90YWxFYXJuZWQpO1xuXG4gICAgICAgIGxldCBtaW51dGVSYXRlID0gcGFyc2VGbG9hdCh0aGlzLnVzZXIuaG91cmx5UmF0ZSkvNjA7XG4gICAgICAgIGxldCBvdmVydGltZU1pbnV0ZVJhdGUgPSBwYXJzZUZsb2F0KHRoaXMudXNlci5vdmVydGltZVJhdGUpLzYwO1xuICAgICAgICBpZiAodGhpc1dlZWtNaW51dGVzV29ya2VkID4gMjQwMCkge1xuICAgICAgICAgICAgbGV0IHJlZ3VsYXJFYXJuZWQgPSAyNDAwKm1pbnV0ZVJhdGU7XG4gICAgICAgICAgICBsZXQgb3ZlcnRpbWVFYXJuZWQgPSAodGhpc1dlZWtNaW51dGVzV29ya2VkLTI0MDApKm92ZXJ0aW1lTWludXRlUmF0ZTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdyZWd1bGFyX2Vhcm5lZCcsIHJlZ3VsYXJFYXJuZWQpO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ292ZXJ0aW1lX2Vhcm5lZCcsIG92ZXJ0aW1lRWFybmVkKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldCgndG90YWxfZWFybmVkJywgKHJlZ3VsYXJFYXJuZWQrb3ZlcnRpbWVFYXJuZWQpLnRvRml4ZWQoMikpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3JlZ3VsYXJfZWFybmVkJywgdGhpc1dlZWtNaW51dGVzV29ya2VkKm1pbnV0ZVJhdGUpO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3RvdGFsX2Vhcm5lZCcsICh0aGlzV2Vla01pbnV0ZXNXb3JrZWQqbWludXRlUmF0ZSkudG9GaXhlZCgyKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZXQoJ3RoaXNXZWVrTWludXRlc1dvcmtlZCcsIHRoaXNXZWVrTWludXRlc1dvcmtlZCk7XG4gICAgICAgIGxldCB0aW1lV29ya2VkID0gJzAgSE9VUlMnO1xuICAgICAgICBpZiAodGhpc1dlZWtNaW51dGVzV29ya2VkKSB0aW1lV29ya2VkID0gc2hpZnRTZXJ2aWNlLmNhbGN1bGF0ZVNoaWZ0SG91cnNXb3JrZWQoZmFsc2UsIGZhbHNlLCB0aGlzV2Vla01pbnV0ZXNXb3JrZWQpLnRpbWVfd29ya2VkO1xuICAgICAgICB0aGlzLnNldCgnaG91cnNfd29ya2VkJywgdGltZVdvcmtlZCk7XG5cbiAgICAgICAgaWYgKGhhc09wZW5TaGlmdCkge1xuICAgICAgICAgICAgbGV0IGNvbXBsZXRlZFNoaWZ0c01pbnV0ZXNXb3JrZWQgPSB0aGlzV2Vla01pbnV0ZXNXb3JrZWQgLSBub0VuZFRpbWVNaW51dGVzV29ya2VkO1xuICAgICAgICAgICAgbGV0IG9wZW5TaGlmdEVhcm5lZCA9IChub0VuZFRpbWVNaW51dGVzV29ya2VkKm1pbnV0ZVJhdGUpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ29wZW4gc2hpZnQgZWFybmVkOiAnICsgb3BlblNoaWZ0RWFybmVkKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdkaXNwbGF5X2Vhcm5lZCcsICh0aGlzV2Vla1RvdGFsRWFybmVkICsgb3BlblNoaWZ0RWFybmVkKS50b0ZpeGVkKDIpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdkaXNwbGF5X2Vhcm5lZCcsIHRoaXNXZWVrVG90YWxFYXJuZWQpO1xuICAgICAgICB9XG4gICAgICAgIFxuXG4gICAgfVxuXG4gICAgcHVibGljIHByb2Nlc3NJbnZvaWNlcyhpbnZvaWNlcykge1xuICAgICAgICBjb25zb2xlLmxvZygnaW4gcHJvY2VzcyBpbnZvaWNlcycpO1xuICAgICAgICB3aGlsZSAodGhpcy5pbnZvaWNlcy5sZW5ndGgpIHRoaXMuaW52b2ljZXMucG9wKCk7XG4gICAgICAgIGxldCB1c2VyID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpO1xuICAgICAgICAvL2xldCBpbnZvaWNlc0FycmF5ID0gbmV3IE9ic2VydmFibGVBcnJheSgpO1xuICAgICAgICB0aGlzLnNldCgnaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcCcsIHt9KTtcbiAgICAgICAgbGV0IHRvdGFsX3VucGFpZCA9IDA7XG4gICAgICAgIGZvciAodmFyIGkgaW4gaW52b2ljZXMpIHtcbiAgICAgICAgICAgIGludm9pY2VzW2ldLmlkID0gaTtcbiAgICAgICAgICAgIGludm9pY2VzW2ldLnNoaWZ0cyA9IFtdO1xuICAgICAgICAgICAgaW52b2ljZXNbaV0uZmFtaWx5X25hbWUgPSB1c2VyLmZhbWlsaWVzW2ludm9pY2VzW2ldLmZhbWlseV9pZF0ubmFtZTtcbiAgICAgICAgICAgIGludm9pY2VzW2ldLmRhdGVfY3JlYXRlZF9wcmV0dHkgPSBtb21lbnQoaW52b2ljZXNbaV0uZGF0ZV9jcmVhdGVkKS5mb3JtYXQoJ01NTSBEbywgWVlZWScpO1xuICAgICAgICAgICAgZm9yICh2YXIgcyA9IDA7IGludm9pY2VzW2ldLnNoaWZ0X2lkcy5sZW5ndGggPiBzOyBzKyspIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hZGRlZFNoaWZ0c01hcFtpbnZvaWNlc1tpXS5zaGlmdF9pZHNbc11dKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHRoaXMgY29uZGl0aW9uYWwgaXNudCBzYXRpc2ZpZWQsIGl0IHByb2JhYmx5IG1lYW5zIHRoZSB1c2VyIGRlbGV0ZWQgdGhlIHNoaWZ0IGFmdGVyIGl0IHdhcyBpbnZvaWNlZC5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXBbaW52b2ljZXNbaV0uZmFtaWx5X2lkXSkgdGhpcy5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ludm9pY2VzW2ldLmZhbWlseV9pZF0gPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ludm9pY2VzW2ldLmZhbWlseV9pZF1baW52b2ljZXNbaV0uc2hpZnRfaWRzW3NdXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGxldCBzaGlmdCA9IHRoaXMuYWRkZWRTaGlmdHNNYXBbaW52b2ljZXNbaV0uc2hpZnRfaWRzW3NdXTtcbiAgICAgICAgICAgICAgICAgICAgc2hpZnQuY29udHJpYnV0aW9uID0gc2hpZnQuY29udHJpYnV0aW9uc1tpbnZvaWNlc1tpXS5mYW1pbHlfaWRdO1xuICAgICAgICAgICAgICAgICAgICBzaGlmdC5pbnZvaWNlX3RpdGxlX2Rpc3BsYXkgPSBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdNL0QvWVknKSArICc6ICcgKyBzaGlmdC5kaXNwbGF5X2hvdXJzO1xuICAgICAgICAgICAgICAgICAgICBzaGlmdC5pbnZvaWNlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGludm9pY2VzW2ldLnNoaWZ0cy5wdXNoKHNoaWZ0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyB0aGlzIGlzIHJlcXVpcmVkIHRvIG1ha2UgdGhlIFVJIHJlc3BlY3QgdGhlIGxvYWRpbmcgaW5kaWNhdG9yLlxuICAgICAgICAgICAgaW52b2ljZXNbaV0ubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKCFpbnZvaWNlc1tpXS5zZW50KSBpbnZvaWNlc1tpXS5zZW50ID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoIWludm9pY2VzW2ldLnBhaWQpIHRvdGFsX3VucGFpZCArPSBpbnZvaWNlc1tpXS50b3RhbC0wO1xuICAgICAgICAgICAgXG5cbiAgICAgICAgICAgIHRoaXMuaW52b2ljZU1hcFtpXSA9IGludm9pY2VzW2ldO1xuICAgICAgICAgICAgbGV0IGlzQWRkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIC8vaW52b2ljZXNBcnJheS5wdXNoKGludm9pY2VzW2ldKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5pbnZvaWNlcy5wdXNoKG9ic2VydmFibGVGcm9tT2JqZWN0KGludm9pY2VzW2ldKSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vdGhpcy5pbnZvaWNlcy5wdXNoKG9ic2VydmFibGVGcm9tT2JqZWN0KGludm9pY2VzW2ldKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZXQoJ3RvdGFsVW5wYWlkU3RyaW5nJywgJ1lvdSBoYXZlICQnICsgdG90YWxfdW5wYWlkLnRvRml4ZWQoMikgKyAnIGluIHVucGFpZCBpbnZvaWNlcy4nKTtcbiAgICAgICAgdGhpcy5zZXQoJ3RvdGFsVW5wYWlkJywgdG90YWxfdW5wYWlkLnRvRml4ZWQoMikpO1xuICAgICAgICBpZiAoIXRvdGFsX3VucGFpZCkgdGhpcy5zZXQoJ3RvdGFsVW5wYWlkU3RyaW5nJywgJ1lvdVxcJ3JlIGFsbCBwYWlkIHVwIScpO1xuICAgICAgICB0aGlzLmludm9pY2VzLnNvcnQoKGE6YW55LCBiOmFueSkgPT4ge1xuICAgICAgICAgICAgaWYgKG1vbWVudChhLmRhdGVfY3JlYXRlZCkgPCBtb21lbnQoYi5kYXRlX2NyZWF0ZWQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vbWVudChhLmRhdGVfY3JlYXRlZCkgPiBtb21lbnQoYi5kYXRlX2NyZWF0ZWQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdpbnZvaWNlc0FycmF5IGxlbmdodCAnICsgaW52b2ljZXNBcnJheS5sZW5ndGgpO1xuICAgICAgICAvLyB0aGlzLnNldCgnaW52b2ljZXMnLCBpbnZvaWNlc0FycmF5KTtcbiAgICAgICAgLy8gZW1wdHkgdGhpcyBhbmQgcmVwb3B1bGF0ZSBpdC5cbiAgICAgICAgdGhpcy5zZXQoJ3VuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcCcsIHt9KTtcbiAgICAgICAgZm9yIChsZXQgc2hpZnRfaWQgaW4gdGhpcy5hZGRlZFNoaWZ0c01hcCkge1xuICAgICAgICAgICAgZm9yIChsZXQgZmFtaWx5X2lkIGluIHRoaXMuZmFtaWxpZXNNYXApIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMudW5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ZhbWlseV9pZF0pIHRoaXMudW5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ZhbWlseV9pZF0gPSB7fTtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcFtmYW1pbHlfaWRdIHx8ICF0aGlzLmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXBbZmFtaWx5X2lkXVtzaGlmdF9pZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG15U2hpZnQgPSB0aGlzLmFkZGVkU2hpZnRzTWFwW3NoaWZ0X2lkXTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNvbnRyaWJ1dGlvbjphbnkgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG15U2hpZnQuY29udHJpYnV0aW9ucykgY29udHJpYnV0aW9uID0gbXlTaGlmdC5jb250cmlidXRpb25zW2ZhbWlseV9pZF07XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250cmlidXRpb24gJiYgY29udHJpYnV0aW9uICE9ICcwJykgdGhpcy51bmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXBbZmFtaWx5X2lkXVtzaGlmdF9pZF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBjb25zb2xlLmxvZygnSU5WT0lDRUQgU0hJRlRTIEJZIEZBTUlMWScpXG4gICAgICAgIC8vIGNvbnNvbGUuZGlyKEpTT04uc3RyaW5naWZ5KHRoaXMuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcCkpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhcIlVOSU5WT0lDRUQgU0hJRlRTIEJZIEZBTUlMWVwiKVxuICAgICAgICAvLyBjb25zb2xlLmRpcihKU09OLnN0cmluZ2lmeSh0aGlzLnVuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcCkpO1xuICAgIH1cbiAgICBcbn0iXX0=