import { EventData, Observable } from 'data/observable';
import { Page } from 'ui/page';
import { HomeModel } from '../../home/home-model';
import { InvoicesModel } from '../../home/invoices/invoices-model';
import { UserService, User } from '../../shared/user.service';
import { ShiftService } from '../../shared/shift.service';
import { StackLayout } from 'ui/layouts/stack-layout';


export function invoicesLoaded(args: EventData) {
    let view:StackLayout = <StackLayout>args.object;
    view.bindingContext = new InvoicesModel(view);
    console.log('invoices loaded');
}

