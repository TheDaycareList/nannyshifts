import { Page } from 'ui/page';
import {Observable, fromObject as observableFromObject} from 'data/observable';
import {ObservableArray} from 'data/observable-array';
import * as firebase from 'nativescript-plugin-firebase';
import * as dialogs from 'ui/dialogs';
import * as appSettings from 'application-settings';
import * as moment from 'moment';
import * as frame from 'ui/frame';

import { UserService, User } from '../shared/user.service';
import { ShiftService } from '../shared/shift.service';


export class InvoiceModel extends Observable {
    constructor(invoice) {
        super();
        if (invoice.sent_times && invoice.sent_times.length) {
            for (let i = 0; invoice.sent_times.length > i; i++) {
                //invoice.sent_times[i] = moment(invoice.sent_times[i]).format('MMMM Do [at] h:mma');
                this.sentTimes.push(moment(invoice.sent_times[i]).format('MMMM Do [at] h:mma'))
            }
        }
        if (invoice.shifts && invoice.shifts.length) {
            for (let s = 0; invoice.shifts.length > s; s++) {
                invoice.shifts[s].this_family_name = invoice.family_name;
                invoice.shifts[s].this_family_contribution = invoice.shifts[s].contributions[invoice.family_id];
            }
        }
        this.set('invoice', observableFromObject(invoice));
        this.set('paid', invoice.paid);
        this.set('sent', invoice.sent);
    }

    public invoice: Observable; 
    public loading: boolean = false;
    public paid: boolean;
    public sent: boolean;
    public sentTimes: ObservableArray<string> = new ObservableArray([]);
    public user: User = JSON.parse(appSettings.getString('userData'));

    private userService = new UserService();
    private shiftService = new ShiftService();

    public invoiceOptions(args) {
        let actions = [];
        if (!this.get('paid')) {
            actions.push('Mark As Paid');
        } else {
            actions.push('Unmark As Paid');
        }
        if (!this.invoice.get('sent')) {
            actions.push('Send to ' + this.invoice.get('family_name'));
            actions.push('Edit');
        } else {
            if (!this.get('paid')) actions.push('Re-send to ' + this.invoice.get('family_name'));
        }
        actions.push('Delete');

        dialogs.action(this.invoice.get('family_name') + ' for $' + this.invoice.get('total'), "Cancel", actions).then(result => {
            if (result == 'Edit') {
                //this.showEditShift(false, shift);
            } else if (result == 'Delete') {
                let msg = 'Are you sure you want to delete this invoice?';
                if (this.get('paid')) {
                    msg += ' You\'ve marked this invoice as paid, so remember to adjust your records accordingly.'; 
                } else if (this.invoice.get('sent')) {
                    msg += ' You\'ve already sent this invoice to ' + this.invoice.get('family_name') + ', so please reach out to them directly informing them that they can discard this invoice.';
                }

                dialogs.action(msg, "Cancel", ["Do it."]).then(result => {
                    if (result == 'Do it.') {
                        // this.shiftService.deleteShift(shift.id).then(result => {
                        //     this.processShifts(JSON.parse(appSettings.getString('shifts')));
                        // })
                    }
                })
            } else if (result == 'Mark As Paid') {
                this.set('loading', true);
                this.shiftService.updateInvoice(this.invoice.get('id'), {paid: true}).then(result => {
                    this.set('loading', false);
                    this.set('paid', true);
                })
            } else if (result == 'Unmark As Paid') {
                this.set('loading', true);
                this.shiftService.updateInvoice(this.invoice.get('id'), {paid: false}).then(result => {
                    this.set('loading', false);
                    this.set('paid', false)
                })
            } else if (result == 'Send to ' + this.invoice.get('family_name')) {
                this.set('loading', true);
                this.sendInvoice();
                let sentTimes = [moment().format()];
                this.shiftService.updateInvoice(this.invoice.get('id'), {sent: true, sent_times: sentTimes}).then(result => {
                    this.set('sent', true);
                    alert('The invoice has been sent!');
                    this.set('loading', false);
                    this.invoice.set('sent', true);
                    this.sentTimes.push(moment().format('MMMM Do [at] h:mma'))
                })
            } else if (result == 'Re-send to ' + this.invoice.get('family_name')) {
                this.sendInvoice(true);
                let sentTimes = [moment().format()];
                if (this.invoice.get('sent_times') && this.invoice.get('sent_times').length) {
                    sentTimes = this.invoice.get('sent_times');
                    sentTimes.push(moment().format());
                }
                this.set('loading', true);
                this.shiftService.updateInvoice(this.invoice.get('id'), {sent: true, sent_times: sentTimes}).then(result => {
                    this.invoice.set('sent', true);
                    this.set('sent', true);
                    this.invoice.set('sent_times', sentTimes);
                    this.sentTimes.push(moment().format('MMMM Do [at] h:mma'))
                    this.set('loading', false);
                    alert('We sent a friendly reminder to ' + this.invoice.get('family_name'));
                })
            } 
        })
    }

    public sendInvoice(resending?) {
        let html = this.buildInvoiceHtml();
        let message = this.user.first_name + ' ' + this.user.last_name + ' created the invoice below, send payment as soon as you can.';
        let subject = this.user.first_name + ' ' + this.user.last_name + ' has sent you an invoice.';
        if (resending) {
            message = this.user.first_name + ' ' + this.user.last_name + ' previously sent the invoice below, here\'s a friendly reminder to send payment as soon as you can.'
            subject = this.user.first_name + ' ' + this.user.last_name + ' is sending you a friendly reminder about an unpaid invoice.'
        }
        let familyToInvoice = this.invoice.get('family');
        this.userService.sendEmail(familyToInvoice, {email: this.user.email, name: this.user.first_name + ' ' + this.user.last_name}, message, html, subject);
    }

    private buildInvoiceHtml() {
        let html = `
            <center><span style="color: gray; font-size: 11px; color: gray;">Invoice ID: ` + this.invoice.get('id') + `</span></center>
            <table width="100%" style="font-family: Helvetica; font-size: 13px;" cellpadding="0" cellspacing="0">
                <tr>
                    <th align="left" width="100%" style="padding: 5; border-bottom: 2px solid #E0E0E0;">Shifts</th>
                    <th align="left" style="padding: 5; border-bottom: 2px solid #E0E0E0;">Contribution</th>
                </tr>
        `
        for (var i = 0; this.get('invoice').shifts.length > i; i++) {
            let shift = this.get('invoice').shifts[i];
            html += `
                <tr>
                    <td align="left" style="padding: 5; border-bottom: 1px solid #f5f5f5;">`+ shift.display_date +`<br /><span style="font-size: 11px; color: gray;">` + shift.display_timing + `</span></td>
                    <td align="left" style="padding: 5; border-bottom: 1px solid #f5f5f5; font-weight: bold;">$` + shift.contributions[this.invoice.get('family_id')] + `</td>
                </tr>
            `;
        }
        html += `
                
            </table>
            <center><h2 style="font-family: Helvetica;">Invoice Total: <span style="color: green;">$` + this.invoice.get('total') + `</span></h2></center>
        `
        
        return html;
    }

    public goback() {
        frame.topmost().goBack();
    }
}