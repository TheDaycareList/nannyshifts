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

let userService: UserService;
export class SettingsModel extends Observable {
    constructor(page, homeModel) {
        super();
        userService = new UserService();
        this.page = page;
        this.homeModel = homeModel;
        this.families = this.homeModel.families
        this.user = this.homeModel.user;
        console.log('i am settings model');
    }

    private page;
    private homeModel;

    public families;
    public user;

    public settingsTest() {
        console.log('here is a settings test.')
        this.homeModel.set('header_text', 'What the fart.')
    }

    public editRates() {
        this.homeModel.showSettings('/views/components/editrates/editrates.xml');
        this.homeModel.set('settingsTitle', 'Edit Rates');
    }

    public saveRates() {
        let data = {
            hourlyRate: this.get('user').hourlyRate,
            overtimeRate: this.get('user').overtimeRate
        }
        userService.updateUser(data).then(result => {
            console.log(result);
            this.homeModel.hideSettings();
        })
    }
    
}