import {EventData, Observable} from 'data/observable';
import {ObservableArray} from 'data/observable-array';
import * as firebase from 'nativescript-plugin-firebase';
import * as dialogs from 'ui/dialogs';
import * as appSettings from 'application-settings';
import * as moment from 'moment';
import * as frame from 'ui/frame';
import { UserService, User } from '../shared/user.service';
import { RadSideDrawer } from "nativescript-telerik-ui/sidedrawer";
import { SettingsModel } from '../modals/settings/settings-model';
let userService: UserService;
export class HomeModel extends SettingsModel {
    constructor() {
        super();
        userService = new UserService();
        let user = JSON.parse(appSettings.getString('userData'));
        for (let i in user.families) {
            let family = new Observable(user.families[i]);
            family.set('id', i);
            if (!user.families[i].deleted) {
                this.families.push(family);
                this.familiesCount++;
            }
        }
        if (this.familiesCount == 1) this.set('justOneFamily', true);
        this.families.getItem(0).set('isFirst', true); 
   }


    public header_text: string = 'Week of ' + moment().startOf('week').format('dddd [the] Do');
    public user: User = JSON.parse(appSettings.getString('userData'));
    public hours_worked: number = 0;
    public total_earned: string = '0.00';
    public settingsTitle: string = 'Settings';
    public families: ObservableArray<Observable> = new ObservableArray([]);
    public familiesCount: number = 0;
    public justOneFamily: boolean = false;
    public editingFamily: Observable;
    public onlyOneFamily: boolean = false;
    public hideSettings: Function;
    //public settingsShown: boolean = false;
    public showMenu() {
        let sideDrawer: RadSideDrawer = <RadSideDrawer>( frame.topmost().getViewById("drawer"));
        sideDrawer.showDrawer();
    }  

    public logUser() {
        console.dump(JSON.parse(appSettings.getString('userData')));
    }

    public kill() {
        appSettings.remove('userData');
        appSettings.remove('uid');
        appSettings.remove('userRecordID');
        frame.topmost().navigate('/views/login/login');
    }

    
}