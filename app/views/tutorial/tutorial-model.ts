import { Page, getViewById } from 'ui/page';
import { StackLayout } from 'ui/layouts/stack-layout';
import { Observable } from 'data/observable';
import { ObservableArray } from 'data/observable-array';
import * as firebase from 'nativescript-plugin-firebase';
import * as dialogs from 'ui/dialogs';
import * as appSettings from 'application-settings';
import * as moment from 'moment';
import * as frame from 'ui/frame';
import { UserService, User } from '../shared/user.service';
import { AnimationDefinition } from "ui/animation";
import { AnimationCurve } from "ui/enums";

let userService: UserService;
let MyModel: Tutorial;

export class Tutorial extends Observable {
    constructor() {
        super();
        userService = new UserService();
        MyModel = this;

        let uid = JSON.parse(appSettings.getString('uid'));
        
    }
    
    public doneTutorial() {
        appSettings.setBoolean('seenTutorial', true);
        frame.topmost().navigate({
            moduleName: '/views/home/home',
            backstackVisible: false,
            animated: true,
            clearHistory: true,
            transition: {
                name: "flip",
                duration: 380,
                curve: AnimationCurve.cubicBezier(0.1, 0.1, 0.1, 1)
            }
        })
    }

    public kill() {
        appSettings.remove('userData');
        appSettings.remove('uid');
        appSettings.remove('userRecordID');
        frame.topmost().navigate('/views/login/login');
    }
}