import { Page } from 'ui/page';
import {EventData, Observable, PropertyChangeData, fromObject as observableFromObject} from 'data/observable';
import {ObservableArray} from 'data/observable-array';
import { GestureTypes, PanGestureEventData } from "ui/gestures";
import * as firebase from 'nativescript-plugin-firebase';
import * as dialogs from 'ui/dialogs';
import * as appSettings from 'application-settings';
import * as moment from 'moment';
import * as frame from 'ui/frame';
import * as fs from 'file-system';
import { AnimationDefinition } from "ui/animation";
import { AnimationCurve } from "ui/enums";
import * as builder from 'ui/builder';
import { screen } from "platform";
import { StackLayout } from 'ui/layouts/stack-layout';
import { GridLayout } from 'ui/layouts/grid-layout';
import { ListView } from 'ui/list-view';
import { ScrollView, ScrollEventData } from 'ui/scroll-view';
import { TextField } from 'ui/text-field';
import { Label } from 'ui/label';
import { UserService, User } from '../shared/user.service';
import { ShiftService } from '../shared/shift.service';
import { RadSideDrawer } from "nativescript-telerik-ui/sidedrawer";
import { SettingsModel } from '../modals/settings/settings-model';
import { SelectedIndexChangedEventData, TabView } from "ui/tab-view";
import { Slider } from "ui/slider";
import * as picker from "../components/picker/picker";
let userService: UserService;
let shiftService: ShiftService;
let settingsContainer: StackLayout;
let settingsOverlayContainer;
let dismissNote;
let blurView: UIView;
let MyModel: HomeModel;
let settingsModel: SettingsModel;
let editingShift;
declare var UIVisualEffectView:any, UIBlurEffect:any, UIViewAutoresizingFlexibleHeight:any, UIViewAutoresizingFlexibleWidth:any, UIBlurEffectStyleLight:any;
export class HomeModel extends Observable {
    constructor() {
        super();
        MyModel = this;
        //allShiftsModel = new AllShiftsModel();
        userService = new UserService();
        shiftService = new ShiftService();
        let user = JSON.parse(appSettings.getString('userData'));
        for (let i in user.families) {
            user.families[i].id = i;
            if (!user.families[i].deleted) this.familiesMap[i] = user.families[i];

            let family = observableFromObject(user.families[i]);
            if (!user.families[i].deleted) {
                this.families.push(family);
                
            }
        }
        if (this.families.length == 1) this.families.getItem(0).set('justOneFamily', true);
        this.families.getItem(0).set('isFirst', true); 
        this.set('isLoading', true);
        shiftService.buildAppData(true).then(result => {
            this.getThisWeekShifts();
            this.set('isLoading', false);
            let invoices = [];
            if (appSettings.getString('invoices')) invoices = JSON.parse(appSettings.getString('invoices'));
            this.processInvoices(invoices);
        })
    }

    public page: Page;
    public header_text: string = 'Week of ' + moment().startOf('week').format('dddd [the] Do');
    public user: User = JSON.parse(appSettings.getString('userData'));
    public hours_worked: number = 0;
    public thisWeekMinutesWorked: number = 0;
    public total_earned: number = 0.00;
    public regular_earned: number = 0;
    public overtime_earned: number= 0;
    public settingsTitle: string = 'Settings';
    public families: ObservableArray<Observable> = new ObservableArray([]);
    public familiesMap: any = {};
    public editingFamily: Observable = observableFromObject({})
    public clockedIn: any = false;
    public thisWeek: ObservableArray<Observable> = new ObservableArray([]);
    public shifts: ObservableArray<Observable> = new ObservableArray([]);
    public addedShiftsMap = {};
    public isLoading: boolean = false;
    public selectedIndex: number = 0;
    public myArray = ['hi', 'world', 'would you like', 'peas'];
    public sectionedShifts: ObservableArray<Observable> = new ObservableArray([]);

    public selectedFamilyToInvoice: any = false;
    public uninvoicedShiftsByFamilyMap: any = {};
    public invoicedShiftsByFamilyMap: any = {};
    public uninvoicedShifts: Array<any> = [];
    public invoiceTotal: number;
    public invoices: ObservableArray<Observable> = new ObservableArray([]);
    public invoiceMap = {};
    public totalUnpaidString: string;
    public totalUnpaid: number;

    public allShifts: ObservableArray<Observable> = new ObservableArray([]);
    public allShiftsMap: any = {};
    public weeks = {};

    

    public rebuildAllData() {
        return new Promise((resolve, reject) => {
            shiftService.buildAppData(true).then(result => {
                this.getThisWeekShifts();
                this.set('isLoading', false);
                console.log('fresh invoices length ' + JSON.parse(appSettings.getString('invoices')).length);
                
            }).then(() => {
                let invoices = [];
                if (appSettings.getString('invoices')) invoices = JSON.parse(appSettings.getString('invoices'));
                this.processInvoices(invoices);
                resolve()
            });
        })
        
    }

    public pageLoaded(myPage: Page) {
        this.page = myPage;
        this.page.bindingContext = this;
        this.page.getViewById('tabview').on('selectedIndexChanged', (args:SelectedIndexChangedEventData) => {
            this.set('selectedIndex', args.newIndex);
            if (args.newIndex == 0) {
                setTimeout(() => {
                    this.getThisWeekShifts()
                }, 10)
            } else {
                setTimeout(() => {
                    let shifts = {};
                    if (appSettings.getString('shifts')) shifts = JSON.parse(appSettings.getString('shifts'));
                    this.processShifts(shifts);
                }, 10)
            }
        })
        let tabView: TabView = this.page.getViewById('tabview')
        this.selectedIndex = tabView.selectedIndex;
    }

    public showMenu() {
        let sideDrawer: RadSideDrawer = <RadSideDrawer>( frame.topmost().getViewById("drawer"));
        sideDrawer.showDrawer();
    }  

    public logUser() {
        console.dir(JSON.parse(appSettings.getString('userData')));
        console.log(JSON.parse(appSettings.getString('uid')))
    }

    public editRates() {
        this.showSettings('/views/components/editrates/editrates.xml');
        this.set('settingsTitle', 'Edit Rates');
    }

    public saveRates() {
        console.dir(this.get('user'));
        let data = {
            hourlyRate: this.page.getViewById('hourly_rate').text,
            overtimeRate: this.page.getViewById('overtime_rate').text,
            first_name: this.page.getViewById('first_name').text,
            last_name: this.page.getViewById('last_name').text,
            email: this.page.getViewById('email').text
        }
        if (!data.hourlyRate || !data.overtimeRate || !data.first_name || !data.last_name || !data.email) {
            alert('Please fill out all the fields.');
            return;
        }
        userService.updateUser(data).then(result => {
            console.log(result);
            for (var x in data) {
                this.get('user')[x] = data[x];
            }
            this.hideSettings();
        })
    }

    public refreshData(args) {
        var pullRefresh = args.object;
        shiftService.buildAppData(true).then(result => {
            this.getThisWeekShifts();
            this.set('isLoading', false);
            let invoices = [];
            if (appSettings.getString('invoices')) invoices = JSON.parse(appSettings.getString('invoices'));
            this.processInvoices(invoices);
            pullRefresh.refreshing = false;
        })
    }

    public editFamily(args) {
        console.log('families?')
        // 'this' is now the family you tapped from the repeater
        let families = MyModel.families;

        let family = families.filter(item => item.get('id') === args.object.id)[0];
        MyModel.set('editingFamily', family);
        MyModel.showSettings('/views/components/editfamily/editfamily.xml');
        MyModel.set('settingsTitle', 'Edit Family');
        MyModel.page.getViewById('editing_family_view').bindingContext = MyModel.editingFamily;
    }

    public addFamily() {
        this.set('editingFamily', observableFromObject({}));
        this.showSettings('/views/components/editfamily/editfamily.xml');
        this.set('settingsTitle', 'Add Family');
        MyModel.page.getViewById('editing_family_view').bindingContext = MyModel.editingFamily;
    }

    public saveFamily() {
        let data:any = {
            name: this.get('editingFamily').get('name'),
            email: this.get('editingFamily').get('email')
        }
        
        if (this.editingFamily.get('id')) {
            console.log('editing a family');
            userService.saveFamily(this.editingFamily.get('id'), data).then((result) => {
                let families = this.families
                families.forEach(element => {
                    if (element.get('id') == this.editingFamily.get('id')) {
                        element.set('name', data.name);
                        element.set('email', data.email);
                    }
                });
                this.hideSettings();
            })
        } else {
            console.log('adding a family');
            let families = this.families;
            userService.addFamily(data).then((result:any) => {
                let families = this.families;
                data.id = result.key;
                families.push(observableFromObject(data));
                this.set('familiesCount', families.length);
                if (families.length > 1) this.families.getItem(0).set('justOneFamily', false);
                
                this.hideSettings();
            })
        }
    }

    public removeFamily(args) {
        let famId = args.object.id;
        dialogs.confirm('Are you sure you want to remove this family?').then((result) => {
            if (result) {
                userService.updateFamily(famId, {deleted: true}).then((result) => {
                    let families = MyModel.families;
                    let deleteIndex;
                    families.forEach((element, index) => {
                        if (element.get('id') == famId) deleteIndex = index;
                    });
                    families.splice(deleteIndex, 1)
                    if (families.length == 1) MyModel.families.getItem(0).set('justOneFamily', true);
                    MyModel.set('families', families);
                    MyModel.hideSettings();
                })
            }
        })
    }

    public getThisWeekShifts(refreshData?) {
        if (refreshData) {
            this.set('isLoading', true);
            shiftService.getShifts(15, true).then(shifts => {
                this.set('isLoading', false);
                this.processShifts(shifts);
            })
        } else {
            let shifts = {};
            if (appSettings.getString('shifts')) shifts = JSON.parse(appSettings.getString('shifts'));
            this.processShifts(shifts);

            
        }
        
    }

    /****************** INVOICE FUNCTIONS ******************/

    public invoiceOptions(args) {
        let invoice = this.invoices.getItem(args.index);
        if (invoice) {
            let actions = [];
            if (!invoice.get('paid')) {
                actions.push('Mark As Paid');
            } else {
                actions.push('Unmark As Paid');
            }
            if (!invoice.get('sent')) {
                actions.push('Send to ' + this.familiesMap[invoice.get('family_id')].name);
                actions.push('Edit');
            } else {
                if (!invoice.get('paid')) actions.push('Re-send to ' + this.familiesMap[invoice.get('family_id')].name);
            }
            actions.push('View');
            actions.push('Delete');

            dialogs.action(this.familiesMap[invoice.get('family_id')].name + ' for $' + invoice.get('total'), "Cancel", actions).then(result => {
                if (result == 'Edit') {
                    //this.showEditShift(false, shift);
                } else if (result == 'Delete') {
                    let msg = 'Are you sure you want to delete this invoice?';
                    if (invoice.get('paid')) {
                        msg += ' You\'ve marked this invoice as paid, so remember to adjust your records accordingly.'; 
                    } else if (invoice.get('sent')) {
                        msg += ' You\'ve already sent this invoice to ' + this.familiesMap[invoice.get('family_id')].name + ', so please reach out to them directly informing them that they can discard this invoice.';
                    }

                    dialogs.action(msg, "Cancel", ["Do it."]).then(result => {
                        
                        if (result == 'Do it.') {
                            invoice.set('loading', true);
                            shiftService.deleteInvoice(invoice.get('id')).then(result => {
                                let invoices = [];
                                if (appSettings.getString('invoices')) invoices = JSON.parse(appSettings.getString('invoices'));
                                this.processInvoices(invoices);
                                invoice.set('loading', false);
                            })
                        }
                    })
                } else if (result == 'Mark As Paid') {
                    invoice.set('loading', true);
                    shiftService.updateInvoice(invoice.get('id'), {paid: true}).then(result => {
                        invoice.set('loading', false);
                        invoice.set('paid', true);
                        let total = parseFloat(invoice.get('total'));
                        let currentUnpaidTotal = parseFloat(this.get('totalUnpaid'));
                        let newUnpaidTotal = (currentUnpaidTotal - total).toFixed(2);
                        this.set('totalUnpaid', newUnpaidTotal);
                        this.set('totalUnpaidString', 'You have $' + newUnpaidTotal + ' in unpaid invoices.');
                        if (!newUnpaidTotal || newUnpaidTotal == '0.00') this.set('totalUnpaidString', 'You\'re all paid up!');
                        let invoiceListView: ListView = this.page.getViewById('invoices_listview');
                        invoiceListView.refresh();
                        //this.invoices.setItem(args.index, invoice);
                    })
                } else if (result == 'Unmark As Paid') {
                    invoice.set('loading', true);
                    shiftService.updateInvoice(invoice.get('id'), {paid: false}).then(result => {
                        invoice.set('loading', false);
                        invoice.set('paid', false)
                        let total = parseFloat(invoice.get('total'));
                        let currentUnpaidTotal = parseFloat(this.get('totalUnpaid'));
                        let newUnpaidTotal = (currentUnpaidTotal + total).toFixed(2);
                        this.set('totalUnpaid', newUnpaidTotal);
                        this.set('totalUnpaidString', 'You have $' + newUnpaidTotal + ' in unpaid invoices.');
                        if (!newUnpaidTotal || newUnpaidTotal == '0.00') this.set('totalUnpaidString', 'You\'re all paid up!');
                        let invoiceListView: ListView = this.page.getViewById('invoices_listview');
                        invoiceListView.refresh();
                    })
                } else if (result == 'View') {
                    this.invoiceMap[invoice.get('id')].family = this.familiesMap[invoice.get('family_id')];
                    let navigationEntry:frame.NavigationEntry = {
                        moduleName: "/views/invoice/invoice",
                        context: this.invoiceMap[invoice.get('id')],
                        animated: true,
                        backstackVisible: true,
                        clearHistory: false
                    };
                    frame.topmost().navigate(navigationEntry);
                    //frame.topmost().navigate('/views/invoice/invoice');

                } else if (result == 'Send to ' + this.familiesMap[invoice.get('family_id')].name) {
                    invoice.set('loading', true);
                    this.sendInvoice(invoice.get('id'), invoice);
                    let sentTimes = [moment().format()];
                    console.dir(sentTimes);
                    shiftService.updateInvoice(invoice.get('id'), {sent: true, sent_times: sentTimes}).then(result => {
                        invoice.set('sent', true);
                        alert('The invoice has been sent!');
                        invoice.set('loading', false);
                    })
                } else if (result == 'Re-send to ' + this.familiesMap[invoice.get('family_id')].name) {
                    let sentTimes = [moment().format()];
                    if (invoice.get('sent_times') && invoice.get('sent_times').length) {
                        sentTimes = invoice.get('sent_times');
                        sentTimes.push(moment().format());
                    }
                    console.dir(sentTimes);
                    invoice.set('loading', true);
                    this.sendInvoice(invoice.get('id'), invoice, true);
                    
                    shiftService.updateInvoice(invoice.get('id'), {sent: true, sent_times: sentTimes}).then(result => {
                        console.log('')
                        invoice.set('sent', true);
                        invoice.set('sent_times', sentTimes);
                        alert('The invoice has been sent!');
                        invoice.set('loading', false);
                    })
                    alert('We sent a friendly reminder to ' + this.familiesMap[invoice.get('family_id')].name)
                } 
            })
        }
    }

    public showCreateInvoice() {
        MyModel.set('selectedFamilyToInvoice', false);
        
        MyModel.set('uninvoicedShifts', []);
        MyModel.showSettings('/views/components/editinvoice/editinvoice.xml');
        MyModel.set('settingsTitle', 'Create Invoice');

        if (this.families.length == 1) {
            while (this.uninvoicedShifts.length) this.uninvoicedShifts.pop();
            let uninvoicedShiftsArray = [];
            let family = this.familiesMap[this.families.getItem(0).get('id')];
            let invoiceTotal = 0;
            for (var i in this.uninvoicedShiftsByFamilyMap[family.id]) {
                
                if (this.addedShiftsMap[i].end_time && this.addedShiftsMap[i].contributions[family.id]) {
                    let familyContribution = this.addedShiftsMap[i].contributions[family.id];
                    this.addedShiftsMap[i].selected_family_contribution = familyContribution;
                    uninvoicedShiftsArray.push(this.addedShiftsMap[i]);
                    invoiceTotal += +this.addedShiftsMap[i].selected_family_contribution;
                }
            }
            if (uninvoicedShiftsArray.length) {
                this.selectedFamilyToInvoice = family;
                this.set('invoiceTotal', invoiceTotal.toFixed(2));
                this.set('uninvoicedShifts', uninvoicedShiftsArray);
            } else {
                this.selectedFamilyToInvoice = false;
                alert('The family you chose does not have any uninvoiced shifts, they\'re all paid up!')
            }
        }
    }

    public chooseFamilyToInvoice() {
        if (this.families.length > 1) {
            this.dismissSoftInputs();
            this.set('picking', 'list');
            this.set('pickerTitle', 'Choose Family');
            let pickerItems = [];
            this.families.forEach(item => {
                pickerItems.push(item.get('name'));
            })
            this.set('pickerItems', pickerItems);
            this.set('pickerDoneText', 'Done');
            picker.animateShow();
            this.set('pickerCancel', function() {
                picker.animateHide().then(() => this.set('picking', false));
            })
            // empty the uninvoicedShifts array if theres anything in it.
            this.set('pickerDone', function() {
                while (this.uninvoicedShifts.length) this.uninvoicedShifts.pop();
                let uninvoicedShiftsArray = [];
                let family = this.familiesMap[this.families.getItem(this.page.getViewById('listpicker').selectedIndex).get('id')];
                let invoiceTotal = 0;
                for (var i in this.uninvoicedShiftsByFamilyMap[family.id]) {
                    
                    if (this.addedShiftsMap[i].end_time && this.addedShiftsMap[i].contributions[family.id]) {
                        let familyContribution = this.addedShiftsMap[i].contributions[family.id];
                        this.addedShiftsMap[i].selected_family_contribution = familyContribution;
                        uninvoicedShiftsArray.push(this.addedShiftsMap[i]);
                        invoiceTotal += +this.addedShiftsMap[i].selected_family_contribution;
                    }
                }
                if (uninvoicedShiftsArray.length) {
                    this.selectedFamilyToInvoice = family;
                    this.set('invoiceTotal', invoiceTotal.toFixed(2));
                    this.set('uninvoicedShifts', uninvoicedShiftsArray);
                } else {
                    this.selectedFamilyToInvoice = false;
                    alert('The family you chose does not have any uninvoiced shifts, they\'re all paid up!')
                }       
                picker.animateHide().then(() => this.set('picking', false));
            })
        }
    }

    public unselectUninvoicedShift(args) {
        if (args.object.id) {
            for (var i = 0; MyModel.uninvoicedShifts.length > i; i++) {
                let item = MyModel.uninvoicedShifts[i];
                if (item.id == args.object.id) {
                    let tappedItem: GridLayout = args.object;
                    let newInvoiceTotal = parseFloat(MyModel.get('invoiceTotal'));
                    console.log('displayed invoice total ' + newInvoiceTotal);
                    if (tappedItem.className == 'uninvoiced_shift selected') {
                        tappedItem.className = 'uninvoiced_shift';
                        item.do_not_invoice = true;
                        newInvoiceTotal -= parseFloat(item.selected_family_contribution);
                    } else {
                        tappedItem.className = 'uninvoiced_shift selected';
                        item.do_not_invoice = false;
                        newInvoiceTotal += parseFloat(item.selected_family_contribution);
                    }
                    MyModel.set('invoiceTotal', newInvoiceTotal.toFixed(2));
                }
            }
        }
    }

    public saveInvoice() {
        let shift_ids = [];
        for (var i = 0; MyModel.uninvoicedShifts.length > i; i++) {
            let item = MyModel.uninvoicedShifts[i];

            if (!item.do_not_invoice) shift_ids.push(item.id);
        }
        let args = {
            shift_ids: shift_ids,
            family_id: this.get('selectedFamilyToInvoice').id,
            total: this.get('invoiceTotal'),
            paid: false,
            date_created: moment().format()
        }
        if (!args.shift_ids || !args.shift_ids.length) {
            alert('Please select one or more shifts to include in this invoice.');
        } else {
            shiftService.createInvoice(args).then(result => {
                this.hideSettings();    
                let invoices = [];
                if (appSettings.getString('invoices')) invoices = JSON.parse(appSettings.getString('invoices'));
                this.processInvoices(invoices);
                
            })
        }
        
    }

    public saveAndSendInvoice() {
        let shift_ids = [];
        for (var i = 0; MyModel.uninvoicedShifts.length > i; i++) {
            let item = MyModel.uninvoicedShifts[i];

            if (!item.do_not_invoice) shift_ids.push(item.id);
        }
        let args = {
            shift_ids: shift_ids,
            family_id: this.get('selectedFamilyToInvoice').id,
            total: this.get('invoiceTotal'),
            paid: false,
            date_created: moment().format(),
            sent: true,
            sent_times: [moment().format()]
        }
        if (!args.shift_ids || !args.shift_ids.length) {
            alert('Please select one or more shifts to include in this invoice.');
        } else {
            shiftService.createInvoice(args).then((result:any) => {
                this.hideSettings();
                this.sendInvoice(result.key)
                let invoices = [];
                if (appSettings.getString('invoices')) invoices = JSON.parse(appSettings.getString('invoices'));
                this.processInvoices(invoices);
            })
        }
        
    }

    public sendInvoice(invoice_id, invoice?, resending?) {
        let html = this.buildInvoiceHtml(invoice_id, invoice);
        let message = this.user.first_name + ' ' + this.user.last_name + ' created the invoice below, send payment as soon as you can.';
        let subject = this.user.first_name + ' ' + this.user.last_name + ' has sent you an invoice.';
        if (resending) {
            message = this.user.first_name + ' ' + this.user.last_name + ' previously sent the invoice below, here\'s a friendly reminder to send payment as soon as you can.'
            subject = this.user.first_name + ' ' + this.user.last_name + ' is sending you a friendly reminder about an unpaid invoice.'
        }
        if (!invoice) {
            userService.sendEmail(this.selectedFamilyToInvoice, {email: this.user.email, name: this.user.first_name + ' ' + this.user.last_name}, message, html, subject);
        } else {
            let familyToInvoice = this.familiesMap[invoice.family_id];
            userService.sendEmail(familyToInvoice, {email: this.user.email, name: this.user.first_name + ' ' + this.user.last_name}, message, html, subject);
        }
        
    }

    private buildInvoiceHtml(invoice_id, invoice?) {
        let html = `
            <center><span style="color: gray; font-size: 11px; color: gray;">Invoice ID: ` + invoice_id + `</span></center>
            <table width="100%" style="font-family: Helvetica; font-size: 13px;" cellpadding="0" cellspacing="0">
                <tr>
                    <th align="left" width="100%" style="padding: 5; border-bottom: 2px solid #E0E0E0;">Shifts</th>
                    <th align="left" style="padding: 5; border-bottom: 2px solid #E0E0E0;">Contribution</th>
                </tr>
        `
        if (!invoice) {
            for (var i = 0; MyModel.uninvoicedShifts.length > i; i++) {
                let item = MyModel.uninvoicedShifts[i];
                if (!item.do_not_invoice) {
                    html += `
                        <tr>
                            <td align="left" style="padding: 5; border-bottom: 1px solid #f5f5f5;">`+ item.display_date +`<br /><span style="font-size: 11px; color: gray;">` + item.display_timing + `</span></td>
                            <td align="left" style="padding: 5; border-bottom: 1px solid #f5f5f5; font-weight: bold;">$` + item.contributions[this.selectedFamilyToInvoice.id] + `</td>
                        </tr>
                    `;
                }
            }
            html += `
                    
                </table>
                <center><h2 style="font-family: Helvetica;">Invoice Total: <span style="color: green;">$` + this.invoiceTotal + `</span></h2></center>
            `
        } else {
            for (var i = 0; invoice.shift_ids.length > i; i++) {
                let shift = MyModel.addedShiftsMap[invoice.shift_ids[i]];
                if (shift) {
                    html += `
                        <tr>
                            <td align="left" style="padding: 5; border-bottom: 1px solid #f5f5f5;">`+ shift.display_date +`<br /><span style="font-size: 11px; color: gray;">` + shift.display_timing + `</span></td>
                            <td align="left" style="padding: 5; border-bottom: 1px solid #f5f5f5; font-weight: bold;">$` + shift.contributions[invoice.family_id] + `</td>
                        </tr>
                    `;
                }
                
            }
            html += `
                    
                </table>
                <center><h2 style="font-family: Helvetica;">Invoice Total: <span style="color: green;">$` + invoice.total + `</span></h2></center>
            `
        }
        
        return html;
    }
    
    /****************** /INVOICE FUNCTIONS ******************/

    /****************** SHIFT FUNCTIONS ******************/

    public shiftOptions(args) {
        let shift;
        if (args.eventName && args.eventName == 'itemTap') {
            shift = MyModel.addedShiftsMap[this.sectionedShifts.getItem(args.index).get('id')]
        } else {
            shift = MyModel.addedShiftsMap[args.object.id];
        }
        if (shift) {
            dialogs.action(shift.title + ' from ' + shift.display_hours, "Cancel", ["Edit Shift", "Delete Shift"]).then(result => {
                if (result == 'Edit Shift') {
                    console.dir(JSON.stringify(shift.invoiced));
                    if (shift.invoiced) {
                        let msg = 'This shift is included in invoices for the following familes: ' + shift.invoiced_families_string + '. If you edit the contributions for a family, you\'ll need to delete the invoice this shift is associated with and create a new one. Also, make sure you reach out to the family and inform them to ignore the previous invoice.';
                        if (this.families.length == 1) msg = 'This shift is included in an invoice already. If you edit the hours worked, you\'ll need to delete the invoice this shift is associated with and create a new one. Also, make sure you reach out to the family and inform them to ignore the previous invoice.'
                        dialogs.confirm({
                            title: "This shift has already been invoiced!",
                            message: msg,
                            okButtonText: "Ok.",
                            cancelButtonText: "Cancel"
                        }).then((result) => {
                            // result argument is boolean
                            console.dir(result);
                            if (result) {
                                this.showEditShift(false, shift);
                            }
                        });
                    } else {
                        this.showEditShift(false, shift);
                    }
                    
                } else if (result == 'Delete Shift') {
                    let msg = 'Are you sure you want to delete this shift? This cannot be undone.';
                    if (shift.invoiced) {
                        msg = 'This shift is included in invoices for the following familes: ' + shift.invoiced_families_string + '. Deleting this shift will remove it from that invoice, but not adjust the invoice\'s total. Are you sure you want to delete this shift? It cannot be undone.';
                        if (this.families.length == 1) msg = 'This shift is included in an invoice. Deleting this shift will remove it from that invoice, but not adjust the invoice\'s total. Are you sure you want to delete this shift? It cannot be undone.';
                    }

                    dialogs.action(msg, "Cancel", ["Do it."]).then(result => {
                        if (result == 'Do it.') {
                            shiftService.deleteShift(shift.id).then(result => {
                                this.processShifts(JSON.parse(appSettings.getString('shifts')));
                                let invoices = [];
                                if (appSettings.getString('invoices')) invoices = JSON.parse(appSettings.getString('invoices'));
                                this.processInvoices(invoices);

                            })
                        }
                    })
                    
                }
            })
        }
        
    }

    public showEditShift(args, shift) {
        // `this` is now referring to the tapped shift object, and not the model anymore, 
        // so we have to use MyModel which is a reference to HomeModel.
        // console.dir(args);
        if (args) {
            if (args.eventName && args.eventName == 'itemTap') {
                shift = MyModel.addedShiftsMap[this.sectionedShifts.getItem(args.index).get('id')]
            } else if (args.object.id) {
                shift = MyModel.addedShiftsMap[args.object.id];
            }
        }
        
        if (!shift) {
            MyModel.showSettings('/views/components/endshift/endshift.xml');
            MyModel.set('settingsTitle', 'Add Shift');
            editingShift = {};
            let startTime = moment().format('YYYY-MM-DD') + ' 09:00:00';
            let endTime = moment().format('YYYY-MM-DD') + ' 17:00:00';
            MyModel.set('editingShiftStartDate', moment().format('MMM Do, YYYY'))
            MyModel.set('editingShiftStartTime', moment(startTime).format('h:mma'))
            MyModel.set('selectedStartDate', moment().format('YYYY-MM-DD'));
            MyModel.set('selectedStartTime', moment(startTime).format('HH:mm'))

            MyModel.set('editingShiftEndDate', moment().format('MMM Do, YYYY'))
            MyModel.set('editingShiftEndTime', moment(endTime).format('h:mma'))
            MyModel.set('selectedEndDate', moment().format('YYYY-MM-DD'));
            MyModel.set('selectedEndTime', moment(endTime).format('HH:mm'))
            editingShift.start_time = moment(startTime).format();
            editingShift.end_time = moment(endTime).format();
            let compareA = moment(endTime);
            var minutesWorked = compareA.diff(moment(startTime), 'minutes')
            var hoursWorked = (minutesWorked/60).toFixed(2);
            let minuteRate = parseFloat(MyModel.user.hourlyRate)/60;
            let overtimeMinuteRate = parseFloat(MyModel.user.overtimeRate)/60;

            let worked = shiftService.calculateShiftHoursWorked(editingShift.start_time, editingShift.end_time);;
            MyModel.updateTotalEarned();
            MyModel.set('endShiftTotalWorked', worked.time_worked);
        } else {
            editingShift = Object.assign({}, shift);
            MyModel.showSettings('/views/components/endshift/endshift.xml');
            MyModel.set('settingsTitle', 'End Shift');
            if (shift.end_time) {
                MyModel.set('settingsTitle', 'Edit Shift');
            }
            MyModel.set('editingShiftStartDate', moment(shift.start_time).format('MMM Do, YYYY'))
            MyModel.set('editingShiftStartTime', moment(shift.start_time).format('h:mma'))
            MyModel.set('selectedStartDate', moment(shift.start_time).format('YYYY-MM-DD'));
            MyModel.set('selectedStartTime', moment(shift.start_time).format('HH:mm'))

            MyModel.set('editingShiftEndDate', moment().format('MMM Do, YYYY'))
            MyModel.set('editingShiftEndTime', moment().format('h:mma'))
            MyModel.set('selectedEndDate', moment().format('YYYY-MM-DD'));
            MyModel.set('selectedEndTime', moment().format('HH:mm'))
            editingShift.end_time = moment().format();
            if (shift.end_time) {
                MyModel.set('editingShiftEndDate', moment(shift.end_time).format('MMM Do, YYYY'))
                MyModel.set('editingShiftEndTime', moment(shift.end_time).format('h:mma'))
                MyModel.set('selectedEndDate', moment(shift.end_time).format('YYYY-MM-DD'));
                MyModel.set('selectedEndTime', moment(shift.end_time).format('HH:mm'))
                editingShift.end_time = moment(shift.end_time).format();
            }

            // console.dir(shift.contributions);
            
            
            var compareA = moment();
            if (shift.end_time) compareA = moment(shift.end_time);
            var minutesWorked = compareA.diff(moment(shift.start_time), 'minutes')
            var hoursWorked = (minutesWorked/60).toFixed(2);
            let minuteRate = parseFloat(MyModel.user.hourlyRate)/60;
            let overtimeMinuteRate = parseFloat(MyModel.user.overtimeRate)/60;


            let worked = shiftService.calculateShiftHoursWorked(editingShift.start_time, editingShift.end_time);;
            MyModel.updateTotalEarned();
            MyModel.set('endShiftTotalWorked', worked.time_worked);
        }        
    }

    public getPreviousShiftsTotalMinutes(shift) {
        // this function gets the total minutes worked up to that shift that week to determine if 
        // any overtime pay should be attributed to this shift.
        var beginningOfWeek = moment(shift.start_time).isoWeekday(0).format('dddd MMMM Do YYYY');
        if (moment(shift.start_time).isoWeekday() == 0 || moment(shift.start_time).isoWeekday() == 7) { //is a sunday.
            beginningOfWeek = moment(shift.start_time).format('dddd MMMM Do YYYY');
        }
        let totalMinutes = 0;
        let reverseShifts = [];
        if (this.weeks[beginningOfWeek]) reverseShifts = this.weeks[beginningOfWeek].shifts.slice(0).reverse();
        for (var i = 0; reverseShifts.length > i; i++) {
            let myShift = reverseShifts[i];
            // console.dir(myShift);
            if (myShift.id != shift.id) {
                totalMinutes += myShift.minutes_worked;
            } else {
                break;
            }
        }
        // console.log('total minutes: ' + totalMinutes);
        return totalMinutes;
    }

    public dismissSoftInputs() {
        for (var i = 0; this.families.length > i; i++) {
            let textField:TextField = <TextField>this.page.getViewById('contribution_' + this.families.getItem(i).get('id'));
            if (textField && textField.dismissSoftInput) textField.dismissSoftInput()
        }
    }

    private updateTotalEarned() {
        let workedObj = shiftService.calculateShiftHoursWorked(editingShift.start_time, editingShift.end_time);
        this.set('endShiftTotalWorked', workedObj.time_worked);
        let earned = shiftService.calculateShiftEarned(workedObj.minutes_worked, this.getPreviousShiftsTotalMinutes(editingShift));
        MyModel.set('endShiftTotalEarned', '$' + earned.total_earned);
        if (earned.overtime_earned != 0.00) {
            MyModel.set('endShiftOvertimeEarned', earned.overtime_earned);
        } else {
            MyModel.set('endShiftOvertimeEarned', false);
        }
        let families = MyModel.get('families');
        let newTotal:any = (earned.total_earned/families.length).toFixed(2);
        // console.log('each contribution: ' + newTotal);
        MyModel.set('endShiftFinalTotal', '$' + (newTotal*families.length).toFixed(2));

        if (families.length > 1) {
            for (var i = 0; families.length > i; i++) {
                if (editingShift.id && editingShift.contributions) {
                    // we are editing a shift, so dont update the contributions automatically. make the user do it.
                    if (editingShift.contributions[families.getItem(i).id]) {
                        families.getItem(i).set('contribution', editingShift.contributions[families.getItem(i).id]);
                    } else {
                        families.getItem(i).set('contribution', '0.00');
                    }
                } else {
                    families.getItem(i).set('contribution', newTotal);
                }
                
                families.getItem(i).on(Observable.propertyChangeEvent, (args: PropertyChangeData) => {
                    if (args.propertyName == 'contribution') {
                        let finalTotal:number = 0;
                        let invalidNumbers = false;
                        for (var x = 0; MyModel.families.length > x; x++) {
                            if (!MyModel.families.getItem(x).get('contribution')) MyModel.families.getItem(x).set('contribution', 0)
                            if (isNaN(MyModel.families.getItem(x).get('contribution'))) {
                                invalidNumbers = true;
                            } else {
                                finalTotal += parseFloat(MyModel.families.getItem(x).get('contribution'));
                            }
                        }
                        if (invalidNumbers) {
                            MyModel.set('endShiftFinalTotal', 'Enter valid numbers.');
                        } else {
                            MyModel.set('endShiftFinalTotal', '$' + finalTotal.toFixed(2));
                        }
                        
                    }
                })
                
            }
        } else {
            // theres only one family, so always update the contributions.
            families.getItem(0).set('contribution', newTotal);
        }
        
    }

    public changeShiftEndTime() {
        this.dismissSoftInputs();
        this.set('pickerHour', moment(editingShift.end_time).format('H'));
        this.set('pickerMinute', moment(editingShift.end_time).format('m'));
        this.set('pickerTitle', 'Change End Time');
        this.set('pickerDoneText', 'Done');
        this.set('picking', 'time');
        this.set('pickerCancel', function() {
            picker.animateHide().then(() => this.set('picking', false));
        })
        picker.animateShow();
        this.set('pickerDone', function() {
            picker.animateHide().then(() => this.set('picking', false));
            let hour = this.pickerHour;
            if (hour < 10) hour = '0' + this.pickerHour;
            let minute = this.pickerMinute;
            if (minute < 10) minute = '0' + minute;
            this.set('selectedEndTime', hour + ':' + minute);
            MyModel.set('editingShiftEndTime', moment(this.get('selectedEndDate') + ' ' + this.get('selectedEndTime') + ':00').format('h:mma'))
            editingShift.end_time = moment(this.get('selectedEndDate') + ' ' + this.get('selectedEndTime') + ':00').format();
            this.updateTotalEarned()
        })
    }

    public changeShiftEndDate() {
        this.dismissSoftInputs();
        this.set('picking', 'date');
        
        this.set('endDateDay', moment(editingShift.end_time).format('DD'));
        this.set('endDateMonth', moment(editingShift.end_time).format('MM'));
        this.set('endDateYear', moment(editingShift.end_time).format('YYYY'));
        this.set('pickerTitle', 'Change End Date');
        this.set('pickerDoneText', 'Done');
        picker.animateShow();
        this.set('pickerCancel', function() {
            picker.animateHide().then(() => this.set('picking', false));
        })
        this.set('pickerDone', function() {
            picker.animateHide().then(() => this.set('picking', false));
            let day = this.endDateDay; 
            if (parseInt(this.endDateDay) < 10) day = '0' + parseInt(this.endDateDay);
            let month = this.endDateMonth; 
            if (parseInt(this.endDateMonth) < 10) month = '0' + parseInt(this.endDateMonth);
            this.set('selectedEndDate', this.endDateYear + '-' + month + '-' + day);
            MyModel.set('editingShiftEndDate', moment(this.get('selectedEndDate')).format('MMM Do, YYYY'))
            editingShift.end_time = moment(this.get('selectedEndDate') + ' ' + this.get('selectedEndTime') + ':00').format();
            this.updateTotalEarned()
        })
    }

    public changeShiftStartTime() {
        this.dismissSoftInputs();
        this.set('pickerHour', moment(editingShift.start_time).format('H'));
        this.set('pickerMinute', moment(editingShift.start_time).format('m'));
        this.set('pickerTitle', 'Change Start Time');
        this.set('picking', 'time');
        this.set('pickerDoneText', 'Done');
        picker.animateShow();
        this.set('pickerCancel', function() {
            picker.animateHide().then(() => this.set('picking', false));
        })
        this.set('pickerDone', function() {
            picker.animateHide().then(() => this.set('picking', false));
            let hour = this.pickerHour;
            if (hour < 10) hour = '0' + this.pickerHour;
            let minute = this.pickerMinute;
            if (minute < 10) minute = '0' + minute;
            this.set('selectedStartTime', hour + ':' + minute);
            MyModel.set('editingShiftStartTime', moment(this.get('selectedStartDate') + ' ' + this.get('selectedStartTime') + ':00').format('h:mma'))
            editingShift.start_time = moment(this.get('selectedStartDate') + ' ' + this.get('selectedStartTime') + ':00').format();
            this.updateTotalEarned()
        })
    }

    public changeShiftStartDate() {
        this.dismissSoftInputs();
        this.set('picking', 'date');
        this.set('endDateDay', moment(editingShift.start_time).format('DD'));
        this.set('endDateMonth', moment(editingShift.start_time).format('MM'));
        this.set('endDateYear', moment(editingShift.start_time).format('YYYY'));
        this.set('pickerTitle', 'Change Start Date');
        this.set('pickerDoneText', 'Done');
        picker.animateShow();
        this.set('pickerCancel', function() {
            picker.animateHide().then(() => this.set('picking', false));
        })
        this.set('pickerDone', function() {
            picker.animateHide().then(() => this.set('picking', false));
            let day = this.endDateDay; 
            if (parseInt(this.endDateDay) < 10) day = '0' + parseInt(this.endDateDay);
            let month = this.endDateMonth; 
            if (parseInt(this.endDateMonth) < 10) month = '0' + parseInt(this.endDateMonth);
            this.set('selectedStartDate', this.endDateYear + '-' + month + '-' + day);
            MyModel.set('editingShiftStartDate', moment(this.get('selectedStartDate')).format('MMM Do, YYYY'))
            editingShift.start_time = moment(this.get('selectedStartDate') + ' ' + this.get('selectedStartTime') + ':00').format();
            this.updateTotalEarned()
        })
    }

    public saveShift() {
        this.dismissSoftInputs();
        let end_time = this.get('selectedEndDate') + ' ' + this.get('selectedEndTime') + ':00';
        let start_time = this.get('selectedStartDate') + ' ' + this.get('selectedStartTime') + ':00';
        let args:any = {};
        args.end_time = moment(end_time).format();
        args.start_time = moment(start_time).format();
        args.contributions = {};
        let contributions:any = {};
        let families = this.get('families');
        for (var i = 0; families.length > i; i++) {
            contributions[families.getItem(i).get('id')] = families.getItem(i).get('contribution');
        }
        args.contributions = contributions;
        if (editingShift.id) {
            shiftService.updateShift(editingShift.id, args).then(result => {
                this.processShifts(JSON.parse(appSettings.getString('shifts')));
                let invoices = [];
                if (appSettings.getString('invoices')) invoices = JSON.parse(appSettings.getString('invoices'));
                this.processInvoices(invoices);
                if (editingShift.id == MyModel.get('clockedIn').id && args.end_time) MyModel.set('clockedIn', false);
                this.hideSettings();
            })
        } else {
            shiftService.addShift(args).then(result => {
                this.processShifts(JSON.parse(appSettings.getString('shifts')));
                let invoices = [];
                if (appSettings.getString('invoices')) invoices = JSON.parse(appSettings.getString('invoices'));
                this.processInvoices(invoices);
                this.hideSettings();
            })
        }
        
    }

    public showStartShift() {
        this.set('pickerHour', moment().format('H'));
        this.set('pickerMinute', moment().format('m'));
        this.set('pickerTitle', 'Set Start Time');
        this.set('pickerDoneText', 'Start');
        this.set('picking', 'time');
        picker.animateShow();
        this.set('pickerCancel', function() {
            picker.animateHide().then(() => this.set('picking', false));
        })
        this.set('pickerDone', function() {
            picker.animateHide().then(() => this.set('picking', false));
            let hour = this.pickerHour;
            if (hour < 10) hour = '0' + this.pickerHour;
            let minute = this.pickerMinute;
            if (minute < 10) minute = '0' + minute;
            let args:any = {
                start_time: moment(moment().format('YYYY-MM-DD') + ' ' + hour + ':' + minute + ':00').format(),
                end_time: null,
            }
            shiftService.startShift(args).then((startedShift: any) => {
                //this.shifts.unshift(observableFromObject(startedShift));
                this.processShifts(JSON.parse(appSettings.getString('shifts')));
                this.set('clockedIn', args);
            })
        })
    }
    
    /****************** /SHIFT FUNCTIONS ******************/

    public onSelectedIndexChanged(args: SelectedIndexChangedEventData) {
        if (args.newIndex == 0) {
            this.getThisWeekShifts();
        } else if (args.newIndex = 1) {
            alert('maybe process shifts again?')
        }
    }

    public kill() {
        appSettings.remove('userData');
        appSettings.remove('uid');
        appSettings.remove('invoices');
        appSettings.remove('shifts');
        let navigationEntry = {
            moduleName: "/views/login/login",
            animated: false,
        };
        frame.topmost().navigate(navigationEntry);
    }

    public settingsScroll(args: ScrollEventData) {

    }

    private showSettings(viewPath) {
        let maingrid: GridLayout = this.page.getViewById('maingrid');
        maingrid.animate(<AnimationDefinition>{
            scale: {x: .92  , y: .92},
            duration: 300,
            curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        })
        settingsContainer = <StackLayout>this.page.getViewById('settings_container');
        settingsOverlayContainer = this.page.getViewById('settings_overlay_container')
        dismissNote = this.page.getViewById('dismiss_note');
        this.set('settingsShown', true);
        let deviceHeight = screen.mainScreen.heightDIPs;
        settingsContainer.translateY = deviceHeight + 30;
        settingsContainer.animate(<AnimationDefinition>{
            translate: {x: 0, y: 0},
            duration: 300,
            curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        })
        settingsOverlayContainer.opacity = 0;
        settingsOverlayContainer.animate({
            opacity: 1,
            duration: 100
        })
        var container: StackLayout = <StackLayout>this.page.getViewById('settings_view');
        container.removeChildren();
        let path = fs.knownFolders.currentApp().path;
        let component = builder.load(path + viewPath);
        container.addChild(component);
        let containerBounds = settingsContainer.ios.bounds;
        let iosSettingsContainer: UIView = settingsContainer.ios;
        if (blurView && blurView.removeFromSuperview) blurView.removeFromSuperview();
        blurView = UIVisualEffectView.alloc().initWithEffect(UIBlurEffect.effectWithStyle(UIBlurEffectStyleLight));
        blurView.frame = {
            origin: { x: containerBounds.origin.x, y: containerBounds.origin.y - 20 },
            size: { width: containerBounds.size.width, height: containerBounds.size.height + 20 }
        };
        blurView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        iosSettingsContainer.addSubview(blurView)
        iosSettingsContainer.sendSubviewToBack(blurView);
        let buzz = UISelectionFeedbackGenerator.new();
        let panner = this.page.getViewById('settings_container');
        let scroller:ScrollView = <ScrollView>this.page.getViewById('settings_scroller');
        if (scroller) {
            let readyToDrop = false;
            panner.off('pan');
            panner.on('pan', (args:PanGestureEventData) => {
                if (args.state == 3 && readyToDrop) {
                    this.hideSettings();
                }
            });
            scroller.on('scroll', (scrollArgs:ScrollEventData) => {
                if (scrollArgs.scrollY < 0) {
                    settingsContainer.translateY = scrollArgs.scrollY*-1.8;
                    if (scrollArgs.scrollY*-1.8 > 150) {
                        readyToDrop = true;
                        if (dismissNote.opacity == 0) {
                            buzz.selectionChanged();
                            dismissNote.animate({
                                opacity: 1,
                                duration: 250
                            })
                        }
                    } else {
                        readyToDrop = false;
                        if (dismissNote.opacity == 1) {
                            dismissNote.animate({
                                opacity: 0,
                                duration: 250
                            })
                        }
                    }

                }
            })
        } else {
            panner.off('pan');
            panner.on('pan', (args:PanGestureEventData) => {
                settingsContainer.translateY = args.deltaY;
                if (args.deltaY > 150) {
                    
                    if (dismissNote.opacity == 0) {
                        buzz.selectionChanged();
                        dismissNote.animate({
                            opacity: 1,
                            duration: 250
                        })
                    }
                } else {
                    if (dismissNote.opacity == 1) {
                        dismissNote.animate({
                            opacity: 0,
                            duration: 250
                        })
                    }
                }
                if (args.state == 3) {
                    if (args.deltaY > 150) {
                        this.hideSettings();
                    } else {
                        settingsContainer.animate(<AnimationDefinition>{
                            translate: {x: 0, y: 0},
                            duration: 200,
                            curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
                        })
                    }
                }
            })
        }
    }

    public hideSettings() {
        this.dismissSoftInputs();
        editingShift = false;
        let maingrid: GridLayout = this.page.getViewById('maingrid');
        maingrid.animate(<AnimationDefinition>{
            scale: {x: 1, y: 1},
            duration: 300,
            curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        })
        let deviceHeight = screen.mainScreen.heightDIPs;
        settingsContainer.animate(<AnimationDefinition>{
            translate: {x: 0, y: deviceHeight - 30},
            duration: 300,
            curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
        }).then(() => {
            this.set('settingsShown', false);
        })
        settingsOverlayContainer.animate({
            opacity: 0,
            duration: 300
        })
    } 

    public removeSectionedShift(args) {
        console.dir(args);
        //this.sectionedShifts.getItem(args.index);
        this.sectionedShifts.splice(args.index, 1);
    }

    public processShifts(shifts) {
        let shiftsArray = [];
        for (var i in shifts) {
            let myShift = shiftService.buildShiftData(shifts[i]);
            myShift.id = i;
            if (!myShift.end_time) this.set('clockedIn', shifts[i]);
            shiftsArray.push(myShift);
        }

        shiftsArray.sort((a, b) => {
            if (moment(a.start_time) < moment(b.start_time)) {
                return 1;
            } else if (moment(a.start_time) > moment(b.start_time)) {
                return -1;
            }
        })

        let weeks = {};
        this.set('addedShiftsMap', {});

        while (this.thisWeek.length) this.thisWeek.pop();
        // calculate hours worked and money earned.
        let thisWeekMinutesWorked = 0;
        for (var s = 0; shiftsArray.length > s; s++) {
            // add the shift if it hasnt been added already and if it is in the current week. OR if the shift has not been ended.
            if (!this.addedShiftsMap[shiftsArray[s].id]) {
                let shift = observableFromObject(shiftsArray[s]);
                this.shifts.push(shift)
                if (shiftsArray[s].end_time && moment(shiftsArray[s].start_time) > moment().startOf('week')) {
                    this.thisWeek.push(shift)
                }
            }
            
            // update the shift thats still running so the times and the money earned updates
            // or update a shift that was recently updated.
            if (!shiftsArray[s].end_time || shiftsArray[s].recentlyUpdated) {
                let updateIndex;
                this.shifts.forEach((element, index) => {
                    if (element.get('id') == shiftsArray[s].id) {
                        updateIndex = index;
                    }
                });
                this.shifts.setItem(updateIndex, observableFromObject(shiftsArray[s]));

                // update the entity in the thisWeek observable.
                let thisWeekUpdateIndex;
                this.thisWeek.forEach((element, index) => {
                    if (element.get('id') == shiftsArray[s].id) {
                        thisWeekUpdateIndex = index;
                    }
                });
                this.thisWeek.setItem(thisWeekUpdateIndex, observableFromObject(shiftsArray[s]));
                shiftsArray[s].recentlyUpdated = false;

            }
            this.addedShiftsMap[shiftsArray[s].id] = shiftsArray[s];
            if (!shiftsArray[s].end_time) {
                var compareA = moment();
                var minutesWorked = compareA.diff(moment(shiftsArray[s].start_time), 'minutes')
                if (this.thisWeek.length && this.thisWeek.getItem(0).get('id') == shiftsArray[s].id) this.thisWeek.shift();
                this.thisWeek.unshift(observableFromObject(shiftsArray[s]))                
            }

            //set up week data.
            // var beginningOfWeekMoment = moment(shiftsArray[s].start_time).isoWeekday(0);
            // var beginningOfWeek = moment(shiftsArray[s].start_time).isoWeekday(0).format('dddd MMMM Do YYYY');

            var beginningOfWeekMoment = moment(shiftsArray[s].start_time).isoWeekday(0);
            var beginningOfWeek = moment(shiftsArray[s].start_time).isoWeekday(0).format('dddd MMMM Do YYYY');
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
            var compareA = moment();
            if (shiftsArray[s].end_time) compareA = moment(shiftsArray[s].end_time);
            var minutesWorked = compareA.diff(moment(shiftsArray[s].start_time), 'minutes')
            weeks[beginningOfWeek].total_minutes += minutesWorked;
            var shift = shiftService.buildShiftData(shiftsArray[s]);
            weeks[beginningOfWeek].shifts.push(shift);
        }

        while (this.sectionedShifts.length) this.sectionedShifts.pop();

        for (var w in weeks) {
            for (var iw = 0; weeks[w].shifts.length > iw; iw++) {
                var myShift = weeks[w].shifts[iw]
                if (iw == 0) {
                    myShift.minutes_accrued = myShift.minutes_worked;
                } else {
                    myShift.minutes_accrued = myShift.minutes_worked + weeks[w].shifts[iw-1].minutes_accrued;
                }
                if (myShift.minutes_accrued > 2400) {
                    // this shift has overtime minutes.
                    myShift.overtime_minutes = myShift.minutes_accrued - 2400;

                    // this line will ensure that you arent exponentially accruing overtime minutes.
                    if (myShift.overtime_minutes > myShift.minutes_worked) {
                        myShift.overtime_minutes = myShift.minutes_worked;
                    }
                    var regular_minutes_worked = myShift.minutes_worked-myShift.overtime_minutes;
                    myShift.regular_earned = (regular_minutes_worked * (this.get('user').hourlyRate/60)).toFixed(2);
                    myShift.overtime_earned = (myShift.overtime_minutes * (this.get('user').overtimeRate/60)).toFixed(2);
                } else {
                    myShift.regular_earned = (myShift.minutes_worked*(this.get('user').hourlyRate/60)).toFixed(2);
                }

                weeks[w].regular_earned += myShift.regular_earned-0;
                if (myShift.overtime_earned) weeks[w].overtime_earned += myShift.overtime_earned-0;
                myShift.total_earned = ((myShift.regular_earned-0) + (myShift.overtime_earned-0 || 0)).toFixed(2)

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
            weeks[w].regular_earned = weeks[w].regular_earned.toFixed(2)
            if (weeks[w].overtime_earned) weeks[w].overtime_earned = weeks[w].overtime_earned.toFixed(2)
            weeks[w].hours_worked = (weeks[w].total_minutes/60).toFixed(2);
            if (weeks[w].total_minutes > 2400) {
                weeks[w].regular_minutes = 2400;
                weeks[w].overtime_minutes = weeks[w].total_minutes-2400;
            } else {
                weeks[w].regular_minutes = weeks[w].total_minutes;
            }

            
            // setup sectioned array.
            var headerObj = {
                "id": weeks[w].title,
                "start_time": moment(weeks[w].shifts[weeks[w].shifts.length-1].start_time).add('10', 'minutes').format('YYYY-MM-DD HH:mm:ss'),
                "header": true,
                "title": weeks[w].title,
                "hours_worked": weeks[w].hours_worked,
                "regular_earned": weeks[w].regular_earned,
                "overtime_earned": weeks[w].overtime_earned,
                "time_worked": shiftService.calculateShiftHoursWorked(false, false, weeks[w].total_minutes).time_worked,
                "total_earned": weeks[w].total_earned
            }
            //console.dir(headerObj);
            this.sectionedShifts.push(observableFromObject(headerObj));

            var hasOpenShift = false;
            for (var ix = 0; weeks[w].shifts.length > ix; ix++) {
                //console.dir(weeks[w].shifts[ix]);
                this.sectionedShifts.push(observableFromObject(weeks[w].shifts[ix]));
            }
        }
        //console.log(this.sectionedShifts.length);
        
        // this.sectionedShifts.pop();
        // while (this.sectionedShifts.length) this.sectionedShifts.pop();
        
        this.weeks = weeks;

        this.thisWeek.forEach(element => {
            var compareA = moment();
            if (element.get('end_time')) compareA = moment(element.get('end_time'));
            var minutesWorked = compareA.diff(moment(element.get('start_time')), 'minutes')
            thisWeekMinutesWorked += minutesWorked;
        });

        let minuteRate = parseFloat(this.user.hourlyRate)/60;
        let overtimeMinuteRate = parseFloat(this.user.overtimeRate)/60;
        if (thisWeekMinutesWorked > 2400) {
            let regularEarned = 2400*minuteRate;
            let overtimeEarned = (thisWeekMinutesWorked-2400)*overtimeMinuteRate;
            this.set('regular_earned', regularEarned);
            this.set('overtime_earned', overtimeEarned)
            
            this.set('total_earned', (regularEarned+overtimeEarned).toFixed(2));
        } else {
            this.set('regular_earned', thisWeekMinutesWorked*minuteRate);
            this.set('total_earned', (thisWeekMinutesWorked*minuteRate).toFixed(2));
        }
        this.set('thisWeekMinutesWorked', thisWeekMinutesWorked);
        let timeWorked = '0 HOURS';
        if (thisWeekMinutesWorked) timeWorked = shiftService.calculateShiftHoursWorked(false, false, thisWeekMinutesWorked).time_worked;
        
        this.set('hours_worked', timeWorked);
    }

    public processInvoices(invoices) {
        console.log('in process invoices');
        while (this.invoices.length) this.invoices.pop();
        let user = JSON.parse(appSettings.getString('userData'));
        //let invoicesArray = new ObservableArray();
        this.set('invoicedShiftsByFamilyMap', {});
        let total_unpaid = 0;
        for (var i in invoices) {
            invoices[i].id = i;
            invoices[i].shifts = [];
            invoices[i].family_name = user.families[invoices[i].family_id].name;
            invoices[i].date_created_pretty = moment(invoices[i].date_created).format('MMM Do, YYYY');
            for (var s = 0; invoices[i].shift_ids.length > s; s++) {
                if (this.addedShiftsMap[invoices[i].shift_ids[s]]) {
                    // if this conditional isnt satisfied, it probably means the user deleted the shift after it was invoiced.
                    if (!this.invoicedShiftsByFamilyMap[invoices[i].family_id]) this.invoicedShiftsByFamilyMap[invoices[i].family_id] = {};
                    this.invoicedShiftsByFamilyMap[invoices[i].family_id][invoices[i].shift_ids[s]] = true;
                    let shift = this.addedShiftsMap[invoices[i].shift_ids[s]];
                    shift.contribution = shift.contributions[invoices[i].family_id];
                    shift.invoice_title_display = moment(shift.start_time).format('M/D/YY') + ': ' + shift.display_hours;
                    shift.invoiced = true;
                    invoices[i].shifts.push(shift);
                }
                
            }
            // this is required to make the UI respect the loading indicator.
            invoices[i].loading = false;
            if (!invoices[i].sent) invoices[i].sent = false;
            if (!invoices[i].paid) total_unpaid += invoices[i].total-0;
            

            this.invoiceMap[i] = invoices[i];
            let isAdded = false;
            //invoicesArray.push(invoices[i]);
            
            this.invoices.push(observableFromObject(invoices[i]));
            
            //this.invoices.push(observableFromObject(invoices[i]));
        }
        this.set('totalUnpaidString', 'You have $' + total_unpaid.toFixed(2) + ' in unpaid invoices.');
        this.set('totalUnpaid', total_unpaid.toFixed(2));
        if (!total_unpaid) this.set('totalUnpaidString', 'You\'re all paid up!');
        this.invoices.sort((a:any, b:any) => {
            if (moment(a.date_created) < moment(b.date_created)) {
                return 1;
            } else if (moment(a.date_created) > moment(b.date_created)) {
                return -1;
            }
        })

        // console.log('invoicesArray lenght ' + invoicesArray.length);
        // this.set('invoices', invoicesArray);
        // empty this and repopulate it.
        this.set('uninvoicedShiftsByFamilyMap', {});
        for (let shift_id in this.addedShiftsMap) {
            for (let family_id in this.familiesMap) {
                if (!this.uninvoicedShiftsByFamilyMap[family_id]) this.uninvoicedShiftsByFamilyMap[family_id] = {};
                if (!this.invoicedShiftsByFamilyMap[family_id] || !this.invoicedShiftsByFamilyMap[family_id][shift_id]) {
                    let myShift = this.addedShiftsMap[shift_id];
                    let contribution:any = false;
                    if (myShift.contributions) contribution = myShift.contributions[family_id];
                    if (contribution && contribution != '0') this.uninvoicedShiftsByFamilyMap[family_id][shift_id] = true;
                }
            }
        }
        // console.log('INVOICED SHIFTS BY FAMILY')
        // console.dir(JSON.stringify(this.invoicedShiftsByFamilyMap));
        // console.log("UNINVOICED SHIFTS BY FAMILY")
        // console.dir(JSON.stringify(this.uninvoicedShiftsByFamilyMap));
    }
    
}