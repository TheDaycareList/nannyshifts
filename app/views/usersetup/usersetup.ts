import { EventData } from 'data/observable';
import { Page } from 'ui/page';
import { UserSetup } from './usersetup-model';
import * as firebase from 'nativescript-plugin-firebase';

export function loaded(args: EventData) {
    let page = <Page>args.object;

   
    page.bindingContext = new UserSetup();
}