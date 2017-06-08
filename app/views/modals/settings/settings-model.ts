import * as view from 'ui/core/view';
import {Observable} from 'data/observable';
import * as firebase from 'nativescript-plugin-firebase';
import * as dialogs from 'ui/dialogs';
import * as appSettings from 'application-settings';
import * as moment from 'moment';
import * as frame from 'ui/frame';
import { UserService, User } from '../../shared/user.service';
import { RadSideDrawer } from "nativescript-telerik-ui/sidedrawer";
import { AnimationCurve } from "ui/enums";
import { AnimationDefinition } from "ui/animation";
import { StackLayout } from 'ui/layouts/stack-layout';
import * as fs from 'file-system';
import * as builder from 'ui/builder';

let page;
export class SettingsModel extends Observable {
    constructor() {
        super();
    }
    
    public settingsShown: boolean = false;

    public removeFamily(args) {
        console.log(args.object.id);
    }
}