import { EventData } from 'data/observable';
import { Page } from 'ui/page';
import { InvoiceModel } from './invoice-model';
import * as firebase from 'nativescript-plugin-firebase';
import * as appSettings from 'application-settings';
import * as frame from 'ui/frame';

export function loaded(args: EventData) {
    let page = <Page>args.object;
    let invoice = page.navigationContext;
    page.bindingContext = new InvoiceModel(invoice);
}