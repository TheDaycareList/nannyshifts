"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var observable_1 = require("data/observable");
var observable_array_1 = require("data/observable-array");
var dialogs = require("ui/dialogs");
var appSettings = require("application-settings");
var moment = require("moment");
var frame = require("ui/frame");
var user_service_1 = require("../shared/user.service");
var shift_service_1 = require("../shared/shift.service");
var InvoiceModel = (function (_super) {
    __extends(InvoiceModel, _super);
    function InvoiceModel(invoice) {
        var _this = _super.call(this) || this;
        _this.loading = false;
        _this.sentTimes = new observable_array_1.ObservableArray([]);
        _this.user = JSON.parse(appSettings.getString('userData'));
        _this.userService = new user_service_1.UserService();
        _this.shiftService = new shift_service_1.ShiftService();
        if (invoice.sent_times && invoice.sent_times.length) {
            for (var i = 0; invoice.sent_times.length > i; i++) {
                //invoice.sent_times[i] = moment(invoice.sent_times[i]).format('MMMM Do [at] h:mma');
                _this.sentTimes.push(moment(invoice.sent_times[i]).format('MMMM Do [at] h:mma'));
            }
        }
        if (invoice.shifts && invoice.shifts.length) {
            for (var s = 0; invoice.shifts.length > s; s++) {
                invoice.shifts[s].this_family_name = invoice.family_name;
                invoice.shifts[s].this_family_contribution = invoice.shifts[s].contributions[invoice.family_id];
            }
        }
        _this.set('invoice', observable_1.fromObject(invoice));
        _this.set('paid', invoice.paid);
        _this.set('sent', invoice.sent);
        return _this;
    }
    InvoiceModel.prototype.invoiceOptions = function (args) {
        var _this = this;
        var actions = [];
        if (!this.get('paid')) {
            actions.push('Mark As Paid');
        }
        else {
            actions.push('Unmark As Paid');
        }
        if (!this.invoice.get('sent')) {
            actions.push('Send to ' + this.invoice.get('family_name'));
            actions.push('Edit');
        }
        else {
            if (!this.get('paid'))
                actions.push('Re-send to ' + this.invoice.get('family_name'));
        }
        actions.push('Delete');
        dialogs.action(this.invoice.get('family_name') + ' for $' + this.invoice.get('total'), "Cancel", actions).then(function (result) {
            if (result == 'Edit') {
                //this.showEditShift(false, shift);
            }
            else if (result == 'Delete') {
                var msg_1 = 'Are you sure you want to delete this invoice?';
                if (_this.get('paid')) {
                    msg_1 += ' You\'ve marked this invoice as paid, so remember to adjust your records accordingly.';
                }
                else if (_this.invoice.get('sent')) {
                    msg_1 += ' You\'ve already sent this invoice to ' + _this.invoice.get('family_name') + ', so please reach out to them directly informing them that they can discard this invoice.';
                }
                dialogs.action(msg_1, "Cancel", ["Do it."]).then(function (result) {
                    if (result == 'Do it.') {
                        // this.shiftService.deleteShift(shift.id).then(result => {
                        //     this.processShifts(JSON.parse(appSettings.getString('shifts')));
                        // })
                    }
                });
            }
            else if (result == 'Mark As Paid') {
                _this.set('loading', true);
                _this.shiftService.updateInvoice(_this.invoice.get('id'), { paid: true }).then(function (result) {
                    _this.set('loading', false);
                    _this.set('paid', true);
                });
            }
            else if (result == 'Unmark As Paid') {
                _this.set('loading', true);
                _this.shiftService.updateInvoice(_this.invoice.get('id'), { paid: false }).then(function (result) {
                    _this.set('loading', false);
                    _this.set('paid', false);
                });
            }
            else if (result == 'Send to ' + _this.invoice.get('family_name')) {
                _this.set('loading', true);
                _this.sendInvoice();
                var sentTimes = [moment().format()];
                _this.shiftService.updateInvoice(_this.invoice.get('id'), { sent: true, sent_times: sentTimes }).then(function (result) {
                    _this.set('sent', true);
                    alert('The invoice has been sent!');
                    _this.set('loading', false);
                    _this.invoice.set('sent', true);
                    _this.sentTimes.push(moment().format('MMMM Do [at] h:mma'));
                });
            }
            else if (result == 'Re-send to ' + _this.invoice.get('family_name')) {
                _this.sendInvoice(true);
                var sentTimes_1 = [moment().format()];
                if (_this.invoice.get('sent_times') && _this.invoice.get('sent_times').length) {
                    sentTimes_1 = _this.invoice.get('sent_times');
                    sentTimes_1.push(moment().format());
                }
                _this.set('loading', true);
                _this.shiftService.updateInvoice(_this.invoice.get('id'), { sent: true, sent_times: sentTimes_1 }).then(function (result) {
                    _this.invoice.set('sent', true);
                    _this.set('sent', true);
                    _this.invoice.set('sent_times', sentTimes_1);
                    _this.sentTimes.push(moment().format('MMMM Do [at] h:mma'));
                    _this.set('loading', false);
                    alert('We sent a friendly reminder to ' + _this.invoice.get('family_name'));
                });
            }
        });
    };
    InvoiceModel.prototype.sendInvoice = function (resending) {
        var html = this.buildInvoiceHtml();
        var message = this.user.first_name + ' ' + this.user.last_name + ' created the invoice below, send payment as soon as you can.';
        var subject = this.user.first_name + ' ' + this.user.last_name + ' has sent you an invoice.';
        if (resending) {
            message = this.user.first_name + ' ' + this.user.last_name + ' previously sent the invoice below, here\'s a friendly reminder to send payment as soon as you can.';
            subject = this.user.first_name + ' ' + this.user.last_name + ' is sending you a friendly reminder about an unpaid invoice.';
        }
        var familyToInvoice = this.invoice.get('family');
        this.userService.sendEmail(familyToInvoice, { email: this.user.email, name: this.user.first_name + ' ' + this.user.last_name }, message, html, subject);
    };
    InvoiceModel.prototype.buildInvoiceHtml = function () {
        var html = "\n            <center><span style=\"color: gray; font-size: 11px; color: gray;\">Invoice ID: " + this.invoice.get('id') + "</span></center>\n            <table width=\"100%\" style=\"font-family: Helvetica; font-size: 13px;\" cellpadding=\"0\" cellspacing=\"0\">\n                <tr>\n                    <th align=\"left\" width=\"100%\" style=\"padding: 5; border-bottom: 2px solid #E0E0E0;\">Shifts</th>\n                    <th align=\"left\" style=\"padding: 5; border-bottom: 2px solid #E0E0E0;\">Contribution</th>\n                </tr>\n        ";
        for (var i = 0; this.get('invoice').shifts.length > i; i++) {
            var shift = this.get('invoice').shifts[i];
            html += "\n                <tr>\n                    <td align=\"left\" style=\"padding: 5; border-bottom: 1px solid #f5f5f5;\">" + shift.display_date + "<br /><span style=\"font-size: 11px; color: gray;\">" + shift.display_timing + "</span></td>\n                    <td align=\"left\" style=\"padding: 5; border-bottom: 1px solid #f5f5f5; font-weight: bold;\">$" + shift.contributions[this.invoice.get('family_id')] + "</td>\n                </tr>\n            ";
        }
        html += "\n                \n            </table>\n            <center><h2 style=\"font-family: Helvetica;\">Invoice Total: <span style=\"color: green;\">$" + this.invoice.get('total') + "</span></h2></center>\n        ";
        return html;
    };
    InvoiceModel.prototype.goback = function () {
        frame.topmost().goBack();
    };
    return InvoiceModel;
}(observable_1.Observable));
exports.InvoiceModel = InvoiceModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW52b2ljZS1tb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImludm9pY2UtbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSw4Q0FBK0U7QUFDL0UsMERBQXNEO0FBRXRELG9DQUFzQztBQUN0QyxrREFBb0Q7QUFDcEQsK0JBQWlDO0FBQ2pDLGdDQUFrQztBQUVsQyx1REFBMkQ7QUFDM0QseURBQXVEO0FBR3ZEO0lBQWtDLGdDQUFVO0lBQ3hDLHNCQUFZLE9BQU87UUFBbkIsWUFDSSxpQkFBTyxTQWdCVjtRQUdNLGFBQU8sR0FBWSxLQUFLLENBQUM7UUFHekIsZUFBUyxHQUE0QixJQUFJLGtDQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0QsVUFBSSxHQUFTLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBRTFELGlCQUFXLEdBQUcsSUFBSSwwQkFBVyxFQUFFLENBQUM7UUFDaEMsa0JBQVksR0FBRyxJQUFJLDRCQUFZLEVBQUUsQ0FBQztRQXpCdEMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDbEQsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNqRCxxRkFBcUY7Z0JBQ3JGLEtBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQTtZQUNuRixDQUFDO1FBQ0wsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQzFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDN0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDO2dCQUN6RCxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNwRyxDQUFDO1FBQ0wsQ0FBQztRQUNELEtBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLHVCQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDbkQsS0FBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLEtBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzs7SUFDbkMsQ0FBQztJQVlNLHFDQUFjLEdBQXJCLFVBQXNCLElBQUk7UUFBMUIsaUJBMEVDO1FBekVHLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNqQixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ25DLENBQUM7UUFDRCxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QixPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBQzNELE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFDekYsQ0FBQztRQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFdkIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07WUFDakgsRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ25CLG1DQUFtQztZQUN2QyxDQUFDO1lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUM1QixJQUFJLEtBQUcsR0FBRywrQ0FBK0MsQ0FBQztnQkFDMUQsRUFBRSxDQUFDLENBQUMsS0FBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ25CLEtBQUcsSUFBSSx1RkFBdUYsQ0FBQztnQkFDbkcsQ0FBQztnQkFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxLQUFHLElBQUksd0NBQXdDLEdBQUcsS0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsMkZBQTJGLENBQUM7Z0JBQ3BMLENBQUM7Z0JBRUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFHLEVBQUUsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQSxNQUFNO29CQUNqRCxFQUFFLENBQUMsQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQzt3QkFDckIsMkRBQTJEO3dCQUMzRCx1RUFBdUU7d0JBQ3ZFLEtBQUs7b0JBQ1QsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQTtZQUNOLENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLEtBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMxQixLQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxLQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07b0JBQzdFLEtBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUMzQixLQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDM0IsQ0FBQyxDQUFDLENBQUE7WUFDTixDQUFDO1lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BDLEtBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMxQixLQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxLQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07b0JBQzlFLEtBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUMzQixLQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDM0IsQ0FBQyxDQUFDLENBQUE7WUFDTixDQUFDO1lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxVQUFVLEdBQUcsS0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoRSxLQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDMUIsS0FBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNuQixJQUFJLFNBQVMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBQ3BDLEtBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLEtBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQSxNQUFNO29CQUNwRyxLQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDdkIsS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUM7b0JBQ3BDLEtBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUMzQixLQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQy9CLEtBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUE7Z0JBQzlELENBQUMsQ0FBQyxDQUFBO1lBQ04sQ0FBQztZQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLElBQUksYUFBYSxHQUFHLEtBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkUsS0FBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdkIsSUFBSSxXQUFTLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUNwQyxFQUFFLENBQUMsQ0FBQyxLQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxLQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUMxRSxXQUFTLEdBQUcsS0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7b0JBQzNDLFdBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDdEMsQ0FBQztnQkFDRCxLQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDMUIsS0FBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsS0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxXQUFTLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU07b0JBQ3BHLEtBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDL0IsS0FBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ3ZCLEtBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxXQUFTLENBQUMsQ0FBQztvQkFDMUMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQTtvQkFDMUQsS0FBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQzNCLEtBQUssQ0FBQyxpQ0FBaUMsR0FBRyxLQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUMvRSxDQUFDLENBQUMsQ0FBQTtZQUNOLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFTSxrQ0FBVyxHQUFsQixVQUFtQixTQUFVO1FBQ3pCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ25DLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyw4REFBOEQsQ0FBQztRQUNoSSxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsMkJBQTJCLENBQUM7UUFDN0YsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNaLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcscUdBQXFHLENBQUE7WUFDbEssT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyw4REFBOEQsQ0FBQTtRQUMvSCxDQUFDO1FBQ0QsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzFKLENBQUM7SUFFTyx1Q0FBZ0IsR0FBeEI7UUFDSSxJQUFJLElBQUksR0FBRywrRkFDdUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxpYkFNN0csQ0FBQTtRQUNELEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDekQsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUMsSUFBSSxJQUFJLHlIQUV3RSxHQUFFLEtBQUssQ0FBQyxZQUFZLEdBQUUsc0RBQW9ELEdBQUcsS0FBSyxDQUFDLGNBQWMsR0FBRyxtSUFDaEYsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsNENBRTNKLENBQUM7UUFDTixDQUFDO1FBQ0QsSUFBSSxJQUFJLG9KQUdxRixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLGlDQUMzSCxDQUFBO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNoQixDQUFDO0lBRU0sNkJBQU0sR0FBYjtRQUNJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBQ0wsbUJBQUM7QUFBRCxDQUFDLEFBcEpELENBQWtDLHVCQUFVLEdBb0ozQztBQXBKWSxvQ0FBWSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBhZ2UgfSBmcm9tICd1aS9wYWdlJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgZnJvbU9iamVjdCBhcyBvYnNlcnZhYmxlRnJvbU9iamVjdH0gZnJvbSAnZGF0YS9vYnNlcnZhYmxlJztcbmltcG9ydCB7T2JzZXJ2YWJsZUFycmF5fSBmcm9tICdkYXRhL29ic2VydmFibGUtYXJyYXknO1xuaW1wb3J0ICogYXMgZmlyZWJhc2UgZnJvbSAnbmF0aXZlc2NyaXB0LXBsdWdpbi1maXJlYmFzZSc7XG5pbXBvcnQgKiBhcyBkaWFsb2dzIGZyb20gJ3VpL2RpYWxvZ3MnO1xuaW1wb3J0ICogYXMgYXBwU2V0dGluZ3MgZnJvbSAnYXBwbGljYXRpb24tc2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgKiBhcyBmcmFtZSBmcm9tICd1aS9mcmFtZSc7XG5cbmltcG9ydCB7IFVzZXJTZXJ2aWNlLCBVc2VyIH0gZnJvbSAnLi4vc2hhcmVkL3VzZXIuc2VydmljZSc7XG5pbXBvcnQgeyBTaGlmdFNlcnZpY2UgfSBmcm9tICcuLi9zaGFyZWQvc2hpZnQuc2VydmljZSc7XG5cblxuZXhwb3J0IGNsYXNzIEludm9pY2VNb2RlbCBleHRlbmRzIE9ic2VydmFibGUge1xuICAgIGNvbnN0cnVjdG9yKGludm9pY2UpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgaWYgKGludm9pY2Uuc2VudF90aW1lcyAmJiBpbnZvaWNlLnNlbnRfdGltZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaW52b2ljZS5zZW50X3RpbWVzLmxlbmd0aCA+IGk7IGkrKykge1xuICAgICAgICAgICAgICAgIC8vaW52b2ljZS5zZW50X3RpbWVzW2ldID0gbW9tZW50KGludm9pY2Uuc2VudF90aW1lc1tpXSkuZm9ybWF0KCdNTU1NIERvIFthdF0gaDptbWEnKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbnRUaW1lcy5wdXNoKG1vbWVudChpbnZvaWNlLnNlbnRfdGltZXNbaV0pLmZvcm1hdCgnTU1NTSBEbyBbYXRdIGg6bW1hJykpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGludm9pY2Uuc2hpZnRzICYmIGludm9pY2Uuc2hpZnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgZm9yIChsZXQgcyA9IDA7IGludm9pY2Uuc2hpZnRzLmxlbmd0aCA+IHM7IHMrKykge1xuICAgICAgICAgICAgICAgIGludm9pY2Uuc2hpZnRzW3NdLnRoaXNfZmFtaWx5X25hbWUgPSBpbnZvaWNlLmZhbWlseV9uYW1lO1xuICAgICAgICAgICAgICAgIGludm9pY2Uuc2hpZnRzW3NdLnRoaXNfZmFtaWx5X2NvbnRyaWJ1dGlvbiA9IGludm9pY2Uuc2hpZnRzW3NdLmNvbnRyaWJ1dGlvbnNbaW52b2ljZS5mYW1pbHlfaWRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2V0KCdpbnZvaWNlJywgb2JzZXJ2YWJsZUZyb21PYmplY3QoaW52b2ljZSkpO1xuICAgICAgICB0aGlzLnNldCgncGFpZCcsIGludm9pY2UucGFpZCk7XG4gICAgICAgIHRoaXMuc2V0KCdzZW50JywgaW52b2ljZS5zZW50KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgaW52b2ljZTogT2JzZXJ2YWJsZTsgXG4gICAgcHVibGljIGxvYWRpbmc6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBwdWJsaWMgcGFpZDogYm9vbGVhbjtcbiAgICBwdWJsaWMgc2VudDogYm9vbGVhbjtcbiAgICBwdWJsaWMgc2VudFRpbWVzOiBPYnNlcnZhYmxlQXJyYXk8c3RyaW5nPiA9IG5ldyBPYnNlcnZhYmxlQXJyYXkoW10pO1xuICAgIHB1YmxpYyB1c2VyOiBVc2VyID0gSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3VzZXJEYXRhJykpO1xuXG4gICAgcHJpdmF0ZSB1c2VyU2VydmljZSA9IG5ldyBVc2VyU2VydmljZSgpO1xuICAgIHByaXZhdGUgc2hpZnRTZXJ2aWNlID0gbmV3IFNoaWZ0U2VydmljZSgpO1xuXG4gICAgcHVibGljIGludm9pY2VPcHRpb25zKGFyZ3MpIHtcbiAgICAgICAgbGV0IGFjdGlvbnMgPSBbXTtcbiAgICAgICAgaWYgKCF0aGlzLmdldCgncGFpZCcpKSB7XG4gICAgICAgICAgICBhY3Rpb25zLnB1c2goJ01hcmsgQXMgUGFpZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCdVbm1hcmsgQXMgUGFpZCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5pbnZvaWNlLmdldCgnc2VudCcpKSB7XG4gICAgICAgICAgICBhY3Rpb25zLnB1c2goJ1NlbmQgdG8gJyArIHRoaXMuaW52b2ljZS5nZXQoJ2ZhbWlseV9uYW1lJykpO1xuICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCdFZGl0Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZ2V0KCdwYWlkJykpIGFjdGlvbnMucHVzaCgnUmUtc2VuZCB0byAnICsgdGhpcy5pbnZvaWNlLmdldCgnZmFtaWx5X25hbWUnKSk7XG4gICAgICAgIH1cbiAgICAgICAgYWN0aW9ucy5wdXNoKCdEZWxldGUnKTtcblxuICAgICAgICBkaWFsb2dzLmFjdGlvbih0aGlzLmludm9pY2UuZ2V0KCdmYW1pbHlfbmFtZScpICsgJyBmb3IgJCcgKyB0aGlzLmludm9pY2UuZ2V0KCd0b3RhbCcpLCBcIkNhbmNlbFwiLCBhY3Rpb25zKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICBpZiAocmVzdWx0ID09ICdFZGl0Jykge1xuICAgICAgICAgICAgICAgIC8vdGhpcy5zaG93RWRpdFNoaWZ0KGZhbHNlLCBzaGlmdCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PSAnRGVsZXRlJykge1xuICAgICAgICAgICAgICAgIGxldCBtc2cgPSAnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSB0aGlzIGludm9pY2U/JztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5nZXQoJ3BhaWQnKSkge1xuICAgICAgICAgICAgICAgICAgICBtc2cgKz0gJyBZb3VcXCd2ZSBtYXJrZWQgdGhpcyBpbnZvaWNlIGFzIHBhaWQsIHNvIHJlbWVtYmVyIHRvIGFkanVzdCB5b3VyIHJlY29yZHMgYWNjb3JkaW5nbHkuJzsgXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmludm9pY2UuZ2V0KCdzZW50JykpIHtcbiAgICAgICAgICAgICAgICAgICAgbXNnICs9ICcgWW91XFwndmUgYWxyZWFkeSBzZW50IHRoaXMgaW52b2ljZSB0byAnICsgdGhpcy5pbnZvaWNlLmdldCgnZmFtaWx5X25hbWUnKSArICcsIHNvIHBsZWFzZSByZWFjaCBvdXQgdG8gdGhlbSBkaXJlY3RseSBpbmZvcm1pbmcgdGhlbSB0aGF0IHRoZXkgY2FuIGRpc2NhcmQgdGhpcyBpbnZvaWNlLic7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZGlhbG9ncy5hY3Rpb24obXNnLCBcIkNhbmNlbFwiLCBbXCJEbyBpdC5cIl0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PSAnRG8gaXQuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhpcy5zaGlmdFNlcnZpY2UuZGVsZXRlU2hpZnQoc2hpZnQuaWQpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0aGlzLnByb2Nlc3NTaGlmdHMoSlNPTi5wYXJzZShhcHBTZXR0aW5ncy5nZXRTdHJpbmcoJ3NoaWZ0cycpKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB9KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09ICdNYXJrIEFzIFBhaWQnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2xvYWRpbmcnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNoaWZ0U2VydmljZS51cGRhdGVJbnZvaWNlKHRoaXMuaW52b2ljZS5nZXQoJ2lkJyksIHtwYWlkOiB0cnVlfSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCgnbG9hZGluZycsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ3BhaWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT0gJ1VubWFyayBBcyBQYWlkJykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdsb2FkaW5nJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5zaGlmdFNlcnZpY2UudXBkYXRlSW52b2ljZSh0aGlzLmludm9pY2UuZ2V0KCdpZCcpLCB7cGFpZDogZmFsc2V9KS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdsb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldCgncGFpZCcsIGZhbHNlKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PSAnU2VuZCB0byAnICsgdGhpcy5pbnZvaWNlLmdldCgnZmFtaWx5X25hbWUnKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdsb2FkaW5nJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kSW52b2ljZSgpO1xuICAgICAgICAgICAgICAgIGxldCBzZW50VGltZXMgPSBbbW9tZW50KCkuZm9ybWF0KCldO1xuICAgICAgICAgICAgICAgIHRoaXMuc2hpZnRTZXJ2aWNlLnVwZGF0ZUludm9pY2UodGhpcy5pbnZvaWNlLmdldCgnaWQnKSwge3NlbnQ6IHRydWUsIHNlbnRfdGltZXM6IHNlbnRUaW1lc30pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ3NlbnQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnQoJ1RoZSBpbnZvaWNlIGhhcyBiZWVuIHNlbnQhJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdsb2FkaW5nJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmludm9pY2Uuc2V0KCdzZW50JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VudFRpbWVzLnB1c2gobW9tZW50KCkuZm9ybWF0KCdNTU1NIERvIFthdF0gaDptbWEnKSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT0gJ1JlLXNlbmQgdG8gJyArIHRoaXMuaW52b2ljZS5nZXQoJ2ZhbWlseV9uYW1lJykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbmRJbnZvaWNlKHRydWUpO1xuICAgICAgICAgICAgICAgIGxldCBzZW50VGltZXMgPSBbbW9tZW50KCkuZm9ybWF0KCldO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmludm9pY2UuZ2V0KCdzZW50X3RpbWVzJykgJiYgdGhpcy5pbnZvaWNlLmdldCgnc2VudF90aW1lcycpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBzZW50VGltZXMgPSB0aGlzLmludm9pY2UuZ2V0KCdzZW50X3RpbWVzJyk7XG4gICAgICAgICAgICAgICAgICAgIHNlbnRUaW1lcy5wdXNoKG1vbWVudCgpLmZvcm1hdCgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2xvYWRpbmcnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNoaWZ0U2VydmljZS51cGRhdGVJbnZvaWNlKHRoaXMuaW52b2ljZS5nZXQoJ2lkJyksIHtzZW50OiB0cnVlLCBzZW50X3RpbWVzOiBzZW50VGltZXN9KS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW52b2ljZS5zZXQoJ3NlbnQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ3NlbnQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnZvaWNlLnNldCgnc2VudF90aW1lcycsIHNlbnRUaW1lcyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VudFRpbWVzLnB1c2gobW9tZW50KCkuZm9ybWF0KCdNTU1NIERvIFthdF0gaDptbWEnKSlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2xvYWRpbmcnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KCdXZSBzZW50IGEgZnJpZW5kbHkgcmVtaW5kZXIgdG8gJyArIHRoaXMuaW52b2ljZS5nZXQoJ2ZhbWlseV9uYW1lJykpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9IFxuICAgICAgICB9KVxuICAgIH1cblxuICAgIHB1YmxpYyBzZW5kSW52b2ljZShyZXNlbmRpbmc/KSB7XG4gICAgICAgIGxldCBodG1sID0gdGhpcy5idWlsZEludm9pY2VIdG1sKCk7XG4gICAgICAgIGxldCBtZXNzYWdlID0gdGhpcy51c2VyLmZpcnN0X25hbWUgKyAnICcgKyB0aGlzLnVzZXIubGFzdF9uYW1lICsgJyBjcmVhdGVkIHRoZSBpbnZvaWNlIGJlbG93LCBzZW5kIHBheW1lbnQgYXMgc29vbiBhcyB5b3UgY2FuLic7XG4gICAgICAgIGxldCBzdWJqZWN0ID0gdGhpcy51c2VyLmZpcnN0X25hbWUgKyAnICcgKyB0aGlzLnVzZXIubGFzdF9uYW1lICsgJyBoYXMgc2VudCB5b3UgYW4gaW52b2ljZS4nO1xuICAgICAgICBpZiAocmVzZW5kaW5nKSB7XG4gICAgICAgICAgICBtZXNzYWdlID0gdGhpcy51c2VyLmZpcnN0X25hbWUgKyAnICcgKyB0aGlzLnVzZXIubGFzdF9uYW1lICsgJyBwcmV2aW91c2x5IHNlbnQgdGhlIGludm9pY2UgYmVsb3csIGhlcmVcXCdzIGEgZnJpZW5kbHkgcmVtaW5kZXIgdG8gc2VuZCBwYXltZW50IGFzIHNvb24gYXMgeW91IGNhbi4nXG4gICAgICAgICAgICBzdWJqZWN0ID0gdGhpcy51c2VyLmZpcnN0X25hbWUgKyAnICcgKyB0aGlzLnVzZXIubGFzdF9uYW1lICsgJyBpcyBzZW5kaW5nIHlvdSBhIGZyaWVuZGx5IHJlbWluZGVyIGFib3V0IGFuIHVucGFpZCBpbnZvaWNlLidcbiAgICAgICAgfVxuICAgICAgICBsZXQgZmFtaWx5VG9JbnZvaWNlID0gdGhpcy5pbnZvaWNlLmdldCgnZmFtaWx5Jyk7XG4gICAgICAgIHRoaXMudXNlclNlcnZpY2Uuc2VuZEVtYWlsKGZhbWlseVRvSW52b2ljZSwge2VtYWlsOiB0aGlzLnVzZXIuZW1haWwsIG5hbWU6IHRoaXMudXNlci5maXJzdF9uYW1lICsgJyAnICsgdGhpcy51c2VyLmxhc3RfbmFtZX0sIG1lc3NhZ2UsIGh0bWwsIHN1YmplY3QpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYnVpbGRJbnZvaWNlSHRtbCgpIHtcbiAgICAgICAgbGV0IGh0bWwgPSBgXG4gICAgICAgICAgICA8Y2VudGVyPjxzcGFuIHN0eWxlPVwiY29sb3I6IGdyYXk7IGZvbnQtc2l6ZTogMTFweDsgY29sb3I6IGdyYXk7XCI+SW52b2ljZSBJRDogYCArIHRoaXMuaW52b2ljZS5nZXQoJ2lkJykgKyBgPC9zcGFuPjwvY2VudGVyPlxuICAgICAgICAgICAgPHRhYmxlIHdpZHRoPVwiMTAwJVwiIHN0eWxlPVwiZm9udC1mYW1pbHk6IEhlbHZldGljYTsgZm9udC1zaXplOiAxM3B4O1wiIGNlbGxwYWRkaW5nPVwiMFwiIGNlbGxzcGFjaW5nPVwiMFwiPlxuICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgPHRoIGFsaWduPVwibGVmdFwiIHdpZHRoPVwiMTAwJVwiIHN0eWxlPVwicGFkZGluZzogNTsgYm9yZGVyLWJvdHRvbTogMnB4IHNvbGlkICNFMEUwRTA7XCI+U2hpZnRzPC90aD5cbiAgICAgICAgICAgICAgICAgICAgPHRoIGFsaWduPVwibGVmdFwiIHN0eWxlPVwicGFkZGluZzogNTsgYm9yZGVyLWJvdHRvbTogMnB4IHNvbGlkICNFMEUwRTA7XCI+Q29udHJpYnV0aW9uPC90aD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICBgXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyB0aGlzLmdldCgnaW52b2ljZScpLnNoaWZ0cy5sZW5ndGggPiBpOyBpKyspIHtcbiAgICAgICAgICAgIGxldCBzaGlmdCA9IHRoaXMuZ2V0KCdpbnZvaWNlJykuc2hpZnRzW2ldO1xuICAgICAgICAgICAgaHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICA8dGQgYWxpZ249XCJsZWZ0XCIgc3R5bGU9XCJwYWRkaW5nOiA1OyBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2Y1ZjVmNTtcIj5gKyBzaGlmdC5kaXNwbGF5X2RhdGUgK2A8YnIgLz48c3BhbiBzdHlsZT1cImZvbnQtc2l6ZTogMTFweDsgY29sb3I6IGdyYXk7XCI+YCArIHNoaWZ0LmRpc3BsYXlfdGltaW5nICsgYDwvc3Bhbj48L3RkPlxuICAgICAgICAgICAgICAgICAgICA8dGQgYWxpZ249XCJsZWZ0XCIgc3R5bGU9XCJwYWRkaW5nOiA1OyBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2Y1ZjVmNTsgZm9udC13ZWlnaHQ6IGJvbGQ7XCI+JGAgKyBzaGlmdC5jb250cmlidXRpb25zW3RoaXMuaW52b2ljZS5nZXQoJ2ZhbWlseV9pZCcpXSArIGA8L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9XG4gICAgICAgIGh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgPC90YWJsZT5cbiAgICAgICAgICAgIDxjZW50ZXI+PGgyIHN0eWxlPVwiZm9udC1mYW1pbHk6IEhlbHZldGljYTtcIj5JbnZvaWNlIFRvdGFsOiA8c3BhbiBzdHlsZT1cImNvbG9yOiBncmVlbjtcIj4kYCArIHRoaXMuaW52b2ljZS5nZXQoJ3RvdGFsJykgKyBgPC9zcGFuPjwvaDI+PC9jZW50ZXI+XG4gICAgICAgIGBcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cblxuICAgIHB1YmxpYyBnb2JhY2soKSB7XG4gICAgICAgIGZyYW1lLnRvcG1vc3QoKS5nb0JhY2soKTtcbiAgICB9XG59Il19