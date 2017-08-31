import {Observable} from 'data/observable';
import * as firebase from 'nativescript-plugin-firebase';
import * as dialogs from 'ui/dialogs';
import * as appSettings from 'application-settings';
import * as moment from 'moment';
import * as frame from 'ui/frame';

import { UserService } from '../shared/user.service';


export class InvoiceModel extends Observable {
    constructor() {
        super();
    }

    private userService = new UserService();
    public goback() {
        frame.topmost().goBack();
    }
}