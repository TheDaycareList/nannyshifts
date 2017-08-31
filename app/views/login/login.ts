import { EventData } from 'data/observable';
import { Page } from 'ui/page';
import { LoginModel } from './login-model';
import * as firebase from 'nativescript-plugin-firebase';
import * as appSettings from 'application-settings';
import * as frame from 'ui/frame';

export function loaded(args: EventData) {
    let page = <Page>args.object;
    page.bindingContext = new LoginModel();
}