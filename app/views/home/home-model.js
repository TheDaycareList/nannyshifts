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
var email = require("nativescript-email");
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
        _this.hasSelectedStartAndEndTimes = false;
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
        if (!appSettings.getBoolean('seenTutorial')) {
            frame.topmost().navigate({
                moduleName: '/views/tutorial/tutorial',
                backstackVisible: false,
                animated: false,
                clearHistory: true
            });
            return;
        }
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
    HomeModel.prototype.viewTutorial = function () {
        frame.topmost().navigate({
            moduleName: '/views/tutorial/tutorial',
            backstackVisible: false,
            animated: true,
            clearHistory: true,
            transition: {
                name: "flip",
                duration: 500,
                curve: enums_1.AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
            }
        });
    };
    HomeModel.prototype.contact = function () {
        email.available().then(function (avail) {
            if (avail) {
                email.compose({
                    subject: "Nanny Shifts question...",
                    body: "",
                    to: ['dave@cubbynotes.com']
                }).then(function () {
                    //console.log("Email composer closed");
                }, function (err) {
                    //console.log("Error: " + err);
                });
            }
            else {
                dialogs.alert('It doesnt\'t look like you have email set up on this device, to contact us just send an email to dave@cubbynotes.com.');
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
            MyModel.set('editingShiftStartDate', 'Choose...');
            MyModel.set('editingShiftStartTime', 'Choose...');
            MyModel.set('selectedStartDate', moment().format('YYYY-MM-DD'));
            MyModel.set('selectedStartTime', moment(startTime).format('HH:mm'));
            MyModel.set('editingShiftEndDate', 'Choose...');
            MyModel.set('editingShiftEndTime', 'Choose...');
            MyModel.set('selectedEndDate', moment().format('YYYY-MM-DD'));
            MyModel.set('selectedEndTime', moment(endTime).format('HH:mm'));
            editingShift.start_time = moment(startTime).format();
            editingShift.end_time = moment(endTime).format();
            // let compareA = moment(endTime);
            // var minutesWorked = compareA.diff(moment(startTime), 'minutes')
            // var hoursWorked = (minutesWorked/60).toFixed(2);
            // let minuteRate = parseFloat(MyModel.user.hourlyRate)/60;
            // let overtimeMinuteRate = parseFloat(MyModel.user.overtimeRate)/60;
            // let worked = shiftService.calculateShiftHoursWorked(editingShift.start_time, editingShift.end_time);;
            // MyModel.updateTotalEarned();
            MyModel.set('hasSelectedStartAndEndTimes', false);
            MyModel.set('endShiftTotalWorked', '0 HOURS');
        }
        else {
            editingShift = Object.assign({}, shift);
            MyModel.showSettings('/views/components/endshift/endshift.xml');
            MyModel.set('settingsTitle', 'Edit Shift');
            MyModel.set('editingShiftStartDate', moment(shift.start_time).format('MMM Do, YYYY'));
            MyModel.set('editingShiftStartTime', moment(shift.start_time).format('h:mma'));
            MyModel.set('selectedStartDate', moment(shift.start_time).format('YYYY-MM-DD'));
            MyModel.set('selectedStartTime', moment(shift.start_time).format('HH:mm'));
            MyModel.set('editingShiftEndDate', moment().format('MMM Do, YYYY'));
            MyModel.set('editingShiftEndTime', 'In progress...');
            MyModel.set('selectedEndDate', moment().format('YYYY-MM-DD'));
            MyModel.set('selectedEndTime', moment().format('HH:mm'));
            editingShift.end_time = moment().format();
            if (shift.end_time) {
                console.log('show it all');
                MyModel.set('hasSelectedStartAndEndTimes', true);
                MyModel.set('editingShiftEndDate', moment(shift.end_time).format('MMM Do, YYYY'));
                MyModel.set('editingShiftEndTime', moment(shift.end_time).format('h:mma'));
                MyModel.set('selectedEndDate', moment(shift.end_time).format('YYYY-MM-DD'));
                MyModel.set('selectedEndTime', moment(shift.end_time).format('HH:mm'));
                editingShift.end_time = moment(shift.end_time).format();
            }
            else {
                MyModel.set('hasSelectedStartAndEndTimes', false);
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
        if (MyModel.get('editingShiftStartDate') != 'Choose...' && MyModel.get('editingShiftEndDate') != 'Choose...' && MyModel.get('editingShiftStartTime') != 'Choose...' && MyModel.get('editingShiftEndTime') != 'Choose...' && MyModel.get('editingShiftEndTime') != 'In progress...') {
            MyModel.set('hasSelectedStartAndEndTimes', true);
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
            if (MyModel.get('editingShiftEndDate') == 'Choose...') {
                MyModel.set('editingShiftEndDate', moment(this.get('selectedStartDate')).format('MMM Do, YYYY'));
                this.set('selectedEndDate', moment(this.get('selectedStartDate')).format('YYYY-MM-DD'));
            }
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
        args.start_time = moment(start_time).format();
        if (this.get('editingShiftEndTime') != 'In progress...') {
            args.end_time = moment(end_time).format();
            args.contributions = {};
            var contributions = {};
            var families = this.get('families');
            for (var i = 0; families.length > i; i++) {
                contributions[families.getItem(i).get('id')] = families.getItem(i).get('contribution');
            }
            args.contributions = contributions;
        }
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
                var compareA_1 = moment();
                noEndTimeMinutesWorked += compareA_1.diff(moment(element.get('start_time')), 'minutes');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9tZS1tb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvbWUtbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSw4Q0FBOEc7QUFDOUcsMERBQXNEO0FBR3RELG9DQUFzQztBQUN0QyxrREFBb0Q7QUFDcEQsK0JBQWlDO0FBQ2pDLGdDQUFrQztBQUNsQyxnQ0FBa0M7QUFFbEMsa0NBQTBDO0FBQzFDLG9DQUFzQztBQUN0QyxxQ0FBa0M7QUFPbEMsdURBQTJEO0FBQzNELHlEQUF1RDtBQUt2RCwwQ0FBNEM7QUFDNUMsb0RBQXNEO0FBQ3RELElBQUksV0FBd0IsQ0FBQztBQUM3QixJQUFJLFlBQTBCLENBQUM7QUFDL0IsSUFBSSxpQkFBOEIsQ0FBQztBQUNuQyxJQUFJLHdCQUF3QixDQUFDO0FBQzdCLElBQUksV0FBVyxDQUFDO0FBQ2hCLElBQUksUUFBZ0IsQ0FBQztBQUNyQixJQUFJLE9BQWtCLENBQUM7QUFDdkIsSUFBSSxhQUE0QixDQUFDO0FBQ2pDLElBQUksWUFBWSxDQUFDO0FBRWpCO0lBQStCLDZCQUFVO0lBQ3JDO1FBQUEsWUFDSSxpQkFBTyxTQTBCVjtRQUdNLGlCQUFXLEdBQVcsVUFBVSxHQUFHLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDcEYsVUFBSSxHQUFTLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQzNELGtCQUFZLEdBQVcsQ0FBQyxDQUFDO1FBQ3pCLDJCQUFxQixHQUFXLENBQUMsQ0FBQztRQUNsQyxrQkFBWSxHQUFXLElBQUksQ0FBQztRQUM1QixvQkFBYyxHQUFXLENBQUMsQ0FBQztRQUMzQixxQkFBZSxHQUFVLENBQUMsQ0FBQztRQUMzQixvQkFBYyxHQUFVLENBQUMsQ0FBQztRQUMxQixtQkFBYSxHQUFXLFVBQVUsQ0FBQztRQUNuQyxjQUFRLEdB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QUFJLENBQUMseUJBQXlCLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNyRyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUM1QyxJQUFJLFlBQVksR0FBTyxLQUFLLENBQUM7b0JBQzdCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7d0JBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQzNFLEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxZQUFZLElBQUksR0FBRyxDQUFDO3dCQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzFHLENBQUM7WUFDTCxDQUFDO1FBQ0wsQ0FBQztRQUNELDJDQUEyQztRQUMzQywrREFBK0Q7UUFDL0QsNkNBQTZDO1FBQzdDLGlFQUFpRTtJQUNyRSxDQUFDO0lBRUwsZ0JBQUM7QUFBRCxDQUFDLEFBM2pERCxDQUErQix1QkFBVSxHQTJqRHhDO0FBM2pEWSw4QkFBUyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBhZ2UgfSBmcm9tICd1aS9wYWdlJztcbmltcG9ydCB7RXZlbnREYXRhLCBPYnNlcnZhYmxlLCBQcm9wZXJ0eUNoYW5nZURhdGEsIGZyb21PYmplY3QgYXMgb2JzZXJ2YWJsZUZyb21PYmplY3R9IGZyb20gJ2RhdGEvb2JzZXJ2YWJsZSc7XG5pbXBvcnQge09ic2VydmFibGVBcnJheX0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlLWFycmF5JztcbmltcG9ydCB7IEdlc3R1cmVUeXBlcywgUGFuR2VzdHVyZUV2ZW50RGF0YSB9IGZyb20gXCJ1aS9nZXN0dXJlc1wiO1xuaW1wb3J0ICogYXMgZmlyZWJhc2UgZnJvbSAnbmF0aXZlc2NyaXB0LXBsdWdpbi1maXJlYmFzZSc7XG5pbXBvcnQgKiBhcyBkaWFsb2dzIGZyb20gJ3VpL2RpYWxvZ3MnO1xuaW1wb3J0ICogYXMgYXBwU2V0dGluZ3MgZnJvbSAnYXBwbGljYXRpb24tc2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgKiBhcyBmcmFtZSBmcm9tICd1aS9mcmFtZSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmaWxlLXN5c3RlbSc7XG5pbXBvcnQgeyBBbmltYXRpb25EZWZpbml0aW9uIH0gZnJvbSBcInVpL2FuaW1hdGlvblwiO1xuaW1wb3J0IHsgQW5pbWF0aW9uQ3VydmUgfSBmcm9tIFwidWkvZW51bXNcIjtcbmltcG9ydCAqIGFzIGJ1aWxkZXIgZnJvbSAndWkvYnVpbGRlcic7XG5pbXBvcnQgeyBzY3JlZW4gfSBmcm9tIFwicGxhdGZvcm1cIjtcbmltcG9ydCB7IFN0YWNrTGF5b3V0IH0gZnJvbSAndWkvbGF5b3V0cy9zdGFjay1sYXlvdXQnO1xuaW1wb3J0IHsgR3JpZExheW91dCB9IGZyb20gJ3VpL2xheW91dHMvZ3JpZC1sYXlvdXQnO1xuaW1wb3J0IHsgTGlzdFZpZXcgfSBmcm9tICd1aS9saXN0LXZpZXcnO1xuaW1wb3J0IHsgU2Nyb2xsVmlldywgU2Nyb2xsRXZlbnREYXRhIH0gZnJvbSAndWkvc2Nyb2xsLXZpZXcnO1xuaW1wb3J0IHsgVGV4dEZpZWxkIH0gZnJvbSAndWkvdGV4dC1maWVsZCc7XG5pbXBvcnQgeyBMYWJlbCB9IGZyb20gJ3VpL2xhYmVsJztcbmltcG9ydCB7IFVzZXJTZXJ2aWNlLCBVc2VyIH0gZnJvbSAnLi4vc2hhcmVkL3VzZXIuc2VydmljZSc7XG5pbXBvcnQgeyBTaGlmdFNlcnZpY2UgfSBmcm9tICcuLi9zaGFyZWQvc2hpZnQuc2VydmljZSc7XG5pbXBvcnQgeyBSYWRTaWRlRHJhd2VyIH0gZnJvbSBcIm5hdGl2ZXNjcmlwdC10ZWxlcmlrLXVpL3NpZGVkcmF3ZXJcIjtcbmltcG9ydCB7IFNldHRpbmdzTW9kZWwgfSBmcm9tICcuLi9tb2RhbHMvc2V0dGluZ3Mvc2V0dGluZ3MtbW9kZWwnO1xuaW1wb3J0IHsgU2VsZWN0ZWRJbmRleENoYW5nZWRFdmVudERhdGEsIFRhYlZpZXcgfSBmcm9tIFwidWkvdGFiLXZpZXdcIjtcbmltcG9ydCB7IFNsaWRlciB9IGZyb20gXCJ1aS9zbGlkZXJcIjtcbmltcG9ydCAqIGFzIGVtYWlsIGZyb20gJ25hdGl2ZXNjcmlwdC1lbWFpbCc7XG5pbXBvcnQgKiBhcyBwaWNrZXIgZnJvbSBcIi4uL2NvbXBvbmVudHMvcGlja2VyL3BpY2tlclwiO1xubGV0IHVzZXJTZXJ2aWNlOiBVc2VyU2VydmljZTtcbmxldCBzaGlmdFNlcnZpY2U6IFNoaWZ0U2VydmljZTtcbmxldCBzZXR0aW5nc0NvbnRhaW5lcjogU3RhY2tMYXlvdXQ7XG5sZXQgc2V0dGluZ3NPdmVybGF5Q29udGFpbmVyO1xubGV0IGRpc21pc3NOb3RlO1xubGV0IGJsdXJWaWV3OiBVSVZpZXc7XG5sZXQgTXlNb2RlbDogSG9tZU1vZGVsO1xubGV0IHNldHRpbmdzTW9kZWw6IFNldHRpbmdzTW9kZWw7XG5sZXQgZWRpdGluZ1NoaWZ0O1xuZGVjbGFyZSB2YXIgVUlWaXN1YWxFZmZlY3RWaWV3OmFueSwgVUlCbHVyRWZmZWN0OmFueSwgVUlWaWV3QXV0b3Jlc2l6aW5nRmxleGlibGVIZWlnaHQ6YW55LCBVSVZpZXdBdXRvcmVzaXppbmdGbGV4aWJsZVdpZHRoOmFueSwgVUlCbHVyRWZmZWN0U3R5bGVMaWdodDphbnk7XG5leHBvcnQgY2xhc3MgSG9tZU1vZGVsIGV4dGVuZHMgT2JzZXJ2YWJsZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIE15TW9kZWwgPSB0aGlzO1xuICAgICAgICAvL2FsbFNoaWZ0c01vZGVsID0gbmV3IEFsbFNoaWZ0c01vZGVsKCk7XG4gICAgICAgIHVzZXJTZXJ2aWNlID0gbmV3IFVzZXJTZXJ2aWNlKCk7XG4gICAgICAgIHNoaWZ0U2VydmljZSA9IG5ldyBTaGlmdFNlcnZpY2UoKTtcbiAgICAgICAgbGV0IHVzZXIgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygndXNlckRhdGEnKSk7XG4gICAgICAgIGZvciAobGV0IGkgaW4gdXNlci5mYW1pbGllcykge1xuICAgICAgICAgICAgdXNlci5mYW1pbGllc1tpXS5pZCA9IGk7XG4gICAgICAgICAgICBpZiAoIXVzZXIuZmFtaWxpZXNbaV0uZGVsZXRlZCkgdGhpcy5mYW1pbGllc01hcFtpXSA9IHVzZXIuZmFtaWxpZXNbaV07XG5cbiAgICAgICAgICAgIGxldCBmYW1pbHkgPSBvYnNlcnZhYmxlRnJvbU9iamVjdCh1c2VyLmZhbWlsaWVzW2ldKTtcbiAgICAgICAgICAgIGlmICghdXNlci5mYW1pbGllc1tpXS5kZWxldGVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mYW1pbGllcy5wdXNoKGZhbWlseSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZmFtaWxpZXMubGVuZ3RoID09IDEpIHRoaXMuZmFtaWxpZXMuZ2V0SXRlbSgwKS5zZXQoJ2p1c3RPbmVGYW1pbHknLCB0cnVlKTtcbiAgICAgICAgdGhpcy5mYW1pbGllcy5nZXRJdGVtKDApLnNldCgnaXNGaXJzdCcsIHRydWUpOyBcbiAgICAgICAgdGhpcy5zZXQoJ2lzTG9hZGluZycsIHRydWUpO1xuICAgICAgICBzaGlmdFNlcnZpY2UuYnVpbGRBcHBEYXRhKHRydWUpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgIHRoaXMuZ2V0VGhpc1dlZWtTaGlmdHMoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdpc0xvYWRpbmcnLCBmYWxzZSk7XG4gICAgICAgICAgICBsZXQgaW52b2ljZXMgPSBbXTtcbiAgICAgICAgICAgIGlmIChhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpIGludm9pY2VzID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpO1xuICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoaW52b2ljZXMpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBwYWdlOiBQYWdlO1xuICAgIHB1YmxpYyBoZWFkZXJfdGV4dDogc3RyaW5nID0gJ1dlZWsgb2YgJyArIG1vbWVudCgpLnN0YXJ0T2YoJ3dlZWsnKS5mb3JtYXQoJ2RkZGQgW3RoZV0gRG8nKTtcbiAgICBwdWJsaWMgdXNlcjogVXNlciA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1c2VyRGF0YScpKTtcbiAgICBwdWJsaWMgaG91cnNfd29ya2VkOiBudW1iZXIgPSAwO1xuICAgIHB1YmxpYyB0aGlzV2Vla01pbnV0ZXNXb3JrZWQ6IG51bWJlciA9IDA7XG4gICAgcHVibGljIHRvdGFsX2Vhcm5lZDogbnVtYmVyID0gMC4wMDtcbiAgICBwdWJsaWMgcmVndWxhcl9lYXJuZWQ6IG51bWJlciA9IDA7XG4gICAgcHVibGljIG92ZXJ0aW1lX2Vhcm5lZDogbnVtYmVyPSAwO1xuICAgIHB1YmxpYyBkaXNwbGF5X2Vhcm5lZDogbnVtYmVyPSAwO1xuICAgIHB1YmxpYyBzZXR0aW5nc1RpdGxlOiBzdHJpbmcgPSAnU2V0dGluZ3MnO1xuICAgIHB1YmxpYyBmYW1pbGllczogT2JzZXJ2YWJsZUFycmF5PE9ic2VydmFibGU+ID0gbmV3IE9ic2VydmFibGVBcnJheShbXSk7XG4gICAgcHVibGljIGZhbWlsaWVzTWFwOiBhbnkgPSB7fTtcbiAgICBwdWJsaWMgZWRpdGluZ0ZhbWlseTogT2JzZXJ2YWJsZSA9IG9ic2VydmFibGVGcm9tT2JqZWN0KHt9KVxuICAgIHB1YmxpYyBjbG9ja2VkSW46IGFueSA9IGZhbHNlO1xuICAgIHB1YmxpYyB0aGlzV2VlazogT2JzZXJ2YWJsZUFycmF5PE9ic2VydmFibGU+ID0gbmV3IE9ic2VydmFibGVBcnJheShbXSk7XG4gICAgcHVibGljIHNoaWZ0czogT2JzZXJ2YWJsZUFycmF5PE9ic2VydmFibGU+ID0gbmV3IE9ic2VydmFibGVBcnJheShbXSk7XG4gICAgcHVibGljIGFkZGVkU2hpZnRzTWFwID0ge307XG4gICAgcHVibGljIGlzTG9hZGluZzogYm9vbGVhbiA9IGZhbHNlO1xuICAgIHB1YmxpYyBzZWxlY3RlZEluZGV4OiBudW1iZXIgPSAwO1xuICAgIHB1YmxpYyBteUFycmF5ID0gWydoaScsICd3b3JsZCcsICd3b3VsZCB5b3UgbGlrZScsICdwZWFzJ107XG4gICAgcHVibGljIHNlY3Rpb25lZFNoaWZ0czogT2JzZXJ2YWJsZUFycmF5PE9ic2VydmFibGU+ID0gbmV3IE9ic2VydmFibGVBcnJheShbXSk7XG5cbiAgICBwdWJsaWMgc2VsZWN0ZWRGYW1pbHlUb0ludm9pY2U6IGFueSA9IGZhbHNlO1xuICAgIHB1YmxpYyB1bmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXA6IGFueSA9IHt9O1xuICAgIHB1YmxpYyBpbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwOiBhbnkgPSB7fTtcbiAgICBwdWJsaWMgdW5pbnZvaWNlZFNoaWZ0czogQXJyYXk8YW55PiA9IFtdO1xuICAgIHB1YmxpYyBpbnZvaWNlVG90YWw6IG51bWJlcjtcbiAgICBwdWJsaWMgaW52b2ljZXM6IE9ic2VydmFibGVBcnJheTxPYnNlcnZhYmxlPiA9IG5ldyBPYnNlcnZhYmxlQXJyYXkoW10pO1xuICAgIHB1YmxpYyBpbnZvaWNlTWFwID0ge307XG4gICAgcHVibGljIHRvdGFsVW5wYWlkU3RyaW5nOiBzdHJpbmc7XG4gICAgcHVibGljIHRvdGFsVW5wYWlkOiBudW1iZXI7XG5cbiAgICBwdWJsaWMgYWxsU2hpZnRzOiBPYnNlcnZhYmxlQXJyYXk8T2JzZXJ2YWJsZT4gPSBuZXcgT2JzZXJ2YWJsZUFycmF5KFtdKTtcbiAgICBwdWJsaWMgYWxsU2hpZnRzTWFwOiBhbnkgPSB7fTtcbiAgICBwdWJsaWMgd2Vla3MgPSB7fTtcblxuICAgIHB1YmxpYyBoYXNTZWxlY3RlZFN0YXJ0QW5kRW5kVGltZXM6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBcblxuICAgIHB1YmxpYyByZWJ1aWxkQWxsRGF0YSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHNoaWZ0U2VydmljZS5idWlsZEFwcERhdGEodHJ1ZSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2V0VGhpc1dlZWtTaGlmdHMoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnaXNMb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmcmVzaCBpbnZvaWNlcyBsZW5ndGggJyArIEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGludm9pY2VzID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkgaW52b2ljZXMgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoaW52b2ljZXMpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIFxuICAgIH1cblxuICAgIHB1YmxpYyBwYWdlTG9hZGVkKG15UGFnZTogUGFnZSkge1xuICAgICAgICB0aGlzLnBhZ2UgPSBteVBhZ2U7XG4gICAgICAgIHRoaXMucGFnZS5iaW5kaW5nQ29udGV4dCA9IHRoaXM7XG5cbiAgICAgICAgaWYgKCFhcHBTZXR0aW5ncy5nZXRCb29sZWFuKCdzZWVuVHV0b3JpYWwnKSkge1xuICAgICAgICAgICAgZnJhbWUudG9wbW9zdCgpLm5hdmlnYXRlKHtcbiAgICAgICAgICAgICAgICBtb2R1bGVOYW1lOiAnL3ZpZXdzL3R1dG9yaWFsL3R1dG9yaWFsJyxcbiAgICAgICAgICAgICAgICBiYWNrc3RhY2tWaXNpYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhbmltYXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgY2xlYXJIaXN0b3J5OiB0cnVlXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cblxuICAgICAgICB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ3RhYnZpZXcnKS5vbignc2VsZWN0ZWRJbmRleENoYW5nZWQnLCAoYXJnczpTZWxlY3RlZEluZGV4Q2hhbmdlZEV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3NlbGVjdGVkSW5kZXgnLCBhcmdzLm5ld0luZGV4KTtcbiAgICAgICAgICAgIGlmIChhcmdzLm5ld0luZGV4ID09IDApIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRUaGlzV2Vla1NoaWZ0cygpXG4gICAgICAgICAgICAgICAgfSwgMTApXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgc2hpZnRzID0ge307XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKSBzaGlmdHMgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTaGlmdHMoc2hpZnRzKTtcbiAgICAgICAgICAgICAgICB9LCAxMClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgbGV0IHRhYlZpZXc6IFRhYlZpZXcgPSB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ3RhYnZpZXcnKVxuICAgICAgICB0aGlzLnNlbGVjdGVkSW5kZXggPSB0YWJWaWV3LnNlbGVjdGVkSW5kZXg7XG4gICAgfVxuXG4gICAgcHVibGljIHZpZXdUdXRvcmlhbCgpIHtcbiAgICAgICAgZnJhbWUudG9wbW9zdCgpLm5hdmlnYXRlKHtcbiAgICAgICAgICAgIG1vZHVsZU5hbWU6ICcvdmlld3MvdHV0b3JpYWwvdHV0b3JpYWwnLFxuICAgICAgICAgICAgYmFja3N0YWNrVmlzaWJsZTogZmFsc2UsXG4gICAgICAgICAgICBhbmltYXRlZDogdHJ1ZSxcbiAgICAgICAgICAgIGNsZWFySGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIHRyYW5zaXRpb246IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBcImZsaXBcIixcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5jdWJpY0JlemllcigwLjEsIDAuMSwgMC4xLCAxKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBjb250YWN0KCkge1xuICAgICAgICBlbWFpbC5hdmFpbGFibGUoKS50aGVuKGZ1bmN0aW9uKGF2YWlsKSB7XG4gICAgICAgICAgICBpZiAoYXZhaWwpIHtcbiAgICAgICAgICAgICAgICBlbWFpbC5jb21wb3NlKHtcbiAgICAgICAgICAgICAgICAgICAgc3ViamVjdDogXCJOYW5ueSBTaGlmdHMgcXVlc3Rpb24uLi5cIixcbiAgICAgICAgICAgICAgICAgICAgYm9keTogXCJcIixcbiAgICAgICAgICAgICAgICAgICAgdG86IFsnZGF2ZUBjdWJieW5vdGVzLmNvbSddXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkVtYWlsIGNvbXBvc2VyIGNsb3NlZFwiKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkVycm9yOiBcIiArIGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWxlcnQoJ0l0IGRvZXNudFxcJ3QgbG9vayBsaWtlIHlvdSBoYXZlIGVtYWlsIHNldCB1cCBvbiB0aGlzIGRldmljZSwgdG8gY29udGFjdCB1cyBqdXN0IHNlbmQgYW4gZW1haWwgdG8gZGF2ZUBjdWJieW5vdGVzLmNvbS4nKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIHNob3dNZW51KCkge1xuICAgICAgICBsZXQgc2lkZURyYXdlcjogUmFkU2lkZURyYXdlciA9IDxSYWRTaWRlRHJhd2VyPiggZnJhbWUudG9wbW9zdCgpLmdldFZpZXdCeUlkKFwiZHJhd2VyXCIpKTtcbiAgICAgICAgc2lkZURyYXdlci5zaG93RHJhd2VyKCk7XG4gICAgfSAgXG5cbiAgICBwdWJsaWMgbG9nVXNlcigpIHtcbiAgICAgICAgY29uc29sZS5kaXIoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpKTtcbiAgICAgICAgY29uc29sZS5sb2coSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VpZCcpKSlcbiAgICB9XG5cbiAgICBwdWJsaWMgZWRpdFJhdGVzKCkge1xuICAgICAgICB0aGlzLnNob3dTZXR0aW5ncygnL3ZpZXdzL2NvbXBvbmVudHMvZWRpdHJhdGVzL2VkaXRyYXRlcy54bWwnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3NldHRpbmdzVGl0bGUnLCAnRWRpdCBSYXRlcycpO1xuICAgIH1cblxuICAgIHB1YmxpYyBzYXZlUmF0ZXMoKSB7XG4gICAgICAgIGNvbnNvbGUuZGlyKHRoaXMuZ2V0KCd1c2VyJykpO1xuICAgICAgICBsZXQgZGF0YSA9IHtcbiAgICAgICAgICAgIGhvdXJseVJhdGU6IHRoaXMucGFnZS5nZXRWaWV3QnlJZCgnaG91cmx5X3JhdGUnKS50ZXh0LFxuICAgICAgICAgICAgb3ZlcnRpbWVSYXRlOiB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ292ZXJ0aW1lX3JhdGUnKS50ZXh0LFxuICAgICAgICAgICAgZmlyc3RfbmFtZTogdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdmaXJzdF9uYW1lJykudGV4dCxcbiAgICAgICAgICAgIGxhc3RfbmFtZTogdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdsYXN0X25hbWUnKS50ZXh0LFxuICAgICAgICAgICAgZW1haWw6IHRoaXMucGFnZS5nZXRWaWV3QnlJZCgnZW1haWwnKS50ZXh0XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFkYXRhLmhvdXJseVJhdGUgfHwgIWRhdGEub3ZlcnRpbWVSYXRlIHx8ICFkYXRhLmZpcnN0X25hbWUgfHwgIWRhdGEubGFzdF9uYW1lIHx8ICFkYXRhLmVtYWlsKSB7XG4gICAgICAgICAgICBhbGVydCgnUGxlYXNlIGZpbGwgb3V0IGFsbCB0aGUgZmllbGRzLicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHVzZXJTZXJ2aWNlLnVwZGF0ZVVzZXIoZGF0YSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gZGF0YSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2V0KCd1c2VyJylbeF0gPSBkYXRhW3hdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgcmVmcmVzaERhdGEoYXJncykge1xuICAgICAgICB2YXIgcHVsbFJlZnJlc2ggPSBhcmdzLm9iamVjdDtcbiAgICAgICAgc2hpZnRTZXJ2aWNlLmJ1aWxkQXBwRGF0YSh0cnVlKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICB0aGlzLmdldFRoaXNXZWVrU2hpZnRzKCk7XG4gICAgICAgICAgICB0aGlzLnNldCgnaXNMb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgbGV0IGludm9pY2VzID0gW107XG4gICAgICAgICAgICBpZiAoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKSBpbnZvaWNlcyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKTtcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc0ludm9pY2VzKGludm9pY2VzKTtcbiAgICAgICAgICAgIHB1bGxSZWZyZXNoLnJlZnJlc2hpbmcgPSBmYWxzZTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgZWRpdEZhbWlseShhcmdzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdmYW1pbGllcz8nKVxuICAgICAgICAvLyAndGhpcycgaXMgbm93IHRoZSBmYW1pbHkgeW91IHRhcHBlZCBmcm9tIHRoZSByZXBlYXRlclxuICAgICAgICBsZXQgZmFtaWxpZXMgPSBNeU1vZGVsLmZhbWlsaWVzO1xuXG4gICAgICAgIGxldCBmYW1pbHkgPSBmYW1pbGllcy5maWx0ZXIoaXRlbSA9PiBpdGVtLmdldCgnaWQnKSA9PT0gYXJncy5vYmplY3QuaWQpWzBdO1xuICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ0ZhbWlseScsIGZhbWlseSk7XG4gICAgICAgIE15TW9kZWwuc2hvd1NldHRpbmdzKCcvdmlld3MvY29tcG9uZW50cy9lZGl0ZmFtaWx5L2VkaXRmYW1pbHkueG1sJyk7XG4gICAgICAgIE15TW9kZWwuc2V0KCdzZXR0aW5nc1RpdGxlJywgJ0VkaXQgRmFtaWx5Jyk7XG4gICAgICAgIE15TW9kZWwucGFnZS5nZXRWaWV3QnlJZCgnZWRpdGluZ19mYW1pbHlfdmlldycpLmJpbmRpbmdDb250ZXh0ID0gTXlNb2RlbC5lZGl0aW5nRmFtaWx5O1xuICAgIH1cblxuICAgIHB1YmxpYyBhZGRGYW1pbHkoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdlZGl0aW5nRmFtaWx5Jywgb2JzZXJ2YWJsZUZyb21PYmplY3Qoe30pKTtcbiAgICAgICAgdGhpcy5zaG93U2V0dGluZ3MoJy92aWV3cy9jb21wb25lbnRzL2VkaXRmYW1pbHkvZWRpdGZhbWlseS54bWwnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3NldHRpbmdzVGl0bGUnLCAnQWRkIEZhbWlseScpO1xuICAgICAgICBNeU1vZGVsLnBhZ2UuZ2V0Vmlld0J5SWQoJ2VkaXRpbmdfZmFtaWx5X3ZpZXcnKS5iaW5kaW5nQ29udGV4dCA9IE15TW9kZWwuZWRpdGluZ0ZhbWlseTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2F2ZUZhbWlseSgpIHtcbiAgICAgICAgbGV0IGRhdGE6YW55ID0ge1xuICAgICAgICAgICAgbmFtZTogdGhpcy5nZXQoJ2VkaXRpbmdGYW1pbHknKS5nZXQoJ25hbWUnKSxcbiAgICAgICAgICAgIGVtYWlsOiB0aGlzLmdldCgnZWRpdGluZ0ZhbWlseScpLmdldCgnZW1haWwnKVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5lZGl0aW5nRmFtaWx5LmdldCgnaWQnKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2VkaXRpbmcgYSBmYW1pbHknKTtcbiAgICAgICAgICAgIHVzZXJTZXJ2aWNlLnNhdmVGYW1pbHkodGhpcy5lZGl0aW5nRmFtaWx5LmdldCgnaWQnKSwgZGF0YSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGZhbWlsaWVzID0gdGhpcy5mYW1pbGllc1xuICAgICAgICAgICAgICAgIGZhbWlsaWVzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnaWQnKSA9PSB0aGlzLmVkaXRpbmdGYW1pbHkuZ2V0KCdpZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnNldCgnbmFtZScsIGRhdGEubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnNldCgnZW1haWwnLCBkYXRhLmVtYWlsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZVNldHRpbmdzKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2FkZGluZyBhIGZhbWlseScpO1xuICAgICAgICAgICAgbGV0IGZhbWlsaWVzID0gdGhpcy5mYW1pbGllcztcbiAgICAgICAgICAgIHVzZXJTZXJ2aWNlLmFkZEZhbWlseShkYXRhKS50aGVuKChyZXN1bHQ6YW55KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGZhbWlsaWVzID0gdGhpcy5mYW1pbGllcztcbiAgICAgICAgICAgICAgICBkYXRhLmlkID0gcmVzdWx0LmtleTtcbiAgICAgICAgICAgICAgICBmYW1pbGllcy5wdXNoKG9ic2VydmFibGVGcm9tT2JqZWN0KGRhdGEpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnZmFtaWxpZXNDb3VudCcsIGZhbWlsaWVzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgaWYgKGZhbWlsaWVzLmxlbmd0aCA+IDEpIHRoaXMuZmFtaWxpZXMuZ2V0SXRlbSgwKS5zZXQoJ2p1c3RPbmVGYW1pbHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgcmVtb3ZlRmFtaWx5KGFyZ3MpIHtcbiAgICAgICAgbGV0IGZhbUlkID0gYXJncy5vYmplY3QuaWQ7XG4gICAgICAgIGRpYWxvZ3MuY29uZmlybSgnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHJlbW92ZSB0aGlzIGZhbWlseT8gSWYgdGhleSBoYXZlIGNvbnRyaWJ1dGVkIHRvIGFueSBzaGlmdHMsIHRoZXkgd2lsbCBubyBsb25nZXIgZGlzcGxheSBpbiB0aGUgc2hpZnQgZGV0YWlscywgYnV0IHRoZSB0b3RhbCBhbW91bnQgcmVjZWl2ZWQgd2lsbCBub3QgY2hhbmdlLicpLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHVzZXJTZXJ2aWNlLnVwZGF0ZUZhbWlseShmYW1JZCwge2RlbGV0ZWQ6IHRydWV9KS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZhbWlsaWVzID0gTXlNb2RlbC5mYW1pbGllcztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRlbGV0ZUluZGV4O1xuICAgICAgICAgICAgICAgICAgICBmYW1pbGllcy5mb3JFYWNoKChlbGVtZW50LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuZ2V0KCdpZCcpID09IGZhbUlkKSBkZWxldGVJbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgZmFtaWxpZXMuc3BsaWNlKGRlbGV0ZUluZGV4LCAxKVxuICAgICAgICAgICAgICAgICAgICBpZiAoZmFtaWxpZXMubGVuZ3RoID09IDEpIE15TW9kZWwuZmFtaWxpZXMuZ2V0SXRlbSgwKS5zZXQoJ2p1c3RPbmVGYW1pbHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2ZhbWlsaWVzJywgZmFtaWxpZXMpO1xuICAgICAgICAgICAgICAgICAgICBNeU1vZGVsLmhpZGVTZXR0aW5ncygpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIGdldFRoaXNXZWVrU2hpZnRzKHJlZnJlc2hEYXRhPykge1xuICAgICAgICBpZiAocmVmcmVzaERhdGEpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdpc0xvYWRpbmcnLCB0cnVlKTtcbiAgICAgICAgICAgIHNoaWZ0U2VydmljZS5nZXRTaGlmdHMoMTUsIHRydWUpLnRoZW4oc2hpZnRzID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnaXNMb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1NoaWZ0cyhzaGlmdHMpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBzaGlmdHMgPSB7fTtcbiAgICAgICAgICAgIGlmIChhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKSBzaGlmdHMgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpO1xuICAgICAgICAgICAgdGhpcy5wcm9jZXNzU2hpZnRzKHNoaWZ0cyk7XG5cbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgICAgIFxuICAgIH1cblxuICAgIC8qKioqKioqKioqKioqKioqKiogSU5WT0lDRSBGVU5DVElPTlMgKioqKioqKioqKioqKioqKioqL1xuXG4gICAgcHVibGljIGludm9pY2VPcHRpb25zKGFyZ3MpIHtcbiAgICAgICAgbGV0IGludm9pY2UgPSB0aGlzLmludm9pY2VzLmdldEl0ZW0oYXJncy5pbmRleCk7XG4gICAgICAgIGlmIChpbnZvaWNlKSB7XG4gICAgICAgICAgICBsZXQgYWN0aW9ucyA9IFtdO1xuICAgICAgICAgICAgaWYgKCFpbnZvaWNlLmdldCgncGFpZCcpKSB7XG4gICAgICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCdNYXJrIEFzIFBhaWQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCdVbm1hcmsgQXMgUGFpZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFpbnZvaWNlLmdldCgnc2VudCcpKSB7XG4gICAgICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCdTZW5kIHRvICcgKyB0aGlzLmZhbWlsaWVzTWFwW2ludm9pY2UuZ2V0KCdmYW1pbHlfaWQnKV0ubmFtZSk7XG4gICAgICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCdFZGl0Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghaW52b2ljZS5nZXQoJ3BhaWQnKSkgYWN0aW9ucy5wdXNoKCdSZS1zZW5kIHRvICcgKyB0aGlzLmZhbWlsaWVzTWFwW2ludm9pY2UuZ2V0KCdmYW1pbHlfaWQnKV0ubmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhY3Rpb25zLnB1c2goJ1ZpZXcnKTtcbiAgICAgICAgICAgIGFjdGlvbnMucHVzaCgnRGVsZXRlJyk7XG5cbiAgICAgICAgICAgIGRpYWxvZ3MuYWN0aW9uKHRoaXMuZmFtaWxpZXNNYXBbaW52b2ljZS5nZXQoJ2ZhbWlseV9pZCcpXS5uYW1lICsgJyBmb3IgJCcgKyBpbnZvaWNlLmdldCgndG90YWwnKSwgXCJDYW5jZWxcIiwgYWN0aW9ucykudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgPT0gJ0VkaXQnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vdGhpcy5zaG93RWRpdFNoaWZ0KGZhbHNlLCBzaGlmdCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT0gJ0RlbGV0ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1zZyA9ICdBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoaXMgaW52b2ljZT8nO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW52b2ljZS5nZXQoJ3BhaWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXNnICs9ICcgWW91XFwndmUgbWFya2VkIHRoaXMgaW52b2ljZSBhcyBwYWlkLCBzbyByZW1lbWJlciB0byBhZGp1c3QgeW91ciByZWNvcmRzIGFjY29yZGluZ2x5Lic7IFxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGludm9pY2UuZ2V0KCdzZW50JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1zZyArPSAnIFlvdVxcJ3ZlIGFscmVhZHkgc2VudCB0aGlzIGludm9pY2UgdG8gJyArIHRoaXMuZmFtaWxpZXNNYXBbaW52b2ljZS5nZXQoJ2ZhbWlseV9pZCcpXS5uYW1lICsgJywgc28gcGxlYXNlIHJlYWNoIG91dCB0byB0aGVtIGRpcmVjdGx5IGluZm9ybWluZyB0aGVtIHRoYXQgdGhleSBjYW4gZGlzY2FyZCB0aGlzIGludm9pY2UuJztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ3MuYWN0aW9uKG1zZywgXCJDYW5jZWxcIiwgW1wiRG8gaXQuXCJdKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgPT0gJ0RvIGl0LicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgnbG9hZGluZycsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNoaWZ0U2VydmljZS5kZWxldGVJbnZvaWNlKGludm9pY2UuZ2V0KCdpZCcpKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnZvaWNlcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKSBpbnZvaWNlcyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoaW52b2ljZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgnbG9hZGluZycsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09ICdNYXJrIEFzIFBhaWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdsb2FkaW5nJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0U2VydmljZS51cGRhdGVJbnZvaWNlKGludm9pY2UuZ2V0KCdpZCcpLCB7cGFpZDogdHJ1ZX0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdsb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW52b2ljZS5zZXQoJ3BhaWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0b3RhbCA9IHBhcnNlRmxvYXQoaW52b2ljZS5nZXQoJ3RvdGFsJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRVbnBhaWRUb3RhbCA9IHBhcnNlRmxvYXQodGhpcy5nZXQoJ3RvdGFsVW5wYWlkJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld1VucGFpZFRvdGFsID0gKGN1cnJlbnRVbnBhaWRUb3RhbCAtIHRvdGFsKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ3RvdGFsVW5wYWlkJywgbmV3VW5wYWlkVG90YWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ3RvdGFsVW5wYWlkU3RyaW5nJywgJ1lvdSBoYXZlICQnICsgbmV3VW5wYWlkVG90YWwgKyAnIGluIHVucGFpZCBpbnZvaWNlcy4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbmV3VW5wYWlkVG90YWwgfHwgbmV3VW5wYWlkVG90YWwgPT0gJzAuMDAnKSB0aGlzLnNldCgndG90YWxVbnBhaWRTdHJpbmcnLCAnWW91XFwncmUgYWxsIHBhaWQgdXAhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW52b2ljZUxpc3RWaWV3OiBMaXN0VmlldyA9IHRoaXMucGFnZS5nZXRWaWV3QnlJZCgnaW52b2ljZXNfbGlzdHZpZXcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2VMaXN0Vmlldy5yZWZyZXNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL3RoaXMuaW52b2ljZXMuc2V0SXRlbShhcmdzLmluZGV4LCBpbnZvaWNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PSAnVW5tYXJrIEFzIFBhaWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdsb2FkaW5nJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0U2VydmljZS51cGRhdGVJbnZvaWNlKGludm9pY2UuZ2V0KCdpZCcpLCB7cGFpZDogZmFsc2V9KS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgnbG9hZGluZycsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdwYWlkJywgZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdG90YWwgPSBwYXJzZUZsb2F0KGludm9pY2UuZ2V0KCd0b3RhbCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjdXJyZW50VW5wYWlkVG90YWwgPSBwYXJzZUZsb2F0KHRoaXMuZ2V0KCd0b3RhbFVucGFpZCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdVbnBhaWRUb3RhbCA9IChjdXJyZW50VW5wYWlkVG90YWwgKyB0b3RhbCkudG9GaXhlZCgyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCd0b3RhbFVucGFpZCcsIG5ld1VucGFpZFRvdGFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCd0b3RhbFVucGFpZFN0cmluZycsICdZb3UgaGF2ZSAkJyArIG5ld1VucGFpZFRvdGFsICsgJyBpbiB1bnBhaWQgaW52b2ljZXMuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW5ld1VucGFpZFRvdGFsIHx8IG5ld1VucGFpZFRvdGFsID09ICcwLjAwJykgdGhpcy5zZXQoJ3RvdGFsVW5wYWlkU3RyaW5nJywgJ1lvdVxcJ3JlIGFsbCBwYWlkIHVwIScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGludm9pY2VMaXN0VmlldzogTGlzdFZpZXcgPSB0aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ2ludm9pY2VzX2xpc3R2aWV3Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlTGlzdFZpZXcucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09ICdWaWV3Jykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmludm9pY2VNYXBbaW52b2ljZS5nZXQoJ2lkJyldLmZhbWlseSA9IHRoaXMuZmFtaWxpZXNNYXBbaW52b2ljZS5nZXQoJ2ZhbWlseV9pZCcpXTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5hdmlnYXRpb25FbnRyeTpmcmFtZS5OYXZpZ2F0aW9uRW50cnkgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGVOYW1lOiBcIi92aWV3cy9pbnZvaWNlL2ludm9pY2VcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQ6IHRoaXMuaW52b2ljZU1hcFtpbnZvaWNlLmdldCgnaWQnKV0sXG4gICAgICAgICAgICAgICAgICAgICAgICBhbmltYXRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tzdGFja1Zpc2libGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhckhpc3Rvcnk6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGZyYW1lLnRvcG1vc3QoKS5uYXZpZ2F0ZShuYXZpZ2F0aW9uRW50cnkpO1xuICAgICAgICAgICAgICAgICAgICAvL2ZyYW1lLnRvcG1vc3QoKS5uYXZpZ2F0ZSgnL3ZpZXdzL2ludm9pY2UvaW52b2ljZScpO1xuXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT0gJ1NlbmQgdG8gJyArIHRoaXMuZmFtaWxpZXNNYXBbaW52b2ljZS5nZXQoJ2ZhbWlseV9pZCcpXS5uYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdsb2FkaW5nJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VuZEludm9pY2UoaW52b2ljZS5nZXQoJ2lkJyksIGludm9pY2UpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgc2VudFRpbWVzID0gW21vbWVudCgpLmZvcm1hdCgpXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kaXIoc2VudFRpbWVzKTtcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLnVwZGF0ZUludm9pY2UoaW52b2ljZS5nZXQoJ2lkJyksIHtzZW50OiB0cnVlLCBzZW50X3RpbWVzOiBzZW50VGltZXN9KS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgnc2VudCcsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ1RoZSBpbnZvaWNlIGhhcyBiZWVuIHNlbnQhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgnbG9hZGluZycsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PSAnUmUtc2VuZCB0byAnICsgdGhpcy5mYW1pbGllc01hcFtpbnZvaWNlLmdldCgnZmFtaWx5X2lkJyldLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNlbnRUaW1lcyA9IFttb21lbnQoKS5mb3JtYXQoKV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnZvaWNlLmdldCgnc2VudF90aW1lcycpICYmIGludm9pY2UuZ2V0KCdzZW50X3RpbWVzJykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZW50VGltZXMgPSBpbnZvaWNlLmdldCgnc2VudF90aW1lcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VudFRpbWVzLnB1c2gobW9tZW50KCkuZm9ybWF0KCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGlyKHNlbnRUaW1lcyk7XG4gICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdsb2FkaW5nJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VuZEludm9pY2UoaW52b2ljZS5nZXQoJ2lkJyksIGludm9pY2UsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLnVwZGF0ZUludm9pY2UoaW52b2ljZS5nZXQoJ2lkJyksIHtzZW50OiB0cnVlLCBzZW50X3RpbWVzOiBzZW50VGltZXN9KS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnJylcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdzZW50JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZvaWNlLnNldCgnc2VudF90aW1lcycsIHNlbnRUaW1lcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydCgnVGhlIGludm9pY2UgaGFzIGJlZW4gc2VudCEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2Uuc2V0KCdsb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICBhbGVydCgnV2Ugc2VudCBhIGZyaWVuZGx5IHJlbWluZGVyIHRvICcgKyB0aGlzLmZhbWlsaWVzTWFwW2ludm9pY2UuZ2V0KCdmYW1pbHlfaWQnKV0ubmFtZSlcbiAgICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBzaG93Q3JlYXRlSW52b2ljZSgpIHtcbiAgICAgICAgTXlNb2RlbC5zZXQoJ3NlbGVjdGVkRmFtaWx5VG9JbnZvaWNlJywgZmFsc2UpO1xuICAgICAgICBcbiAgICAgICAgTXlNb2RlbC5zZXQoJ3VuaW52b2ljZWRTaGlmdHMnLCBbXSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5mYW1pbGllcy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgd2hpbGUgKHRoaXMudW5pbnZvaWNlZFNoaWZ0cy5sZW5ndGgpIHRoaXMudW5pbnZvaWNlZFNoaWZ0cy5wb3AoKTtcbiAgICAgICAgICAgIGxldCB1bmludm9pY2VkU2hpZnRzQXJyYXkgPSBbXTtcbiAgICAgICAgICAgIGxldCBmYW1pbHkgPSB0aGlzLmZhbWlsaWVzTWFwW3RoaXMuZmFtaWxpZXMuZ2V0SXRlbSgwKS5nZXQoJ2lkJyldO1xuICAgICAgICAgICAgbGV0IGludm9pY2VUb3RhbCA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciBpIGluIHRoaXMudW5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ZhbWlseS5pZF0pIHtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hZGRlZFNoaWZ0c01hcFtpXS5lbmRfdGltZSAmJiB0aGlzLmFkZGVkU2hpZnRzTWFwW2ldLmNvbnRyaWJ1dGlvbnNbZmFtaWx5LmlkXSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZmFtaWx5Q29udHJpYnV0aW9uID0gdGhpcy5hZGRlZFNoaWZ0c01hcFtpXS5jb250cmlidXRpb25zW2ZhbWlseS5pZF07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkZWRTaGlmdHNNYXBbaV0uc2VsZWN0ZWRfZmFtaWx5X2NvbnRyaWJ1dGlvbiA9IGZhbWlseUNvbnRyaWJ1dGlvbjtcbiAgICAgICAgICAgICAgICAgICAgdW5pbnZvaWNlZFNoaWZ0c0FycmF5LnB1c2godGhpcy5hZGRlZFNoaWZ0c01hcFtpXSk7XG4gICAgICAgICAgICAgICAgICAgIGludm9pY2VUb3RhbCArPSArdGhpcy5hZGRlZFNoaWZ0c01hcFtpXS5zZWxlY3RlZF9mYW1pbHlfY29udHJpYnV0aW9uO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh1bmludm9pY2VkU2hpZnRzQXJyYXkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEZhbWlseVRvSW52b2ljZSA9IGZhbWlseTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnaW52b2ljZVRvdGFsJywgaW52b2ljZVRvdGFsLnRvRml4ZWQoMikpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0KCd1bmludm9pY2VkU2hpZnRzJywgdW5pbnZvaWNlZFNoaWZ0c0FycmF5KTtcblxuICAgICAgICAgICAgICAgIE15TW9kZWwuc2hvd1NldHRpbmdzKCcvdmlld3MvY29tcG9uZW50cy9lZGl0aW52b2ljZS9lZGl0aW52b2ljZS54bWwnKTtcbiAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnc2V0dGluZ3NUaXRsZScsICdDcmVhdGUgSW52b2ljZScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkRmFtaWx5VG9JbnZvaWNlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgYWxlcnQoJ1lvdSBkb25cXCd0IGhhdmUgYW55IHVuaW52b2ljZWQgc2hpZnRzLCBzbyB5b3UgY2FuXFwndCBjcmVhdGUgYW4gaW52b2ljZSByaWdodCBub3cuJylcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIE15TW9kZWwuc2hvd1NldHRpbmdzKCcvdmlld3MvY29tcG9uZW50cy9lZGl0aW52b2ljZS9lZGl0aW52b2ljZS54bWwnKTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZXR0aW5nc1RpdGxlJywgJ0NyZWF0ZSBJbnZvaWNlJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgY2hvb3NlRmFtaWx5VG9JbnZvaWNlKCkge1xuICAgICAgICBpZiAodGhpcy5mYW1pbGllcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0aGlzLmRpc21pc3NTb2Z0SW5wdXRzKCk7XG4gICAgICAgICAgICB0aGlzLnNldCgncGlja2luZycsICdsaXN0Jyk7XG4gICAgICAgICAgICB0aGlzLnNldCgncGlja2VyVGl0bGUnLCAnQ2hvb3NlIEZhbWlseScpO1xuICAgICAgICAgICAgbGV0IHBpY2tlckl0ZW1zID0gW107XG4gICAgICAgICAgICB0aGlzLmZhbWlsaWVzLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgcGlja2VySXRlbXMucHVzaChpdGVtLmdldCgnbmFtZScpKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB0aGlzLnNldCgncGlja2VySXRlbXMnLCBwaWNrZXJJdGVtcyk7XG4gICAgICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZVRleHQnLCAnRG9uZScpO1xuICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVTaG93KCk7XG4gICAgICAgICAgICB0aGlzLnNldCgncGlja2VyQ2FuY2VsJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLy8gZW1wdHkgdGhlIHVuaW52b2ljZWRTaGlmdHMgYXJyYXkgaWYgdGhlcmVzIGFueXRoaW5nIGluIGl0LlxuICAgICAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAodGhpcy51bmludm9pY2VkU2hpZnRzLmxlbmd0aCkgdGhpcy51bmludm9pY2VkU2hpZnRzLnBvcCgpO1xuICAgICAgICAgICAgICAgIGxldCB1bmludm9pY2VkU2hpZnRzQXJyYXkgPSBbXTtcbiAgICAgICAgICAgICAgICBsZXQgZmFtaWx5ID0gdGhpcy5mYW1pbGllc01hcFt0aGlzLmZhbWlsaWVzLmdldEl0ZW0odGhpcy5wYWdlLmdldFZpZXdCeUlkKCdsaXN0cGlja2VyJykuc2VsZWN0ZWRJbmRleCkuZ2V0KCdpZCcpXTtcbiAgICAgICAgICAgICAgICBsZXQgaW52b2ljZVRvdGFsID0gMDtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIHRoaXMudW5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ZhbWlseS5pZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmFkZGVkU2hpZnRzTWFwW2ldLmVuZF90aW1lICYmIHRoaXMuYWRkZWRTaGlmdHNNYXBbaV0uY29udHJpYnV0aW9uc1tmYW1pbHkuaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZmFtaWx5Q29udHJpYnV0aW9uID0gdGhpcy5hZGRlZFNoaWZ0c01hcFtpXS5jb250cmlidXRpb25zW2ZhbWlseS5pZF07XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZGVkU2hpZnRzTWFwW2ldLnNlbGVjdGVkX2ZhbWlseV9jb250cmlidXRpb24gPSBmYW1pbHlDb250cmlidXRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICB1bmludm9pY2VkU2hpZnRzQXJyYXkucHVzaCh0aGlzLmFkZGVkU2hpZnRzTWFwW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludm9pY2VUb3RhbCArPSArdGhpcy5hZGRlZFNoaWZ0c01hcFtpXS5zZWxlY3RlZF9mYW1pbHlfY29udHJpYnV0aW9uO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh1bmludm9pY2VkU2hpZnRzQXJyYXkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRGYW1pbHlUb0ludm9pY2UgPSBmYW1pbHk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdpbnZvaWNlVG90YWwnLCBpbnZvaWNlVG90YWwudG9GaXhlZCgyKSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCd1bmludm9pY2VkU2hpZnRzJywgdW5pbnZvaWNlZFNoaWZ0c0FycmF5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkRmFtaWx5VG9JbnZvaWNlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KCdUaGUgZmFtaWx5IHlvdSBjaG9zZSBkb2VzIG5vdCBoYXZlIGFueSB1bmludm9pY2VkIHNoaWZ0cywgdGhleVxcJ3JlIGFsbCBwYWlkIHVwIScpXG4gICAgICAgICAgICAgICAgfSAgICAgICBcbiAgICAgICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgdW5zZWxlY3RVbmludm9pY2VkU2hpZnQoYXJncykge1xuICAgICAgICBpZiAoYXJncy5vYmplY3QuaWQpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHNbaV07XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0uaWQgPT0gYXJncy5vYmplY3QuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRhcHBlZEl0ZW06IEdyaWRMYXlvdXQgPSBhcmdzLm9iamVjdDtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludm9pY2VUb3RhbCA9IHBhcnNlRmxvYXQoTXlNb2RlbC5nZXQoJ2ludm9pY2VUb3RhbCcpKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2Rpc3BsYXllZCBpbnZvaWNlIHRvdGFsICcgKyBuZXdJbnZvaWNlVG90YWwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGFwcGVkSXRlbS5jbGFzc05hbWUgPT0gJ3VuaW52b2ljZWRfc2hpZnQgc2VsZWN0ZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXBwZWRJdGVtLmNsYXNzTmFtZSA9ICd1bmludm9pY2VkX3NoaWZ0JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uZG9fbm90X2ludm9pY2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SW52b2ljZVRvdGFsIC09IHBhcnNlRmxvYXQoaXRlbS5zZWxlY3RlZF9mYW1pbHlfY29udHJpYnV0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcHBlZEl0ZW0uY2xhc3NOYW1lID0gJ3VuaW52b2ljZWRfc2hpZnQgc2VsZWN0ZWQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5kb19ub3RfaW52b2ljZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SW52b2ljZVRvdGFsICs9IHBhcnNlRmxvYXQoaXRlbS5zZWxlY3RlZF9mYW1pbHlfY29udHJpYnV0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnaW52b2ljZVRvdGFsJywgbmV3SW52b2ljZVRvdGFsLnRvRml4ZWQoMikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBzYXZlSW52b2ljZSgpIHtcbiAgICAgICAgbGV0IHNoaWZ0X2lkcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgTXlNb2RlbC51bmludm9pY2VkU2hpZnRzLmxlbmd0aCA+IGk7IGkrKykge1xuICAgICAgICAgICAgbGV0IGl0ZW0gPSBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHNbaV07XG5cbiAgICAgICAgICAgIGlmICghaXRlbS5kb19ub3RfaW52b2ljZSkgc2hpZnRfaWRzLnB1c2goaXRlbS5pZCk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGFyZ3MgPSB7XG4gICAgICAgICAgICBzaGlmdF9pZHM6IHNoaWZ0X2lkcyxcbiAgICAgICAgICAgIGZhbWlseV9pZDogdGhpcy5nZXQoJ3NlbGVjdGVkRmFtaWx5VG9JbnZvaWNlJykuaWQsXG4gICAgICAgICAgICB0b3RhbDogdGhpcy5nZXQoJ2ludm9pY2VUb3RhbCcpLFxuICAgICAgICAgICAgcGFpZDogZmFsc2UsXG4gICAgICAgICAgICBkYXRlX2NyZWF0ZWQ6IG1vbWVudCgpLmZvcm1hdCgpXG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFhcmdzLnNoaWZ0X2lkcyB8fCAhYXJncy5zaGlmdF9pZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhbGVydCgnUGxlYXNlIHNlbGVjdCBvbmUgb3IgbW9yZSBzaGlmdHMgdG8gaW5jbHVkZSBpbiB0aGlzIGludm9pY2UuJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzaGlmdFNlcnZpY2UuY3JlYXRlSW52b2ljZShhcmdzKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTsgICAgXG4gICAgICAgICAgICAgICAgbGV0IGludm9pY2VzID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkgaW52b2ljZXMgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW52b2ljZXMoaW52b2ljZXMpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9XG5cbiAgICBwdWJsaWMgc2F2ZUFuZFNlbmRJbnZvaWNlKCkge1xuICAgICAgICBsZXQgc2hpZnRfaWRzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBNeU1vZGVsLnVuaW52b2ljZWRTaGlmdHMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgaXRlbSA9IE15TW9kZWwudW5pbnZvaWNlZFNoaWZ0c1tpXTtcblxuICAgICAgICAgICAgaWYgKCFpdGVtLmRvX25vdF9pbnZvaWNlKSBzaGlmdF9pZHMucHVzaChpdGVtLmlkKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgYXJncyA9IHtcbiAgICAgICAgICAgIHNoaWZ0X2lkczogc2hpZnRfaWRzLFxuICAgICAgICAgICAgZmFtaWx5X2lkOiB0aGlzLmdldCgnc2VsZWN0ZWRGYW1pbHlUb0ludm9pY2UnKS5pZCxcbiAgICAgICAgICAgIHRvdGFsOiB0aGlzLmdldCgnaW52b2ljZVRvdGFsJyksXG4gICAgICAgICAgICBwYWlkOiBmYWxzZSxcbiAgICAgICAgICAgIGRhdGVfY3JlYXRlZDogbW9tZW50KCkuZm9ybWF0KCksXG4gICAgICAgICAgICBzZW50OiB0cnVlLFxuICAgICAgICAgICAgc2VudF90aW1lczogW21vbWVudCgpLmZvcm1hdCgpXVxuICAgICAgICB9XG4gICAgICAgIGlmICghYXJncy5zaGlmdF9pZHMgfHwgIWFyZ3Muc2hpZnRfaWRzLmxlbmd0aCkge1xuICAgICAgICAgICAgYWxlcnQoJ1BsZWFzZSBzZWxlY3Qgb25lIG9yIG1vcmUgc2hpZnRzIHRvIGluY2x1ZGUgaW4gdGhpcyBpbnZvaWNlLicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLmNyZWF0ZUludm9pY2UoYXJncykudGhlbigocmVzdWx0OmFueSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kSW52b2ljZShyZXN1bHQua2V5KVxuICAgICAgICAgICAgICAgIGxldCBpbnZvaWNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpIGludm9pY2VzID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpO1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0ludm9pY2VzKGludm9pY2VzKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfVxuXG4gICAgcHVibGljIHNlbmRJbnZvaWNlKGludm9pY2VfaWQsIGludm9pY2U/LCByZXNlbmRpbmc/KSB7XG4gICAgICAgIGxldCBodG1sID0gdGhpcy5idWlsZEludm9pY2VIdG1sKGludm9pY2VfaWQsIGludm9pY2UpO1xuICAgICAgICBsZXQgbWVzc2FnZSA9IHRoaXMudXNlci5maXJzdF9uYW1lICsgJyAnICsgdGhpcy51c2VyLmxhc3RfbmFtZSArICcgY3JlYXRlZCB0aGUgaW52b2ljZSBiZWxvdywgc2VuZCBwYXltZW50IGFzIHNvb24gYXMgeW91IGNhbi4nO1xuICAgICAgICBsZXQgc3ViamVjdCA9IHRoaXMudXNlci5maXJzdF9uYW1lICsgJyAnICsgdGhpcy51c2VyLmxhc3RfbmFtZSArICcgaGFzIHNlbnQgeW91IGFuIGludm9pY2UuJztcbiAgICAgICAgaWYgKHJlc2VuZGluZykge1xuICAgICAgICAgICAgbWVzc2FnZSA9IHRoaXMudXNlci5maXJzdF9uYW1lICsgJyAnICsgdGhpcy51c2VyLmxhc3RfbmFtZSArICcgcHJldmlvdXNseSBzZW50IHRoZSBpbnZvaWNlIGJlbG93LCBoZXJlXFwncyBhIGZyaWVuZGx5IHJlbWluZGVyIHRvIHNlbmQgcGF5bWVudCBhcyBzb29uIGFzIHlvdSBjYW4uJ1xuICAgICAgICAgICAgc3ViamVjdCA9IHRoaXMudXNlci5maXJzdF9uYW1lICsgJyAnICsgdGhpcy51c2VyLmxhc3RfbmFtZSArICcgaXMgc2VuZGluZyB5b3UgYSBmcmllbmRseSByZW1pbmRlciBhYm91dCBhbiB1bnBhaWQgaW52b2ljZS4nXG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFpbnZvaWNlKSB7XG4gICAgICAgICAgICB1c2VyU2VydmljZS5zZW5kRW1haWwodGhpcy5zZWxlY3RlZEZhbWlseVRvSW52b2ljZSwge2VtYWlsOiB0aGlzLnVzZXIuZW1haWwsIG5hbWU6IHRoaXMudXNlci5maXJzdF9uYW1lICsgJyAnICsgdGhpcy51c2VyLmxhc3RfbmFtZX0sIG1lc3NhZ2UsIGh0bWwsIHN1YmplY3QpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGZhbWlseVRvSW52b2ljZSA9IHRoaXMuZmFtaWxpZXNNYXBbaW52b2ljZS5mYW1pbHlfaWRdO1xuICAgICAgICAgICAgdXNlclNlcnZpY2Uuc2VuZEVtYWlsKGZhbWlseVRvSW52b2ljZSwge2VtYWlsOiB0aGlzLnVzZXIuZW1haWwsIG5hbWU6IHRoaXMudXNlci5maXJzdF9uYW1lICsgJyAnICsgdGhpcy51c2VyLmxhc3RfbmFtZX0sIG1lc3NhZ2UsIGh0bWwsIHN1YmplY3QpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgIH1cblxuICAgIHByaXZhdGUgYnVpbGRJbnZvaWNlSHRtbChpbnZvaWNlX2lkLCBpbnZvaWNlPykge1xuICAgICAgICBsZXQgaHRtbCA9IGBcbiAgICAgICAgICAgIDxjZW50ZXI+PHNwYW4gc3R5bGU9XCJjb2xvcjogZ3JheTsgZm9udC1zaXplOiAxMXB4OyBjb2xvcjogZ3JheTtcIj5JbnZvaWNlIElEOiBgICsgaW52b2ljZV9pZCArIGA8L3NwYW4+PC9jZW50ZXI+XG4gICAgICAgICAgICA8dGFibGUgd2lkdGg9XCIxMDAlXCIgc3R5bGU9XCJmb250LWZhbWlseTogSGVsdmV0aWNhOyBmb250LXNpemU6IDEzcHg7XCIgY2VsbHBhZGRpbmc9XCIwXCIgY2VsbHNwYWNpbmc9XCIwXCI+XG4gICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICA8dGggYWxpZ249XCJsZWZ0XCIgd2lkdGg9XCIxMDAlXCIgc3R5bGU9XCJwYWRkaW5nOiA1OyBib3JkZXItYm90dG9tOiAycHggc29saWQgI0UwRTBFMDtcIj5TaGlmdHM8L3RoPlxuICAgICAgICAgICAgICAgICAgICA8dGggYWxpZ249XCJsZWZ0XCIgc3R5bGU9XCJwYWRkaW5nOiA1OyBib3JkZXItYm90dG9tOiAycHggc29saWQgI0UwRTBFMDtcIj5Db250cmlidXRpb248L3RoPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgIGBcbiAgICAgICAgaWYgKCFpbnZvaWNlKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgTXlNb2RlbC51bmludm9pY2VkU2hpZnRzLmxlbmd0aCA+IGk7IGkrKykge1xuICAgICAgICAgICAgICAgIGxldCBpdGVtID0gTXlNb2RlbC51bmludm9pY2VkU2hpZnRzW2ldO1xuICAgICAgICAgICAgICAgIGlmICghaXRlbS5kb19ub3RfaW52b2ljZSkge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgYWxpZ249XCJsZWZ0XCIgc3R5bGU9XCJwYWRkaW5nOiA1OyBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2Y1ZjVmNTtcIj5gKyBpdGVtLmRpc3BsYXlfZGF0ZSArYDxiciAvPjxzcGFuIHN0eWxlPVwiZm9udC1zaXplOiAxMXB4OyBjb2xvcjogZ3JheTtcIj5gICsgaXRlbS5kaXNwbGF5X3RpbWluZyArIGA8L3NwYW4+PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgYWxpZ249XCJsZWZ0XCIgc3R5bGU9XCJwYWRkaW5nOiA1OyBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2Y1ZjVmNTsgZm9udC13ZWlnaHQ6IGJvbGQ7XCI+JGAgKyBpdGVtLmNvbnRyaWJ1dGlvbnNbdGhpcy5zZWxlY3RlZEZhbWlseVRvSW52b2ljZS5pZF0gKyBgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSBgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgICAgICAgICAgPGNlbnRlcj48aDIgc3R5bGU9XCJmb250LWZhbWlseTogSGVsdmV0aWNhO1wiPkludm9pY2UgVG90YWw6IDxzcGFuIHN0eWxlPVwiY29sb3I6IGdyZWVuO1wiPiRgICsgdGhpcy5pbnZvaWNlVG90YWwgKyBgPC9zcGFuPjwvaDI+PC9jZW50ZXI+XG4gICAgICAgICAgICBgXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaW52b2ljZS5zaGlmdF9pZHMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IHNoaWZ0ID0gTXlNb2RlbC5hZGRlZFNoaWZ0c01hcFtpbnZvaWNlLnNoaWZ0X2lkc1tpXV07XG4gICAgICAgICAgICAgICAgaWYgKHNoaWZ0KSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBhbGlnbj1cImxlZnRcIiBzdHlsZT1cInBhZGRpbmc6IDU7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZjVmNWY1O1wiPmArIHNoaWZ0LmRpc3BsYXlfZGF0ZSArYDxiciAvPjxzcGFuIHN0eWxlPVwiZm9udC1zaXplOiAxMXB4OyBjb2xvcjogZ3JheTtcIj5gICsgc2hpZnQuZGlzcGxheV90aW1pbmcgKyBgPC9zcGFuPjwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGFsaWduPVwibGVmdFwiIHN0eWxlPVwicGFkZGluZzogNTsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNmNWY1ZjU7IGZvbnQtd2VpZ2h0OiBib2xkO1wiPiRgICsgc2hpZnQuY29udHJpYnV0aW9uc1tpbnZvaWNlLmZhbWlseV9pZF0gKyBgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSBgXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgICAgICAgICAgPGNlbnRlcj48aDIgc3R5bGU9XCJmb250LWZhbWlseTogSGVsdmV0aWNhO1wiPkludm9pY2UgVG90YWw6IDxzcGFuIHN0eWxlPVwiY29sb3I6IGdyZWVuO1wiPiRgICsgaW52b2ljZS50b3RhbCArIGA8L3NwYW4+PC9oMj48L2NlbnRlcj5cbiAgICAgICAgICAgIGBcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxuICAgIFxuICAgIC8qKioqKioqKioqKioqKioqKiogL0lOVk9JQ0UgRlVOQ1RJT05TICoqKioqKioqKioqKioqKioqKi9cblxuICAgIC8qKioqKioqKioqKioqKioqKiogU0hJRlQgRlVOQ1RJT05TICoqKioqKioqKioqKioqKioqKi9cblxuICAgIHB1YmxpYyBzaGlmdE9wdGlvbnMoYXJncykge1xuICAgICAgICBsZXQgc2hpZnQ7XG4gICAgICAgIGlmIChhcmdzLmV2ZW50TmFtZSAmJiBhcmdzLmV2ZW50TmFtZSA9PSAnaXRlbVRhcCcpIHtcbiAgICAgICAgICAgIHNoaWZ0ID0gTXlNb2RlbC5hZGRlZFNoaWZ0c01hcFt0aGlzLnNlY3Rpb25lZFNoaWZ0cy5nZXRJdGVtKGFyZ3MuaW5kZXgpLmdldCgnaWQnKV1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNoaWZ0ID0gTXlNb2RlbC5hZGRlZFNoaWZ0c01hcFthcmdzLm9iamVjdC5pZF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNoaWZ0KSB7XG4gICAgICAgICAgICBkaWFsb2dzLmFjdGlvbihzaGlmdC50aXRsZSArICcgZnJvbSAnICsgc2hpZnQuZGlzcGxheV9ob3VycywgXCJDYW5jZWxcIiwgW1wiRWRpdCBTaGlmdFwiLCBcIkRlbGV0ZSBTaGlmdFwiXSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgPT0gJ0VkaXQgU2hpZnQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGlyKEpTT04uc3RyaW5naWZ5KHNoaWZ0Lmludm9pY2VkKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzaGlmdC5pbnZvaWNlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1zZyA9ICdUaGlzIHNoaWZ0IGlzIGluY2x1ZGVkIGluIGludm9pY2VzIGZvciB0aGUgZm9sbG93aW5nIGZhbWlsZXM6ICcgKyBzaGlmdC5pbnZvaWNlZF9mYW1pbGllc19zdHJpbmcgKyAnLiBJZiB5b3UgZWRpdCB0aGUgY29udHJpYnV0aW9ucyBmb3IgYSBmYW1pbHksIHlvdVxcJ2xsIG5lZWQgdG8gZGVsZXRlIHRoZSBpbnZvaWNlIHRoaXMgc2hpZnQgaXMgYXNzb2NpYXRlZCB3aXRoIGFuZCBjcmVhdGUgYSBuZXcgb25lLiBBbHNvLCBtYWtlIHN1cmUgeW91IHJlYWNoIG91dCB0byB0aGUgZmFtaWx5IGFuZCBpbmZvcm0gdGhlbSB0byBpZ25vcmUgdGhlIHByZXZpb3VzIGludm9pY2UuJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmZhbWlsaWVzLmxlbmd0aCA9PSAxKSBtc2cgPSAnVGhpcyBzaGlmdCBpcyBpbmNsdWRlZCBpbiBhbiBpbnZvaWNlIGFscmVhZHkuIElmIHlvdSBlZGl0IHRoZSBob3VycyB3b3JrZWQsIHlvdVxcJ2xsIG5lZWQgdG8gZGVsZXRlIHRoZSBpbnZvaWNlIHRoaXMgc2hpZnQgaXMgYXNzb2NpYXRlZCB3aXRoIGFuZCBjcmVhdGUgYSBuZXcgb25lLiBBbHNvLCBtYWtlIHN1cmUgeW91IHJlYWNoIG91dCB0byB0aGUgZmFtaWx5IGFuZCBpbmZvcm0gdGhlbSB0byBpZ25vcmUgdGhlIHByZXZpb3VzIGludm9pY2UuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlhbG9ncy5jb25maXJtKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJUaGlzIHNoaWZ0IGhhcyBhbHJlYWR5IGJlZW4gaW52b2ljZWQhXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogbXNnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9rQnV0dG9uVGV4dDogXCJPay5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW5jZWxCdXR0b25UZXh0OiBcIkNhbmNlbFwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZXN1bHQgYXJndW1lbnQgaXMgYm9vbGVhblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGlyKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNob3dFZGl0U2hpZnQoZmFsc2UsIHNoaWZ0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvd0VkaXRTaGlmdChmYWxzZSwgc2hpZnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09ICdEZWxldGUgU2hpZnQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBtc2cgPSAnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSB0aGlzIHNoaWZ0PyBUaGlzIGNhbm5vdCBiZSB1bmRvbmUuJztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNoaWZ0Lmludm9pY2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtc2cgPSAnVGhpcyBzaGlmdCBpcyBpbmNsdWRlZCBpbiBpbnZvaWNlcyBmb3IgdGhlIGZvbGxvd2luZyBmYW1pbGVzOiAnICsgc2hpZnQuaW52b2ljZWRfZmFtaWxpZXNfc3RyaW5nICsgJy4gRGVsZXRpbmcgdGhpcyBzaGlmdCB3aWxsIHJlbW92ZSBpdCBmcm9tIHRoYXQgaW52b2ljZSwgYnV0IG5vdCBhZGp1c3QgdGhlIGludm9pY2VcXCdzIHRvdGFsLiBBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoaXMgc2hpZnQ/IEl0IGNhbm5vdCBiZSB1bmRvbmUuJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmZhbWlsaWVzLmxlbmd0aCA9PSAxKSBtc2cgPSAnVGhpcyBzaGlmdCBpcyBpbmNsdWRlZCBpbiBhbiBpbnZvaWNlLiBEZWxldGluZyB0aGlzIHNoaWZ0IHdpbGwgcmVtb3ZlIGl0IGZyb20gdGhhdCBpbnZvaWNlLCBidXQgbm90IGFkanVzdCB0aGUgaW52b2ljZVxcJ3MgdG90YWwuIEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgdGhpcyBzaGlmdD8gSXQgY2Fubm90IGJlIHVuZG9uZS4nO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZGlhbG9ncy5hY3Rpb24obXNnLCBcIkNhbmNlbFwiLCBbXCJEbyBpdC5cIl0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgPT0gJ0RvIGl0LicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaGlmdFNlcnZpY2UuZGVsZXRlU2hpZnQoc2hpZnQuaWQpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzU2hpZnRzKEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW52b2ljZXMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSkgaW52b2ljZXMgPSBKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnaW52b2ljZXMnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0ludm9pY2VzKGludm9pY2VzKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfVxuXG4gICAgcHVibGljIHNob3dFZGl0U2hpZnQoYXJncywgc2hpZnQpIHtcbiAgICAgICAgLy8gYHRoaXNgIGlzIG5vdyByZWZlcnJpbmcgdG8gdGhlIHRhcHBlZCBzaGlmdCBvYmplY3QsIGFuZCBub3QgdGhlIG1vZGVsIGFueW1vcmUsIFxuICAgICAgICAvLyBzbyB3ZSBoYXZlIHRvIHVzZSBNeU1vZGVsIHdoaWNoIGlzIGEgcmVmZXJlbmNlIHRvIEhvbWVNb2RlbC5cbiAgICAgICAgLy8gY29uc29sZS5kaXIoYXJncyk7XG4gICAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgICAgICBpZiAoYXJncy5ldmVudE5hbWUgJiYgYXJncy5ldmVudE5hbWUgPT0gJ2l0ZW1UYXAnKSB7XG4gICAgICAgICAgICAgICAgc2hpZnQgPSBNeU1vZGVsLmFkZGVkU2hpZnRzTWFwW3RoaXMuc2VjdGlvbmVkU2hpZnRzLmdldEl0ZW0oYXJncy5pbmRleCkuZ2V0KCdpZCcpXVxuICAgICAgICAgICAgfSBlbHNlIGlmIChhcmdzLm9iamVjdC5pZCkge1xuICAgICAgICAgICAgICAgIHNoaWZ0ID0gTXlNb2RlbC5hZGRlZFNoaWZ0c01hcFthcmdzLm9iamVjdC5pZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzaGlmdCkge1xuICAgICAgICAgICAgTXlNb2RlbC5zaG93U2V0dGluZ3MoJy92aWV3cy9jb21wb25lbnRzL2VuZHNoaWZ0L2VuZHNoaWZ0LnhtbCcpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NldHRpbmdzVGl0bGUnLCAnQWRkIFNoaWZ0Jyk7XG4gICAgICAgICAgICBlZGl0aW5nU2hpZnQgPSB7fTtcbiAgICAgICAgICAgIGxldCBzdGFydFRpbWUgPSBtb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKSArICcgMDk6MDA6MDAnO1xuICAgICAgICAgICAgbGV0IGVuZFRpbWUgPSBtb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKSArICcgMTc6MDA6MDAnO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdFN0YXJ0RGF0ZScsICdDaG9vc2UuLi4nKVxuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdFN0YXJ0VGltZScsICdDaG9vc2UuLi4nKVxuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NlbGVjdGVkU3RhcnREYXRlJywgbW9tZW50KCkuZm9ybWF0KCdZWVlZLU1NLUREJykpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NlbGVjdGVkU3RhcnRUaW1lJywgbW9tZW50KHN0YXJ0VGltZSkuZm9ybWF0KCdISDptbScpKVxuXG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0RW5kRGF0ZScsICdDaG9vc2UuLi4nKVxuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdEVuZFRpbWUnLCAnQ2hvb3NlLi4uJylcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZEVuZERhdGUnLCBtb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRFbmRUaW1lJywgbW9tZW50KGVuZFRpbWUpLmZvcm1hdCgnSEg6bW0nKSlcbiAgICAgICAgICAgIGVkaXRpbmdTaGlmdC5zdGFydF90aW1lID0gbW9tZW50KHN0YXJ0VGltZSkuZm9ybWF0KCk7XG4gICAgICAgICAgICBlZGl0aW5nU2hpZnQuZW5kX3RpbWUgPSBtb21lbnQoZW5kVGltZSkuZm9ybWF0KCk7XG4gICAgICAgICAgICAvLyBsZXQgY29tcGFyZUEgPSBtb21lbnQoZW5kVGltZSk7XG4gICAgICAgICAgICAvLyB2YXIgbWludXRlc1dvcmtlZCA9IGNvbXBhcmVBLmRpZmYobW9tZW50KHN0YXJ0VGltZSksICdtaW51dGVzJylcbiAgICAgICAgICAgIC8vIHZhciBob3Vyc1dvcmtlZCA9IChtaW51dGVzV29ya2VkLzYwKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgLy8gbGV0IG1pbnV0ZVJhdGUgPSBwYXJzZUZsb2F0KE15TW9kZWwudXNlci5ob3VybHlSYXRlKS82MDtcbiAgICAgICAgICAgIC8vIGxldCBvdmVydGltZU1pbnV0ZVJhdGUgPSBwYXJzZUZsb2F0KE15TW9kZWwudXNlci5vdmVydGltZVJhdGUpLzYwO1xuXG4gICAgICAgICAgICAvLyBsZXQgd29ya2VkID0gc2hpZnRTZXJ2aWNlLmNhbGN1bGF0ZVNoaWZ0SG91cnNXb3JrZWQoZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUsIGVkaXRpbmdTaGlmdC5lbmRfdGltZSk7O1xuICAgICAgICAgICAgLy8gTXlNb2RlbC51cGRhdGVUb3RhbEVhcm5lZCgpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2hhc1NlbGVjdGVkU3RhcnRBbmRFbmRUaW1lcycsIGZhbHNlKTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlbmRTaGlmdFRvdGFsV29ya2VkJywgJzAgSE9VUlMnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVkaXRpbmdTaGlmdCA9IE9iamVjdC5hc3NpZ24oe30sIHNoaWZ0KTtcbiAgICAgICAgICAgIE15TW9kZWwuc2hvd1NldHRpbmdzKCcvdmlld3MvY29tcG9uZW50cy9lbmRzaGlmdC9lbmRzaGlmdC54bWwnKTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZXR0aW5nc1RpdGxlJywgJ0VkaXQgU2hpZnQnKTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRTdGFydERhdGUnLCBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKSlcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRTdGFydFRpbWUnLCBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdoOm1tYScpKVxuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NlbGVjdGVkU3RhcnREYXRlJywgbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnWVlZWS1NTS1ERCcpKTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZFN0YXJ0VGltZScsIG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ0hIOm1tJykpXG5cbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRFbmREYXRlJywgbW9tZW50KCkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKSlcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRFbmRUaW1lJywgJ0luIHByb2dyZXNzLi4uJylcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdzZWxlY3RlZEVuZERhdGUnLCBtb21lbnQoKS5mb3JtYXQoJ1lZWVktTU0tREQnKSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRFbmRUaW1lJywgbW9tZW50KCkuZm9ybWF0KCdISDptbScpKVxuICAgICAgICAgICAgZWRpdGluZ1NoaWZ0LmVuZF90aW1lID0gbW9tZW50KCkuZm9ybWF0KCk7XG4gICAgICAgICAgICBpZiAoc2hpZnQuZW5kX3RpbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2hvdyBpdCBhbGwnKTtcbiAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnaGFzU2VsZWN0ZWRTdGFydEFuZEVuZFRpbWVzJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdEVuZERhdGUnLCBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnTU1NIERvLCBZWVlZJykpXG4gICAgICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdEVuZFRpbWUnLCBtb21lbnQoc2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnaDptbWEnKSlcbiAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnc2VsZWN0ZWRFbmREYXRlJywgbW9tZW50KHNoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ1lZWVktTU0tREQnKSk7XG4gICAgICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ3NlbGVjdGVkRW5kVGltZScsIG1vbWVudChzaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdISDptbScpKVxuICAgICAgICAgICAgICAgIGVkaXRpbmdTaGlmdC5lbmRfdGltZSA9IG1vbWVudChzaGlmdC5lbmRfdGltZSkuZm9ybWF0KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdoYXNTZWxlY3RlZFN0YXJ0QW5kRW5kVGltZXMnLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGNvbnNvbGUuZGlyKHNoaWZ0LmNvbnRyaWJ1dGlvbnMpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBjb21wYXJlQSA9IG1vbWVudCgpO1xuICAgICAgICAgICAgaWYgKHNoaWZ0LmVuZF90aW1lKSBjb21wYXJlQSA9IG1vbWVudChzaGlmdC5lbmRfdGltZSk7XG4gICAgICAgICAgICB2YXIgbWludXRlc1dvcmtlZCA9IGNvbXBhcmVBLmRpZmYobW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLCAnbWludXRlcycpXG4gICAgICAgICAgICB2YXIgaG91cnNXb3JrZWQgPSAobWludXRlc1dvcmtlZC82MCkudG9GaXhlZCgyKTtcbiAgICAgICAgICAgIGxldCBtaW51dGVSYXRlID0gcGFyc2VGbG9hdChNeU1vZGVsLnVzZXIuaG91cmx5UmF0ZSkvNjA7XG4gICAgICAgICAgICBsZXQgb3ZlcnRpbWVNaW51dGVSYXRlID0gcGFyc2VGbG9hdChNeU1vZGVsLnVzZXIub3ZlcnRpbWVSYXRlKS82MDtcblxuXG4gICAgICAgICAgICBsZXQgd29ya2VkID0gc2hpZnRTZXJ2aWNlLmNhbGN1bGF0ZVNoaWZ0SG91cnNXb3JrZWQoZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUsIGVkaXRpbmdTaGlmdC5lbmRfdGltZSk7O1xuICAgICAgICAgICAgTXlNb2RlbC51cGRhdGVUb3RhbEVhcm5lZCgpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0VG90YWxXb3JrZWQnLCB3b3JrZWQudGltZV93b3JrZWQpO1xuICAgICAgICB9ICAgICAgICBcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0UHJldmlvdXNTaGlmdHNUb3RhbE1pbnV0ZXMoc2hpZnQpIHtcbiAgICAgICAgLy8gdGhpcyBmdW5jdGlvbiBnZXRzIHRoZSB0b3RhbCBtaW51dGVzIHdvcmtlZCB1cCB0byB0aGF0IHNoaWZ0IHRoYXQgd2VlayB0byBkZXRlcm1pbmUgaWYgXG4gICAgICAgIC8vIGFueSBvdmVydGltZSBwYXkgc2hvdWxkIGJlIGF0dHJpYnV0ZWQgdG8gdGhpcyBzaGlmdC5cbiAgICAgICAgdmFyIGJlZ2lubmluZ09mV2VlayA9IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5pc29XZWVrZGF5KDApLmZvcm1hdCgnZGRkZCBNTU1NIERvIFlZWVknKTtcbiAgICAgICAgaWYgKG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5pc29XZWVrZGF5KCkgPT0gMCB8fCBtb21lbnQoc2hpZnQuc3RhcnRfdGltZSkuaXNvV2Vla2RheSgpID09IDcpIHsgLy9pcyBhIHN1bmRheS5cbiAgICAgICAgICAgIGJlZ2lubmluZ09mV2VlayA9IG1vbWVudChzaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2RkZGQgTU1NTSBEbyBZWVlZJyk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHRvdGFsTWludXRlcyA9IDA7XG4gICAgICAgIGxldCByZXZlcnNlU2hpZnRzID0gW107XG4gICAgICAgIGlmICh0aGlzLndlZWtzW2JlZ2lubmluZ09mV2Vla10pIHJldmVyc2VTaGlmdHMgPSB0aGlzLndlZWtzW2JlZ2lubmluZ09mV2Vla10uc2hpZnRzLnNsaWNlKDApLnJldmVyc2UoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IHJldmVyc2VTaGlmdHMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgbXlTaGlmdCA9IHJldmVyc2VTaGlmdHNbaV07XG4gICAgICAgICAgICAvLyBjb25zb2xlLmRpcihteVNoaWZ0KTtcbiAgICAgICAgICAgIGlmIChteVNoaWZ0LmlkICE9IHNoaWZ0LmlkKSB7XG4gICAgICAgICAgICAgICAgdG90YWxNaW51dGVzICs9IG15U2hpZnQubWludXRlc193b3JrZWQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCd0b3RhbCBtaW51dGVzOiAnICsgdG90YWxNaW51dGVzKTtcbiAgICAgICAgcmV0dXJuIHRvdGFsTWludXRlcztcbiAgICB9XG5cbiAgICBwdWJsaWMgZGlzbWlzc1NvZnRJbnB1dHMoKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyB0aGlzLmZhbWlsaWVzLmxlbmd0aCA+IGk7IGkrKykge1xuICAgICAgICAgICAgbGV0IHRleHRGaWVsZDpUZXh0RmllbGQgPSA8VGV4dEZpZWxkPnRoaXMucGFnZS5nZXRWaWV3QnlJZCgnY29udHJpYnV0aW9uXycgKyB0aGlzLmZhbWlsaWVzLmdldEl0ZW0oaSkuZ2V0KCdpZCcpKTtcbiAgICAgICAgICAgIGlmICh0ZXh0RmllbGQgJiYgdGV4dEZpZWxkLmRpc21pc3NTb2Z0SW5wdXQpIHRleHRGaWVsZC5kaXNtaXNzU29mdElucHV0KClcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgdXBkYXRlVG90YWxFYXJuZWQoKSB7XG4gICAgICAgIGxldCB3b3JrZWRPYmogPSBzaGlmdFNlcnZpY2UuY2FsY3VsYXRlU2hpZnRIb3Vyc1dvcmtlZChlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSwgZWRpdGluZ1NoaWZ0LmVuZF90aW1lKTtcbiAgICAgICAgdGhpcy5zZXQoJ2VuZFNoaWZ0VG90YWxXb3JrZWQnLCB3b3JrZWRPYmoudGltZV93b3JrZWQpO1xuICAgICAgICBsZXQgZWFybmVkID0gc2hpZnRTZXJ2aWNlLmNhbGN1bGF0ZVNoaWZ0RWFybmVkKHdvcmtlZE9iai5taW51dGVzX3dvcmtlZCwgdGhpcy5nZXRQcmV2aW91c1NoaWZ0c1RvdGFsTWludXRlcyhlZGl0aW5nU2hpZnQpKTtcbiAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0VG90YWxFYXJuZWQnLCAnJCcgKyBlYXJuZWQudG90YWxfZWFybmVkKTtcbiAgICAgICAgaWYgKGVhcm5lZC5vdmVydGltZV9lYXJuZWQgIT0gMC4wMCkge1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0T3ZlcnRpbWVFYXJuZWQnLCBlYXJuZWQub3ZlcnRpbWVfZWFybmVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlbmRTaGlmdE92ZXJ0aW1lRWFybmVkJywgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIGxldCBmYW1pbGllcyA9IE15TW9kZWwuZ2V0KCdmYW1pbGllcycpO1xuICAgICAgICBsZXQgbmV3VG90YWw6YW55ID0gKGVhcm5lZC50b3RhbF9lYXJuZWQvZmFtaWxpZXMubGVuZ3RoKS50b0ZpeGVkKDIpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnZWFjaCBjb250cmlidXRpb246ICcgKyBuZXdUb3RhbCk7XG4gICAgICAgIE15TW9kZWwuc2V0KCdlbmRTaGlmdEZpbmFsVG90YWwnLCAnJCcgKyAobmV3VG90YWwqZmFtaWxpZXMubGVuZ3RoKS50b0ZpeGVkKDIpKTtcbiAgICAgICAgbGV0IGNvbnRyaWJ1dGlvblRvdGFsID0gMDtcbiAgICAgICAgaWYgKGVkaXRpbmdTaGlmdC5pZCAmJiBlZGl0aW5nU2hpZnQuY29udHJpYnV0aW9ucykge1xuICAgICAgICAgICAgbGV0IGNvbnRyaWJ1dGlvblRvdGFsID0gMDtcbiAgICAgICAgICAgIGZvciAobGV0IHggaW4gZWRpdGluZ1NoaWZ0LmNvbnRyaWJ1dGlvbnMpIHtcbiAgICAgICAgICAgICAgICBjb250cmlidXRpb25Ub3RhbCArPSBwYXJzZUZsb2F0KGVkaXRpbmdTaGlmdC5jb250cmlidXRpb25zW3hdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlbmRTaGlmdEZpbmFsVG90YWwnLCAnJCcgKyBjb250cmlidXRpb25Ub3RhbC50b0ZpeGVkKDIpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmYW1pbGllcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgZmFtaWxpZXMubGVuZ3RoID4gaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVkaXRpbmdTaGlmdC5pZCAmJiBlZGl0aW5nU2hpZnQuY29udHJpYnV0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICAvLyB3ZSBhcmUgZWRpdGluZyBhIHNoaWZ0LCBzbyBkb250IHVwZGF0ZSB0aGUgY29udHJpYnV0aW9ucyBhdXRvbWF0aWNhbGx5LiBtYWtlIHRoZSB1c2VyIGRvIGl0LlxuICAgICAgICAgICAgICAgICAgICBpZiAoZWRpdGluZ1NoaWZ0LmNvbnRyaWJ1dGlvbnNbZmFtaWxpZXMuZ2V0SXRlbShpKS5pZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhbWlsaWVzLmdldEl0ZW0oaSkuc2V0KCdjb250cmlidXRpb24nLCBlZGl0aW5nU2hpZnQuY29udHJpYnV0aW9uc1tmYW1pbGllcy5nZXRJdGVtKGkpLmlkXSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmYW1pbGllcy5nZXRJdGVtKGkpLnNldCgnY29udHJpYnV0aW9uJywgJzAuMDAnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZhbWlsaWVzLmdldEl0ZW0oaSkuc2V0KCdjb250cmlidXRpb24nLCBuZXdUb3RhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGZhbWlsaWVzLmdldEl0ZW0oaSkub24oT2JzZXJ2YWJsZS5wcm9wZXJ0eUNoYW5nZUV2ZW50LCAoYXJnczogUHJvcGVydHlDaGFuZ2VEYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLnByb3BlcnR5TmFtZSA9PSAnY29udHJpYnV0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZpbmFsVG90YWw6bnVtYmVyID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnZhbGlkTnVtYmVycyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgeCA9IDA7IE15TW9kZWwuZmFtaWxpZXMubGVuZ3RoID4geDsgeCsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFNeU1vZGVsLmZhbWlsaWVzLmdldEl0ZW0oeCkuZ2V0KCdjb250cmlidXRpb24nKSkgTXlNb2RlbC5mYW1pbGllcy5nZXRJdGVtKHgpLnNldCgnY29udHJpYnV0aW9uJywgMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNOYU4oTXlNb2RlbC5mYW1pbGllcy5nZXRJdGVtKHgpLmdldCgnY29udHJpYnV0aW9uJykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludmFsaWROdW1iZXJzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbFRvdGFsICs9IHBhcnNlRmxvYXQoTXlNb2RlbC5mYW1pbGllcy5nZXRJdGVtKHgpLmdldCgnY29udHJpYnV0aW9uJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnZhbGlkTnVtYmVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlbmRTaGlmdEZpbmFsVG90YWwnLCAnRW50ZXIgdmFsaWQgbnVtYmVycy4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VuZFNoaWZ0RmluYWxUb3RhbCcsICckJyArIGZpbmFsVG90YWwudG9GaXhlZCgyKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyB0aGVyZXMgb25seSBvbmUgZmFtaWx5LCBzbyBhbHdheXMgdXBkYXRlIHRoZSBjb250cmlidXRpb25zLlxuICAgICAgICAgICAgaWYgKGVkaXRpbmdTaGlmdC5pZCAmJiBlZGl0aW5nU2hpZnQuY29udHJpYnV0aW9ucykge1xuICAgICAgICAgICAgICAgIGlmIChlZGl0aW5nU2hpZnQuY29udHJpYnV0aW9uc1tmYW1pbGllcy5nZXRJdGVtKDApLmlkXSkge1xuICAgICAgICAgICAgICAgICAgICBmYW1pbGllcy5nZXRJdGVtKDApLnNldCgnY29udHJpYnV0aW9uJywgZWRpdGluZ1NoaWZ0LmNvbnRyaWJ1dGlvbnNbZmFtaWxpZXMuZ2V0SXRlbSgwKS5pZF0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZhbWlsaWVzLmdldEl0ZW0oMCkuc2V0KCdjb250cmlidXRpb24nLCAnMC4wMCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZmFtaWxpZXMuZ2V0SXRlbSgwKS5zZXQoJ2NvbnRyaWJ1dGlvbicsIG5ld1RvdGFsKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZmFtaWxpZXMuZ2V0SXRlbSgwKS5vbihPYnNlcnZhYmxlLnByb3BlcnR5Q2hhbmdlRXZlbnQsIChhcmdzOiBQcm9wZXJ0eUNoYW5nZURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5wcm9wZXJ0eU5hbWUgPT0gJ2NvbnRyaWJ1dGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZpbmFsVG90YWw6bnVtYmVyID0gMDtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGludmFsaWROdW1iZXJzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHggPSAwOyBNeU1vZGVsLmZhbWlsaWVzLmxlbmd0aCA+IHg7IHgrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFNeU1vZGVsLmZhbWlsaWVzLmdldEl0ZW0oeCkuZ2V0KCdjb250cmlidXRpb24nKSkgTXlNb2RlbC5mYW1pbGllcy5nZXRJdGVtKHgpLnNldCgnY29udHJpYnV0aW9uJywgMClcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc05hTihNeU1vZGVsLmZhbWlsaWVzLmdldEl0ZW0oeCkuZ2V0KCdjb250cmlidXRpb24nKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnZhbGlkTnVtYmVycyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsVG90YWwgKz0gcGFyc2VGbG9hdChNeU1vZGVsLmZhbWlsaWVzLmdldEl0ZW0oeCkuZ2V0KCdjb250cmlidXRpb24nKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGludmFsaWROdW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnZW5kU2hpZnRGaW5hbFRvdGFsJywgJ0VudGVyIHZhbGlkIG51bWJlcnMuJyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnZW5kU2hpZnRGaW5hbFRvdGFsJywgJyQnICsgZmluYWxUb3RhbC50b0ZpeGVkKDIpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKE15TW9kZWwuZ2V0KCdlZGl0aW5nU2hpZnRTdGFydERhdGUnKSAhPSAnQ2hvb3NlLi4uJyAmJiBNeU1vZGVsLmdldCgnZWRpdGluZ1NoaWZ0RW5kRGF0ZScpICE9ICdDaG9vc2UuLi4nICYmIE15TW9kZWwuZ2V0KCdlZGl0aW5nU2hpZnRTdGFydFRpbWUnKSAhPSAnQ2hvb3NlLi4uJyAmJiBNeU1vZGVsLmdldCgnZWRpdGluZ1NoaWZ0RW5kVGltZScpICE9ICdDaG9vc2UuLi4nICYmIE15TW9kZWwuZ2V0KCdlZGl0aW5nU2hpZnRFbmRUaW1lJykgIT0gJ0luIHByb2dyZXNzLi4uJykge1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2hhc1NlbGVjdGVkU3RhcnRBbmRFbmRUaW1lcycsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgIH1cblxuICAgIHB1YmxpYyBjaGFuZ2VTaGlmdEVuZFRpbWUoKSB7XG4gICAgICAgIHRoaXMuZGlzbWlzc1NvZnRJbnB1dHMoKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckhvdXInLCBtb21lbnQoZWRpdGluZ1NoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ0gnKSk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJNaW51dGUnLCBtb21lbnQoZWRpdGluZ1NoaWZ0LmVuZF90aW1lKS5mb3JtYXQoJ20nKSk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJUaXRsZScsICdDaGFuZ2UgRW5kIFRpbWUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmVUZXh0JywgJ0RvbmUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tpbmcnLCAndGltZScpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyQ2FuY2VsJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgfSlcbiAgICAgICAgcGlja2VyLmFuaW1hdGVTaG93KCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgICAgIGxldCBob3VyID0gdGhpcy5waWNrZXJIb3VyO1xuICAgICAgICAgICAgaWYgKGhvdXIgPCAxMCkgaG91ciA9ICcwJyArIHRoaXMucGlja2VySG91cjtcbiAgICAgICAgICAgIGxldCBtaW51dGUgPSB0aGlzLnBpY2tlck1pbnV0ZTtcbiAgICAgICAgICAgIGlmIChtaW51dGUgPCAxMCkgbWludXRlID0gJzAnICsgbWludXRlO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3NlbGVjdGVkRW5kVGltZScsIGhvdXIgKyAnOicgKyBtaW51dGUpO1xuICAgICAgICAgICAgTXlNb2RlbC5zZXQoJ2VkaXRpbmdTaGlmdEVuZFRpbWUnLCBtb21lbnQodGhpcy5nZXQoJ3NlbGVjdGVkRW5kRGF0ZScpICsgJyAnICsgdGhpcy5nZXQoJ3NlbGVjdGVkRW5kVGltZScpICsgJzowMCcpLmZvcm1hdCgnaDptbWEnKSlcbiAgICAgICAgICAgIGVkaXRpbmdTaGlmdC5lbmRfdGltZSA9IG1vbWVudCh0aGlzLmdldCgnc2VsZWN0ZWRFbmREYXRlJykgKyAnICcgKyB0aGlzLmdldCgnc2VsZWN0ZWRFbmRUaW1lJykgKyAnOjAwJykuZm9ybWF0KCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVRvdGFsRWFybmVkKClcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgY2hhbmdlU2hpZnRFbmREYXRlKCkge1xuICAgICAgICB0aGlzLmRpc21pc3NTb2Z0SW5wdXRzKCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNraW5nJywgJ2RhdGUnKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0KCdlbmREYXRlRGF5JywgbW9tZW50KGVkaXRpbmdTaGlmdC5lbmRfdGltZSkuZm9ybWF0KCdERCcpKTtcbiAgICAgICAgdGhpcy5zZXQoJ2VuZERhdGVNb250aCcsIG1vbWVudChlZGl0aW5nU2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnTU0nKSk7XG4gICAgICAgIHRoaXMuc2V0KCdlbmREYXRlWWVhcicsIG1vbWVudChlZGl0aW5nU2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnWVlZWScpKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlclRpdGxlJywgJ0NoYW5nZSBFbmQgRGF0ZScpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZVRleHQnLCAnRG9uZScpO1xuICAgICAgICBwaWNrZXIuYW5pbWF0ZVNob3coKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckNhbmNlbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgIH0pXG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgICAgIGxldCBkYXkgPSB0aGlzLmVuZERhdGVEYXk7IFxuICAgICAgICAgICAgaWYgKHBhcnNlSW50KHRoaXMuZW5kRGF0ZURheSkgPCAxMCkgZGF5ID0gJzAnICsgcGFyc2VJbnQodGhpcy5lbmREYXRlRGF5KTtcbiAgICAgICAgICAgIGxldCBtb250aCA9IHRoaXMuZW5kRGF0ZU1vbnRoOyBcbiAgICAgICAgICAgIGlmIChwYXJzZUludCh0aGlzLmVuZERhdGVNb250aCkgPCAxMCkgbW9udGggPSAnMCcgKyBwYXJzZUludCh0aGlzLmVuZERhdGVNb250aCk7XG4gICAgICAgICAgICB0aGlzLnNldCgnc2VsZWN0ZWRFbmREYXRlJywgdGhpcy5lbmREYXRlWWVhciArICctJyArIG1vbnRoICsgJy0nICsgZGF5KTtcbiAgICAgICAgICAgIE15TW9kZWwuc2V0KCdlZGl0aW5nU2hpZnRFbmREYXRlJywgbW9tZW50KHRoaXMuZ2V0KCdzZWxlY3RlZEVuZERhdGUnKSkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKSlcbiAgICAgICAgICAgIGVkaXRpbmdTaGlmdC5lbmRfdGltZSA9IG1vbWVudCh0aGlzLmdldCgnc2VsZWN0ZWRFbmREYXRlJykgKyAnICcgKyB0aGlzLmdldCgnc2VsZWN0ZWRFbmRUaW1lJykgKyAnOjAwJykuZm9ybWF0KCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVRvdGFsRWFybmVkKClcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBwdWJsaWMgY2hhbmdlU2hpZnRTdGFydFRpbWUoKSB7XG4gICAgICAgIHRoaXMuZGlzbWlzc1NvZnRJbnB1dHMoKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckhvdXInLCBtb21lbnQoZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnSCcpKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlck1pbnV0ZScsIG1vbWVudChlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdtJykpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyVGl0bGUnLCAnQ2hhbmdlIFN0YXJ0IFRpbWUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tpbmcnLCAndGltZScpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZVRleHQnLCAnRG9uZScpO1xuICAgICAgICBwaWNrZXIuYW5pbWF0ZVNob3coKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckNhbmNlbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgIH0pXG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgICAgIGxldCBob3VyID0gdGhpcy5waWNrZXJIb3VyO1xuICAgICAgICAgICAgaWYgKGhvdXIgPCAxMCkgaG91ciA9ICcwJyArIHRoaXMucGlja2VySG91cjtcbiAgICAgICAgICAgIGxldCBtaW51dGUgPSB0aGlzLnBpY2tlck1pbnV0ZTtcbiAgICAgICAgICAgIGlmIChtaW51dGUgPCAxMCkgbWludXRlID0gJzAnICsgbWludXRlO1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3NlbGVjdGVkU3RhcnRUaW1lJywgaG91ciArICc6JyArIG1pbnV0ZSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0U3RhcnRUaW1lJywgbW9tZW50KHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0RGF0ZScpICsgJyAnICsgdGhpcy5nZXQoJ3NlbGVjdGVkU3RhcnRUaW1lJykgKyAnOjAwJykuZm9ybWF0KCdoOm1tYScpKVxuICAgICAgICAgICAgZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUgPSBtb21lbnQodGhpcy5nZXQoJ3NlbGVjdGVkU3RhcnREYXRlJykgKyAnICcgKyB0aGlzLmdldCgnc2VsZWN0ZWRTdGFydFRpbWUnKSArICc6MDAnKS5mb3JtYXQoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVG90YWxFYXJuZWQoKVxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBjaGFuZ2VTaGlmdFN0YXJ0RGF0ZSgpIHtcbiAgICAgICAgdGhpcy5kaXNtaXNzU29mdElucHV0cygpO1xuICAgICAgICB0aGlzLnNldCgncGlja2luZycsICdkYXRlJyk7XG4gICAgICAgIHRoaXMuc2V0KCdlbmREYXRlRGF5JywgbW9tZW50KGVkaXRpbmdTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ0REJykpO1xuICAgICAgICB0aGlzLnNldCgnZW5kRGF0ZU1vbnRoJywgbW9tZW50KGVkaXRpbmdTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ01NJykpO1xuICAgICAgICB0aGlzLnNldCgnZW5kRGF0ZVllYXInLCBtb21lbnQoZWRpdGluZ1NoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnWVlZWScpKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlclRpdGxlJywgJ0NoYW5nZSBTdGFydCBEYXRlJyk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJEb25lVGV4dCcsICdEb25lJyk7XG4gICAgICAgIHBpY2tlci5hbmltYXRlU2hvdygpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyQ2FuY2VsJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwaWNrZXIuYW5pbWF0ZUhpZGUoKS50aGVuKCgpID0+IHRoaXMuc2V0KCdwaWNraW5nJywgZmFsc2UpKTtcbiAgICAgICAgfSlcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICAgICAgbGV0IGRheSA9IHRoaXMuZW5kRGF0ZURheTsgXG4gICAgICAgICAgICBpZiAocGFyc2VJbnQodGhpcy5lbmREYXRlRGF5KSA8IDEwKSBkYXkgPSAnMCcgKyBwYXJzZUludCh0aGlzLmVuZERhdGVEYXkpO1xuICAgICAgICAgICAgbGV0IG1vbnRoID0gdGhpcy5lbmREYXRlTW9udGg7IFxuICAgICAgICAgICAgaWYgKHBhcnNlSW50KHRoaXMuZW5kRGF0ZU1vbnRoKSA8IDEwKSBtb250aCA9ICcwJyArIHBhcnNlSW50KHRoaXMuZW5kRGF0ZU1vbnRoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdzZWxlY3RlZFN0YXJ0RGF0ZScsIHRoaXMuZW5kRGF0ZVllYXIgKyAnLScgKyBtb250aCArICctJyArIGRheSk7XG4gICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0U3RhcnREYXRlJywgbW9tZW50KHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0RGF0ZScpKS5mb3JtYXQoJ01NTSBEbywgWVlZWScpKVxuICAgICAgICAgICAgaWYgKE15TW9kZWwuZ2V0KCdlZGl0aW5nU2hpZnRFbmREYXRlJykgPT0gJ0Nob29zZS4uLicpIHtcbiAgICAgICAgICAgICAgICBNeU1vZGVsLnNldCgnZWRpdGluZ1NoaWZ0RW5kRGF0ZScsIG1vbWVudCh0aGlzLmdldCgnc2VsZWN0ZWRTdGFydERhdGUnKSkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKSlcbiAgICAgICAgICAgICAgICB0aGlzLnNldCgnc2VsZWN0ZWRFbmREYXRlJywgbW9tZW50KHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0RGF0ZScpKS5mb3JtYXQoJ1lZWVktTU0tREQnKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlZGl0aW5nU2hpZnQuc3RhcnRfdGltZSA9IG1vbWVudCh0aGlzLmdldCgnc2VsZWN0ZWRTdGFydERhdGUnKSArICcgJyArIHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0VGltZScpICsgJzowMCcpLmZvcm1hdCgpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVUb3RhbEVhcm5lZCgpXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcHVibGljIHNhdmVTaGlmdCgpIHtcbiAgICAgICAgdGhpcy5kaXNtaXNzU29mdElucHV0cygpO1xuICAgICAgICBsZXQgZW5kX3RpbWUgPSB0aGlzLmdldCgnc2VsZWN0ZWRFbmREYXRlJykgKyAnICcgKyB0aGlzLmdldCgnc2VsZWN0ZWRFbmRUaW1lJykgKyAnOjAwJztcbiAgICAgICAgbGV0IHN0YXJ0X3RpbWUgPSB0aGlzLmdldCgnc2VsZWN0ZWRTdGFydERhdGUnKSArICcgJyArIHRoaXMuZ2V0KCdzZWxlY3RlZFN0YXJ0VGltZScpICsgJzowMCc7XG4gICAgICAgIGxldCBhcmdzOmFueSA9IHt9O1xuICAgICAgICBhcmdzLnN0YXJ0X3RpbWUgPSBtb21lbnQoc3RhcnRfdGltZSkuZm9ybWF0KCk7XG4gICAgICAgIGlmICh0aGlzLmdldCgnZWRpdGluZ1NoaWZ0RW5kVGltZScpICE9ICdJbiBwcm9ncmVzcy4uLicpIHtcbiAgICAgICAgICAgIGFyZ3MuZW5kX3RpbWUgPSBtb21lbnQoZW5kX3RpbWUpLmZvcm1hdCgpO1xuICAgICAgICAgICAgYXJncy5jb250cmlidXRpb25zID0ge307XG4gICAgICAgICAgICBsZXQgY29udHJpYnV0aW9uczphbnkgPSB7fTtcbiAgICAgICAgICAgIGxldCBmYW1pbGllcyA9IHRoaXMuZ2V0KCdmYW1pbGllcycpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGZhbWlsaWVzLmxlbmd0aCA+IGk7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnRyaWJ1dGlvbnNbZmFtaWxpZXMuZ2V0SXRlbShpKS5nZXQoJ2lkJyldID0gZmFtaWxpZXMuZ2V0SXRlbShpKS5nZXQoJ2NvbnRyaWJ1dGlvbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXJncy5jb250cmlidXRpb25zID0gY29udHJpYnV0aW9ucztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGVkaXRpbmdTaGlmdC5pZCkge1xuICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLnVwZGF0ZVNoaWZ0KGVkaXRpbmdTaGlmdC5pZCwgYXJncykudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1NoaWZ0cyhKU09OLnBhcnNlKGFwcFNldHRpbmdzLmdldFN0cmluZygnc2hpZnRzJykpKTtcbiAgICAgICAgICAgICAgICBsZXQgaW52b2ljZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKSBpbnZvaWNlcyA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdpbnZvaWNlcycpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NJbnZvaWNlcyhpbnZvaWNlcyk7XG4gICAgICAgICAgICAgICAgaWYgKGVkaXRpbmdTaGlmdC5pZCA9PSBNeU1vZGVsLmdldCgnY2xvY2tlZEluJykuaWQgJiYgYXJncy5lbmRfdGltZSkgTXlNb2RlbC5zZXQoJ2Nsb2NrZWRJbicsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVTZXR0aW5ncygpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNoaWZ0U2VydmljZS5hZGRTaGlmdChhcmdzKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzU2hpZnRzKEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSkpO1xuICAgICAgICAgICAgICAgIGxldCBpbnZvaWNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpIGludm9pY2VzID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ2ludm9pY2VzJykpO1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0ludm9pY2VzKGludm9pY2VzKTtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVTZXR0aW5ncygpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9XG5cbiAgICBwdWJsaWMgc2hvd1N0YXJ0U2hpZnQoKSB7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJIb3VyJywgbW9tZW50KCkuZm9ybWF0KCdIJykpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyTWludXRlJywgbW9tZW50KCkuZm9ybWF0KCdtJykpO1xuICAgICAgICB0aGlzLnNldCgncGlja2VyVGl0bGUnLCAnU2V0IFN0YXJ0IFRpbWUnKTtcbiAgICAgICAgdGhpcy5zZXQoJ3BpY2tlckRvbmVUZXh0JywgJ1N0YXJ0Jyk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNraW5nJywgJ3RpbWUnKTtcbiAgICAgICAgcGlja2VyLmFuaW1hdGVTaG93KCk7XG4gICAgICAgIHRoaXMuc2V0KCdwaWNrZXJDYW5jZWwnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHBpY2tlci5hbmltYXRlSGlkZSgpLnRoZW4oKCkgPT4gdGhpcy5zZXQoJ3BpY2tpbmcnLCBmYWxzZSkpO1xuICAgICAgICB9KVxuICAgICAgICB0aGlzLnNldCgncGlja2VyRG9uZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGlja2VyLmFuaW1hdGVIaWRlKCkudGhlbigoKSA9PiB0aGlzLnNldCgncGlja2luZycsIGZhbHNlKSk7XG4gICAgICAgICAgICBsZXQgaG91ciA9IHRoaXMucGlja2VySG91cjtcbiAgICAgICAgICAgIGlmIChob3VyIDwgMTApIGhvdXIgPSAnMCcgKyB0aGlzLnBpY2tlckhvdXI7XG4gICAgICAgICAgICBsZXQgbWludXRlID0gdGhpcy5waWNrZXJNaW51dGU7XG4gICAgICAgICAgICBpZiAobWludXRlIDwgMTApIG1pbnV0ZSA9ICcwJyArIG1pbnV0ZTtcbiAgICAgICAgICAgIGxldCBhcmdzOmFueSA9IHtcbiAgICAgICAgICAgICAgICBzdGFydF90aW1lOiBtb21lbnQobW9tZW50KCkuZm9ybWF0KCdZWVlZLU1NLUREJykgKyAnICcgKyBob3VyICsgJzonICsgbWludXRlICsgJzowMCcpLmZvcm1hdCgpLFxuICAgICAgICAgICAgICAgIGVuZF90aW1lOiBudWxsLFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2hpZnRTZXJ2aWNlLnN0YXJ0U2hpZnQoYXJncykudGhlbigoc3RhcnRlZFNoaWZ0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAvL3RoaXMuc2hpZnRzLnVuc2hpZnQob2JzZXJ2YWJsZUZyb21PYmplY3Qoc3RhcnRlZFNoaWZ0KSk7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzU2hpZnRzKEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCdzaGlmdHMnKSkpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdjbG9ja2VkSW4nLCBhcmdzKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuICAgIFxuICAgIC8qKioqKioqKioqKioqKioqKiogL1NISUZUIEZVTkNUSU9OUyAqKioqKioqKioqKioqKioqKiovXG5cbiAgICBwdWJsaWMgb25TZWxlY3RlZEluZGV4Q2hhbmdlZChhcmdzOiBTZWxlY3RlZEluZGV4Q2hhbmdlZEV2ZW50RGF0YSkge1xuICAgICAgICBpZiAoYXJncy5uZXdJbmRleCA9PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmdldFRoaXNXZWVrU2hpZnRzKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoYXJncy5uZXdJbmRleCA9IDEpIHtcbiAgICAgICAgICAgIGFsZXJ0KCdtYXliZSBwcm9jZXNzIHNoaWZ0cyBhZ2Fpbj8nKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGtpbGwoKSB7XG4gICAgICAgIGFwcFNldHRpbmdzLnJlbW92ZSgndXNlckRhdGEnKTtcbiAgICAgICAgYXBwU2V0dGluZ3MucmVtb3ZlKCd1aWQnKTtcbiAgICAgICAgYXBwU2V0dGluZ3MucmVtb3ZlKCdpbnZvaWNlcycpO1xuICAgICAgICBhcHBTZXR0aW5ncy5yZW1vdmUoJ3NoaWZ0cycpO1xuICAgICAgICBsZXQgbmF2aWdhdGlvbkVudHJ5ID0ge1xuICAgICAgICAgICAgbW9kdWxlTmFtZTogXCIvdmlld3MvbG9naW4vbG9naW5cIixcbiAgICAgICAgICAgIGFuaW1hdGVkOiBmYWxzZSxcbiAgICAgICAgfTtcbiAgICAgICAgZnJhbWUudG9wbW9zdCgpLm5hdmlnYXRlKG5hdmlnYXRpb25FbnRyeSk7XG4gICAgfVxuXG4gICAgcHVibGljIHNldHRpbmdzU2Nyb2xsKGFyZ3M6IFNjcm9sbEV2ZW50RGF0YSkge1xuXG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzaG93U2V0dGluZ3Modmlld1BhdGgpIHtcbiAgICAgICAgbGV0IG1haW5ncmlkOiBHcmlkTGF5b3V0ID0gdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdtYWluZ3JpZCcpO1xuICAgICAgICBtYWluZ3JpZC5hbmltYXRlKDxBbmltYXRpb25EZWZpbml0aW9uPntcbiAgICAgICAgICAgIHNjYWxlOiB7eDogLjkyICAsIHk6IC45Mn0sXG4gICAgICAgICAgICBkdXJhdGlvbjogMzAwLFxuICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmN1YmljQmV6aWVyKDAuMSwgMC4xLCAwLjEsIDEpXG4gICAgICAgIH0pXG4gICAgICAgIHNldHRpbmdzQ29udGFpbmVyID0gPFN0YWNrTGF5b3V0PnRoaXMucGFnZS5nZXRWaWV3QnlJZCgnc2V0dGluZ3NfY29udGFpbmVyJyk7XG4gICAgICAgIHNldHRpbmdzT3ZlcmxheUNvbnRhaW5lciA9IHRoaXMucGFnZS5nZXRWaWV3QnlJZCgnc2V0dGluZ3Nfb3ZlcmxheV9jb250YWluZXInKVxuICAgICAgICBkaXNtaXNzTm90ZSA9IHRoaXMucGFnZS5nZXRWaWV3QnlJZCgnZGlzbWlzc19ub3RlJyk7XG4gICAgICAgIHRoaXMuc2V0KCdzZXR0aW5nc1Nob3duJywgdHJ1ZSk7XG4gICAgICAgIGxldCBkZXZpY2VIZWlnaHQgPSBzY3JlZW4ubWFpblNjcmVlbi5oZWlnaHRESVBzO1xuICAgICAgICBzZXR0aW5nc0NvbnRhaW5lci50cmFuc2xhdGVZID0gZGV2aWNlSGVpZ2h0ICsgMzA7XG4gICAgICAgIHNldHRpbmdzQ29udGFpbmVyLmFuaW1hdGUoPEFuaW1hdGlvbkRlZmluaXRpb24+e1xuICAgICAgICAgICAgdHJhbnNsYXRlOiB7eDogMCwgeTogMH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogMzAwLFxuICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmN1YmljQmV6aWVyKDAuMSwgMC4xLCAwLjEsIDEpXG4gICAgICAgIH0pXG4gICAgICAgIHNldHRpbmdzT3ZlcmxheUNvbnRhaW5lci5vcGFjaXR5ID0gMDtcbiAgICAgICAgc2V0dGluZ3NPdmVybGF5Q29udGFpbmVyLmFuaW1hdGUoe1xuICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgIGR1cmF0aW9uOiAxMDBcbiAgICAgICAgfSlcbiAgICAgICAgdmFyIGNvbnRhaW5lcjogU3RhY2tMYXlvdXQgPSA8U3RhY2tMYXlvdXQ+dGhpcy5wYWdlLmdldFZpZXdCeUlkKCdzZXR0aW5nc192aWV3Jyk7XG4gICAgICAgIGNvbnRhaW5lci5yZW1vdmVDaGlsZHJlbigpO1xuICAgICAgICBsZXQgcGF0aCA9IGZzLmtub3duRm9sZGVycy5jdXJyZW50QXBwKCkucGF0aDtcbiAgICAgICAgbGV0IGNvbXBvbmVudCA9IGJ1aWxkZXIubG9hZChwYXRoICsgdmlld1BhdGgpO1xuICAgICAgICBjb250YWluZXIuYWRkQ2hpbGQoY29tcG9uZW50KTtcbiAgICAgICAgbGV0IGNvbnRhaW5lckJvdW5kcyA9IHNldHRpbmdzQ29udGFpbmVyLmlvcy5ib3VuZHM7XG4gICAgICAgIGxldCBpb3NTZXR0aW5nc0NvbnRhaW5lcjogVUlWaWV3ID0gc2V0dGluZ3NDb250YWluZXIuaW9zO1xuICAgICAgICBpZiAoYmx1clZpZXcgJiYgYmx1clZpZXcucmVtb3ZlRnJvbVN1cGVydmlldykgYmx1clZpZXcucmVtb3ZlRnJvbVN1cGVydmlldygpO1xuICAgICAgICBibHVyVmlldyA9IFVJVmlzdWFsRWZmZWN0Vmlldy5hbGxvYygpLmluaXRXaXRoRWZmZWN0KFVJQmx1ckVmZmVjdC5lZmZlY3RXaXRoU3R5bGUoVUlCbHVyRWZmZWN0U3R5bGVMaWdodCkpO1xuICAgICAgICBibHVyVmlldy5mcmFtZSA9IHtcbiAgICAgICAgICAgIG9yaWdpbjogeyB4OiBjb250YWluZXJCb3VuZHMub3JpZ2luLngsIHk6IGNvbnRhaW5lckJvdW5kcy5vcmlnaW4ueSAtIDIwIH0sXG4gICAgICAgICAgICBzaXplOiB7IHdpZHRoOiBjb250YWluZXJCb3VuZHMuc2l6ZS53aWR0aCwgaGVpZ2h0OiBjb250YWluZXJCb3VuZHMuc2l6ZS5oZWlnaHQgKyAyMCB9XG4gICAgICAgIH07XG4gICAgICAgIGJsdXJWaWV3LmF1dG9yZXNpemluZ01hc2sgPSBVSVZpZXdBdXRvcmVzaXppbmdGbGV4aWJsZVdpZHRoIHwgVUlWaWV3QXV0b3Jlc2l6aW5nRmxleGlibGVIZWlnaHQ7XG4gICAgICAgIGlvc1NldHRpbmdzQ29udGFpbmVyLmFkZFN1YnZpZXcoYmx1clZpZXcpXG4gICAgICAgIGlvc1NldHRpbmdzQ29udGFpbmVyLnNlbmRTdWJ2aWV3VG9CYWNrKGJsdXJWaWV3KTtcbiAgICAgICAgbGV0IGJ1enogPSBVSVNlbGVjdGlvbkZlZWRiYWNrR2VuZXJhdG9yLm5ldygpO1xuICAgICAgICBsZXQgcGFubmVyID0gdGhpcy5wYWdlLmdldFZpZXdCeUlkKCdzZXR0aW5nc19jb250YWluZXInKTtcbiAgICAgICAgbGV0IHNjcm9sbGVyOlNjcm9sbFZpZXcgPSA8U2Nyb2xsVmlldz50aGlzLnBhZ2UuZ2V0Vmlld0J5SWQoJ3NldHRpbmdzX3Njcm9sbGVyJyk7XG4gICAgICAgIGlmIChzY3JvbGxlcikge1xuICAgICAgICAgICAgbGV0IHJlYWR5VG9Ecm9wID0gZmFsc2U7XG4gICAgICAgICAgICBwYW5uZXIub2ZmKCdwYW4nKTtcbiAgICAgICAgICAgIHBhbm5lci5vbigncGFuJywgKGFyZ3M6UGFuR2VzdHVyZUV2ZW50RGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLnN0YXRlID09IDMgJiYgcmVhZHlUb0Ryb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHNjcm9sbGVyLm9uKCdzY3JvbGwnLCAoc2Nyb2xsQXJnczpTY3JvbGxFdmVudERhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoc2Nyb2xsQXJncy5zY3JvbGxZIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBzZXR0aW5nc0NvbnRhaW5lci50cmFuc2xhdGVZID0gc2Nyb2xsQXJncy5zY3JvbGxZKi0xLjg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY3JvbGxBcmdzLnNjcm9sbFkqLTEuOCA+IDE1MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZHlUb0Ryb3AgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRpc21pc3NOb3RlLm9wYWNpdHkgPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1enouc2VsZWN0aW9uQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc21pc3NOb3RlLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogMjUwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWR5VG9Ecm9wID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGlzbWlzc05vdGUub3BhY2l0eSA9PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzbWlzc05vdGUuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wYWNpdHk6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAyNTBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFubmVyLm9mZigncGFuJyk7XG4gICAgICAgICAgICBwYW5uZXIub24oJ3BhbicsIChhcmdzOlBhbkdlc3R1cmVFdmVudERhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBzZXR0aW5nc0NvbnRhaW5lci50cmFuc2xhdGVZID0gYXJncy5kZWx0YVk7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MuZGVsdGFZID4gMTUwKSB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoZGlzbWlzc05vdGUub3BhY2l0eSA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidXp6LnNlbGVjdGlvbkNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc21pc3NOb3RlLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDI1MFxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkaXNtaXNzTm90ZS5vcGFjaXR5ID09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc21pc3NOb3RlLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wYWNpdHk6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IDI1MFxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYXJncy5zdGF0ZSA9PSAzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmRlbHRhWSA+IDE1MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oaWRlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzQ29udGFpbmVyLmFuaW1hdGUoPEFuaW1hdGlvbkRlZmluaXRpb24+e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0ZToge3g6IDAsIHk6IDB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAyMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmN1YmljQmV6aWVyKDAuMSwgMC4xLCAwLjEsIDEpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBoaWRlU2V0dGluZ3MoKSB7XG4gICAgICAgIHRoaXMuZGlzbWlzc1NvZnRJbnB1dHMoKTtcbiAgICAgICAgZWRpdGluZ1NoaWZ0ID0gZmFsc2U7XG4gICAgICAgIGxldCBtYWluZ3JpZDogR3JpZExheW91dCA9IHRoaXMucGFnZS5nZXRWaWV3QnlJZCgnbWFpbmdyaWQnKTtcbiAgICAgICAgbWFpbmdyaWQuYW5pbWF0ZSg8QW5pbWF0aW9uRGVmaW5pdGlvbj57XG4gICAgICAgICAgICBzY2FsZToge3g6IDEsIHk6IDF9LFxuICAgICAgICAgICAgZHVyYXRpb246IDMwMCxcbiAgICAgICAgICAgIGN1cnZlOiBBbmltYXRpb25DdXJ2ZS5jdWJpY0JlemllcigwLjEsIDAuMSwgMC4xLCAxKVxuICAgICAgICB9KVxuICAgICAgICBsZXQgZGV2aWNlSGVpZ2h0ID0gc2NyZWVuLm1haW5TY3JlZW4uaGVpZ2h0RElQcztcbiAgICAgICAgc2V0dGluZ3NDb250YWluZXIuYW5pbWF0ZSg8QW5pbWF0aW9uRGVmaW5pdGlvbj57XG4gICAgICAgICAgICB0cmFuc2xhdGU6IHt4OiAwLCB5OiBkZXZpY2VIZWlnaHQgLSAzMH0sXG4gICAgICAgICAgICBkdXJhdGlvbjogMzAwLFxuICAgICAgICAgICAgY3VydmU6IEFuaW1hdGlvbkN1cnZlLmN1YmljQmV6aWVyKDAuMSwgMC4xLCAwLjEsIDEpXG4gICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXQoJ3NldHRpbmdzU2hvd24nLCBmYWxzZSk7XG4gICAgICAgIH0pXG4gICAgICAgIHNldHRpbmdzT3ZlcmxheUNvbnRhaW5lci5hbmltYXRlKHtcbiAgICAgICAgICAgIG9wYWNpdHk6IDAsXG4gICAgICAgICAgICBkdXJhdGlvbjogMzAwXG4gICAgICAgIH0pXG4gICAgfSBcblxuICAgIHB1YmxpYyByZW1vdmVTZWN0aW9uZWRTaGlmdChhcmdzKSB7XG4gICAgICAgIGNvbnNvbGUuZGlyKGFyZ3MpO1xuICAgICAgICAvL3RoaXMuc2VjdGlvbmVkU2hpZnRzLmdldEl0ZW0oYXJncy5pbmRleCk7XG4gICAgICAgIHRoaXMuc2VjdGlvbmVkU2hpZnRzLnNwbGljZShhcmdzLmluZGV4LCAxKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcHJvY2Vzc1NoaWZ0cyhzaGlmdHMpIHtcbiAgICAgICAgbGV0IHNoaWZ0c0FycmF5ID0gW107XG4gICAgICAgIGZvciAodmFyIGkgaW4gc2hpZnRzKSB7XG4gICAgICAgICAgICBsZXQgbXlTaGlmdCA9IHNoaWZ0U2VydmljZS5idWlsZFNoaWZ0RGF0YShzaGlmdHNbaV0pO1xuICAgICAgICAgICAgbXlTaGlmdC5pZCA9IGk7XG4gICAgICAgICAgICBpZiAoIW15U2hpZnQuZW5kX3RpbWUpIHRoaXMuc2V0KCdjbG9ja2VkSW4nLCBzaGlmdHNbaV0pO1xuICAgICAgICAgICAgc2hpZnRzQXJyYXkucHVzaChteVNoaWZ0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNoaWZ0c0FycmF5LnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgIGlmIChtb21lbnQoYS5zdGFydF90aW1lKSA8IG1vbWVudChiLnN0YXJ0X3RpbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vbWVudChhLnN0YXJ0X3RpbWUpID4gbW9tZW50KGIuc3RhcnRfdGltZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG5cbiAgICAgICAgbGV0IHdlZWtzID0ge307XG4gICAgICAgIHRoaXMuc2V0KCdhZGRlZFNoaWZ0c01hcCcsIHt9KTtcblxuICAgICAgICB3aGlsZSAodGhpcy50aGlzV2Vlay5sZW5ndGgpIHRoaXMudGhpc1dlZWsucG9wKCk7XG4gICAgICAgIC8vIGNhbGN1bGF0ZSBob3VycyB3b3JrZWQgYW5kIG1vbmV5IGVhcm5lZC5cbiAgICAgICAgbGV0IHRoaXNXZWVrTWludXRlc1dvcmtlZCA9IDA7XG4gICAgICAgIGxldCB0aGlzV2Vla1RvdGFsRWFybmVkID0gMDtcbiAgICAgICAgZm9yICh2YXIgcyA9IDA7IHNoaWZ0c0FycmF5Lmxlbmd0aCA+IHM7IHMrKykge1xuICAgICAgICAgICAgLy8gYWRkIHRoZSBzaGlmdCBpZiBpdCBoYXNudCBiZWVuIGFkZGVkIGFscmVhZHkgYW5kIGlmIGl0IGlzIGluIHRoZSBjdXJyZW50IHdlZWsuIE9SIGlmIHRoZSBzaGlmdCBoYXMgbm90IGJlZW4gZW5kZWQuXG4gICAgICAgICAgICBpZiAoIXRoaXMuYWRkZWRTaGlmdHNNYXBbc2hpZnRzQXJyYXlbc10uaWRdKSB7XG4gICAgICAgICAgICAgICAgbGV0IHNoaWZ0ID0gb2JzZXJ2YWJsZUZyb21PYmplY3Qoc2hpZnRzQXJyYXlbc10pO1xuICAgICAgICAgICAgICAgIHRoaXMuc2hpZnRzLnB1c2goc2hpZnQpXG4gICAgICAgICAgICAgICAgaWYgKHNoaWZ0c0FycmF5W3NdLmVuZF90aW1lICYmIG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKSA+IG1vbWVudCgpLnN0YXJ0T2YoJ3dlZWsnKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRoaXNXZWVrLnB1c2goc2hpZnQpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyB1cGRhdGUgdGhlIHNoaWZ0IHRoYXRzIHN0aWxsIHJ1bm5pbmcgc28gdGhlIHRpbWVzIGFuZCB0aGUgbW9uZXkgZWFybmVkIHVwZGF0ZXNcbiAgICAgICAgICAgIC8vIG9yIHVwZGF0ZSBhIHNoaWZ0IHRoYXQgd2FzIHJlY2VudGx5IHVwZGF0ZWQuXG4gICAgICAgICAgICBpZiAoIXNoaWZ0c0FycmF5W3NdLmVuZF90aW1lIHx8IHNoaWZ0c0FycmF5W3NdLnJlY2VudGx5VXBkYXRlZCkge1xuICAgICAgICAgICAgICAgIGxldCB1cGRhdGVJbmRleDtcbiAgICAgICAgICAgICAgICB0aGlzLnNoaWZ0cy5mb3JFYWNoKChlbGVtZW50LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5nZXQoJ2lkJykgPT0gc2hpZnRzQXJyYXlbc10uaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZUluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLnNoaWZ0cy5zZXRJdGVtKHVwZGF0ZUluZGV4LCBvYnNlcnZhYmxlRnJvbU9iamVjdChzaGlmdHNBcnJheVtzXSkpO1xuXG4gICAgICAgICAgICAgICAgLy8gdXBkYXRlIHRoZSBlbnRpdHkgaW4gdGhlIHRoaXNXZWVrIG9ic2VydmFibGUuXG4gICAgICAgICAgICAgICAgbGV0IHRoaXNXZWVrVXBkYXRlSW5kZXg7XG4gICAgICAgICAgICAgICAgdGhpcy50aGlzV2Vlay5mb3JFYWNoKChlbGVtZW50LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5nZXQoJ2lkJykgPT0gc2hpZnRzQXJyYXlbc10uaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNXZWVrVXBkYXRlSW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMudGhpc1dlZWsuc2V0SXRlbSh0aGlzV2Vla1VwZGF0ZUluZGV4LCBvYnNlcnZhYmxlRnJvbU9iamVjdChzaGlmdHNBcnJheVtzXSkpO1xuICAgICAgICAgICAgICAgIHNoaWZ0c0FycmF5W3NdLnJlY2VudGx5VXBkYXRlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmFkZGVkU2hpZnRzTWFwW3NoaWZ0c0FycmF5W3NdLmlkXSA9IHNoaWZ0c0FycmF5W3NdO1xuICAgICAgICAgICAgaWYgKCFzaGlmdHNBcnJheVtzXS5lbmRfdGltZSkge1xuICAgICAgICAgICAgICAgIHZhciBjb21wYXJlQSA9IG1vbWVudCgpO1xuICAgICAgICAgICAgICAgIHZhciBtaW51dGVzV29ya2VkID0gY29tcGFyZUEuZGlmZihtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSksICdtaW51dGVzJylcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aGlzV2Vlay5sZW5ndGggJiYgdGhpcy50aGlzV2Vlay5nZXRJdGVtKDApLmdldCgnaWQnKSA9PSBzaGlmdHNBcnJheVtzXS5pZCkgdGhpcy50aGlzV2Vlay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIHRoaXMudGhpc1dlZWsudW5zaGlmdChvYnNlcnZhYmxlRnJvbU9iamVjdChzaGlmdHNBcnJheVtzXSkpICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL3NldCB1cCB3ZWVrIGRhdGEuXG4gICAgICAgICAgICAvLyB2YXIgYmVnaW5uaW5nT2ZXZWVrTW9tZW50ID0gbW9tZW50KHNoaWZ0c0FycmF5W3NdLnN0YXJ0X3RpbWUpLmlzb1dlZWtkYXkoMCk7XG4gICAgICAgICAgICAvLyB2YXIgYmVnaW5uaW5nT2ZXZWVrID0gbW9tZW50KHNoaWZ0c0FycmF5W3NdLnN0YXJ0X3RpbWUpLmlzb1dlZWtkYXkoMCkuZm9ybWF0KCdkZGRkIE1NTU0gRG8gWVlZWScpO1xuXG4gICAgICAgICAgICB2YXIgYmVnaW5uaW5nT2ZXZWVrTW9tZW50ID0gbW9tZW50KHNoaWZ0c0FycmF5W3NdLnN0YXJ0X3RpbWUpLmlzb1dlZWtkYXkoMCk7XG4gICAgICAgICAgICB2YXIgYmVnaW5uaW5nT2ZXZWVrID0gbW9tZW50KHNoaWZ0c0FycmF5W3NdLnN0YXJ0X3RpbWUpLmlzb1dlZWtkYXkoMCkuZm9ybWF0KCdkZGRkIE1NTU0gRG8gWVlZWScpO1xuICAgICAgICAgICAgaWYgKG1vbWVudChzaGlmdHNBcnJheVtzXS5zdGFydF90aW1lKS5pc29XZWVrZGF5KCkgPT0gMCB8fCBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSkuaXNvV2Vla2RheSgpID09IDcpIHtcbiAgICAgICAgICAgICAgICBiZWdpbm5pbmdPZldlZWtNb21lbnQgPSBtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSk7XG4gICAgICAgICAgICAgICAgYmVnaW5uaW5nT2ZXZWVrID0gbW9tZW50KHNoaWZ0c0FycmF5W3NdLnN0YXJ0X3RpbWUpLmZvcm1hdCgnZGRkZCBNTU1NIERvIFlZWVknKTtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghd2Vla3NbYmVnaW5uaW5nT2ZXZWVrXSkge1xuICAgICAgICAgICAgICAgIHdlZWtzW2JlZ2lubmluZ09mV2Vla10gPSB7XG4gICAgICAgICAgICAgICAgICAgIHRvdGFsX21pbnV0ZXM6IDAsXG4gICAgICAgICAgICAgICAgICAgIHJlZ3VsYXJfbWludXRlczogMCxcbiAgICAgICAgICAgICAgICAgICAgb3ZlcnRpbWVfbWludXRlczogMCxcbiAgICAgICAgICAgICAgICAgICAgaG91cnNfd29ya2VkOiAwLFxuICAgICAgICAgICAgICAgICAgICByZWd1bGFyX2Vhcm5lZDogMCxcbiAgICAgICAgICAgICAgICAgICAgb3ZlcnRpbWVfZWFybmVkOiAwLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogYmVnaW5uaW5nT2ZXZWVrTW9tZW50LmZvcm1hdCgnW1dlZWsgb2ZdIE1NTSBEbycpLFxuICAgICAgICAgICAgICAgICAgICB3ZWVrX3N0YXJ0OiBiZWdpbm5pbmdPZldlZWtNb21lbnQuZm9ybWF0KCdZWVlZLU1NLUREJyksXG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0czogW11cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGNvbXBhcmVBID0gbW9tZW50KCk7XG4gICAgICAgICAgICBpZiAoc2hpZnRzQXJyYXlbc10uZW5kX3RpbWUpIGNvbXBhcmVBID0gbW9tZW50KHNoaWZ0c0FycmF5W3NdLmVuZF90aW1lKTtcbiAgICAgICAgICAgIHZhciBtaW51dGVzV29ya2VkID0gY29tcGFyZUEuZGlmZihtb21lbnQoc2hpZnRzQXJyYXlbc10uc3RhcnRfdGltZSksICdtaW51dGVzJylcbiAgICAgICAgICAgIHdlZWtzW2JlZ2lubmluZ09mV2Vla10udG90YWxfbWludXRlcyArPSBtaW51dGVzV29ya2VkO1xuICAgICAgICAgICAgdmFyIHNoaWZ0ID0gc2hpZnRTZXJ2aWNlLmJ1aWxkU2hpZnREYXRhKHNoaWZ0c0FycmF5W3NdKTtcbiAgICAgICAgICAgIHdlZWtzW2JlZ2lubmluZ09mV2Vla10uc2hpZnRzLnB1c2goc2hpZnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgd2hpbGUgKHRoaXMuc2VjdGlvbmVkU2hpZnRzLmxlbmd0aCkgdGhpcy5zZWN0aW9uZWRTaGlmdHMucG9wKCk7XG5cblxuICAgICAgICBmb3IgKHZhciB3IGluIHdlZWtzKSB7XG4gICAgICAgICAgICBsZXQgd2Vla0NvbnRyaWJ1dGlvblRvdGFsID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGl3ID0gMDsgd2Vla3Nbd10uc2hpZnRzLmxlbmd0aCA+IGl3OyBpdysrKSB7XG4gICAgICAgICAgICAgICAgdmFyIG15U2hpZnQgPSB3ZWVrc1t3XS5zaGlmdHNbaXddXG4gICAgICAgICAgICAgICAgaWYgKGl3ID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5taW51dGVzX2FjY3J1ZWQgPSBteVNoaWZ0Lm1pbnV0ZXNfd29ya2VkO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQubWludXRlc19hY2NydWVkID0gbXlTaGlmdC5taW51dGVzX3dvcmtlZCArIHdlZWtzW3ddLnNoaWZ0c1tpdy0xXS5taW51dGVzX2FjY3J1ZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChteVNoaWZ0Lm1pbnV0ZXNfYWNjcnVlZCA+IDI0MDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBzaGlmdCBoYXMgb3ZlcnRpbWUgbWludXRlcy5cbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5vdmVydGltZV9taW51dGVzID0gbXlTaGlmdC5taW51dGVzX2FjY3J1ZWQgLSAyNDAwO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgbGluZSB3aWxsIGVuc3VyZSB0aGF0IHlvdSBhcmVudCBleHBvbmVudGlhbGx5IGFjY3J1aW5nIG92ZXJ0aW1lIG1pbnV0ZXMuXG4gICAgICAgICAgICAgICAgICAgIGlmIChteVNoaWZ0Lm92ZXJ0aW1lX21pbnV0ZXMgPiBteVNoaWZ0Lm1pbnV0ZXNfd29ya2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBteVNoaWZ0Lm92ZXJ0aW1lX21pbnV0ZXMgPSBteVNoaWZ0Lm1pbnV0ZXNfd29ya2VkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWd1bGFyX21pbnV0ZXNfd29ya2VkID0gbXlTaGlmdC5taW51dGVzX3dvcmtlZC1teVNoaWZ0Lm92ZXJ0aW1lX21pbnV0ZXM7XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQucmVndWxhcl9lYXJuZWQgPSAocmVndWxhcl9taW51dGVzX3dvcmtlZCAqICh0aGlzLmdldCgndXNlcicpLmhvdXJseVJhdGUvNjApKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0Lm92ZXJ0aW1lX2Vhcm5lZCA9IChteVNoaWZ0Lm92ZXJ0aW1lX21pbnV0ZXMgKiAodGhpcy5nZXQoJ3VzZXInKS5vdmVydGltZVJhdGUvNjApKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQucmVndWxhcl9lYXJuZWQgPSAobXlTaGlmdC5taW51dGVzX3dvcmtlZCoodGhpcy5nZXQoJ3VzZXInKS5ob3VybHlSYXRlLzYwKSkudG9GaXhlZCgyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB3ZWVrc1t3XS5yZWd1bGFyX2Vhcm5lZCArPSBteVNoaWZ0LnJlZ3VsYXJfZWFybmVkLTA7XG4gICAgICAgICAgICAgICAgaWYgKG15U2hpZnQub3ZlcnRpbWVfZWFybmVkKSB3ZWVrc1t3XS5vdmVydGltZV9lYXJuZWQgKz0gbXlTaGlmdC5vdmVydGltZV9lYXJuZWQtMDtcbiAgICAgICAgICAgICAgICBteVNoaWZ0LnRvdGFsX2Vhcm5lZCA9ICgobXlTaGlmdC5yZWd1bGFyX2Vhcm5lZC0wKSArIChteVNoaWZ0Lm92ZXJ0aW1lX2Vhcm5lZC0wIHx8IDApKS50b0ZpeGVkKDIpXG4gICAgICAgICAgICAgICAgY29uc29sZS5kaXIoSlNPTi5zdHJpbmdpZnkobXlTaGlmdC5jb250cmlidXRpb25zKSk7XG5cbiAgICAgICAgICAgICAgICAvLyBJZiBjb250cmlidXRpb25zIGFyZSBzZXQsIGRpc3BsYXkgd2hhdCB0aGV5IHNldCBhcyBjb250cmlidXRpb25zIGFzIGl0IG1heSBiZVxuICAgICAgICAgICAgICAgIC8vIGRpZmZlcmVudCBmcm9tIHdoYXQgdGhleSBlYXJuZWQgYmFzZWQgb24gdGltZSB3b3JrZWQgYW5kIGhvdXJseSByYXRlcy5cbiAgICAgICAgICAgICAgICBteVNoaWZ0LnRvdGFsX2NvbnRyaWJ1dGlvbnMgPSAwO1xuICAgICAgICAgICAgICAgIG15U2hpZnQuZGlzcGxheV9lYXJuZWQgPSBteVNoaWZ0LnRvdGFsX2Vhcm5lZDtcbiAgICAgICAgICAgICAgICBpZiAobXlTaGlmdC5jb250cmlidXRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHggaW4gbXlTaGlmdC5jb250cmlidXRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBteVNoaWZ0LnRvdGFsX2NvbnRyaWJ1dGlvbnMgKz0gcGFyc2VGbG9hdChteVNoaWZ0LmNvbnRyaWJ1dGlvbnNbeF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2Vla0NvbnRyaWJ1dGlvblRvdGFsICs9IHBhcnNlRmxvYXQobXlTaGlmdC5jb250cmlidXRpb25zW3hdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0LmRpc3BsYXlfZWFybmVkID0gbXlTaGlmdC50b3RhbF9jb250cmlidXRpb25zLnRvRml4ZWQoMik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgd2Vla0NvbnRyaWJ1dGlvblRvdGFsICs9IHBhcnNlRmxvYXQobXlTaGlmdC50b3RhbF9lYXJuZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvL2xldCBwZXJjZW50YWdlT2Y6IG51bWJlciA9IHBhcnNlRmxvYXQoKChteVNoaWZ0LmRpc3BsYXlfZWFybmVkKjEwMCkvbXlTaGlmdC50b3RhbF9lYXJuZWQpLnRvRml4ZWQoMCkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIGlmIChwZXJjZW50YWdlT2YgPiAxMDApIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgbXlTaGlmdC5lYXJuZWRfZGlmZmVyZW5jZSA9IHBlcmNlbnRhZ2VPZi0xMDA7XG4gICAgICAgICAgICAgICAgLy8gfSBlbHNlIGlmIChwZXJjZW50YWdlT2YgPCAxMDApIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgbXlTaGlmdC5lYXJuZWRfZGlmZmVyZW5jZSA9IDEwMCAtIHBlcmNlbnRhZ2VPZjtcbiAgICAgICAgICAgICAgICAvLyB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vICAgICBteVNoaWZ0LmVhcm5lZF9kaWZmZXJlbmNlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgLy8gfVxuXG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlRmxvYXQobXlTaGlmdC50b3RhbF9lYXJuZWQpID4gcGFyc2VGbG9hdChteVNoaWZ0LmRpc3BsYXlfZWFybmVkKSkge1xuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0LmVhcm5lZF9kaWZmZXJlbmNlID0gJyQnICsgKG15U2hpZnQudG90YWxfZWFybmVkIC0gbXlTaGlmdC5kaXNwbGF5X2Vhcm5lZCkudG9GaXhlZCgyKSArICcgVW5kZXInO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocGFyc2VGbG9hdChteVNoaWZ0LnRvdGFsX2Vhcm5lZCkgPCBwYXJzZUZsb2F0KG15U2hpZnQuZGlzcGxheV9lYXJuZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQuZWFybmVkX2RpZmZlcmVuY2UgPSAnJCcgKyAobXlTaGlmdC5kaXNwbGF5X2Vhcm5lZCAtIG15U2hpZnQudG90YWxfZWFybmVkKS50b0ZpeGVkKDIpICsgJyBPdmVyJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0LmVhcm5lZF9kaWZmZXJlbmNlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vbXlTaGlmdC5lYXJuZWRfZGlmZmVyZW5jZVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG15U2hpZnQudGl0bGUgKyAnIGZyb20gJyArIG15U2hpZnQuZGlzcGxheV9ob3VycylcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndG90YWwgZWFybmVkOiAnICsgbXlTaGlmdC50b3RhbF9lYXJuZWQpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkaXNwbGF5IGVhcm5lZDogJyArIG15U2hpZnQuZGlzcGxheV9lYXJuZWQpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkaWZmZXJlbmNlOiAnICsgbXlTaGlmdC5lYXJuZWRfZGlmZmVyZW5jZSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobXlTaGlmdC50b3RhbF9jb250cmlidXRpb25zKTtcblxuXG5cbiAgICAgICAgICAgICAgICBteVNoaWZ0LmRpc3BsYXlfZGF0ZSA9IG1vbWVudChteVNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnZGRkZCBNTU0gREQsIFlZWVknKTtcbiAgICAgICAgICAgICAgICBteVNoaWZ0LmRpc3BsYXlfdGltaW5nID0gbW9tZW50KG15U2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdoOm1tYScpICsgJyB0byAnICsgbW9tZW50KG15U2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnaDptbWEnKTtcbiAgICAgICAgICAgICAgICBpZiAobW9tZW50KG15U2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdZWVlZTU1ERCcpIDwgbW9tZW50KG15U2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnWVlZWU1NREQnKSkge1xuICAgICAgICAgICAgICAgICAgICBteVNoaWZ0LmRpc3BsYXlfdGltaW5nID0gbW9tZW50KG15U2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdoOm1tYScpICsgJyB0byAnICsgbW9tZW50KG15U2hpZnQuZW5kX3RpbWUpLmZvcm1hdCgnTU1NIEREIFthdF0gaDptbWEnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFteVNoaWZ0LmVuZF90aW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIG15U2hpZnQuZGlzcGxheV9kYXRlID0gbXlTaGlmdC5kaXNwbGF5X2RhdGUgPSBtb21lbnQoKS5mb3JtYXQoJ1tUT0RBWV0gTU1NIERELCBZWVlZJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgbXlTaGlmdC5kaXNwbGF5X3RpbWluZyA9ICdTaGlmdCBzdGFydGVkIGF0ICcgKyBtb21lbnQobXlTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ2g6bW1hJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtb21lbnQobXlTaGlmdC5zdGFydF90aW1lKS5mb3JtYXQoJ1lZWVlNTUREJykgPCBtb21lbnQoKS5mb3JtYXQoJ1lZWVlNTUREJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG15U2hpZnQuZGlzcGxheV90aW1pbmcgPSAnU2hpZnQgc3RhcnRlZCBvbiAnICsgbW9tZW50KG15U2hpZnQuc3RhcnRfdGltZSkuZm9ybWF0KCdNTU0gREQgW2F0XSBoOm1tYScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB3ZWVrc1t3XS50b3RhbF9lYXJuZWQgPSAod2Vla3Nbd10ucmVndWxhcl9lYXJuZWQgKyAod2Vla3Nbd10ub3ZlcnRpbWVfZWFybmVkIHx8IDApKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgd2Vla3Nbd10ucmVndWxhcl9lYXJuZWQgPSB3ZWVrc1t3XS5yZWd1bGFyX2Vhcm5lZC50b0ZpeGVkKDIpXG4gICAgICAgICAgICBpZiAod2Vla3Nbd10ub3ZlcnRpbWVfZWFybmVkKSB3ZWVrc1t3XS5vdmVydGltZV9lYXJuZWQgPSB3ZWVrc1t3XS5vdmVydGltZV9lYXJuZWQudG9GaXhlZCgyKVxuICAgICAgICAgICAgd2Vla3Nbd10uaG91cnNfd29ya2VkID0gKHdlZWtzW3ddLnRvdGFsX21pbnV0ZXMvNjApLnRvRml4ZWQoMik7XG4gICAgICAgICAgICBpZiAod2Vla3Nbd10udG90YWxfbWludXRlcyA+IDI0MDApIHtcbiAgICAgICAgICAgICAgICB3ZWVrc1t3XS5yZWd1bGFyX21pbnV0ZXMgPSAyNDAwO1xuICAgICAgICAgICAgICAgIHdlZWtzW3ddLm92ZXJ0aW1lX21pbnV0ZXMgPSB3ZWVrc1t3XS50b3RhbF9taW51dGVzLTI0MDA7XG5cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgd2Vla3Nbd10ucmVndWxhcl9taW51dGVzID0gd2Vla3Nbd10udG90YWxfbWludXRlcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBzZXR1cCBzZWN0aW9uZWQgYXJyYXkuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnd2VlayBjb250cmlidXRpb24gdG90YWw6ICcgKyB3ZWVrQ29udHJpYnV0aW9uVG90YWwpXG4gICAgICAgICAgICB2YXIgaGVhZGVyT2JqOiBhbnkgPSB7XG4gICAgICAgICAgICAgICAgXCJpZFwiOiB3ZWVrc1t3XS50aXRsZSxcbiAgICAgICAgICAgICAgICBcInN0YXJ0X3RpbWVcIjogbW9tZW50KHdlZWtzW3ddLnNoaWZ0c1t3ZWVrc1t3XS5zaGlmdHMubGVuZ3RoLTFdLnN0YXJ0X3RpbWUpLmFkZCgnMTAnLCAnbWludXRlcycpLmZvcm1hdCgnWVlZWS1NTS1ERCBISDptbTpzcycpLFxuICAgICAgICAgICAgICAgIFwiaGVhZGVyXCI6IHRydWUsXG4gICAgICAgICAgICAgICAgXCJ0aXRsZVwiOiB3ZWVrc1t3XS50aXRsZSxcbiAgICAgICAgICAgICAgICBcImhvdXJzX3dvcmtlZFwiOiB3ZWVrc1t3XS5ob3Vyc193b3JrZWQsXG4gICAgICAgICAgICAgICAgXCJyZWd1bGFyX2Vhcm5lZFwiOiB3ZWVrc1t3XS5yZWd1bGFyX2Vhcm5lZCxcbiAgICAgICAgICAgICAgICBcIm92ZXJ0aW1lX2Vhcm5lZFwiOiB3ZWVrc1t3XS5vdmVydGltZV9lYXJuZWQsXG4gICAgICAgICAgICAgICAgXCJ0b3RhbF9jb250cmlidXRpb25zXCI6IHdlZWtDb250cmlidXRpb25Ub3RhbC50b0ZpeGVkKDIpLFxuICAgICAgICAgICAgICAgIFwidGltZV93b3JrZWRcIjogc2hpZnRTZXJ2aWNlLmNhbGN1bGF0ZVNoaWZ0SG91cnNXb3JrZWQoZmFsc2UsIGZhbHNlLCB3ZWVrc1t3XS50b3RhbF9taW51dGVzKS50aW1lX3dvcmtlZCxcbiAgICAgICAgICAgICAgICBcInRvdGFsX2Vhcm5lZFwiOiB3ZWVrc1t3XS50b3RhbF9lYXJuZWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh3ZWVrc1t3XS50b3RhbF9taW51dGVzID4gMjQwMCkge1xuICAgICAgICAgICAgICAgIGlmICh3ZWVrc1t3XS5vdmVydGltZV9taW51dGVzIC82MCA8IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyT2JqLm92ZXJ0aW1lX2hvdXJzID0gd2Vla3Nbd10ub3ZlcnRpbWVfbWludXRlcyArICcgTUlOVVRFUyc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICgod2Vla3Nbd10ub3ZlcnRpbWVfbWludXRlcy82MCkgJSAxID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlck9iai5vdmVydGltZV9ob3VycyA9IE1hdGguZmxvb3Iod2Vla3Nbd10ub3ZlcnRpbWVfbWludXRlcy82MCkgKyAnIEhPVVJTJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbWludXRlc09uSG91ciA9IHdlZWtzW3ddLm92ZXJ0aW1lX2hvdXJzIC0gKE1hdGguZmxvb3Iod2Vla3Nbd10ub3ZlcnRpbWVfaG91cnMvNjApICogNjApO1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXJPYmoub3ZlcnRpbWVfaG91cnMgID0gTWF0aC5mbG9vcih3ZWVrc1t3XS5vdmVydGltZV9ob3Vycy82MCkgKyAnIEhPVVInICsgKE1hdGguZmxvb3Iod2Vla3Nbd10ub3ZlcnRpbWVfaG91cnMvNjApID09IDEgPyAnJyA6ICdTJykgKyAnICcgKyBtaW51dGVzT25Ib3VyICsgJyBNSU5VVEUnICsgKG1pbnV0ZXNPbkhvdXIgPT0gMSA/ICcnIDogJ1MnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL2NvbnNvbGUuZGlyKGhlYWRlck9iaik7XG4gICAgICAgICAgICB0aGlzLnNlY3Rpb25lZFNoaWZ0cy5wdXNoKG9ic2VydmFibGVGcm9tT2JqZWN0KGhlYWRlck9iaikpO1xuXG5cbiAgICAgICAgICAgIGZvciAodmFyIGl4ID0gMDsgd2Vla3Nbd10uc2hpZnRzLmxlbmd0aCA+IGl4OyBpeCsrKSB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmRpcih3ZWVrc1t3XS5zaGlmdHNbaXhdKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlY3Rpb25lZFNoaWZ0cy5wdXNoKG9ic2VydmFibGVGcm9tT2JqZWN0KHdlZWtzW3ddLnNoaWZ0c1tpeF0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvL2NvbnNvbGUubG9nKHRoaXMuc2VjdGlvbmVkU2hpZnRzLmxlbmd0aCk7XG4gICAgICAgIFxuICAgICAgICAvLyB0aGlzLnNlY3Rpb25lZFNoaWZ0cy5wb3AoKTtcbiAgICAgICAgLy8gd2hpbGUgKHRoaXMuc2VjdGlvbmVkU2hpZnRzLmxlbmd0aCkgdGhpcy5zZWN0aW9uZWRTaGlmdHMucG9wKCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLndlZWtzID0gd2Vla3M7XG4gICAgICAgIGxldCBub0VuZFRpbWVNaW51dGVzV29ya2VkID0gMDtcbiAgICAgICAgbGV0IGhhc09wZW5TaGlmdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRoaXNXZWVrLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgICB2YXIgY29tcGFyZUEgPSBtb21lbnQoKTtcbiAgICAgICAgICAgIGlmIChlbGVtZW50LmdldCgnZW5kX3RpbWUnKSkgY29tcGFyZUEgPSBtb21lbnQoZWxlbWVudC5nZXQoJ2VuZF90aW1lJykpO1xuICAgICAgICAgICAgdmFyIG1pbnV0ZXNXb3JrZWQgPSBjb21wYXJlQS5kaWZmKG1vbWVudChlbGVtZW50LmdldCgnc3RhcnRfdGltZScpKSwgJ21pbnV0ZXMnKVxuICAgICAgICAgICAgdGhpc1dlZWtNaW51dGVzV29ya2VkICs9IG1pbnV0ZXNXb3JrZWQ7XG4gICAgICAgICAgICBpZiAoZWxlbWVudC5nZXQoJ2VuZF90aW1lJykpIHtcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5nZXQoJ2NvbnRyaWJ1dGlvbnMnKSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCB4IGluIGVsZW1lbnQuZ2V0KCdjb250cmlidXRpb25zJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNXZWVrVG90YWxFYXJuZWQgKz0gcGFyc2VGbG9hdChlbGVtZW50LmdldCgnY29udHJpYnV0aW9ucycpW3hdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaGFzT3BlblNoaWZ0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBsZXQgY29tcGFyZUEgPSBtb21lbnQoKTtcbiAgICAgICAgICAgICAgICBub0VuZFRpbWVNaW51dGVzV29ya2VkICs9IGNvbXBhcmVBLmRpZmYobW9tZW50KGVsZW1lbnQuZ2V0KCdzdGFydF90aW1lJykpLCAnbWludXRlcycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgY29uc29sZS5sb2coJ25vIGVuZCB0aW1lIG1pbnV0ZXMgd29ya2VkOiAnICsgbm9FbmRUaW1lTWludXRlc1dvcmtlZClcbiAgICAgICAgY29uc29sZS5sb2coJ3RoaXMgd2VlayB0b3RhbCBlYXJuZWQ6ICcgKyB0aGlzV2Vla1RvdGFsRWFybmVkKTtcblxuICAgICAgICBsZXQgbWludXRlUmF0ZSA9IHBhcnNlRmxvYXQodGhpcy51c2VyLmhvdXJseVJhdGUpLzYwO1xuICAgICAgICBsZXQgb3ZlcnRpbWVNaW51dGVSYXRlID0gcGFyc2VGbG9hdCh0aGlzLnVzZXIub3ZlcnRpbWVSYXRlKS82MDtcbiAgICAgICAgaWYgKHRoaXNXZWVrTWludXRlc1dvcmtlZCA+IDI0MDApIHtcbiAgICAgICAgICAgIGxldCByZWd1bGFyRWFybmVkID0gMjQwMCptaW51dGVSYXRlO1xuICAgICAgICAgICAgbGV0IG92ZXJ0aW1lRWFybmVkID0gKHRoaXNXZWVrTWludXRlc1dvcmtlZC0yNDAwKSpvdmVydGltZU1pbnV0ZVJhdGU7XG4gICAgICAgICAgICB0aGlzLnNldCgncmVndWxhcl9lYXJuZWQnLCByZWd1bGFyRWFybmVkKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdvdmVydGltZV9lYXJuZWQnLCBvdmVydGltZUVhcm5lZClcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5zZXQoJ3RvdGFsX2Vhcm5lZCcsIChyZWd1bGFyRWFybmVkK292ZXJ0aW1lRWFybmVkKS50b0ZpeGVkKDIpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KCdyZWd1bGFyX2Vhcm5lZCcsIHRoaXNXZWVrTWludXRlc1dvcmtlZCptaW51dGVSYXRlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0KCd0b3RhbF9lYXJuZWQnLCAodGhpc1dlZWtNaW51dGVzV29ya2VkKm1pbnV0ZVJhdGUpLnRvRml4ZWQoMikpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2V0KCd0aGlzV2Vla01pbnV0ZXNXb3JrZWQnLCB0aGlzV2Vla01pbnV0ZXNXb3JrZWQpO1xuICAgICAgICBsZXQgdGltZVdvcmtlZCA9ICcwIEhPVVJTJztcbiAgICAgICAgaWYgKHRoaXNXZWVrTWludXRlc1dvcmtlZCkgdGltZVdvcmtlZCA9IHNoaWZ0U2VydmljZS5jYWxjdWxhdGVTaGlmdEhvdXJzV29ya2VkKGZhbHNlLCBmYWxzZSwgdGhpc1dlZWtNaW51dGVzV29ya2VkKS50aW1lX3dvcmtlZDtcbiAgICAgICAgdGhpcy5zZXQoJ2hvdXJzX3dvcmtlZCcsIHRpbWVXb3JrZWQpO1xuXG4gICAgICAgIGlmIChoYXNPcGVuU2hpZnQpIHtcbiAgICAgICAgICAgIGxldCBjb21wbGV0ZWRTaGlmdHNNaW51dGVzV29ya2VkID0gdGhpc1dlZWtNaW51dGVzV29ya2VkIC0gbm9FbmRUaW1lTWludXRlc1dvcmtlZDtcbiAgICAgICAgICAgIGxldCBvcGVuU2hpZnRFYXJuZWQgPSAobm9FbmRUaW1lTWludXRlc1dvcmtlZCptaW51dGVSYXRlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvcGVuIHNoaWZ0IGVhcm5lZDogJyArIG9wZW5TaGlmdEVhcm5lZCk7XG4gICAgICAgICAgICB0aGlzLnNldCgnZGlzcGxheV9lYXJuZWQnLCAodGhpc1dlZWtUb3RhbEVhcm5lZCArIG9wZW5TaGlmdEVhcm5lZCkudG9GaXhlZCgyKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldCgnZGlzcGxheV9lYXJuZWQnLCB0aGlzV2Vla1RvdGFsRWFybmVkKTtcbiAgICAgICAgfVxuICAgICAgICBcblxuICAgIH1cblxuICAgIHB1YmxpYyBwcm9jZXNzSW52b2ljZXMoaW52b2ljZXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2luIHByb2Nlc3MgaW52b2ljZXMnKTtcbiAgICAgICAgd2hpbGUgKHRoaXMuaW52b2ljZXMubGVuZ3RoKSB0aGlzLmludm9pY2VzLnBvcCgpO1xuICAgICAgICBsZXQgdXNlciA9IEpTT04ucGFyc2UoYXBwU2V0dGluZ3MuZ2V0U3RyaW5nKCd1c2VyRGF0YScpKTtcbiAgICAgICAgLy9sZXQgaW52b2ljZXNBcnJheSA9IG5ldyBPYnNlcnZhYmxlQXJyYXkoKTtcbiAgICAgICAgdGhpcy5zZXQoJ2ludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXAnLCB7fSk7XG4gICAgICAgIGxldCB0b3RhbF91bnBhaWQgPSAwO1xuICAgICAgICBmb3IgKHZhciBpIGluIGludm9pY2VzKSB7XG4gICAgICAgICAgICBpbnZvaWNlc1tpXS5pZCA9IGk7XG4gICAgICAgICAgICBpbnZvaWNlc1tpXS5zaGlmdHMgPSBbXTtcbiAgICAgICAgICAgIGludm9pY2VzW2ldLmZhbWlseV9uYW1lID0gdXNlci5mYW1pbGllc1tpbnZvaWNlc1tpXS5mYW1pbHlfaWRdLm5hbWU7XG4gICAgICAgICAgICBpbnZvaWNlc1tpXS5kYXRlX2NyZWF0ZWRfcHJldHR5ID0gbW9tZW50KGludm9pY2VzW2ldLmRhdGVfY3JlYXRlZCkuZm9ybWF0KCdNTU0gRG8sIFlZWVknKTtcbiAgICAgICAgICAgIGZvciAodmFyIHMgPSAwOyBpbnZvaWNlc1tpXS5zaGlmdF9pZHMubGVuZ3RoID4gczsgcysrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYWRkZWRTaGlmdHNNYXBbaW52b2ljZXNbaV0uc2hpZnRfaWRzW3NdXSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiB0aGlzIGNvbmRpdGlvbmFsIGlzbnQgc2F0aXNmaWVkLCBpdCBwcm9iYWJseSBtZWFucyB0aGUgdXNlciBkZWxldGVkIHRoZSBzaGlmdCBhZnRlciBpdCB3YXMgaW52b2ljZWQuXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ludm9pY2VzW2ldLmZhbWlseV9pZF0pIHRoaXMuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcFtpbnZvaWNlc1tpXS5mYW1pbHlfaWRdID0ge307XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcFtpbnZvaWNlc1tpXS5mYW1pbHlfaWRdW2ludm9pY2VzW2ldLnNoaWZ0X2lkc1tzXV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBsZXQgc2hpZnQgPSB0aGlzLmFkZGVkU2hpZnRzTWFwW2ludm9pY2VzW2ldLnNoaWZ0X2lkc1tzXV07XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0LmNvbnRyaWJ1dGlvbiA9IHNoaWZ0LmNvbnRyaWJ1dGlvbnNbaW52b2ljZXNbaV0uZmFtaWx5X2lkXTtcbiAgICAgICAgICAgICAgICAgICAgc2hpZnQuaW52b2ljZV90aXRsZV9kaXNwbGF5ID0gbW9tZW50KHNoaWZ0LnN0YXJ0X3RpbWUpLmZvcm1hdCgnTS9EL1lZJykgKyAnOiAnICsgc2hpZnQuZGlzcGxheV9ob3VycztcbiAgICAgICAgICAgICAgICAgICAgc2hpZnQuaW52b2ljZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpbnZvaWNlc1tpXS5zaGlmdHMucHVzaChzaGlmdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gdGhpcyBpcyByZXF1aXJlZCB0byBtYWtlIHRoZSBVSSByZXNwZWN0IHRoZSBsb2FkaW5nIGluZGljYXRvci5cbiAgICAgICAgICAgIGludm9pY2VzW2ldLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmICghaW52b2ljZXNbaV0uc2VudCkgaW52b2ljZXNbaV0uc2VudCA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKCFpbnZvaWNlc1tpXS5wYWlkKSB0b3RhbF91bnBhaWQgKz0gaW52b2ljZXNbaV0udG90YWwtMDtcbiAgICAgICAgICAgIFxuXG4gICAgICAgICAgICB0aGlzLmludm9pY2VNYXBbaV0gPSBpbnZvaWNlc1tpXTtcbiAgICAgICAgICAgIGxldCBpc0FkZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAvL2ludm9pY2VzQXJyYXkucHVzaChpbnZvaWNlc1tpXSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuaW52b2ljZXMucHVzaChvYnNlcnZhYmxlRnJvbU9iamVjdChpbnZvaWNlc1tpXSkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvL3RoaXMuaW52b2ljZXMucHVzaChvYnNlcnZhYmxlRnJvbU9iamVjdChpbnZvaWNlc1tpXSkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2V0KCd0b3RhbFVucGFpZFN0cmluZycsICdZb3UgaGF2ZSAkJyArIHRvdGFsX3VucGFpZC50b0ZpeGVkKDIpICsgJyBpbiB1bnBhaWQgaW52b2ljZXMuJyk7XG4gICAgICAgIHRoaXMuc2V0KCd0b3RhbFVucGFpZCcsIHRvdGFsX3VucGFpZC50b0ZpeGVkKDIpKTtcbiAgICAgICAgaWYgKCF0b3RhbF91bnBhaWQpIHRoaXMuc2V0KCd0b3RhbFVucGFpZFN0cmluZycsICdZb3VcXCdyZSBhbGwgcGFpZCB1cCEnKTtcbiAgICAgICAgdGhpcy5pbnZvaWNlcy5zb3J0KChhOmFueSwgYjphbnkpID0+IHtcbiAgICAgICAgICAgIGlmIChtb21lbnQoYS5kYXRlX2NyZWF0ZWQpIDwgbW9tZW50KGIuZGF0ZV9jcmVhdGVkKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtb21lbnQoYS5kYXRlX2NyZWF0ZWQpID4gbW9tZW50KGIuZGF0ZV9jcmVhdGVkKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICAvLyBjb25zb2xlLmxvZygnaW52b2ljZXNBcnJheSBsZW5naHQgJyArIGludm9pY2VzQXJyYXkubGVuZ3RoKTtcbiAgICAgICAgLy8gdGhpcy5zZXQoJ2ludm9pY2VzJywgaW52b2ljZXNBcnJheSk7XG4gICAgICAgIC8vIGVtcHR5IHRoaXMgYW5kIHJlcG9wdWxhdGUgaXQuXG4gICAgICAgIHRoaXMuc2V0KCd1bmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXAnLCB7fSk7XG4gICAgICAgIGZvciAobGV0IHNoaWZ0X2lkIGluIHRoaXMuYWRkZWRTaGlmdHNNYXApIHtcbiAgICAgICAgICAgIGZvciAobGV0IGZhbWlseV9pZCBpbiB0aGlzLmZhbWlsaWVzTWFwKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnVuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcFtmYW1pbHlfaWRdKSB0aGlzLnVuaW52b2ljZWRTaGlmdHNCeUZhbWlseU1hcFtmYW1pbHlfaWRdID0ge307XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXBbZmFtaWx5X2lkXSB8fCAhdGhpcy5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ZhbWlseV9pZF1bc2hpZnRfaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBteVNoaWZ0ID0gdGhpcy5hZGRlZFNoaWZ0c01hcFtzaGlmdF9pZF07XG4gICAgICAgICAgICAgICAgICAgIGxldCBjb250cmlidXRpb246YW55ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlmIChteVNoaWZ0LmNvbnRyaWJ1dGlvbnMpIGNvbnRyaWJ1dGlvbiA9IG15U2hpZnQuY29udHJpYnV0aW9uc1tmYW1pbHlfaWRdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJpYnV0aW9uICYmIGNvbnRyaWJ1dGlvbiAhPSAnMCcpIHRoaXMudW5pbnZvaWNlZFNoaWZ0c0J5RmFtaWx5TWFwW2ZhbWlseV9pZF1bc2hpZnRfaWRdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ0lOVk9JQ0VEIFNISUZUUyBCWSBGQU1JTFknKVxuICAgICAgICAvLyBjb25zb2xlLmRpcihKU09OLnN0cmluZ2lmeSh0aGlzLmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXApKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJVTklOVk9JQ0VEIFNISUZUUyBCWSBGQU1JTFlcIilcbiAgICAgICAgLy8gY29uc29sZS5kaXIoSlNPTi5zdHJpbmdpZnkodGhpcy51bmludm9pY2VkU2hpZnRzQnlGYW1pbHlNYXApKTtcbiAgICB9XG4gICAgXG59Il19